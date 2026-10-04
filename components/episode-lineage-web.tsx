"use client";

/**
 * The chronicle as a lineage: every episode on a spine read left to right, in
 * its direction's band, with the relations between episodes drawn as arcs.
 *
 * Miadi's chronicle opens on this picture (`LineageWeb`), and it answers what a
 * list cannot: which episodes carry a thread forward, which stand alone, where
 * the work keeps returning. The wheel already holds every relation it draws.
 *
 * Tap an episode to see its relations and the words that say why each holds;
 * tap it again, or its name, to open it. Touch first — a phone has no hover.
 * Ref jgwill/medicine-wheel#156.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isContinuation, relationsOf, type LineageEdge } from "@/lib/episode-lineage";

export interface LineageEpisode {
  id: string;
  name: string;
  direction?: string;
  /** `YYYY-MM-DD`, when known: the axis is labelled by month. */
  date?: string;
}

const BANDS = ["east", "south", "west", "north"] as const;
const BAND_ICON: Record<string, string> = { east: "🌅", south: "🔥", west: "🌊", north: "❄️" };
const BAND_H = 64;
const TOP = 28;
const AXIS = 26;
const STEP = 15;
const MARGIN_L = 72;
const MARGIN_R = 24;
const H = TOP + BAND_H * BANDS.length + AXIS;

function bandOf(direction?: string): number {
  const at = BANDS.indexOf((direction ?? "") as (typeof BANDS)[number]);
  return at === -1 ? 1.5 : at;
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
  /** When a filter is typed: the episodes it matches. The rest fade. */
  matches?: Set<string> | null;
}) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const layout = useMemo(() => {
    const position = new Map<string, { x: number; y: number }>();
    episodes.forEach((episode, i) => {
      const x = MARGIN_L + i * STEP;
      // A small stagger so neighbours in one band do not sit on one line.
      const y = TOP + (bandOf(episode.direction) + 0.5) * BAND_H + ((i % 3) - 1) * 13;
      position.set(episode.id, { x, y });
    });
    const width = Math.max(MARGIN_L + (episodes.length - 1) * STEP + MARGIN_R, 360);

    const months: Array<{ x: number; label: string }> = [];
    let last = "";
    episodes.forEach((episode, i) => {
      const month = episode.date?.slice(0, 7) ?? "";
      if (month && month !== last) {
        months.push({ x: MARGIN_L + i * STEP, label: month });
        last = month;
      }
    });

    const degree = new Map<string, number>();
    for (const edge of edges) {
      degree.set(edge.from_id, (degree.get(edge.from_id) ?? 0) + 1);
      degree.set(edge.to_id, (degree.get(edge.to_id) ?? 0) + 1);
    }
    return { position, width, months, degree };
  }, [episodes, edges]);

  // The newest episodes are where the work is: open scrolled to the right.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [layout.width]);

  const focus = hovered ?? selected;
  const near = useMemo(() => {
    if (!focus) return null;
    const set = new Set([focus]);
    for (const edge of edges) {
      if (edge.from_id === focus) set.add(edge.to_id);
      if (edge.to_id === focus) set.add(edge.from_id);
    }
    return set;
  }, [focus, edges]);

  const byId = useMemo(() => new Map(episodes.map((e) => [e.id, e])), [episodes]);
  const chosen = selected ? byId.get(selected) : undefined;
  const chosenRelations = useMemo(
    () => (selected ? relationsOf(selected, edges) : []),
    [selected, edges],
  );

  function open(id: string) {
    router.push(`/episodes/${encodeURIComponent(id)}`);
  }

  function tap(id: string) {
    if (selected === id) open(id);
    else setSelected(id);
  }

  const faded = (id: string) =>
    (near !== null && !near.has(id)) || (matches != null && !matches.has(id));

  return (
    <div className="space-y-3">
      <div ref={scroller} className="overflow-x-auto border rounded-lg bg-card">
        <svg
          width={layout.width}
          height={H}
          viewBox={`0 0 ${layout.width} ${H}`}
          role="img"
          aria-label={`${episodes.length} episodes in chronicle order, with ${edges.length} relations between them`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          {BANDS.map((band, i) => (
            <g key={band}>
              <line
                x1={0}
                x2={layout.width}
                y1={TOP + (i + 1) * BAND_H}
                y2={TOP + (i + 1) * BAND_H}
                stroke="var(--mw-border)"
                strokeWidth={1}
                opacity={0.5}
              />
              <text x={8} y={TOP + i * BAND_H + 16} fontSize={11} fill="var(--mw-muted)">
                {BAND_ICON[band]} {band}
              </text>
            </g>
          ))}

          {layout.months.map((m) => (
            <text key={m.label} x={m.x} y={H - 8} fontSize={10} fill="var(--mw-muted)">
              {m.label}
            </text>
          ))}

          {edges.map((edge) => {
            const a = layout.position.get(edge.from_id);
            const b = layout.position.get(edge.to_id);
            if (!a || !b) return null;
            const lit = focus !== null && (edge.from_id === focus || edge.to_id === focus);
            const lift = Math.min(110, Math.abs(b.x - a.x) * 0.3) + 18;
            const top = Math.max(6, Math.min(a.y, b.y) - lift);
            const continuation = isContinuation(edge);
            return (
              <path
                key={edge.id}
                d={`M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${top} ${b.x} ${b.y}`}
                fill="none"
                stroke={lit ? "var(--mw-primary)" : "var(--mw-muted)"}
                strokeWidth={lit ? 2 : 1}
                strokeDasharray={continuation ? undefined : "3 3"}
                opacity={lit ? 1 : focus ? 0.12 : continuation ? 0.55 : 0.3}
              />
            );
          })}

          {episodes.map((episode) => {
            const p = layout.position.get(episode.id)!;
            const related = (layout.degree.get(episode.id) ?? 0) > 0;
            const isSelected = episode.id === selected;
            return (
              <g
                key={episode.id}
                onClick={() => tap(episode.id)}
                onMouseEnter={() => setHovered(episode.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
                opacity={faded(episode.id) ? 0.2 : 1}
              >
                <title>{episode.name}</title>
                {/* A target a finger can hit, larger than the dot it holds. */}
                <circle cx={p.x} cy={p.y} r={9} fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={related ? 4.5 : 3}
                  fill={`var(--mw-${episode.direction ?? "west"}-ink, var(--mw-muted))`}
                  stroke={isSelected ? "var(--mw-primary)" : "none"}
                  strokeWidth={isSelected ? 2.5 : 0}
                />
              </g>
            );
          })}
        </svg>
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
          Each dot is an episode, oldest on the left, in its direction&apos;s band. Solid arcs carry
          a thread forward (continues from); dashed arcs relate two episodes. Tap a dot to see why
          they are related; tap it again to open it.
        </p>
      )}
    </div>
  );
}
