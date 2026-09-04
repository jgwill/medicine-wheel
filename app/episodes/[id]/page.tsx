"use client";

/**
 * One episode: what it is, what it still holds open, and what it touches.
 *
 * The three panels answer the three things the graph could not. What this is,
 * from the node itself. What is open, from `?kind=attention&parent_id=<id>` —
 * a query the API has always accepted and no page ever sent. What it relates to,
 * from `/api/nodes/[id]/web`, which walks the traversal that shipped in
 * `relational-query` and went unimported.
 *
 * The relations panel is where the wheel's current honesty shows. 101 of 106
 * containment links live only in `metadata.parent_id` and were never written as
 * edges, so most episodes will show a parent here that has no relation behind
 * it. The panel names that rather than rendering an empty box, because an empty
 * box reads as "this episode touches nothing" when the truth is "the edge was
 * never written".
 */

import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import type { RelationalNode, RelationalEdge } from "@/lib/types";

// `description` lives on the store's node, not on ontology-core's — the same
// widening `app/nodes/page.tsx` declares as `NodeRecord`. Named EpisodeNode
// rather than Node so it cannot be confused with the DOM's global `Node`.
type EpisodeNode = RelationalNode & {
  description?: string;
  metadata?: Record<string, unknown>;
};

const DIRECTION_ICONS: Record<string, string> = {
  east: "🌅",
  south: "🔥",
  west: "🌊",
  north: "❄️",
};

function metaString(node: EpisodeNode | null, key: string): string | null {
  const value = node?.metadata?.[key];
  return typeof value === "string" && value ? value : null;
}

export default function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = decodeURIComponent(rawId);

  const [episode, setEpisode] = useState<EpisodeNode | null>(null);
  const [attention, setAttention] = useState<EpisodeNode[]>([]);
  const [web, setWeb] = useState<{ nodes: EpisodeNode[]; edges: RelationalEdge[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const encoded = encodeURIComponent(id);
      const [nodeRes, attentionRes, webRes] = await Promise.all([
        fetch(`/api/nodes?kind=chronicle_episode&limit=all`),
        fetch(`/api/nodes?kind=attention&parent_id=${encoded}&limit=all`),
        fetch(`/api/nodes/${encoded}/web?depth=1`),
      ]);

      if (!nodeRes.ok) throw new Error(`Episodes: ${nodeRes.status}`);
      const all: EpisodeNode[] = (await nodeRes.json()).nodes ?? [];
      const found = all.find((n) => n.id === id) ?? null;
      setEpisode(found);

      setAttention(attentionRes.ok ? ((await attentionRes.json()).nodes ?? []) : []);

      // A 404 here means the node is not in the wheel at all — distinct from a
      // node with no relations, which is a 200 carrying only its own root.
      setWeb(webRes.ok ? await webRes.json() : null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const parentId = metaString(episode, "parent_id");
  const neighbours = (web?.nodes ?? []).filter((n) => n.id !== id);
  const parentHasEdge = Boolean(parentId && neighbours.some((n) => n.id === parentId));

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto text-sm text-muted-foreground">Loading…</div>;
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/episodes" className="text-sm text-muted-foreground hover:underline">
          ← Episodes
        </Link>
        <div className="mt-4 p-4 border rounded-lg bg-card">
          <p className="text-sm font-medium">The chronicle did not answer.</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={load} className="mw-btn mw-btn--ghost mt-2">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/episodes" className="text-sm text-muted-foreground hover:underline">
          ← Episodes
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          No episode node with id <code className="font-mono">{id}</code>. The wheel answered and
          does not hold it — 102 of 185 episode folders on disk have no node yet.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/episodes" className="text-sm text-muted-foreground hover:underline">
          ← Episodes
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap mt-2">
          <h1 className="text-2xl font-bold">{episode.name}</h1>
          {episode.direction && (
            <span className={`mw-badge mw-badge--${episode.direction}`}>
              {DIRECTION_ICONS[episode.direction]} {episode.direction}
            </span>
          )}
        </div>
        <p className="font-mono text-xs text-muted-foreground mt-1 break-all">{episode.id}</p>
        {episode.description && <p className="text-sm mt-3">{episode.description}</p>}
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-2">
          Open attention {attention.length > 0 && `(${attention.length})`}
        </h2>
        {attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing held open against this episode.
          </p>
        ) : (
          <ul className="space-y-2">
            {attention.map((item) => (
              <li key={item.id} className="p-3 border rounded-lg bg-card">
                <p className="text-sm font-medium">{item.name}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-2">
          Relations {neighbours.length > 0 && `(${neighbours.length})`}
        </h2>

        {parentId && !parentHasEdge && (
          <p className="mb-2 text-xs text-muted-foreground border rounded-lg p-3 bg-card">
            This episode records a parent in <code>metadata.parent_id</code> (
            <code className="break-all">{parentId}</code>) that was never written as a relation, so
            it does not appear below and the graph cannot draw it. 101 of 106 containment links in
            this wheel are in that state.
          </p>
        )}

        {neighbours.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No relation reaches this episode. {parentId ? "See the note above." : ""}
          </p>
        ) : (
          <ul className="space-y-2">
            {neighbours.map((n) => {
              const edge = (web?.edges ?? []).find(
                (e) =>
                  (e.from_id === id && e.to_id === n.id) ||
                  (e.to_id === id && e.from_id === n.id),
              );
              return (
                <li
                  key={n.id}
                  className="p-3 border rounded-lg bg-card flex items-baseline justify-between gap-3 flex-wrap"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{n.name}</span>
                    <span className="font-mono text-xs text-muted-foreground block break-all">
                      {n.id}
                    </span>
                  </span>
                  {edge && (
                    <span className="mw-badge shrink-0" title="relationship_type">
                      {edge.from_id === id ? "→" : "←"} {edge.relationship_type}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href={`/graph?focus=${encodeURIComponent(id)}`}
          className="mw-btn mw-btn--ghost mt-3 inline-block"
        >
          Open in graph
        </Link>
      </section>
    </div>
  );
}
