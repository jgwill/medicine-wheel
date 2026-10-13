"use client";

/**
 * The chronicle as a lineage: every episode on a spine read left to right, in
 * its direction's band, with the relations between episodes drawn as arcs.
 *
 * The web itself is `LineageWeb` from `@medicine-wheel/graph-viz`, the one the
 * Miadi chronicle draws too (#162). This file adapts the wheel's edges to it
 * and shows, under it, the selected episode's relations and the words that say
 * why each holds. A tap selects, a second tap opens. Ref jgwill/medicine-wheel#156.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineageWeb, type LineageWebEdge, type LineageWebLayoutConfig } from "@medicine-wheel/graph-viz";
import { isContinuation, relationsOf, type LineageEdge } from "@/lib/episode-lineage";

export interface LineageEpisode {
  id: string;
  name: string;
  direction?: string;
  /** `YYYY-MM-DD`, when known: the axis is labelled by month. */
  date?: string;
}

const BAND_LABELS = { east: "🌅 east", south: "🔥 south", west: "🌊 west", north: "❄️ north" };
// The wheel's page is narrower than the chronicle's: closer bands, less room for arcs.
const LAYOUT: Partial<LineageWebLayoutConfig> = { headroom: 90, bandGap: 84, footroom: 84, minStep: 15, minWidth: 360 };

/** `E044` from a `chronicle:<date>-episode-044-…` id; the dot's chip shows the name under it. */
function markOf(id: string): string {
  const n = /episode-(\d+)/i.exec(id)?.[1];
  return n ? `E${n.padStart(3, "0")}` : "·";
}

export function EpisodeLineageWeb({
  episodes,
  edges,
  matches,
}: {
  /** In chronicle order, oldest first. */
  episodes: LineageEpisode[];
  /** Episode↔episode relations only. */
  edges: LineageEdge[];
  /** When a filter is typed: the episodes it matches. Their relatives stay, as rings. */
  matches?: Set<string> | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const webEpisodes = useMemo(
    () => episodes.map((e) => ({ id: e.id, label: markOf(e.id), title: e.name, direction: e.direction, date: e.date })),
    [episodes],
  );
  const webEdges = useMemo<LineageWebEdge[]>(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        from: edge.from_id,
        to: edge.to_id,
        kind: isContinuation(edge) ? "continuation" : "relation",
        words: edge.description,
      })),
    [edges],
  );

  const byId = useMemo(() => new Map(episodes.map((e) => [e.id, e])), [episodes]);
  const chosen = selected ? byId.get(selected) : undefined;
  const chosenRelations = useMemo(
    () => (selected ? relationsOf(selected, edges) : []),
    [selected, edges],
  );

  return (
    <div className="space-y-3">
      <div className="border rounded-lg bg-card p-2">
        <LineageWeb
          episodes={webEpisodes}
          edges={webEdges}
          selected={selected}
          onSelect={setSelected}
          onOpen={(id) => router.push(`/episodes/${encodeURIComponent(id)}`)}
          matches={matches}
          layout={LAYOUT}
          bandLabels={BAND_LABELS}
          startAt="end"
        />
      </div>

      {chosen ? (
        <div className="p-3 border rounded-lg bg-card space-y-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <Link href={`/episodes/${encodeURIComponent(chosen.id)}`} className="text-sm font-medium hover:underline">
              {chosen.name}
            </Link>
            <span className="text-xs text-muted-foreground">{chosen.date}</span>
          </div>
          {chosenRelations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No relation to another episode has been woven yet.</p>
          ) : (
            <ul className="space-y-1">
              {chosenRelations.map((r) => (
                <li key={`${r.other}-${r.label}`} className="text-sm">
                  <span className="text-muted-foreground">{r.label}</span>{" "}
                  <button className="hover:underline text-left" onClick={() => setSelected(r.other)}>
                    {byId.get(r.other)?.name ?? r.other}
                  </button>
                  {r.descriptions[0] && (
                    <p className="text-xs text-muted-foreground pl-3">{r.descriptions[0]}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Each dot is an episode, oldest on the left, in its direction&apos;s band. Solid arcs above carry
          a thread forward (continues from); dashed arcs below relate two episodes. Tap a dot to see why
          they are related; tap it again to open it. A filter keeps what it found and, as rings, the
          episodes related to it.
        </p>
      )}
    </div>
  );
}
