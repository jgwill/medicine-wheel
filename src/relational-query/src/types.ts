/**
 * medicine-wheel-relational-query — types
 *
 * Query builder types for context-aware relational traversal
 * with Indigenous protocol awareness.
 */
import type {
  DirectionName,
  NodeType,
  CeremonyType,
  RelationalNode,
  RelationalEdge,
  Relation,
} from 'medicine-wheel-ontology-core';

// ─── Query Filters ────────────────────────────────────────────

export interface NodeFilter {
  type?: NodeType | NodeType[];
  direction?: DirectionName | DirectionName[];
  nameContains?: string;
  hasRelationsTo?: string; // node ID
  minRelations?: number;
  createdAfter?: string;
  createdBefore?: string;
}

export interface EdgeFilter {
  relationshipType?: string | string[];
  minStrength?: number;
  ceremonyHonored?: boolean;
  fromNode?: string;
  toNode?: string;
}

export interface RelationFilter {
  direction?: DirectionName;
  ceremonied?: boolean;
  ocapCompliant?: boolean;
  minWilsonAlignment?: number;
  hasObligations?: boolean;
}

// ─── Query Builder ────────────────────────────────────────────

export type SortField = 'name' | 'created_at' | 'updated_at' | 'type' | 'direction';
export type SortOrder = 'asc' | 'desc';

export interface QuerySort {
  field: SortField;
  order: SortOrder;
}

export interface QueryPagination {
  offset: number;
  limit: number;
}

export interface QueryOptions {
  filter?: NodeFilter;
  sort?: QuerySort;
  pagination?: QueryPagination;
  includeEdges?: boolean;
  includeRelations?: boolean;
}

export interface QueryResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// ─── Traversal ────────────────────────────────────────────────

export type TraversalDirection = 'outgoing' | 'incoming' | 'both';

export interface TraversalOptions {
  maxDepth: number;
  direction: TraversalDirection;
  edgeFilter?: EdgeFilter;
  nodeFilter?: NodeFilter;
  /** Stop traversal at nodes without ceremony-honored edges */
  respectCeremonyBoundaries?: boolean;
  /** Only follow OCAP-compliant relations */
  ocapOnly?: boolean;
}

export interface TraversalPath {
  nodes: RelationalNode[];
  edges: RelationalEdge[];
  depth: number;
}

export interface TraversalResult {
  root: RelationalNode;
  paths: TraversalPath[];
  visitedNodes: Set<string>;
  maxDepthReached: boolean;
}

// ─── Accountability Audit ─────────────────────────────────────

export interface AccountabilityReport {
  totalRelations: number;
  ocapCompliant: number;
  ocapNonCompliant: number;
  averageWilsonAlignment: number;
  directionCoverage: Record<DirectionName, number>;
  ceremoniedRelations: number;
  unceremoniedRelations: number;
  obligationsOutstanding: number;
  recommendations: string[];
}
