"use client";

/**
 * The episodes surface — "what am I working on, and what came before it".
 *
 * `/api/nodes` has accepted `?kind=` and `?parent_id=` for some time, and no
 * page ever passed either. So the only way to see an episode in this app was to
 * find its dot on a wheel of 205, where 37% of the mass has no edge at all and
 * the largest hubs are systemd units. The wheel could answer this question and
 * was never asked it.
 *
 * Sorted by `metadata.occurred_at` when present, falling back to `created_at`.
 * That fallback is not a nicety: `created_at` records when the wheel *learned*
 * of an episode, not when the episode happened — 41 of 83 episodes disagree with
 * their own date, and twelve May episodes all carry the same September timestamp
 * from one import batch. Until `occurred_at` is backfilled this list is ordered
 * by registration for those rows, and it says so rather than implying a history
 * it does not have.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RelationalNode } from "@/lib/types";
import { EpisodeLineageWeb } from "@/components/episode-lineage-web";
import { chronicleKey, episodeDateOf, lineageEdges, type LineageEdge } from "@/lib/episode-lineage";

type View = "list" | "lineage";

// `description` lives on the store's node, not on ontology-core's — the same
// widening `app/nodes/page.tsx` declares as `NodeRecord`.
type Episode = RelationalNode & {
  description?: string;
  metadata?: Record<string, unknown>;
};

const DIRECTION_ICONS: Record<string, string> = {
  east: "🌅",
  south: "🔥",
  west: "🌊",
  north: "❄️",
};

/** `chronicle:2026-06-19-episode-068-extending-…` → `068`, or null. */
function episodeNumber(id: string): string | null {
  const match = id.match(/episode-(\d+)/i);
  return match ? match[1] : null;
}

/** The date the episode happened, if the wheel knows it apart from registration. */
function occurredAt(node: Episode): string | null {
  const value = node.metadata?.occurred_at;
  return typeof value === "string" && value ? value : null;
}

function sortKey(node: Episode): string {
  return occurredAt(node) ?? node.created_at ?? "";
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [attentionCounts, setAttentionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [edges, setEdges] = useState<LineageEdge[]>([]);
  const [edgesFailed, setEdgesFailed] = useState(false);
  const [view, setView] = useState<View>("list");

  // `?view=lineage` opens on the lineage, so it can be linked to. Read once on
  // mount from the location rather than through useSearchParams, which would
  // need a Suspense boundary around the whole page.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "lineage") setView("lineage");
  }, []);

  const choose = useCallback((next: View) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "lineage") url.searchParams.set("view", "lineage");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // limit=all, not the provider's 100-row default. The chronicle holds more
      // episodes than a default page, and a list that silently ends is worse
      // than one that refuses to load.
      const [episodesRes, attentionRes, edgesRes] = await Promise.all([
        fetch("/api/nodes?kind=chronicle_episode&limit=all"),
        fetch("/api/nodes?kind=attention&limit=all"),
        fetch("/api/edges?limit=all").catch(() => null),
      ]);

      if (!episodesRes.ok) throw new Error(`Episodes: ${episodesRes.status}`);
      const episodesBody = await episodesRes.json();
      const list: Episode[] = episodesBody.nodes ?? [];

      const counts: Record<string, number> = {};
      if (attentionRes.ok) {
        const attentionBody = await attentionRes.json();
        for (const item of (attentionBody.nodes ?? []) as Episode[]) {
          const parent = item.metadata?.parent_id;
          if (typeof parent === "string") counts[parent] = (counts[parent] ?? 0) + 1;
        }
      }

      setEpisodes([...list].sort((a, b) => sortKey(b).localeCompare(sortKey(a))));
      setAttentionCounts(counts);

      // The relations are a second answer: if they do not come, the list still does.
      const ids = new Set(list.map((e) => e.id));
      if (edgesRes?.ok) {
        const body = await edgesRes.json();
        const all: LineageEdge[] = Array.isArray(body) ? body : (body.edges ?? []);
        setEdges(lineageEdges(all, (id) => ids.has(id)));
        setEdgesFailed(false);
      } else {
        setEdges([]);
        setEdgesFailed(true);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return episodes;
    return episodes.filter(
      (e) =>
        e.name.toLowerCase().includes(needle) ||
        e.id.toLowerCase().includes(needle) ||
        (e.description ?? "").toLowerCase().includes(needle),
    );
  }, [episodes, query]);

  /** Relations to other episodes, per episode. */
  const relationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const edge of edges) {
      counts[edge.from_id] = (counts[edge.from_id] ?? 0) + 1;
      counts[edge.to_id] = (counts[edge.to_id] ?? 0) + 1;
    }
    return counts;
  }, [edges]);

  /** The lineage reads oldest first, in the folders' own order. */
  const chronological = useMemo(
    () =>
      [...episodes]
        .sort((a, b) => chronicleKey(a).localeCompare(chronicleKey(b)))
        .map((e) => ({ id: e.id, name: e.name, direction: e.direction, date: episodeDateOf(e) ?? occurredAt(e)?.slice(0, 10) })),
    [episodes],
  );

  const matching = useMemo(
    () => (query.trim() ? new Set(visible.map((e) => e.id)) : null),
    [query, visible],
  );

  /** How many rows are ordered by registration rather than by when they happened. */
  const undatedCount = useMemo(
    () => episodes.filter((e) => !occurredAt(e)).length,
    [episodes],
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Episodes</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Reading the chronicle…" : `${episodes.length} episodes in the wheel`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1" role="group" aria-label="View">
            {(["list", "lineage"] as const).map((v) => (
              <button
                key={v}
                onClick={() => choose(v)}
                aria-pressed={view === v}
                className={`mw-btn ${view === v ? "" : "mw-btn--ghost"}`}
              >
                {v === "list" ? "List" : "Lineage"}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or id"
            className="mw-input max-w-xs"
            aria-label="Filter episodes"
          />
        </div>
      </div>

      {view === "lineage" && !loading && episodes.length > 0 && (
        <div className="mb-6">
          {edgesFailed && (
            <p className="mb-2 text-xs text-muted-foreground">
              The wheel did not answer for its relations, so the lineage shows episodes without arcs.
            </p>
          )}
          <EpisodeLineageWeb episodes={chronological} edges={edges} matches={matching} />
        </div>
      )}

      {view === "list" && undatedCount > 0 && !loading && (
        <p className="mb-4 text-xs text-muted-foreground border rounded-lg p-3 bg-card">
          {undatedCount} of {episodes.length} episodes have no <code>occurred_at</code>, so they
          are ordered by when the wheel recorded them rather than by when they happened. That is
          registration order, not history.
        </p>
      )}

      {error && (
        <div className="mb-4 p-4 border rounded-lg bg-card">
          <p className="text-sm font-medium">The chronicle did not answer.</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={load} className="mw-btn mw-btn--ghost mt-2">
            Try again
          </button>
        </div>
      )}

      {!loading && episodes.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">
          No node carries <code>metadata.kind: &quot;chronicle_episode&quot;</code>. The wheel is
          reachable and holds no episodes — which is a different thing from the wheel being
          unreachable.
        </p>
      )}

      {view === "list" && (
      <ul className="space-y-2">
        {visible.map((episode) => {
          const number = episodeNumber(episode.id);
          const open = attentionCounts[episode.id] ?? 0;
          const related = relationCounts[episode.id] ?? 0;
          const dated = occurredAt(episode);
          return (
            <li key={episode.id}>
              <Link
                href={`/episodes/${encodeURIComponent(episode.id)}`}
                className="block p-4 border rounded-lg bg-card hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="flex items-baseline gap-2 min-w-0">
                    {number && (
                      <span className="font-mono text-xs text-muted-foreground shrink-0">
                        {number}
                      </span>
                    )}
                    <span className="font-medium truncate">{episode.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {related > 0 && (
                      <span className="mw-badge" title={`${related} relations to other episodes`}>
                        {related} related
                      </span>
                    )}
                    {open > 0 && (
                      <span className="mw-badge" title={`${open} open attention items`}>
                        {open} attention
                      </span>
                    )}
                    {episode.direction && (
                      <span className={`mw-badge mw-badge--${episode.direction}`}>
                        {DIRECTION_ICONS[episode.direction]} {episode.direction}
                      </span>
                    )}
                    <span
                      className="font-mono text-xs text-muted-foreground"
                      title={dated ? "occurred_at" : "created_at — when the wheel learned this"}
                    >
                      {formatDate(dated ?? episode.created_at ?? "")}
                      {!dated && "*"}
                    </span>
                  </div>
                </div>
                {episode.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {episode.description}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      )}

      {view === "list" && !loading && visible.length === 0 && episodes.length > 0 && (
        <p className="text-sm text-muted-foreground">Nothing matches “{query}”.</p>
      )}
    </div>
  );
}
