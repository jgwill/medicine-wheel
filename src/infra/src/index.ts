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
 * Every specification is now shipped: S1 (facets), S3 (`detectPortConflicts`),
 * S4 (`Precondition` / `preconditionGuard` / `readyService`), S5 (`MetisHold`),
 * S6 (`ObservedState` / `reconcile`). S2 — the governed `part-of`,
 * `ordered-after` and `binds-port` edges — landed in `ontology-core`, which is
 * where edge vocabulary belongs; `infra` never forked it.
 *
 * The package remains types plus pure functions. Zero I/O, zero persistence,
 * zero clock: `reconcile` takes `now` as an argument for exactly that reason.
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

export {
  PreconditionKindSchema,
  MachineFactSchema,
  ConsentReferenceSchema,
  PreconditionSchema,
  PreconditionVerdictSchema,
  DriftStateSchema,
  ObservedStateSchema,
} from './schemas';

export type {
  ValidatedMetisHold,
  ValidatedPortBinding,
  ValidatedPortConflict,
  ValidatedHostFacet,
  ValidatedTenantFacet,
  ValidatedServiceFacet,
  ValidatedMachineFact,
  ValidatedConsentReference,
  ValidatedPrecondition,
  ValidatedObservedState,
} from './schemas';

// ── Port-conflict detection (S3) ────────────────────────────────────────────
export { detectPortConflicts } from './ports';

// ── Preconditions (S4) ──────────────────────────────────────────────────────
export {
  preconditionGuard,
  readyService,
  lingerFact,
  AUTHORIZING_CONSENT_STATES,
  CONSENT_REQUIRING_KINDS,
} from './preconditions';

export type {
  PreconditionKind,
  MachineFact,
  ConsentReference,
  Precondition,
  PreconditionVerdict,
  PreconditionResult,
  ServiceReadiness,
} from './preconditions';

// ── Reconciliation (S6) ─────────────────────────────────────────────────────
export { reconcile, DRIFT_STATES } from './reconcile';

export type {
  DriftState,
  ObservedState,
  FieldDifference,
  DriftRow,
  ReconcileResult,
} from './reconcile';
