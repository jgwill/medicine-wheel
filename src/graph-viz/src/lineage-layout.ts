/**
 * Lineage layout — the chronicle as a spine you read left to right.
 *
 * `applyWheelLayout` answers "what direction is this?" and answers it well. It
 * cannot answer "what came before this?", because a circle has no before. At 85
 * episodes with 93 of them in one quadrant, the wheel is also simply full.
 *
 * So: **x is time, y is direction.** Each episode sits at its own date along a
 * horizontal spine, in the band of its direction, and a relation arcs from what
 * an episode continues from to the episode itself.
 *
 * ## This layout requires `metadata.occurred_at`
 *
 * `created_at` records when the wheel *learned* of a node, not when the thing
 * happened. Measured 2026-09-05 before the backfill: 0 of 84 episodes carried
 * an occurrence date, and twelve May episodes shared one September `created_at`
 * from a single import batch — so a timeline drawn on `created_at` would have
 * stacked four months of work on one pixel and looked correct while being
 * wrong.
 *
 * Migration 0002 backfilled `occurred_at` from each `episode.yaml`; 34 of 76
 * episodes had a `created_at` that disagreed with when they happened, episode
 * 001 by four months. Nodes still lacking it fall back to `created_at` and are
 * reported in `undated`, so a caller can say so rather than implying a history
 * the data does not have.
 *
 * Ported from the mechanism in `/src/Miadi/app/chronicle/components/
 * LineageWeb.tsx`, which solved this for the chronicle app first.
 */

import type { MWGraphData, MWGraphNode } from './types.js';
import type { DirectionName } from '@medicine-wheel/ontology-core';

export interface LineageLayoutConfig {
  /** Horizontal padding either side of the spine. */
  marginX: number;
  /** Minimum pixels between adjacent nodes before the canvas widens. */
  minStep: number;
  /** Vertical centre of each direction's band. */
  bandY: Record<DirectionName, number>;
  /** Band for a node carrying no direction. */
  undirectedY: number;
  /**
   * Vertical stagger applied to consecutive nodes in the same band, so episodes
   * on the same day do not land on one another. Deterministic, not random —
   * the same graph must lay out identically twice or a saved disposition is
   * meaningless.
   */
  stagger: number;
}

export const DEFAULT_LINEAGE_LAYOUT: LineageLayoutConfig = {
  marginX: 80,
  minStep: 19,
  bandY: { east: 120, south: 260, west: 400, north: 540 },
  undirectedY: 670,
  stagger: 16,
};

export interface LineageLayoutResult extends MWGraphData {
  /** Canvas width the spine needs — grows with the corpus. */
  width: number;
  /** Earliest and latest date placed, or null when nothing was datable. */
  span: { from: string; to: string } | null;
  /**
   * Ids placed by `created_at` because they carry no `occurred_at`. Surfaced so
   * a caller can name them rather than presenting registration order as
   * history.
   */
  undated: string[];
}

/** When a node says it happened, falling back to when the wheel learned of it. */
function occurrenceDate(node: MWGraphNode): { date: string; exact: boolean } {
  const occurred = node.metadata?.occurred_at;
  if (typeof occurred === 'string' && occurred) return { date: occurred, exact: true };

  // `created_at` sits on the node itself, not in metadata — `buildGraphData`
  // keeps the whole RelationalNode on `data`, which is where to find it.
  const created =
    (node as { data?: { created_at?: unknown } }).data?.created_at ??
    node.metadata?.created_at;
  if (typeof created === 'string' && created) return { date: created.slice(0, 10), exact: false };

  return { date: '', exact: false };
}

/**
 * Lay a graph out as a chronological spine.
 *
 * Returns new node objects rather than mutating — `applyWheelLayout` mutates in
 * place, and a caller switching between the two needs the wheel's positions to
 * survive the round trip.
 */
export function applyLineageLayout(
  data: MWGraphData,
  config: Partial<LineageLayoutConfig> = {},
): LineageLayoutResult {
  const cfg: LineageLayoutConfig = { ...DEFAULT_LINEAGE_LAYOUT, ...config };

  const dated = data.nodes.map((node) => ({ node, ...occurrenceDate(node) }));
  const undated = dated.filter((d) => !d.exact).map((d) => d.node.id);

  // Sort by date, then by id — a stable tiebreak so two nodes on the same day
  // keep their order between renders.
  const sorted = [...dated].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    return byDate !== 0 ? byDate : a.node.id.localeCompare(b.node.id);
  });

  const width = Math.max(1180, sorted.length * cfg.minStep + cfg.marginX * 2);
  const step = sorted.length > 1 ? (width - cfg.marginX * 2) / (sorted.length - 1) : 0;

  // Stagger counts within a band, not across the whole row: two neighbours in
  // different directions are already far apart vertically and do not need it.
  const seenInBand = new Map<string, number>();

  const nodes: MWGraphNode[] = sorted.map((entry, index) => {
    const band = entry.node.direction ?? 'undirected';
    const nth = seenInBand.get(band) ?? 0;
    seenInBand.set(band, nth + 1);

    const baseY = entry.node.direction
      ? cfg.bandY[entry.node.direction]
      : cfg.undirectedY;

    return {
      ...entry.node,
      x: cfg.marginX + index * step,
      // -stagger, 0, +stagger, repeating — enough to separate same-day nodes
      // without breaking the band's readability.
      y: baseY + ((nth % 3) - 1) * cfg.stagger,
    };
  });

  const withDates = sorted.filter((d) => d.date);
  const span =
    withDates.length > 0
      ? { from: withDates[0].date, to: withDates[withDates.length - 1].date }
      : null;

  return { nodes, links: data.links, width, span, undated };
}
