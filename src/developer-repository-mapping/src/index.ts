/**
 * @medicine-wheel/developer-repository-mapping
 *
 * Repository mapping for the Medicine Wheel Developer Suite: the rows an
 * owner hub (`<owner>/<owner>/.miadi/repository-mapping/`) holds, the
 * lifecycle state machine, the comparison of a declared lifecycle with git,
 * the meta mapping that reads several hubs without copying them, and the
 * projection of a mapping into wheel nodes and edges.
 *
 * Consumes `@medicine-wheel/capabilities` (a feature realizes a capability,
 * every row carries its attribution) and `@medicine-wheel/ontology-core`
 * (`DEVELOPER_ENTITY_BINDING`, the developer kinship edges).
 *
 * This entry point is pure. File, git and HTTP access live in
 * `@medicine-wheel/developer-repository-mapping/node`, and the `mw-repomap`
 * CLI is built on that.
 *
 * Spec: rispecs/developer-suite/repository-mapping/ in jgwill/medicine-wheel.
 *
 * @packageDocumentation
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  Lifecycle,
  LifecycleEvent,
  Origin,
  ActivityClass,
  LifecycleDrift,
  ActivityReading,
  RepositoryFacet,
  FeatureFacet,
  DeveloperEdgeName,
  RelationRow,
  OwnerRegistration,
  MappingManifest,
  RepositoryMapping,
  MappingIssue,
} from './types';

export { MAPPING_DIR, MAPPING_FILES, MAPPING_SCHEMA, PROTOTYPE_CORE_FEATURES } from './types';

// ── Ids ─────────────────────────────────────────────────────────────────────
export {
  REPOSITORY_ID,
  FEATURE_ID,
  RESEARCH_FIELD_ID,
  PROTOTYPE_ID,
  repositoryNodeId,
  parseRepositoryNodeId,
  toRepositoryNodeId,
  featureNodeId,
  featureRepository,
  repositoryUrl,
  parseGithubRemote,
} from './ids';

// ── Zod schemas ─────────────────────────────────────────────────────────────
export {
  LifecycleSchema,
  LifecycleEventSchema,
  OriginSchema,
  DeveloperEdgeNameSchema,
  RepositoryNodeIdSchema,
  FeatureNodeIdSchema,
  ResearchFieldNodeIdSchema,
  PrototypeNodeIdSchema,
  ActivityReadingSchema,
  RepositoryFacetSchema,
  FeatureFacetSchema,
  RelationRowSchema,
  OwnerRegistrationSchema,
  MappingManifestSchema,
} from './schemas';

export type {
  ValidatedActivityReading,
  ValidatedRepositoryFacet,
  ValidatedFeatureFacet,
  ValidatedRelationRow,
  ValidatedOwnerRegistration,
  ValidatedMappingManifest,
} from './schemas';

// ── Lifecycle ───────────────────────────────────────────────────────────────
export {
  LIFECYCLE_TRANSITIONS,
  ACTIVITY_THRESHOLDS,
  transition,
  daysSinceLastCommit,
  classifyActivity,
  reconcileLifecycle,
} from './lifecycle';

export type { TransitionResult, ActivityThresholds, LifecycleReading } from './lifecycle';

// ── Reading and checking ────────────────────────────────────────────────────
export { parseJsonl, parseJsonDocument, toJsonl } from './jsonl';
export type { ParsedRows } from './jsonl';

export { checkMapping, hasErrors, relationKey } from './check';
export type { CheckOptions } from './check';

// ── The meta mapping ────────────────────────────────────────────────────────
export { mergeMappings } from './merge';
export type { HubReading, MergedMapping } from './merge';

// ── Summary and the wheel ───────────────────────────────────────────────────
export { summarize, mappingCapabilityClaims } from './summary';
export type { MappingSummary } from './summary';

export { toWheelNodes, toWheelEdges } from './wheel';

// ── Reading a folder through any reader ─────────────────────────────────────
export { readMapping } from './read';
export type { MappingReader, MappingRead } from './read';
