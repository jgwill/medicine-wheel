/**
 * @medicine-wheel/capabilities
 *
 * The platform-features and capabilities layer of the Medicine Wheel Developer
 * Suite: what the platform can do for someone, which repositories and services
 * give it, and who said so. A sibling of `@medicine-wheel/infra`, built the
 * same way: a `metadata.kind` discriminator in `ontology-core`
 * (`DEVELOPER_ENTITY_BINDING`), typed facets keyed by node id, Zod schemas at
 * the boundary, pure functions.
 *
 * `@medicine-wheel/developer-repository-mapping` consumes it: a feature
 * observed in a repository `realizes` a capability, and a repository
 * `provides` one.
 *
 * Zero I/O, zero persistence, zero clock.
 *
 * @packageDocumentation
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  NodeId,
  StatementStatus,
  RevisionState,
  Attribution,
  CapabilityFacet,
  CapabilityClaim,
  SharedCapability,
} from './types';

export { STATEMENT_WORD_LIMIT } from './types';

// ── The word limit ──────────────────────────────────────────────────────────
export { countWords, checkStatement, isSlug, capabilityNodeId } from './statement';
export type { StatementCheck } from './statement';

// ── Zod schemas ─────────────────────────────────────────────────────────────
export {
  StatementStatusSchema,
  RevisionStateSchema,
  TimestampSchema,
  StatementSchema,
  attributionShape,
  refineAttribution,
  refineStatementPresence,
  CapabilityNodeIdSchema,
  CapabilityFacetSchema,
} from './schemas';

export type { ValidatedCapabilityFacet } from './schemas';

// ── Shared capabilities ─────────────────────────────────────────────────────
export { capabilityClaims, findSharedCapabilities } from './shared';
