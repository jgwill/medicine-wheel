/**
 * The envelope every wheel event travels in: jgwill/Miadi's
 * `MiadiEventEnvelope` (rispecs/events/00-miadi-event-spine.rispec.md, 0.1.0),
 * with this wheel as its source. The envelope is the broker-neutral part; the
 * catalog says what each `event_type` means and what its payload holds.
 */

import { WHEEL_EVENT_CATALOG, type PayloadOf, type WheelEventName, type WheelSubjectKind } from './catalog';

/** The `MiadiEventEnvelope` version these events follow. */
export const EVENT_SCHEMA_VERSION = '0.1.0';
export const EVENT_NAMESPACE = 'medicine-wheel';

export interface WheelEvent<N extends WheelEventName = WheelEventName> {
  /** Stable identity of this occurrence: `mwev:<epoch ms>:<hex>`. */
  id: string;
  schema_version: typeof EVENT_SCHEMA_VERSION;
  /** Namespaced: `medicine-wheel.cycle.opened`. */
  event_type: `${typeof EVENT_NAMESPACE}.${N}`;
  source: { kind: 'miadi'; system: typeof EVENT_NAMESPACE; instance?: string };
  subject: { kind: WheelSubjectKind; id: string };
  /** The wheel commits what it reports, so both times are the same moment. */
  occurred_at: string;
  observed_at: string;
  actor?: { kind: string; id?: string };
  correlation_id?: string;
  causation_id?: string;
  /** Equal to `id`: a resend of this line is the same occurrence. */
  idempotency_key: string;
  privacy: { classification: string; content_included: boolean };
  payload: PayloadOf<N>;
}

/** What a producer says about an occurrence; {@link buildEvent} gives it identity and time. */
export interface WheelEventInput<N extends WheelEventName = WheelEventName> {
  name: N;
  subject: { kind: WheelSubjectKind; id: string };
  payload?: PayloadOf<N> | Record<string, unknown>;
  actor?: { kind: string; id?: string };
  correlation_id?: string;
  causation_id?: string;
}

export interface BuildOptions {
  /** The wheel that observed it — a configured name such as `ilex:8040`. */
  instance?: string;
  now?: Date;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Drops keys whose value is undefined, so a payload says only what is known. */
function defined(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
}

/** The envelope for one occurrence. */
export function buildEvent<N extends WheelEventName>(input: WheelEventInput<N>, options: BuildOptions = {}): WheelEvent<N> {
  const definition = WHEEL_EVENT_CATALOG[input.name];
  if (!definition) throw new Error(`Unknown wheel event: ${String(input.name)}`);
  if (definition.subject !== input.subject.kind) {
    throw new Error(`${input.name} is about a ${definition.subject}, not a ${input.subject.kind}`);
  }
  const now = options.now ?? new Date();
  const at = now.toISOString();
  const id = `mwev:${now.getTime()}:${randomHex(4)}`;
  return {
    id,
    schema_version: EVENT_SCHEMA_VERSION,
    event_type: `${EVENT_NAMESPACE}.${input.name}`,
    source: { kind: 'miadi', system: EVENT_NAMESPACE, ...(options.instance ? { instance: options.instance } : {}) },
    subject: input.subject,
    occurred_at: at,
    observed_at: at,
    ...(input.actor?.id ? { actor: input.actor } : {}),
    ...(input.correlation_id ? { correlation_id: input.correlation_id } : {}),
    ...(input.causation_id ? { causation_id: input.causation_id } : {}),
    idempotency_key: id,
    privacy: {
      classification: ('classification' in definition && definition.classification) || 'internal',
      content_included: 'contentIncluded' in definition && definition.contentIncluded === true,
    },
    payload: defined((input.payload ?? {}) as Record<string, unknown>) as PayloadOf<N>,
  };
}

/** `medicine-wheel.cycle.opened` → `cycle.opened`. */
export function shortName(eventType: string): string {
  return eventType.startsWith(`${EVENT_NAMESPACE}.`) ? eventType.slice(EVENT_NAMESPACE.length + 1) : eventType;
}

/** Whether a value has the shape of a wheel event (enough to file and filter it). */
export function isWheelEvent(value: unknown): value is WheelEvent {
  const v = value as Partial<WheelEvent> | null;
  return !!v && typeof v === 'object'
    && typeof v.id === 'string' && typeof v.event_type === 'string' && typeof v.observed_at === 'string'
    && !!v.subject && typeof v.subject.id === 'string';
}

export interface EventFilter {
  /** `cycle.opened` or `medicine-wheel.cycle.opened`; a trailing dot (`cycle.`) takes the family. */
  type?: string;
  /** The subject's id. */
  subject?: string;
  /** The correlation id — a cycle's events and the beats recorded in it. */
  correlation?: string;
  /** Only events observed after this ISO time. */
  since?: string;
}

function typeMatches(eventType: string, wanted: string): boolean {
  const full = wanted.startsWith(`${EVENT_NAMESPACE}.`) ? wanted : `${EVENT_NAMESPACE}.${wanted}`;
  return full.endsWith('.') ? eventType.startsWith(full) : eventType === full;
}

/** Events matching the filter, in the order given. */
export function filterEvents<E extends WheelEvent>(events: E[], filter: EventFilter): E[] {
  const since = filter.since ? Date.parse(filter.since) : NaN;
  return events.filter((e) =>
    (!filter.type || typeMatches(e.event_type, filter.type))
    && (!filter.subject || e.subject.id === filter.subject)
    && (!filter.correlation || e.correlation_id === filter.correlation)
    && (Number.isNaN(since) || Date.parse(e.observed_at) > since));
}
