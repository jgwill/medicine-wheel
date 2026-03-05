/**
 * Graph Traversal — context-aware relationship traversal
 * with ceremony boundary and OCAP® awareness.
 */
import type { RelationalNode, RelationalEdge, Relation } from 'medicine-wheel-ontology-core';
import { checkOcapCompliance } from 'medicine-wheel-ontology-core';
import type {
  TraversalOptions,
  TraversalPath,
  TraversalResult,
  EdgeFilter,
  NodeFilter,
} from './types.js';
import { filterEdges, filterNodes } from './query.js';

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

  // OCAP filter: only follow edges whose relations are compliant
  if (options.ocapOnly) {
    const compliantRelIds = new Set(
      relations
        .filter(r => r.ocap && checkOcapCompliance(r.ocap).compliant)
        .map(r => r.id)
    );
    // Keep edges that match compliant relation IDs or have no relation mapping
    filteredEdges = filteredEdges.filter(e => {
      const relId = `${e.from_id}-${e.to_id}`;
      const reverseId = `${e.to_id}-${e.from_id}`;
      return compliantRelIds.has(relId) || compliantRelIds.has(reverseId) || !relations.some(r => r.id === relId || r.id === reverseId);
    });
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

      // Ceremony boundary check
      if (options.respectCeremonyBoundaries && !edge.ceremony_honored) {
        continue;
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

  return { root: rootNode, paths, visitedNodes: visited, maxDepthReached };
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
