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

/**
 * Hops from the root.
 *
 * One, not two. Two was the first default and it was a trap: with a chronicle
 * root that every episode `belongs_to`, depth 2 from any episode goes
 * episode → root → all 81 other episodes. Episode 011 has exactly one relation
 * and its "2-hop neighbourhood" was 83 nodes — the corpus, wearing the name of a
 * neighbourhood. `maxExpandDegree` below fixes the cause; this default keeps the
 * first thing a person sees small.
 */
const DEFAULT_DEPTH = 1;

/**
 * A node with more relations than this is shown but not expanded through.
 *
 * 20 is chosen against the measured shape of this wheel rather than as a round
 * number: the chronicle root sits at **82**, and the next-largest nodes are
 * `gaia` at 17, `ilex` at 14 and `episode-332` at 14. So the threshold separates
 * the one true container from the busiest ordinary nodes with room on both
 * sides, and a corpus that grows a second container will cross it before any
 * episode does. Override per request with `?hub=`; `?hub=0` disables suppression.
 */
const DEFAULT_MAX_EXPAND_DEGREE = 20;

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

const WEB_QUERY_PARAMS = ["depth", "follow", "direction", "kind", "type", "hub"] as const;

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

    const rawHub = searchParams.get("hub");
    let maxExpandDegree: number | undefined = DEFAULT_MAX_EXPAND_DEGREE;
    if (rawHub !== null && rawHub !== "") {
      const parsed = Number(rawHub);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return badRequest(`Invalid hub: ${rawHub} — nothing was traversed.`, {
          hint: "hub must be a non-negative integer; 0 expands through everything.",
        });
      }
      // 0 means "no suppression", which is the honest spelling of "expand
      // through everything" — not "suppress nodes with more than zero edges".
      maxExpandDegree = parsed === 0 ? undefined : parsed;
    }

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
      maxExpandDegree,
      // The corpus already spells "container" directly, so say it rather than
      // inferring it from degree. `chronicle_root` is one by definition however
      // many episodes it holds; degree stays as the backstop for containers
      // nobody has named. Suppressible with `?hub=0` along with the threshold.
      containerKinds: maxExpandDegree === undefined ? [] : ["chronicle_root"],
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
    // Reported by the traversal that made the decision, never recomputed here.
    // The first version re-derived it from undirected whole-store degree while
    // the walk had suppressed on direction-filtered degree — so under
    // `?follow=outgoing` the walk expanded straight through the chronicle root
    // (out-degree 0) while this told the caller it held 82 relations. Only one
    // place can know, and it is not this one.
    const nameById = new Map(allNodes.map((n) => [n.id, n.name]));
    const hubsHeld = result.heldAtHubs.map((hold) => ({
      id: hold.nodeId,
      name: nameById.get(hold.nodeId) ?? hold.nodeId,
      degree: hold.degree,
      reason: hold.reason,
      unexpanded: hold.unexpanded.length,
    }));

    const returnedIds = new Set(nodes.map((n) => n.id));

    /**
     * "There is more further out" — measured at the frontier, not inferred from
     * why the walk stopped.
     *
     * `maxDepthReached` is the traversal's own flag and it means *the walk hit
     * the limit*, which is not the same claim: a walk that reached every node in
     * a component at exactly its depth limit sets it, with nothing beyond. And
     * hub suppression sets nothing at all, so a walk that withheld 81 nodes
     * reported `false` — the failure that started this fix, pointing the other
     * way. Both are answered by asking the graph instead: does any returned node
     * have an edge to a node that was not returned?
     */
    const hasMoreBeyond = allEdges.some(
      (e) =>
        (returnedIds.has(e.from_id) && !returnedIds.has(e.to_id)) ||
        (returnedIds.has(e.to_id) && !returnedIds.has(e.from_id)),
    );
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
      // Which returned nodes were reached but not expanded through, and how much
      // sits behind each. Reported rather than silently applied: a neighbourhood
      // that quietly stopped at a container is the same class of lie as a list
      // that quietly stopped at 100 rows.
      hubs: hubsHeld,
      maxExpandDegree: maxExpandDegree ?? null,
      // True when there is more further out, for either reason: the walk hit the
      // depth limit, or it stopped at a container.
      //
      // `maxDepthReached` alone was wrong here and wrong in the direction that
      // hides things. Suppression skips the queue push, so a hub-terminated walk
      // never sets it — measured on the live wheel, episode 011 at depth 3 came
      // back `truncated: false` with 81 nodes withheld, and the page's "there is
      // more further out" line went dark for exactly the node that motivated the
      // feature. Both are the same claim to a reader: you are not seeing all of it.
      //
      // A container is only truncating when it actually withheld something. A
      // `chronicle_root` with one child is held by kind and hides nothing, and
      // saying "there is more further out" there would be the same false claim
      // pointing the other way.
      truncated: hasMoreBeyond,
      // Kept apart so a caller can still tell the two reasons apart.
      depthLimited: result.maxDepthReached,
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
