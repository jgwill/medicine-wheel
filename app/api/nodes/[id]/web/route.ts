import { NextResponse } from "next/server";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";
import { traverse } from "@medicine-wheel/relational-query";
import type { TraversalDirection } from "@medicine-wheel/relational-query";
import type { RelationalNode } from "@medicine-wheel/ontology-core";
import type { RelationalEdge as OntologyEdge } from "@medicine-wheel/ontology-core";
import type { RelationalEdge as StoredEdge } from "@medicine-wheel/storage-provider";

/**
 * One node's relational web — the node, everything within N hops, and the
 * relations among them.
 *
 * `@medicine-wheel/relational-query` has shipped `traverse` and `neighborhood`
 * with depth limits, direction filters, ceremony boundaries and OCAP guards for
 * some time, and has been a declared dependency of this app the whole while.
 * Nothing imported it: `grep -rn "@medicine-wheel/relational-query" app/ lib/`
 * returned nothing. The wheel could always answer "this node and what touches
 * it" and had no way to be asked. This route is the asking.
 *
 * It exists because the graph draws every node it is given on one wheel. At 205
 * nodes that is a field of dots in which 37% have no edge at all and the largest
 * hubs are systemd units, and no amount of layout work fixes a question nobody
 * can narrow. The fix for "I cannot navigate" is not a prettier wheel; it is
 * being able to ask for less.
 */

/** Hops from the root. Two shows a node's neighbours and what they touch. */
const DEFAULT_DEPTH = 2;

/**
 * Beyond this the answer stops being a neighbourhood and becomes the store with
 * extra steps — at depth 6 a connected component is usually fully covered, and
 * the caller wanted `/api/nodes?limit=all` instead.
 */
const MAX_DEPTH = 6;

/**
 * `follow`, not `direction`.
 *
 * This route has two unrelated notions of direction and collapsing them would be
 * a quiet, permanent trap: the wheel's `DirectionName` (east/south/west/north)
 * and the traversal's `TraversalDirection` (outgoing/incoming/both). `direction`
 * already means the former on `/api/nodes`, and a reader who assumed it meant
 * the same here would get a silently different query. So edge-following is
 * `follow`, and `direction` keeps its established meaning.
 */
const FOLLOW_VALUES = ["outgoing", "incoming", "both"] as const;

const WEB_QUERY_PARAMS = ["depth", "follow", "direction", "kind", "type"] as const;

function badRequest(error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status: 400 });
}

function parseDepth(raw: string | null): number | NextResponse {
  if (raw === null || raw === "") return DEFAULT_DEPTH;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_DEPTH) {
    return badRequest(`Invalid depth: ${raw} — nothing was traversed.`, {
      hint: `depth must be an integer from 1 to ${MAX_DEPTH}.`,
    });
  }
  return parsed;
}

function parseFollow(raw: string | null): TraversalDirection | NextResponse {
  if (raw === null || raw === "") return "both";
  if ((FOLLOW_VALUES as readonly string[]).includes(raw)) return raw as TraversalDirection;
  return badRequest(`Invalid follow: ${raw} — nothing was traversed.`, {
    accepted: [...FOLLOW_VALUES],
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // The same contract as /api/nodes: an unrecognised parameter is a 400 naming
    // what is accepted, never a filtered-looking payload that filtered nothing.
    const unknown = [...new Set(searchParams.keys())].filter(
      (key) => !(WEB_QUERY_PARAMS as readonly string[]).includes(key),
    );
    if (unknown.length > 0) {
      return badRequest(
        `Unknown query parameter${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")} — nothing was traversed.`,
        { accepted: [...WEB_QUERY_PARAMS] },
      );
    }

    const depth = parseDepth(searchParams.get("depth"));
    if (depth instanceof NextResponse) return depth;

    const follow = parseFollow(searchParams.get("follow"));
    if (follow instanceof NextResponse) return follow;

    const store = await createProvider();

    // The whole store, deliberately. A traversal over a 100-row page would walk
    // a graph the store does not have and return a neighbourhood that is missing
    // arbitrary neighbours — the same silent truncation the paging fix closed on
    // the list routes, but harder to notice here because the answer is small by
    // design and looks complete.
    const [allNodes, allEdges] = await Promise.all([
      store.getAllNodes(Number.MAX_SAFE_INTEGER),
      store.getAllEdges(Number.MAX_SAFE_INTEGER),
    ]);

    const root = allNodes.find((n) => n.id === id);
    if (!root) {
      return NextResponse.json(
        {
          error: `No node with id ${id}.`,
          hint: "Check the id on /nodes, or list them with /api/nodes?limit=all.",
        },
        { status: 404 },
      );
    }

    // `storage-provider`'s RelationalEdge deliberately makes `id` optional —
    // relations are identified by their (from_id, to_id) pair, which is why
    // /api/edges addresses them as `?id=<from>:<to>`. `traverse` takes
    // ontology-core's edge, where `id` is required. Rather than loosen the
    // ontology or tighten the store, the pair-derived id is supplied here, using
    // the composite form the edges route already established.
    const traversable: OntologyEdge[] = allEdges.map((e) => ({
      ...e,
      id: e.id ?? `${e.from_id}:${e.to_id}`,
    }));

    const result = traverse(id, allNodes, traversable, [], {
      maxDepth: depth,
      direction: follow,
    });

    const nodeById = new Map(allNodes.map((n) => [n.id, n]));
    let nodes = [...result.visitedNodes]
      .map((visitedId) => nodeById.get(visitedId))
      .filter((n): n is RelationalNode => n !== undefined);

    // Filters narrow what is *returned*, never what is *walked*. Filtering during
    // the walk would cut the graph at every non-matching node and silently hide
    // matches that sit two hops behind one — a neighbourhood is defined by the
    // relations, and the filter is a view of it.
    const kind = searchParams.get("kind") || undefined;
    const type = searchParams.get("type") || undefined;
    const direction = searchParams.get("direction") || undefined;
    if (kind) nodes = nodes.filter((n) => n.metadata?.kind === kind);
    if (type) nodes = nodes.filter((n) => n.type === type);
    if (direction) nodes = nodes.filter((n) => n.direction === direction);

    // The root always comes back, even when it fails its own filter. A web with
    // no centre is not a web, and dropping it would make an empty result
    // indistinguishable from a missing node.
    if (!nodes.some((n) => n.id === root.id)) nodes = [root, ...nodes];

    // Induced edges only: both endpoints present. An edge to a node that was not
    // returned is exactly the dangling reference that made the main graph draw
    // 53 unconnected dots out of 100 — a renderer receives it, cannot place one
    // end, and drops it without a word.
    // Filtered from the stored edges, not the traversable copy, so the response
    // carries what the store actually holds rather than this route's synthetic
    // ids. A consumer that round-trips an edge back to /api/edges must send the
    // store's own shape.
    const returnedIds = new Set(nodes.map((n) => n.id));
    const edges: StoredEdge[] = allEdges.filter(
      (e) => returnedIds.has(e.from_id) && returnedIds.has(e.to_id),
    );

    return NextResponse.json({
      root,
      nodes,
      edges,
      provider: detectProvider(),
      count: nodes.length,
      depth,
      follow,
      // True when the walk stopped because it ran out of depth rather than out of
      // graph — the caller is looking at a horizon, not a boundary, and raising
      // depth would show more.
      truncated: result.maxDepthReached,
      // Crossings a ceremony or OCAP guard refused. Empty here because this route
      // sets no guards, but carried so the shape does not change when it does.
      escalations: result.escalations,
      ...(kind || type || direction ? { filters: { kind, type, direction } } : {}),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
