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
 * `/api/nodes/[id]/web`: its lineage first — each relation to another episode
 * read from this episode's end ("continues from", "continued by") with the
 * words that say why it holds — then everything else it touches
 * (`lib/episode-lineage.ts`). Ref jgwill/medicine-wheel#153, #156.
 *
 * Containment links that live only in `metadata.parent_id` were never written
 * as edges, so an episode can show a parent with no relation behind it. The
 * page names that rather than rendering an empty box, because an empty box
 * reads as "this episode touches nothing" when the truth is "the edge was
 * never written".
 */

import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import type { RelationalNode, RelationalEdge } from "@/lib/types";
import { EpisodeFilesPanel } from "@/components/episode-files-panel";
import { EpisodeHoldings } from "@/components/episode-holdings";
import {
  chronicleKey,
  episodeFolderOfNode,
  relationsOf,
  type EpisodeRelation,
  type LineageEdge,
} from "@/lib/episode-lineage";

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

/** One relation, as read from this episode, with the words that say why it holds. */
function RelationRow({
  relation,
  node,
  episode = false,
}: {
  relation: EpisodeRelation;
  node?: EpisodeNode;
  episode?: boolean;
}) {
  const name = node?.name ?? relation.other;
  return (
    <li className="p-3 border rounded-lg bg-card">
      <p className="text-sm">
        <span className="text-muted-foreground">{relation.label}</span>{" "}
        {episode ? (
          <Link href={`/episodes/${encodeURIComponent(relation.other)}`} className="font-medium hover:underline">
            {name}
          </Link>
        ) : (
          <span className="font-medium">{name}</span>
        )}
      </p>
      {!episode && (
        <span className="font-mono text-xs text-muted-foreground block break-all">{relation.other}</span>
      )}
      {relation.descriptions.map((said) => (
        <p key={said} className="text-sm text-muted-foreground mt-1">
          {said}
        </p>
      ))}
    </li>
  );
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
  const folder = episode ? episodeFolderOfNode(episode) : null;
  const neighbours = (web?.nodes ?? []).filter((n) => n.id !== id);
  const parentHasEdge = Boolean(parentId && neighbours.some((n) => n.id === parentId));

  // Each relation read from this episode's end, with the words that say why it
  // holds; episodes first (the lineage), then everything else it touches.
  const nodeById = new Map(neighbours.map((n) => [n.id, n]));
  const relations = relationsOf(id, (web?.edges ?? []) as LineageEdge[]);
  const isEpisodeId = (other: string) => nodeById.get(other)?.metadata?.kind === "chronicle_episode";
  const lineage = relations.filter((r) => isEpisodeId(r.other));
  const elsewhere = relations.filter((r) => !isEpisodeId(r.other));

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
          Lineage {lineage.length > 0 && `(${lineage.length})`}
        </h2>
        {lineage.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No relation to another episode has been woven yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {lineage.map((r) => (
              <RelationRow key={`${r.other}-${r.label}`} relation={r} node={nodeById.get(r.other)} episode />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-2">
          Also related {elsewhere.length > 0 && `(${elsewhere.length})`}
        </h2>

        {parentId && !parentHasEdge && (
          <p className="mb-2 text-xs text-muted-foreground border rounded-lg p-3 bg-card">
            This episode records a parent in <code>metadata.parent_id</code> (
            <code className="break-all">{parentId}</code>) that was never written as a relation, so
            it does not appear below and the graph cannot draw it.
          </p>
        )}

        {elsewhere.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing else is related to this episode. {parentId && !parentHasEdge ? "See the note above." : ""}
          </p>
        ) : (
          <ul className="space-y-2">
            {elsewhere.map((r) => (
              <RelationRow key={`${r.other}-${r.label}`} relation={r} node={nodeById.get(r.other)} />
            ))}
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
