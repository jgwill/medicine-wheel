/**
 * The catalog as documents a consumer in any language can read.
 *
 * - {@link wheelEventsJsonSchema}: one JSON Schema (draft-07) that validates
 *   any wheel event — the envelope, plus each event's `event_type`, subject
 *   kind and payload.
 * - {@link asyncApiDocument}: an AsyncAPI 3.0 document with one channel per
 *   event, addressed by its topic (`medicine-wheel.cycle.opened`). AsyncAPI is
 *   to event-driven systems what OpenAPI is to HTTP: tools read it to render
 *   documentation and generate consumers. It names no server, because no
 *   broker has been chosen.
 *
 * Both are generated from the catalog and written to `schema/` at build time.
 * Draft-07 because AsyncAPI's schema format is a superset of it.
 */

import { CATALOG_VERSION, WHEEL_EVENT_CATALOG, WHEEL_EVENTS, type PayloadField, type WheelEventName } from './catalog';
import { EVENT_NAMESPACE, EVENT_SCHEMA_VERSION } from './envelope';

type Schema = Record<string, unknown>;

const SUBJECT_KINDS = ['cycle', 'beat', 'ceremony', 'diary', 'node', 'relation'];

/** `chronicle.episode.registered` → `chronicleEpisodeRegistered`: an id every tool accepts. */
export function schemaId(name: string): string {
  return name.split(/[.]/).map((part, i) => {
    const camel = part.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    return i === 0 ? camel : camel.charAt(0).toUpperCase() + camel.slice(1);
  }).join('');
}

/** The envelope every event shares, without its event-specific constraints. */
export function envelopeJsonSchema(): Schema {
  return {
    title: 'MiadiEventEnvelope (Medicine Wheel)',
    description: `A Medicine Wheel event in jgwill/Miadi's MiadiEventEnvelope ${EVENT_SCHEMA_VERSION}. The payload carries references and labels, never a person's words.`,
    type: 'object',
    required: ['id', 'schema_version', 'event_type', 'source', 'subject', 'occurred_at', 'observed_at', 'idempotency_key', 'privacy', 'payload'],
    properties: {
      id: { type: 'string', pattern: '^mwev:', description: 'Stable identity of this occurrence.' },
      schema_version: { type: 'string', const: EVENT_SCHEMA_VERSION },
      event_type: { type: 'string', pattern: `^${EVENT_NAMESPACE.replace(/[-.]/g, '\\$&')}\\.`, description: 'The namespaced event name; also its topic.' },
      source: {
        type: 'object',
        required: ['kind', 'system'],
        properties: {
          kind: { type: 'string', const: 'miadi' },
          system: { type: 'string', const: EVENT_NAMESPACE },
          instance: { type: 'string', description: 'The wheel that observed it, as configured (MW_INSTANCE).' },
        },
      },
      subject: {
        type: 'object',
        required: ['kind', 'id'],
        properties: {
          kind: { type: 'string', enum: SUBJECT_KINDS },
          id: { type: 'string', minLength: 1, description: 'The record the event is about; read it back from the wheel by this id.' },
        },
      },
      occurred_at: { type: 'string', format: 'date-time' },
      observed_at: { type: 'string', format: 'date-time' },
      actor: {
        type: 'object',
        required: ['kind'],
        properties: { kind: { type: 'string' }, id: { type: 'string' } },
        description: 'Who acted, when the record names them: a speaker, a participant, a source, a judge.',
      },
      correlation_id: { type: 'string', description: 'Groups related events: a cycle and the beats recorded in it, a ceremony and its closing.' },
      causation_id: { type: 'string', description: 'The event that directly led to this one.' },
      idempotency_key: { type: 'string', description: 'Equal to id. A resend is the same occurrence.' },
      privacy: {
        type: 'object',
        required: ['classification', 'content_included'],
        properties: { classification: { type: 'string' }, content_included: { type: 'boolean' } },
      },
      payload: { type: 'object' },
    },
  };
}

function fieldSchema(field: PayloadField): Schema {
  const base = field.type === 'string[]' ? { type: 'array', items: { type: 'string' } } : { type: field.type };
  return { ...base, description: field.description };
}

/** The payload of one event: its fields, with the required ones required. Extra fields are allowed, so a consumer survives a catalog that grows. */
export function payloadJsonSchema(name: WheelEventName): Schema {
  const fields = WHEEL_EVENT_CATALOG[name].payload as Record<string, PayloadField>;
  const required = Object.entries(fields).filter(([, f]) => f.required).map(([k]) => k);
  return {
    type: 'object',
    properties: Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, fieldSchema(f)])),
    ...(required.length ? { required } : {}),
  };
}

/** One event: the envelope (by reference) narrowed to this `event_type`, subject kind and payload. */
export function eventJsonSchema(name: WheelEventName, envelopeRef: string): Schema {
  const def = WHEEL_EVENT_CATALOG[name];
  return {
    title: `${EVENT_NAMESPACE}.${name}`,
    description: [def.summary, `Written by: ${def.writtenBy}.`, 'correlation' in def ? `Correlation: ${def.correlation}.` : '']
      .filter(Boolean).join(' '),
    allOf: [
      { $ref: envelopeRef },
      {
        properties: {
          event_type: { const: `${EVENT_NAMESPACE}.${name}` },
          subject: { properties: { kind: { const: def.subject } } },
          payload: payloadJsonSchema(name),
        },
      },
    ],
  };
}

/** One JSON Schema (draft-07) that validates any wheel event. */
export function wheelEventsJsonSchema(): Schema {
  const ref = '#/definitions/envelope';
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Medicine Wheel events',
    description: `Every event a Medicine Wheel writes to events.jsonl and will publish. Catalog ${CATALOG_VERSION}, envelope MiadiEventEnvelope ${EVENT_SCHEMA_VERSION}.`,
    definitions: {
      envelope: envelopeJsonSchema(),
      ...Object.fromEntries(WHEEL_EVENTS.map((name) => [schemaId(name), eventJsonSchema(name, ref)])),
    },
    oneOf: WHEEL_EVENTS.map((name) => ({ $ref: `#/definitions/${schemaId(name)}` })),
  };
}

/** An AsyncAPI 3.0 document: one channel per event, the wheel as its sender. */
export function asyncApiDocument(): Schema {
  const ref = '#/components/schemas/envelope';
  const channels: Schema = {};
  const operations: Schema = {};
  const messages: Schema = {};
  const schemas: Schema = { envelope: envelopeJsonSchema() };
  for (const name of WHEEL_EVENTS) {
    const id = schemaId(name);
    const def = WHEEL_EVENT_CATALOG[name];
    schemas[id] = eventJsonSchema(name, ref);
    messages[id] = {
      name: `${EVENT_NAMESPACE}.${name}`,
      title: name,
      summary: def.summary,
      contentType: 'application/json',
      payload: { $ref: `#/components/schemas/${id}` },
    };
    channels[id] = {
      address: `${EVENT_NAMESPACE}.${name}`,
      description: `${def.summary} Written by: ${def.writtenBy}.`,
      messages: { [id]: { $ref: `#/components/messages/${id}` } },
    };
    operations[id] = {
      action: 'send',
      summary: def.summary,
      channel: { $ref: `#/channels/${id}` },
      messages: [{ $ref: `#/channels/${id}/messages/${id}` }],
    };
  }
  return {
    asyncapi: '3.0.0',
    info: {
      title: 'Medicine Wheel events',
      version: CATALOG_VERSION,
      description:
        'The events a Medicine Wheel writes beside its store (events.jsonl) and publishes once a broker is chosen ' +
        '(miadi-chronicle://548). Each message is a MiadiEventEnvelope whose payload names records and carries labels; ' +
        'a consumer reads the record back from the wheel by subject.id. Package: @medicine-wheel/events.',
    },
    defaultContentType: 'application/json',
    channels,
    operations,
    components: { schemas, messages },
  };
}
