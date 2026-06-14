/**
 * Graph Traversal — context-aware relationship traversal
 * with ceremony boundary and OCAP® awareness.
 */
import type { RelationalNode, RelationalEdge, Relation } from '@medicine-wheel/ontology-core';
import type {
  TraversalOptions,
  TraversalPath,
  TraversalResult,
} from './types.js';
import { filterEdges, filterNodes } from './query.js';
import type { ProtocolGuard, GuardEscalation } from './guards.js';
import { ceremonyBoundaryGuard, ocapComplianceGuard, evaluateGuards } from './guards.js';

const DEFAULT_OPTIONS: TraversalOptions = {
  maxDepth: 3,
  direction: 'both',
  respectCeremonyBoundaries: false,
  ocapOnly: false,
};

/** Build an adjacency map from edges */
function buildAdjacency(
  edges: RelationalEdge[],
  direction: 'outgoing' | 'incoming' | 'both',
): Map<string, Array<{ nodeId: string; edge: RelationalEdge }>> {
  const adj = new Map<string, Array<{ nodeId: string; edge: RelationalEdge }>>();

  for (const edge of edges) {
    if (direction === 'outgoing' || direction === 'both') {
      const list = adj.get(edge.from_id) ?? [];
      list.push({ nodeId: edge.to_id, edge });
      adj.set(edge.from_id, list);
    }
    if (direction === 'incoming' || direction === 'both') {
      const list = adj.get(edge.to_id) ?? [];
      list.push({ nodeId: edge.from_id, edge });
      adj.set(edge.to_id, list);
    }
  }

  return adj;
}

/** Traverse the relational web from a root node */
export function traverse(
  rootId: string,
  nodes: RelationalNode[],
  edges: RelationalEdge[],
  relations: Relation[],
  opts: Partial<TraversalOptions> = {},
): TraversalResult {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  // Pre-filter edges
  let filteredEdges = edges;
  if (options.edgeFilter) {
    filteredEdges = filterEdges(edges, options.edgeFilter);
  }

  // Assemble the protocol-guard stack. The former `respectCeremonyBoundaries`
  // and `ocapOnly` booleans are now built-in guards, evaluated per crossing
  // alongside any caller-supplied guards.
  const guards: ProtocolGuard[] = [];
  if (options.respectCeremonyBoundaries) guards.push(ceremonyBoundaryGuard);
  if (options.ocapOnly) guards.push(ocapComplianceGuard);
  if (options.guards) guards.push(...options.guards);
  const guardContext = options.context ?? {};

  // Map an edge (by endpoint pair, in either direction) to its first-class
  // Relation, so guards can read the relation's OCAP flags and context.
  const relationLookup = new Map<string, Relation>();
  for (const r of relations) {
    relationLookup.set(`${r.from_id}|${r.to_id}`, r);
    relationLookup.set(`${r.to_id}|${r.from_id}`, r);
  }

  // Build adjacency
  const adj = buildAdjacency(filteredEdges, options.direction);

  // Node lookup
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const rootNode = nodeMap.get(rootId);
  if (!rootNode) {
    throw new Error(`Traversal root node not found: "${rootId}"`);
  }

  // BFS traversal
  const paths: TraversalPath[] = [];
  const escalations: GuardEscalation[] = [];
  const visited = new Set<string>([rootId]);
  let maxDepthReached = false;

  interface QueueItem {
    nodeId: string;
    path: RelationalNode[];
    edgePath: RelationalEdge[];
    depth: number;
  }

  const queue: QueueItem[] = [{ nodeId: rootId, path: [rootNode], edgePath: [], depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.depth >= options.maxDepth) {
      maxDepthReached = true;
      continue;
    }

    const neighbors = adj.get(current.nodeId) ?? [];
    for (const { nodeId, edge } of neighbors) {
      if (visited.has(nodeId)) continue;

      // Protocol guards: evaluate before crossing the edge. A blocked crossing
      // is recorded as an escalation (delegation), not a silent skip.
      if (guards.length > 0) {
        const relation = relationLookup.get(`${edge.from_id}|${edge.to_id}`);
        const { decision, guard } = evaluateGuards(guards, edge, relation, guardContext);
        if (!decision.allowed) {
          escalations.push({
            fromId: current.nodeId,
            toId: nodeId,
            guard: guard ?? 'unknown',
            reason: decision.reason,
            escalateTo: decision.escalateTo,
          });
          continue;
        }
      }

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      // Node filter
      if (options.nodeFilter) {
        const filtered = filterNodes([node], options.nodeFilter);
        if (filtered.length === 0) continue;
      }

      visited.add(nodeId);

      const newPath = [...current.path, node];
      const newEdgePath = [...current.edgePath, edge];

      paths.push({
        nodes: newPath,
        edges: newEdgePath,
        depth: current.depth + 1,
      });

      queue.push({
        nodeId,
        path: newPath,
        edgePath: newEdgePath,
        depth: current.depth + 1,
      });
    }
  }

  return { root: rootNode, paths, visitedNodes: visited, maxDepthReached, escalations };
}

/** Find shortest path between two nodes */
export function shortestPath(
  fromId: string,
  toId: string,
  nodes: RelationalNode[],
  edges: RelationalEdge[],
): TraversalPath | null {
  const adj = buildAdjacency(edges, 'both');
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>([fromId]);

  interface QueueItem {
    nodeId: string;
    path: RelationalNode[];
    edgePath: RelationalEdge[];
  }

  const fromNode = nodeMap.get(fromId);
  if (!fromNode) return null;

  const queue: QueueItem[] = [{ nodeId: fromId, path: [fromNode], edgePath: [] }];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.nodeId === toId) {
      return {
        nodes: current.path,
        edges: current.edgePath,
        depth: current.path.length - 1,
      };
    }

    const neighbors = adj.get(current.nodeId) ?? [];
    for (const { nodeId, edge } of neighbors) {
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      queue.push({
        nodeId,
        path: [...current.path, node],
        edgePath: [...current.edgePath, edge],
      });
    }
  }

  return null;
}

/** Find all nodes reachable within N hops */
export function neighborhood(
  nodeId: string,
  nodes: RelationalNode[],
  edges: RelationalEdge[],
  maxDepth: number = 2,
): RelationalNode[] {
  const result = traverse(nodeId, nodes, edges, [], { maxDepth, direction: 'both' });
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return [...result.visitedNodes]
    .map(id => nodeMap.get(id))
    .filter((n): n is RelationalNode => n !== undefined);
}
