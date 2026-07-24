/**
 * @medicine-wheel/ontology-core
 *
 * Foundational ontology layer for the Medicine Wheel Developer Suite.
 * Unified types, RDF vocabulary, Zod schemas, constants, and semantic
 * query helpers — grounded in Indigenous relational ontology.
 *
 * @packageDocumentation
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  DirectionName,
  Direction,
  NodeType,
  RelationalNode,
  RelationalEdge,
  ObligationCategory,
  RelationalObligation,
  OcapFlags,
  AccountabilityTracking,
  RelationContext,
  Relation,
  CeremonyType,
  CeremonyGuidance,
  CeremonyLog,
  NarrativeBeat,
  BeatOrigin,
  MedicineWheelCycle,
  TensionPhase,
  StructuralTensionChart,
  ActionStep,
  DirectionResponse,
  MWTool,
  MWResource,
  MWPrompt,
  // Epistemic & axiological types
  EpistemicSource,
  AxiologicalPillar,
  // Specialized relation subtypes
  LandRelation,
  AncestorRelation,
  FutureRelation,
  CosmicRelation,
  // Production (film & media) relation subtype — additive
  ProductionEntityKind,
  ProductionRelation,
  // RSIS types
  SunName,
  CeremonyPhase,
  GovernanceAccess,
  PersonRole,
  RSISRelationType,
  GovernanceProtectedPath,
  GovernanceConfig,
  RSISConfig,
  KinshipHubInfo,
  KinshipRelation,
  ReciprocityFlow,
  ReciprocityBalance,
  CeremonyLineageEntry,
  DirectionDetail,
  DirectionDistribution,
  DirectionInfo,
  MedicineWheelView,
} from './types';

// ── Kinship Edge Vocabulary ─────────────────────────────────────────────────
export type { KinshipEdgeType, KinshipEdgeName, EdgeSymmetry } from './kinship';
export {
  KINSHIP_EDGE_TYPES,
  KINSHIP_EDGE_NAMES,
  getKinshipEdgeType,
  isKinshipEdgeName,
  inverseEdge,
} from './kinship';

// ── Medicine Wheel Vocabulary (kinship-graph labels) ────────────────────────
export {
  MW_NS, IDS_NS, OCAP_NS, REL_NS, CER_NS, BEAT_NS,
  MW, CER, OCAP, REL, IDS, BEAT,
} from './vocabulary';

// ── RDF Interop Adapter (OPTIONAL — the kinship graph is primary) ───────────
// RDF/OWL is no longer the backbone; it is an optional serialization adapter.
export * as rdfInterop from './rdf-interop';
// Back-compat named re-exports, now sourced from the adapter.
export {
  RDF_NS, RDFS_NS, OWL_NS, SKOS_NS, PROV_NS, SHACL_NS,
  PREFIXES,
  prefixed, expandIRI, compactIRI,
} from './rdf-interop';

// ── Constants ───────────────────────────────────────────────────────────────
export {
  DIRECTIONS,
  DIRECTION_COLORS,
  NODE_TYPE_COLORS,
  CEREMONY_ICONS,
  DIRECTION_MAP,
  DIRECTION_NAMES,
  NODE_TYPES,
  CEREMONY_TYPES,
  OJIBWE_NAMES,
  DIRECTION_SEASONS,
  DIRECTION_ACTS,
  ACT_DIRECTIONS,
  // RSIS constants
  SUN_NAMES,
  SUN_DESCRIPTIONS,
  CEREMONY_PHASES,
  CEREMONY_PHASE_DESCRIPTIONS,
  PERSON_ROLES,
  RSIS_RELATION_TYPES,
  GOVERNANCE_ACCESS_LEVELS,
  DIRECTION_INFO,
} from './constants';

// ── Zod Schemas ─────────────────────────────────────────────────────────────
export {
  DirectionNameSchema,
  NodeTypeSchema,
  CeremonyTypeSchema,
  ObligationCategorySchema,
  TensionPhaseSchema,
  EpistemicSourceSchema,
  AxiologicalPillarSchema,
  ConsentStateSchema,
  AccessLevelSchema,
  PossessionLocationSchema,
  KinshipEdgeNameSchema,
  KinshipEdgeTypeSchema,
  DirectionSchema,
  RelationalNodeSchema,
  RelationalEdgeSchema,
  RelationalObligationSchema,
  OcapFlagsSchema,
  AccountabilityTrackingSchema,
  CeremonyContextSchema,
  RelationContextSchema,
  RelationSchema,
  CeremonyGuidanceSchema,
  CeremonyLogSchema,
  NarrativeBeatSchema,
  BeatOriginSchema,
  MedicineWheelCycleSchema,
  ActionStepSchema,
  StructuralTensionChartSchema,
  DirectionResponseSchema,
} from './schemas';

// Re-export validated types
export type {
  ValidatedDirection,
  ValidatedRelationalNode,
  ValidatedRelationalEdge,
  ValidatedRelation,
  ValidatedOcapFlags,
  ValidatedAccountabilityTracking,
  ValidatedCeremonyLog,
  ValidatedNarrativeBeat,
  ValidatedMedicineWheelCycle,
  ValidatedStructuralTensionChart,
} from './schemas';

// ── Semantic Query Helpers ──────────────────────────────────────────────────
export {
  nodesByDirection,
  nodesByType,
  nodeById,
  relationsForNode,
  relationsByType,
  neighborIds,
  traverseRelationalWeb,
  computeWilsonAlignment,
  aggregateWilsonAlignment,
  cycleWilsonAlignment,
  findAccountabilityGaps,
  checkOcapCompliance,
  auditOcapCompliance,
  beatsByDirection,
  beatsByAct,
  allDirectionsVisited,
  ceremoniesByDirection,
  ceremonyCounts,
  relationalCompleteness,
} from './queries';
