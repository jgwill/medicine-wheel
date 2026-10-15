/**
 * Sending the log somewhere — the seam a broker will plug into.
 *
 * Episode 548 draws an event's path as Named → Sent → Arrived | Failed →
 * Replayed. Here: an event in `events.jsonl` is Named. {@link drainLog} Sends
 * each one after a publisher's cursor, in log order, and writes what came back
 * to `events-receipts.jsonl`: `arrived`, `failed` (may arrive later — the pass
 * stops and the next one starts from the same event), or `refused` (the
 * receiver's answer to this event as shaped — recorded and passed, so one bad
 * event does not hold every later one). {@link rewind} is Replay: the cursor
 * moves back and the same lines, with the same idempotency keys, are sent again.
 *
 * Each publisher keeps its own cursor (`events-cursor.<name>.json`), so a
 * second destination starts from the beginning without disturbing the first.
 * The log itself is never changed.
 *
 * {@link httpPublisher} is the one adapter today: a POST of the envelope as
 * JSON, which a webhook endpoint, a Hookdeck source, a Cloudflare Worker in
 * front of a queue, or the Miadi hooks-gateway can each receive. A broker
 * client is another `Publisher` beside it, not a change to the log.
 *
 * Node only — import it as `@medicine-wheel/events/publish`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { WheelEvent } from './envelope';
import { readEventLog } from './log';

export type PublishOutcome =
  | { outcome: 'arrived'; status?: number }
  | { outcome: 'failed'; status?: number; error: string }
  | { outcome: 'refused'; status?: number; error: string };

export interface Publisher {
  /** Names the cursor and the receipts: `http`, `nats`, `hookdeck`. */
  name: string;
  publish(event: WheelEvent): Promise<PublishOutcome>;
}

export interface Receipt {
  event_id: string;
  event_type: string;
  publisher: string;
  outcome: PublishOutcome['outcome'];
  at: string;
  status?: number;
  error?: string;
}

// ── the HTTP adapter ────────────────────────────────────────────────────────

export interface HttpPublisherOptions {
  url: string;
  /** Sent as `Authorization: Bearer <token>`. */
  token?: string;
  name?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

/**
 * POST each envelope as JSON, with `Idempotency-Key` and `X-Event-Type`.
 * 2xx arrived. Unreachable, timed out, 408, 429 or 5xx failed — may arrive
 * later. Any other answer is refused.
 */
export function httpPublisher(options: HttpPublisherOptions): Publisher {
  const send = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  return {
    name: options.name ?? 'http',
    async publish(event) {
      let res: Response;
      try {
        res = await send(options.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': event.idempotency_key,
            'x-event-type': event.event_type,
            ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
          },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        return { outcome: 'failed', error: (error as Error)?.message ?? String(error) };
      }
      if (res.ok) return { outcome: 'arrived', status: res.status };
      const body = await res.text().catch(() => '');
      const error = `HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`;
      const later = res.status >= 500 || res.status === 408 || res.status === 429;
      return { outcome: later ? 'failed' : 'refused', status: res.status, error };
    },
  };
}

// ── state beside the log ────────────────────────────────────────────────────

/**
 * Where a publisher keeps its cursor and receipts: beside the log, or in
 * `stateDir` — a follower reading someone else's checkout keeps its own state
 * out of it.
 */
export interface StateOptions {
  stateDir?: string;
}

const stateDirOf = (logFile: string, options?: StateOptions) => options?.stateDir ?? path.dirname(logFile);

export function cursorPath(logFile: string, publisher: string, options?: StateOptions): string {
  return path.join(stateDirOf(logFile, options), `events-cursor.${publisher}.json`);
}

export function receiptsPath(logFile: string, options?: StateOptions): string {
  return path.join(stateDirOf(logFile, options), 'events-receipts.jsonl');
}

export interface Cursor {
  /** The last event this publisher is done with — arrived or refused. Absent: nothing yet. */
  last_event_id?: string;
  at?: string;
}

export function readCursor(logFile: string, publisher: string, options?: StateOptions): Cursor {
  try {
    return JSON.parse(fs.readFileSync(cursorPath(logFile, publisher, options), 'utf-8')) as Cursor;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

function writeCursor(logFile: string, publisher: string, cursor: Cursor, options?: StateOptions): void {
  const file = cursorPath(logFile, publisher, options);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cursor) + '\n');
  fs.renameSync(tmp, file);
}

function appendReceipt(logFile: string, receipt: Receipt, options?: StateOptions): void {
  const file = receiptsPath(logFile, options);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(receipt) + '\n');
}

/** Receipts, oldest first, optionally for one publisher. */
export function readReceipts(logFile: string, publisher?: string, options?: StateOptions): Receipt[] {
  let text: string;
  try {
    text = fs.readFileSync(receiptsPath(logFile, options), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const receipts: Receipt[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as Receipt;
      if (typeof r.event_id === 'string' && (!publisher || r.publisher === publisher)) receipts.push(r);
    } catch {
      // torn line
    }
  }
  return receipts;
}

/** Index of the first event this publisher still owes. A cursor naming an event the log no longer holds starts over. */
function startIndex(events: WheelEvent[], cursor: Cursor): number {
  if (!cursor.last_event_id) return 0;
  const at = events.findIndex((e) => e.id === cursor.last_event_id);
  return at + 1;
}

// ── draining ────────────────────────────────────────────────────────────────

export interface DrainResult {
  publisher: string;
  arrived: number;
  refused: number;
  /** True when the pass stopped on an event that may arrive later. */
  stopped: boolean;
  /** Events still owed after this pass. */
  pending: number;
  error?: string;
}

/** Send what this publisher still owes, oldest first, until it is all sent or a send fails. */
export async function drainLog(logFile: string, publisher: Publisher, options?: StateOptions): Promise<DrainResult> {
  const events = readEventLog(logFile);
  let index = startIndex(events, readCursor(logFile, publisher.name, options));
  const result: DrainResult = { publisher: publisher.name, arrived: 0, refused: 0, stopped: false, pending: 0 };
  for (; index < events.length; index++) {
    const event = events[index];
    let outcome: PublishOutcome;
    try {
      outcome = await publisher.publish(event);
    } catch (error) {
      outcome = { outcome: 'failed', error: (error as Error)?.message ?? String(error) };
    }
    const at = new Date().toISOString();
    appendReceipt(logFile, {
      event_id: event.id,
      event_type: event.event_type,
      publisher: publisher.name,
      outcome: outcome.outcome,
      at,
      ...(outcome.status !== undefined ? { status: outcome.status } : {}),
      ...('error' in outcome ? { error: outcome.error } : {}),
    }, options);
    if (outcome.outcome === 'failed') {
      result.stopped = true;
      result.error = outcome.error;
      break;
    }
    if (outcome.outcome === 'arrived') result.arrived++;
    else result.refused++;
    writeCursor(logFile, publisher.name, { last_event_id: event.id, at }, options);
  }
  result.pending = events.length - index;
  return result;
}

/**
 * Replay: move this publisher's cursor so the next pass sends `fromEventId`
 * and everything after it again — or the whole log when no id is given. The
 * lines and their idempotency keys are the same; a receiver that keeps keys
 * recognises them. Returns how many events the next pass will send.
 */
export function rewind(logFile: string, publisher: string, fromEventId?: string, options?: StateOptions): { pending: number } {
  const events = readEventLog(logFile);
  if (fromEventId === undefined) {
    writeCursor(logFile, publisher, { at: new Date().toISOString() }, options);
    return { pending: events.length };
  }
  const at = events.findIndex((e) => e.id === fromEventId);
  if (at < 0) throw new Error(`No event ${fromEventId} in ${logFile}`);
  writeCursor(logFile, publisher, { ...(at > 0 ? { last_event_id: events[at - 1].id } : {}), at: new Date().toISOString() }, options);
  return { pending: events.length - at };
}

export interface PublisherStatus {
  publisher: string;
  pending: number;
  last_event_id?: string;
  last_arrived_at?: string;
  last_failure?: { at: string; event_id: string; error?: string };
}

/** Where a publisher stands: how much it owes, what last arrived, what last failed. */
export function publisherStatus(logFile: string, publisher: string, options?: StateOptions): PublisherStatus {
  const events = readEventLog(logFile);
  const cursor = readCursor(logFile, publisher, options);
  const receipts = readReceipts(logFile, publisher, options);
  const lastArrived = [...receipts].reverse().find((r) => r.outcome === 'arrived');
  const lastFailure = [...receipts].reverse().find((r) => r.outcome === 'failed');
  return {
    publisher,
    pending: events.length - startIndex(events, cursor),
    ...(cursor.last_event_id ? { last_event_id: cursor.last_event_id } : {}),
    ...(lastArrived ? { last_arrived_at: lastArrived.at } : {}),
    ...(lastFailure && (!lastArrived || lastFailure.at > lastArrived.at)
      ? { last_failure: { at: lastFailure.at, event_id: lastFailure.event_id, ...(lastFailure.error ? { error: lastFailure.error } : {}) } }
      : {}),
  };
}
