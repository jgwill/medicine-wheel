/**
 * What every broker needs from an event, before any one broker is chosen
 * (#165): which topic it goes to, which key keeps its order, and the
 * CloudEvents form many providers already read.
 *
 * Pure and browser-safe. Provider adapters (`./adapters`) use these; so can a
 * consumer that reads a topic and wants the wheel's envelope back.
 */

import { familyOf } from './catalog';
import { EVENT_NAMESPACE, EVENT_SCHEMA_VERSION, shortName, type WheelEvent } from './envelope';

// ── topics ──────────────────────────────────────────────────────────────────

/**
 * How events are divided into topics (Kafka topics, NATS subjects, queues):
 *
 * - `event`: one topic per event type (`medicine-wheel.cycle.opened`). One
 *   schema per topic, the shape Bellemare recommends for fact streams
 *   (miadi-chronicle://548, Kafka review, 34:00).
 * - `family`: one per family (`medicine-wheel.cycle`, `medicine-wheel.chronicle.lineage`).
 *   A record's opened, amended and archived share one ordered stream, the
 *   shape he recommends when a lifecycle's order matters (35:45).
 * - `subject`: one per subject kind (`medicine-wheel.relation`).
 * - `single`: everything in one topic (`medicine-wheel.events`).
 */
export type TopicScheme = 'event' | 'family' | 'subject' | 'single';

/** Each provider's naming rules. `none` keeps the dotted name. */
export type TopicNaming = 'nats' | 'kafka' | 'cloudflare' | 'none';

export interface TopicOptions {
  scheme?: TopicScheme;
  naming?: TopicNaming;
  /** The single topic's name, for `scheme: 'single'`. */
  single?: string;
}

/**
 * Names as each provider allows them:
 * - NATS: dotted tokens, never empty, without spaces, `*` or `>`.
 * - Kafka: `[a-zA-Z0-9._-]`, at most 249 characters.
 * - Cloudflare Queues: lowercase letters, digits and dashes, at most 63.
 */
export function nameFor(name: string, naming: TopicNaming = 'none'): string {
  switch (naming) {
    case 'nats':
      return name.split('.').map((t) => t.replace(/[\s*>]/g, '_') || '_').join('.');
    case 'kafka':
      return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 249);
    case 'cloudflare':
      return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63);
    default:
      return name;
  }
}

/** The topic an event goes to. */
export function topicFor(event: Pick<WheelEvent, 'event_type' | 'subject'>, options: TopicOptions = {}): string {
  const short = shortName(event.event_type);
  let name: string;
  switch (options.scheme ?? 'event') {
    case 'family':
      name = `${EVENT_NAMESPACE}.${familyOf(short)}`;
      break;
    case 'subject':
      name = `${EVENT_NAMESPACE}.${event.subject.kind}`;
      break;
    case 'single':
      name = options.single ?? `${EVENT_NAMESPACE}.events`;
      break;
    default:
      name = event.event_type;
  }
  return nameFor(name, options.naming);
}

/**
 * The key that keeps related events in order within a partition: the
 * correlation (a cycle and its beats, a ceremony and its closing, an episode
 * and its relations), else the subject.
 */
export function partitionKey(event: Pick<WheelEvent, 'correlation_id' | 'subject'>): string {
  return event.correlation_id ?? event.subject.id;
}

// ── CloudEvents 1.0 ─────────────────────────────────────────────────────────

/**
 * A CloudEvents 1.0 event (CNCF, 2019). The wheel's envelope fields that
 * CloudEvents has no attribute for travel as extension attributes, whose names
 * the specification restricts to lowercase letters and digits.
 */
export interface CloudEvent {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  subject?: string;
  time?: string;
  datacontenttype?: string;
  dataschema?: string;
  data?: unknown;
  [extension: string]: unknown;
}

export interface CloudEventOptions {
  /** A URI for the payload's schema, e.g. the published JSON Schema. */
  dataschema?: string;
}

const EXT = {
  subjectKind: 'mwsubjectkind',
  correlation: 'mwcorrelation',
  causation: 'mwcausation',
  actorKind: 'mwactorkind',
  actor: 'mwactor',
  classification: 'mwclassification',
  contentIncluded: 'mwcontentincluded',
  schemaVersion: 'mwschemaversion',
  occurredAt: 'mwoccurredat',
} as const;

/**
 * The wheel's envelope as a structured CloudEvent: `id`, the source as a URN
 * naming the wheel, `type` the event type, `subject` the record's id, `time`
 * when it was observed, and the payload as `data`.
 */
export function toCloudEvent(event: WheelEvent, options: CloudEventOptions = {}): CloudEvent {
  const ce: CloudEvent = {
    specversion: '1.0',
    id: event.id,
    source: `urn:${EVENT_NAMESPACE}:${event.source.instance ?? 'wheel'}`,
    type: event.event_type,
    subject: event.subject.id,
    time: event.observed_at,
    datacontenttype: 'application/json',
    ...(options.dataschema ? { dataschema: options.dataschema } : {}),
    data: event.payload,
    [EXT.subjectKind]: event.subject.kind,
    [EXT.classification]: event.privacy.classification,
    [EXT.contentIncluded]: event.privacy.content_included,
    [EXT.schemaVersion]: event.schema_version,
  };
  if (event.occurred_at !== event.observed_at) ce[EXT.occurredAt] = event.occurred_at;
  if (event.correlation_id) ce[EXT.correlation] = event.correlation_id;
  if (event.causation_id) ce[EXT.causation] = event.causation_id;
  if (event.actor) {
    ce[EXT.actorKind] = event.actor.kind;
    if (event.actor.id) ce[EXT.actor] = event.actor.id;
  }
  return ce;
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

/** The envelope back from a CloudEvent `toCloudEvent` made, field for field. */
export function fromCloudEvent(ce: CloudEvent): WheelEvent {
  const instance = ce.source.startsWith(`urn:${EVENT_NAMESPACE}:`) ? ce.source.slice(`urn:${EVENT_NAMESPACE}:`.length) : undefined;
  const time = str(ce.time) ?? new Date(0).toISOString();
  const actorKind = str(ce[EXT.actorKind]);
  return {
    id: ce.id,
    schema_version: (str(ce[EXT.schemaVersion]) ?? EVENT_SCHEMA_VERSION) as typeof EVENT_SCHEMA_VERSION,
    event_type: ce.type as WheelEvent['event_type'],
    source: { kind: 'miadi', system: EVENT_NAMESPACE, ...(instance && instance !== 'wheel' ? { instance } : {}) },
    subject: { kind: (str(ce[EXT.subjectKind]) ?? 'node') as WheelEvent['subject']['kind'], id: str(ce.subject) ?? '' },
    occurred_at: str(ce[EXT.occurredAt]) ?? time,
    observed_at: time,
    ...(actorKind ? { actor: { kind: actorKind, ...(str(ce[EXT.actor]) ? { id: str(ce[EXT.actor]) } : {}) } } : {}),
    ...(str(ce[EXT.correlation]) ? { correlation_id: str(ce[EXT.correlation]) } : {}),
    ...(str(ce[EXT.causation]) ? { causation_id: str(ce[EXT.causation]) } : {}),
    idempotency_key: ce.id,
    privacy: { classification: str(ce[EXT.classification]) ?? 'internal', content_included: ce[EXT.contentIncluded] === true },
    payload: (ce.data ?? {}) as WheelEvent['payload'],
  };
}

/**
 * CloudEvents' HTTP binary mode: every attribute except `data` as a `ce-`
 * header, `data` as the body, `datacontenttype` as `content-type`. Header
 * values are strings; a receiver reads `mwcontentincluded` as `"true"`.
 */
export function cloudEventHeaders(ce: CloudEvent): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(ce)) {
    if (key === 'data' || value === undefined) continue;
    if (key === 'datacontenttype') headers['content-type'] = String(value);
    else headers[`ce-${key}`] = String(value);
  }
  return headers;
}
