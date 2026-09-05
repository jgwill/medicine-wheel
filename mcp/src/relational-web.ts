/**
 * One node's relational web — the shared walk behind `get_relational_web`.
 *
 * Both stores had their own copy of this BFS and both copies had the same two
 * defects, which is the argument for there being one.
 *
 * **It returned edges it had no nodes for.** The loop pushed every edge touching
 * a visited node, including edges whose far end sat past the depth limit and was
 * never returned. A consumer drawing that gets a dangling reference; a consumer
 * counting it is told the web is denser than the nodes it was handed.
 *
 * **It had no notion of a container.** `chronicle:miadi-chronicle` carries a
 * `belongs_to` from all 82 episodes. So depth 2 from any one episode went
 * episode → root → all 81 others, and "what does this episode touch" answered
 * with the corpus. Measured 2026-09-03: episode 011 has exactly **one** relation
 * and its 2-hop web came back with 31 nodes and 100 edges — 81KB, over the tool
 * result limit, from a node with one neighbour.
 *
 * A container is reached and not expanded through: it stays in the answer,
 * because "this episode belongs to the chronicle" is true and worth knowing, and
 * the walk does not leave again through its other 81 edges.
 *
 * @see app/api/nodes/[id]/web/route.ts — the HTTP surface with the same semantics
 */

/**
 * Structural, not nominal.
 *
 * `StoredNode` and `StoredEdge` are declared privately and identically inside
 * both `jsonl-store.ts` and `http-store.ts` — a duplication this file is not the
 * place to unwind. Taking the shape instead of the name lets one walk serve both
 * stores without either importing the other's copy, and callers keep their own
 * richer types through the generic parameters.
 */
export interface WebNode {
  id: string;
  name?: string;
  metadata?: Record<string, unknown> | null;
}

export interface WebEdge {
  from_id: string;
  to_id: string;
}

/**
 * Node kinds that are containers by definition, whatever their degree.
 *
 * Named rather than inferred. Degree is a proxy and it drifts: on the wheel
 * measured 2026-09-03 the median degree is 2, p99 is 14, the chronicle root is
 * 82 — and `node:land:host:gaia` at 17 is already closing that gap, so a
 * threshold correct today is wrong in weeks. The corpus already spells the
 * thing directly.
 */
export const CONTAINER_KINDS = ['chronicle_root'] as const;

/**
 * A node above this degree is treated as a container even unnamed — the backstop
 * for containers nobody has classified yet. Placed in the gap between the
 * busiest ordinary node (17) and the root (82).
 */
export const DEFAULT_MAX_EXPAND_DEGREE = 20;

export interface RelationalWebOptions {
  depth?: number;
  /** `null` disables suppression entirely. */
  maxExpandDegree?: number | null;
  containerKinds?: readonly string[];
}

/** A container the walk reached and declined to expand through. */
export interface WebHubHold {
  id: string;
  name: string;
  degree: number;
  reason: 'kind' | 'degree';
  /** Neighbours behind it that no other path reached. */
  unexpanded: number;
}

export interface RelationalWebResult<N, E> {
  nodes: N[];
  edges: E[];
  hubs: WebHubHold[];
  /** True when some node adjacent to the returned set was not returned. */
  truncated: boolean;
}

export function buildRelationalWeb<N extends WebNode, E extends WebEdge>(
  nodeId: string,
  allNodes: N[],
  allEdges: E[],
  options: RelationalWebOptions = {},
): RelationalWebResult<N, E> {
  const depth = options.depth ?? 2;
  const maxExpandDegree =
    options.maxExpandDegree === null ? undefined : options.maxExpandDegree ?? DEFAULT_MAX_EXPAND_DEGREE;
  const containerKinds =
    options.maxExpandDegree === null ? [] : options.containerKinds ?? CONTAINER_KINDS;

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  const adjacency = new Map<string, E[]>();
  for (const edge of allEdges) {
    for (const end of [edge.from_id, edge.to_id]) {
      const list = adjacency.get(end);
      if (list) list.push(edge);
      else adjacency.set(end, [edge]);
    }
  }

  const visited = new Set<string>();
  const held = new Map<string, { degree: number; reason: 'kind' | 'degree'; behind: string[] }>();
  const queue: { id: string; d: number }[] = [{ id: nodeId, d: 0 }];

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const incident = adjacency.get(id) ?? [];

    // The centre is never suppressed — you asked about it.
    if (id !== nodeId) {
      const node = nodeMap.get(id);
      const kind = typeof node?.metadata?.kind === 'string' ? node.metadata.kind : undefined;
      const namedContainer = kind !== undefined && containerKinds.includes(kind);
      const overDegree = maxExpandDegree !== undefined && incident.length > maxExpandDegree;

      if (namedContainer || overDegree) {
        held.set(id, {
          degree: incident.length,
          reason: namedContainer ? 'kind' : 'degree',
          behind: incident.map((e) => (e.from_id === id ? e.to_id : e.from_id)),
        });
        continue;
      }
    }

    if (d >= depth) continue;

    for (const edge of incident) {
      const otherId = edge.from_id === id ? edge.to_id : edge.from_id;
      if (!visited.has(otherId)) queue.push({ id: otherId, d: d + 1 });
    }
  }

  const nodes = [...visited]
    .map((id) => nodeMap.get(id))
    .filter((n): n is N => n !== undefined);

  // Induced edges only — both ends present. An edge to a node that was not
  // returned is a reference the consumer cannot resolve.
  const returned = new Set(nodes.map((n) => n.id));
  const edges = allEdges.filter((e) => returned.has(e.from_id) && returned.has(e.to_id));

  const hubs: WebHubHold[] = [...held].map(([id, info]) => ({
    id,
    name: nodeMap.get(id)?.name ?? id,
    degree: info.degree,
    reason: info.reason,
    // A neighbour another path reached anyway was never withheld.
    unexpanded: info.behind.filter((n) => !returned.has(n)).length,
  }));

  // "There is more further out", measured at the frontier rather than inferred
  // from why the walk stopped — which covers both the depth limit and a
  // container, and is silent when a whole component came back.
  const truncated = allEdges.some(
    (e) =>
      (returned.has(e.from_id) && !returned.has(e.to_id)) ||
      (returned.has(e.to_id) && !returned.has(e.from_id)),
  );

  return { nodes, edges, hubs, truncated };
}
