/**
 * @medicine-wheel/events
 *
 * The events a Medicine Wheel writes when something happens on it — a cycle
 * opened, a beat recorded, a ceremony closed, a relation woven — as one
 * catalog, its envelope, and the decision of which event a write is.
 *
 * - The catalog ({@link WHEEL_EVENT_CATALOG}) is the contract. Payload types,
 *   the JSON Schema and the AsyncAPI document are derived from it; the latter
 *   two ship as files in `schema/` for consumers outside JavaScript.
 * - Events travel in jgwill/Miadi's `MiadiEventEnvelope` 0.1.0.
 * - The deciders (`cycleWritten`, `nodeWritten`, …) are shared by every
 *   writer, so the same act leaves the same event whichever door it used.
 *
 * This entry is pure and browser-safe. The log on disk is
 * `@medicine-wheel/events/log`; sending it somewhere is
 * `@medicine-wheel/events/publish`.
 */

export {
  CATALOG_VERSION,
  WHEEL_EVENT_CATALOG,
  WHEEL_EVENTS,
  familyOf,
  type EventDefinition,
  type PayloadField,
  type PayloadOf,
  type WheelEventName,
  type WheelSubjectKind,
} from './catalog';

export {
  EVENT_NAMESPACE,
  EVENT_SCHEMA_VERSION,
  buildEvent,
  filterEvents,
  isWheelEvent,
  shortName,
  type BuildOptions,
  type EventFilter,
  type WheelEvent,
  type WheelEventInput,
} from './envelope';

export {
  BEAT_CONTENT_FIELDS,
  beatWitnessed,
  beatWritten,
  ceremonyRemoved,
  ceremonyWritten,
  changedFields,
  conclusionJudged,
  cycleWritten,
  diaryRemoved,
  diaryWritten,
  isLineage,
  nodeChanges,
  nodeFamily,
  nodeRemoved,
  nodeWritten,
  relationId,
  relationRemoved,
  relationWritten,
  type BeatLike,
  type CeremonyLike,
  type CycleLike,
  type DiaryLike,
  type NodeFamily,
  type NodeLike,
  type RelationEnds,
  type RelationLike,
} from './decide';

export {
  asyncApiDocument,
  envelopeJsonSchema,
  eventJsonSchema,
  payloadJsonSchema,
  schemaId,
  wheelEventsJsonSchema,
} from './schema';
