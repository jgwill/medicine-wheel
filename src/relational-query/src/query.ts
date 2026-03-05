/**
 * Query Builder — fluent API for querying relational nodes and edges
 * with Indigenous protocol awareness.
 */
import type { RelationalNode, RelationalEdge, Relation } from 'medicine-wheel-ontology-core';
import type {
  NodeFilter,
  EdgeFilter,
  RelationFilter,
  QuerySort,
  QueryPagination,
  QueryResult,
} from './types.js';

/** Apply a NodeFilter to an array of nodes */
export function filterNodes(
  nodes: RelationalNode[],
  filter: NodeFilter,
): RelationalNode[] {
  let result = [...nodes];

  if (filter.type) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type];
    result = result.filter(n => types.includes(n.type));
  }

  if (filter.direction) {
    const dirs = Array.isArray(filter.direction) ? filter.direction : [filter.direction];
    result = result.filter(n => n.direction && dirs.includes(n.direction));
  }

  if (filter.nameContains) {
    const term = filter.nameContains.toLowerCase();
    result = result.filter(n => n.name.toLowerCase().includes(term));
  }

  if (filter.createdAfter) {
    result = result.filter(n => n.created_at >= filter.createdAfter!);
  }

  if (filter.createdBefore) {
    result = result.filter(n => n.created_at <= filter.createdBefore!);
  }

  return result;
}

/** Apply an EdgeFilter to an array of edges */
export function filterEdges(
  edges: RelationalEdge[],
  filter: EdgeFilter,
): RelationalEdge[] {
  let result = [...edges];

  if (filter.relationshipType) {
    const types = Array.isArray(filter.relationshipType) ? filter.relationshipType : [filter.relationshipType];
    result = result.filter(e => types.includes(e.relationship_type));
  }

  if (filter.minStrength !== undefined) {
    result = result.filter(e => e.strength >= filter.minStrength!);
  }

  if (filter.ceremonyHonored !== undefined) {
    result = result.filter(e => e.ceremony_honored === filter.ceremonyHonored);
  }

  if (filter.fromNode) {
    result = result.filter(e => e.from_id === filter.fromNode);
  }

  if (filter.toNode) {
    result = result.filter(e => e.to_id === filter.toNode);
  }

  return result;
}

/** Apply sorting to nodes */
export function sortNodes(
  nodes: RelationalNode[],
  sort: QuerySort,
): RelationalNode[] {
  const sorted = [...nodes];
  const multiplier = sort.order === 'desc' ? -1 : 1;

  sorted.sort((a, b) => {
    let aVal: string, bVal: string;
    switch (sort.field) {
      case 'name':
        aVal = a.name; bVal = b.name; break;
      case 'type':
        aVal = a.type; bVal = b.type; break;
      case 'direction':
        aVal = a.direction ?? ''; bVal = b.direction ?? ''; break;
      case 'updated_at':
        aVal = a.updated_at; bVal = b.updated_at; break;
      default:
        aVal = a.created_at; bVal = b.created_at;
    }
    return aVal.localeCompare(bVal) * multiplier;
  });

  return sorted;
}

/** Apply pagination */
export function paginate<T>(
  items: T[],
  pagination: QueryPagination,
): QueryResult<T> {
  const total = items.length;
  const paged = items.slice(pagination.offset, pagination.offset + pagination.limit);

  return {
    items: paged,
    total,
    offset: pagination.offset,
    limit: pagination.limit,
    hasMore: pagination.offset + pagination.limit < total,
  };
}

/** Filter nodes that have relations to a specific node */
export function filterByRelation(
  nodes: RelationalNode[],
  edges: RelationalEdge[],
  targetNodeId: string,
): RelationalNode[] {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    if (edge.from_id === targetNodeId) connectedIds.add(edge.to_id);
    if (edge.to_id === targetNodeId) connectedIds.add(edge.from_id);
  }
  return nodes.filter(n => connectedIds.has(n.id));
}

/** Count relations per node */
export function relationCounts(
  nodes: RelationalNode[],
  edges: RelationalEdge[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of nodes) counts.set(node.id, 0);

  for (const edge of edges) {
    counts.set(edge.from_id, (counts.get(edge.from_id) ?? 0) + 1);
    counts.set(edge.to_id, (counts.get(edge.to_id) ?? 0) + 1);
  }

  return counts;
}

/** Filter nodes with minimum relation count */
export function filterByMinRelations(
  nodes: RelationalNode[],
  edges: RelationalEdge[],
  minRelations: number,
): RelationalNode[] {
  const counts = relationCounts(nodes, edges);
  return nodes.filter(n => (counts.get(n.id) ?? 0) >= minRelations);
}

/** Apply a RelationFilter to first-class Relation objects */
export function filterRelations(
  relations: Relation[],
  filter: RelationFilter,
): Relation[] {
  let result = [...relations];

  if (filter.direction) {
    result = result.filter(r => r.direction === filter.direction);
  }

  if (filter.ceremonied !== undefined) {
    result = result.filter(r =>
      r.ceremony_context?.ceremony_honored === filter.ceremonied,
    );
  }

  if (filter.ocapCompliant !== undefined) {
    result = result.filter(r => r.ocap.compliant === filter.ocapCompliant);
  }

  if (filter.minWilsonAlignment !== undefined) {
    result = result.filter(r =>
      r.accountability.wilson_alignment >= filter.minWilsonAlignment!,
    );
  }

  if (filter.hasObligations !== undefined) {
    result = result.filter(r => {
      const has = r.obligations.length > 0;
      return has === filter.hasObligations;
    });
  }

  return result;
}
