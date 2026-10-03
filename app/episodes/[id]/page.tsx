"use client";

/**
 * One episode: what it is, what it holds, what it still holds open, and what
 * it touches.
 *
 * What this is, from the node itself, with the episodes before and after it in
 * the chronicle. What it holds, from its folder — read-only, through the rules
 * `@miadi/episode-vessel` states for every surface that opens one (see
 * `components/episode-files-panel.tsx`). What was said and gathered for it —
 * ceremonies, diary, inquiry weaves, plan perspectives, captures — from routes
 * that filtered by episode long before any page asked them
 * (`components/episode-holdings.tsx`). What is open, from
 * `?kind=attention&parent_id=<id>`. What it relates to, from
 * `/api/nodes/[id]/web`, which walks the traversal that shipped in
 * `relational-query` and went unimported. Ref jgwill/medicine-wheel#153.
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
import { EpisodeFilesPanel } from "@/components/episode-files-panel";
import { EpisodeHoldings } from "@/components/episode-holdings";

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

/**
 * Where an episode sits in the chronicle: its folder's date, then its number —
 * the order the folders keep on disk. Not `created_at`, which records when the
 * wheel learned of an episode, and not the number alone, which the chronicle
 * does not hand out in date order (episode 1000 follows episode 550 by two days).
 */
function chronicleKey(node: EpisodeNode): string {
  const match = (episodeFolderOf(node) ?? "").match(/^(\d{4}-\d{2}-\d{2})-episode-(\d+)/i);
  return match ? `${match[1]}-${match[2].padStart(6, "0")}` : (node.created_at ?? "");
}

/**
 * The episode's folder name — what the wheel's other records file it under.
 *
 * From the id when it is `chronicle:<folder>`. A few early episodes were
 * registered under other ids (`node:knowledge:…`, a bare uuid); their node
 * still carries the artefact reference, so the folder comes from
 * `metadata.relative_path` when `metadata.root` names the chronicle.
 */
function episodeFolderOf(node: EpisodeNode): string | null {
  if (node.id.startsWith("chronicle:")) return node.id.slice("chronicle:".length) || null;
  const relative = metaString(node, "relative_path");
  if (metaString(node, "root") !== "MIADI_CHRONICLE_ROOT" || !relative) return null;
  const folder = relative.split("/")[0];
  return folder && folder !== relative ? folder : null;
}

function EpisodeLink({ node, label }: { node: EpisodeNode | null; label: string }) {
  if (!node) return <span />;
  return (
    <Link
      href={`/episodes/${encodeURIComponent(node.id)}`}
      className="text-xs text-muted-foreground hover:underline min-w-0 truncate"
      title={node.name}
    >
      {label} {node.name}
    </Link>
  );
}

export default function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = decodeURIComponent(rawId);

  const [episode, setEpisode] = useState<EpisodeNode | null>(null);
  const [attention, setAttention] = useState<EpisodeNode[]>([]);
  const [web, setWeb] = useState<{ nodes: EpisodeNode[]; edges: RelationalEdge[] } | null>(null);
  const [before, setBefore] = useState<EpisodeNode | null>(null);
  const [after, setAfter] = useState<EpisodeNode | null>(null);
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

      const ordered = [...all].sort((a, b) => chronicleKey(a).localeCompare(chronicleKey(b)));
      const at = ordered.findIndex((n) => n.id === id);
      setBefore(at > 0 ? ordered[at - 1] : null);
      setAfter(at >= 0 && at < ordered.length - 1 ? ordered[at + 1] : null);

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
  const folder = episode ? episodeFolderOf(episode) : null;
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
          does not hold it: an episode folder can exist before it is registered on the wheel.
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
        {(before || after) && (
          <nav className="flex justify-between gap-4 mt-3" aria-label="Neighbouring episodes">
            <EpisodeLink node={before} label="←" />
            <EpisodeLink node={after} label="→" />
          </nav>
        )}
      </div>

      {folder && <EpisodeFilesPanel episodeId={`chronicle:${folder}`} />}

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

      {folder && <EpisodeHoldings episodeId={`chronicle:${folder}`} episodePath={folder} />}

      <section>
        <h2 className="text-sm font-semibold mb-2">
          Relations {neighbours.length > 0 && `(${neighbours.length})`}
        </h2>

        {parentId && !parentHasEdge && (
          <p className="mb-2 text-xs text-muted-foreground border rounded-lg p-3 bg-card">
            This episode records a parent in <code>metadata.parent_id</code> (
            <code className="break-all">{parentId}</code>) that was never written as a relation, so
            it does not appear below and the graph cannot draw it.
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
          href={`/graph?scope=${encodeURIComponent(id)}`}
          className="mw-btn mw-btn--ghost mt-3 inline-block"
        >
          Open in graph
        </Link>
      </section>
    </div>
  );
}
