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
  Relation,
  CeremonyType,
  CeremonyGuidance,
  CeremonyLog,
  NarrativeBeat,
  MedicineWheelCycle,
  TensionPhase,
  StructuralTensionChart,
  ActionStep,
  DirectionResponse,
  MWTool,
  MWResource,
  MWPrompt,
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
} from './types.js';

// ── RDF Vocabulary ──────────────────────────────────────────────────────────
export {
  MW_NS, IDS_NS, OCAP_NS, REL_NS, CER_NS, BEAT_NS,
  RDF_NS, RDFS_NS, OWL_NS, SKOS_NS, PROV_NS, SHACL_NS,
  PREFIXES,
  MW, CER, OCAP, REL, IDS, BEAT,
  prefixed, expandIRI, compactIRI,
} from './vocabulary.js';

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
} from './constants.js';

// ── Zod Schemas ─────────────────────────────────────────────────────────────
export {
  DirectionNameSchema,
  NodeTypeSchema,
  CeremonyTypeSchema,
  ObligationCategorySchema,
  TensionPhaseSchema,
  AccessLevelSchema,
  PossessionLocationSchema,
  DirectionSchema,
  RelationalNodeSchema,
  RelationalEdgeSchema,
  RelationalObligationSchema,
  OcapFlagsSchema,
  AccountabilityTrackingSchema,
  CeremonyContextSchema,
  RelationSchema,
  CeremonyGuidanceSchema,
  CeremonyLogSchema,
  NarrativeBeatSchema,
  MedicineWheelCycleSchema,
  ActionStepSchema,
  StructuralTensionChartSchema,
  DirectionResponseSchema,
} from './schemas.js';

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
} from './schemas.js';

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
} from './queries.js';
