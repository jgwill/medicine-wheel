/**
 * @medicine-wheel/relational-query
 *
 * Query builder, graph traversal, and accountability audit
 * for the Medicine Wheel relational web.
 */

// Types
export type {
  NodeFilter,
  EdgeFilter,
  RelationFilter,
  SortField,
  SortOrder,
  QuerySort,
  QueryPagination,
  QueryOptions,
  QueryResult,
  TraversalDirection,
  TraversalOptions,
  TraversalPath,
  TraversalResult,
  AccountabilityReport,
} from './types.js';

// Protocol guards (avoidance protocols)
export type {
  TraversalContext,
  GuardDecision,
  ProtocolGuard,
  GuardEscalation,
} from './guards.js';
export {
  ceremonyBoundaryGuard,
  ocapComplianceGuard,
  avoidanceProtocolGuard,
  evaluateGuards,
} from './guards.js';

// Query builder
export {
  filterNodes,
  filterEdges,
  filterRelations,
  sortNodes,
  paginate,
  filterByRelation,
  relationCounts,
  filterByMinRelations,
} from './query.js';

// Traversal
export {
  traverse,
  shortestPath,
  neighborhood,
} from './traversal.js';

// Audit
export {
  auditAccountability,
  isOcapCompliant,
  relationsNeedingAttention,
} from './audit.js';

// Cypher query builders (for RSIS-GitNexus KuzuDB queries)
export {
  queryStewards,
  queryCeremonyProvenance,
  queryInquiries,
  queryKinshipHubs,
  queryKinshipRelations,
  queryDirectionAlignment,
  queryReciprocityFlows,
  queryInquiriesBySun,
  queryCeremonies,
  queryAllInquiries,
  formatReciprocityObservation,
  formatDirectionObservation,
} from './cypher.js';

// RDF → flat kinship-graph migration
export type { RdfTriple, MigrationOptions, KinshipGraph } from './migrate.js';
export {
  rdfToKinshipGraph,
  kinshipGraphToCypher,
  kinshipGraphToJsonl,
  localName,
} from './migrate.js';
