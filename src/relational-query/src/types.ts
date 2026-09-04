/**
 * @medicine-wheel/relational-query — types
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
} from '@medicine-wheel/ontology-core';
import type { ProtocolGuard, TraversalContext, GuardEscalation } from './guards.js';

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
  /** Stop traversal at nodes without ceremony-honored edges (built-in guard) */
  respectCeremonyBoundaries?: boolean;
  /** Only follow OCAP-compliant relations (built-in guard) */
  ocapOnly?: boolean;
  /** Additional protocol guards evaluated before each edge crossing */
  guards?: ProtocolGuard[];
  /** Runtime context (identity, ceremony state) supplied to the guards */
  context?: TraversalContext;
  /**
   * A node with more than this many relations is **reached but not expanded
   * through**: it appears in the result, and the walk does not continue out of
   * its other edges. Undefined (the default) expands through everything.
   *
   * Some nodes are containers rather than paths. A chronicle root that every
   * episode `belongs_to` has degree 82, so a depth-2 walk from any one episode
   * arrives at the root and leaves again through all 81 others — and returns the
   * whole corpus. Measured on the live wheel: episode 011 has exactly **one**
   * relation, and asking for its 2-hop neighbourhood returned **83 nodes**.
   *
   * That is not a bug in the traversal; the walk is correct. It is that "within
   * N hops" stops meaning "nearby" once a hub exists, and a hub is exactly what
   * a well-connected corpus grows. Suppressing expansion keeps the container
   * visible as a fact about the node while refusing to treat co-membership as
   * proximity.
   */
  maxExpandDegree?: number;
  /**
   * Node kinds (`metadata.kind`) always treated as containers, whatever their
   * degree. Checked before `maxExpandDegree`.
   *
   * Degree is a *proxy* for "this is a container, not a path", and a proxy drifts:
   * on the wheel measured 2026-09-03 the median degree is 2, p99 is 14, and the
   * chronicle root is 82 — a clean gap, and `gaia` at 17 is already closing it, so
   * a threshold correct today is wrong in weeks. The corpus meanwhile spells the
   * thing directly: the root carries `metadata.kind: "chronicle_root"`. Naming the
   * kind says what is meant; the degree stays as a backstop for containers nobody
   * has named yet.
   */
  containerKinds?: string[];
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
  /** Edge crossings a protocol guard refused, surfaced for delegation. */
  escalations: GuardEscalation[];
  /**
   * Containers the walk reached and declined to expand through, with what lies
   * behind each — reported by the traversal that made the decision, never
   * re-derived by a caller.
   *
   * The first version of this feature let the route recompute which nodes had
   * been suppressed, and it got a different answer: the traversal suppresses on
   * *direction-filtered* degree, the route recomputed *undirected whole-store*
   * degree. On the live wheel the chronicle root is out-degree 0 and in-degree
   * 82, so `follow: 'outgoing'` expanded straight through a node the caller was
   * simultaneously told held 82 relations. A disclosure built to prevent a silent
   * lie was itself the lie.
   */
  heldAtHubs: HubHold[];
}

/** One container the walk stopped at, and what it did not bring back. */
export interface HubHold {
  nodeId: string;
  /** Relations in the direction actually being followed — the number the walk used. */
  degree: number;
  /** Why this node was treated as a container. */
  reason: 'kind' | 'degree';
  /** Neighbours behind it that no other path reached. */
  unexpanded: string[];
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
