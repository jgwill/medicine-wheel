/**
 * Adapters: the provider-specific half of publishing (#165).
 *
 * The port is `Publisher` (`./publish`): one event in, one outcome out. An
 * adapter is that port for one destination. It knows the destination's
 * request shape, its authentication, how its answers map to `arrived`,
 * `failed` and `refused`, and what it actually promises. The jgwill/Miadi
 * Event Spine (rispecs/events §4) requires that promise to be declared rather
 * than assumed, so every adapter here carries `guarantees`.
 *
 * Everything an adapter needs that is not about one provider — topics,
 * partition keys, CloudEvents — is in `./route`.
 *
 * The adapters here speak HTTP and need no dependency: a plain receiver, a
 * Hookdeck source, the Cloudflare Queues API. NATS JetStream and Kafka need
 * a client library and a server to test against; their shape is specified in
 * miadi-chronicle://548 and they come when a server exists.
 */

import type { WheelEvent } from './envelope';
import type { Publisher, PublishOutcome } from './publish';
import { cloudEventHeaders, toCloudEvent } from './route';

// ── what an answer means ────────────────────────────────────────────────────

/**
 * One rule for every HTTP destination.
 *
 * - `arrived`: 2xx.
 * - `failed` — the pass stops, and the same event goes first next time:
 *   - 401, 403, 407: the credentials are wrong;
 *   - 404, 405, 410, 421: the address is wrong;
 *   - 408, 425, 429 and 5xx: the destination is busy or down;
 *   - 1xx and 3xx: an answer this client does not follow.
 *
 *   None of these is the receiver's judgement of this event, so passing the
 *   event would lose it for that destination.
 * - `refused` — the receiver's judgement of this event as shaped (400, 409,
 *   413, 415, 422 and every other 4xx). It is recorded and passed.
 */
export function classifyHttpStatus(status: number): PublishOutcome['outcome'] {
  if (status >= 200 && status < 300) return 'arrived';
  if (status >= 400 && status < 500 && ![401, 403, 404, 405, 407, 408, 410, 421, 425, 429].includes(status)) return 'refused';
  return 'failed';
}

async function outcomeOf(res: Response): Promise<PublishOutcome> {
  const outcome = classifyHttpStatus(res.status);
  if (outcome === 'arrived') return { outcome, status: res.status };
  const body = await res.text().catch(() => '');
  return { outcome, status: res.status, error: `HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}` };
}

const unreachable = (error: unknown): PublishOutcome => ({ outcome: 'failed', error: (error as Error)?.message ?? String(error) });

// ── what an adapter promises ────────────────────────────────────────────────

/** What a destination actually promises, in its own terms. Each field says what is true, not what is hoped. */
export interface AdapterGuarantees {
  /** What `arrived` means at this destination. */
  acknowledgement: string;
  ordering: string;
  retention: string;
  replay: string;
  redelivery: string;
  deadLetter: string;
  /** Who keeps a consumer's place. */
  consumerPosition: string;
}

/** What the wheel itself gives every adapter: log order, its own cursor, replay by rewind. */
const WHEEL_SIDE = 'The wheel sends in log order, keeps this publisher\'s cursor and receipts beside the log, and replays by rewind with the same idempotency keys.';

// ── a plain receiver ────────────────────────────────────────────────────────

/** How the event is put on the wire: the wheel's envelope, or CloudEvents 1.0 in structured or binary mode. */
export type WireFormat = 'envelope' | 'cloudevents' | 'cloudevents-binary';

function wire(event: WheelEvent, format: WireFormat): { headers: Record<string, string>; body: string } {
  if (format === 'cloudevents') {
    return { headers: { 'content-type': 'application/cloudevents+json' }, body: JSON.stringify(toCloudEvent(event)) };
  }
  if (format === 'cloudevents-binary') {
    const ce = toCloudEvent(event);
    return { headers: cloudEventHeaders(ce), body: JSON.stringify(ce.data ?? {}) };
  }
  return { headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) };
}

export interface HttpPublisherOptions {
  url: string;
  /** Sent as `Authorization: Bearer <token>`. */
  token?: string;
  name?: string;
  timeoutMs?: number;
  format?: WireFormat;
  fetch?: typeof fetch;
  guarantees?: AdapterGuarantees;
}

/**
 * POST each event to a receiver that answers HTTP, with `Idempotency-Key` and
 * `X-Event-Type` headers and the body in the chosen format.
 */
export function httpPublisher(options: HttpPublisherOptions): Publisher {
  const send = options.fetch ?? fetch;
  const format = options.format ?? 'envelope';
  return {
    name: options.name ?? 'http',
    guarantees: options.guarantees ?? {
      acknowledgement: 'The receiver answered 2xx. What it did next is the receiver\'s.',
      ordering: `${WHEEL_SIDE} Order beyond the receiver is the receiver's.`,
      retention: 'The wheel\'s log keeps every event; the receiver keeps what it keeps.',
      replay: WHEEL_SIDE,
      redelivery: 'A failed send is sent again on the next pass, every minute and after each recorded event.',
      deadLetter: 'A refusal (4xx other than auth, address or rate) is a `refused` receipt, and the cursor passes it.',
      consumerPosition: 'Kept by the wheel, one cursor per publisher.',
    },
    async publish(event) {
      const { headers, body } = wire(event, format);
      try {
        const res = await send(options.url, {
          method: 'POST',
          headers: {
            ...headers,
            'idempotency-key': event.idempotency_key,
            'x-event-type': event.event_type,
            ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
          },
          body,
          signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
        });
        return await outcomeOf(res);
      } catch (error) {
        return unreachable(error);
      }
    },
  };
}

// ── Hookdeck ────────────────────────────────────────────────────────────────

export interface HookdeckPublisherOptions extends Omit<HttpPublisherOptions, 'url' | 'guarantees'> {
  /** The Hookdeck source URL that receives the wheel's events. */
  sourceUrl: string;
}

/**
 * Hookdeck's Event Gateway takes any HTTP POST at a source URL and delivers
 * it to the destinations its connections name, with its own retries,
 * filtering and replay. The wheel's side is a plain POST.
 */
export function hookdeckPublisher(options: HookdeckPublisherOptions): Publisher {
  return httpPublisher({
    ...options,
    url: options.sourceUrl,
    name: options.name ?? 'hookdeck',
    guarantees: {
      acknowledgement: 'Hookdeck accepted the request at the source (2xx). Delivery to each destination is Hookdeck\'s, by its connection rules.',
      ordering: 'The wheel sends in log order. Delivery order at the destinations is not promised by this adapter.',
      retention: 'Per Hookdeck plan: 3 days on the free Developer plan, 7 on Team (hookdeck.com/pricing, read 2026-10-17). The wheel\'s log keeps every event.',
      replay: `Hookdeck retries and bulk-retries from its dashboard and API within retention. ${WHEEL_SIDE}`,
      redelivery: 'Hookdeck retries failed deliveries to a destination, linearly or exponentially, per connection.',
      deadLetter: 'Failed deliveries stay visible in Hookdeck for retry within retention. A refusal at the source is a `refused` receipt here.',
      consumerPosition: 'Hookdeck pushes to destinations; the wheel keeps its cursor to the source.',
    },
  });
}

// ── Cloudflare Queues ───────────────────────────────────────────────────────

export interface CloudflareQueuesOptions {
  accountId: string;
  queueId: string;
  /** An API token with the "Queues Edit" permission. */
  token: string;
  name?: string;
  /** `envelope` (default) or `cloudevents`: what the message body holds. */
  format?: 'envelope' | 'cloudevents';
  apiBase?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

/**
 * Cloudflare Queues over its HTTP API, from outside Workers: POST
 * `/accounts/{account}/queues/{queue}/messages` with `{ "body": <message> }`
 * and a bearer token (developers.cloudflare.com, "Publish to a Queue via
 * HTTP"). Arrived means the API answered `success: true`. A consumer — a
 * Worker, or an HTTP pull consumer on another machine — takes it from there,
 * and deduplicates by the message's `idempotency_key`.
 */
export function cloudflareQueuesPublisher(options: CloudflareQueuesOptions): Publisher {
  const send = options.fetch ?? fetch;
  const base = (options.apiBase ?? 'https://api.cloudflare.com/client/v4').replace(/\/+$/, '');
  const url = `${base}/accounts/${encodeURIComponent(options.accountId)}/queues/${encodeURIComponent(options.queueId)}/messages`;
  return {
    name: options.name ?? 'cloudflare-queues',
    guarantees: {
      acknowledgement: 'The Queues API answered 2xx with `success: true`: the message is in the queue.',
      ordering: 'The wheel sends in log order. Delivery order to consumers is not promised by this adapter.',
      retention: 'Up to 24 hours on the Workers free plan, up to 14 days on paid plans (Cloudflare changelog, 2026-02-04).',
      replay: `Within the queue, redelivery until acknowledged. ${WHEEL_SIDE}`,
      redelivery: 'At-least-once to a Worker or HTTP pull consumer, retried per the consumer\'s settings.',
      deadLetter: 'A dead-letter queue when the consumer configures one. A refusal by the API is a `refused` receipt here.',
      consumerPosition: 'Cloudflare holds each message until a consumer acknowledges it; the wheel keeps its cursor to the queue.',
    },
    async publish(event) {
      const message = options.format === 'cloudevents' ? toCloudEvent(event) : event;
      let res: Response;
      try {
        res = await send(url, {
          method: 'POST',
          headers: { authorization: `Bearer ${options.token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ body: message }),
          signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
        });
      } catch (error) {
        return unreachable(error);
      }
      const outcome = await outcomeOf(res.clone());
      if (outcome.outcome !== 'arrived') return outcome;
      // A 2xx that does not say success is not proof of storage.
      const answer = (await res.json().catch(() => null)) as { success?: unknown; errors?: unknown } | null;
      if (answer?.success === true) return outcome;
      return { outcome: 'failed', status: res.status, error: `Queues API answered ${res.status} without success: ${JSON.stringify(answer?.errors ?? answer).slice(0, 200)}` };
    },
  };
}
