/**
 * @medicine-wheel/infra
 *
 * Typed infrastructure facets for the Medicine Wheel Developer Suite — a home
 * for the machine specifics (`port`, `unit`, `linger`) that otherwise leak into
 * `metadata: Record<string, unknown>`.
 *
 * A new sibling package built **on** `ontology-core`, exactly as
 * `consent-lifecycle` and `transformation-tracker` are. It changes no published
 * package: the closed `NodeType` union is reused, never widened, and facets are
 * keyed by node id rather than re-declaring nodes.
 *
 * Scope of `0.1.0` — S1, S3, S5 only. `Precondition` / `preconditionGuard` /
 * `readyService` are `0.2.0` (S4); `reconcile()` / `ObservedState` are `0.3.0`
 * (S6). Neither is shipped here.
 *
 * @packageDocumentation
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  NodeId,
  MetisHold,
  LingerState,
  Reachability,
  PortProto,
  ServiceScope,
  HostFacet,
  TenantFacet,
  ServiceFacet,
  PortBinding,
  PortConflict,
  FacetKind,
} from './types';

export { DEFAULT_PORT_PROTO, FACET_NODE_TYPES } from './types';

// ── Zod schemas ─────────────────────────────────────────────────────────────
export {
  MetisHoldSchema,
  LingerStateSchema,
  ReachabilitySchema,
  PortProtoSchema,
  ServiceScopeSchema,
  PortNumberSchema,
  PortBindingSchema,
  PortConflictSchema,
  HostFacetSchema,
  TenantFacetSchema,
  ServiceFacetSchema,
} from './schemas';

export type {
  ValidatedMetisHold,
  ValidatedPortBinding,
  ValidatedPortConflict,
  ValidatedHostFacet,
  ValidatedTenantFacet,
  ValidatedServiceFacet,
} from './schemas';

// ── Port-conflict detection ─────────────────────────────────────────────────
export { detectPortConflicts } from './ports';
