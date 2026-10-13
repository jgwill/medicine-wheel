/**
 * Lineage web — the geometry and the reading behind `<LineageWeb>`.
 *
 * Episodes sit on a spine in chronicle order, left to right, each in its
 * direction's band. A relation between two episodes is an arc. This module is
 * pure: it decides which episodes and arcs a view shows, where each episode
 * sits, and the path each arc takes, so the component only draws.
 *
 * Two copies of this picture existed before it lived here: Miadi's chronicle
 * (`app/chronicle/components/LineageWeb.tsx`) and the wheel's Episodes tab
 * (`components/episode-lineage-web.tsx`, #156). jgwill/medicine-wheel#162
 * brings them into one.
 *
 * @see ./lineage-layout.ts for the same spine laid out on `MWGraphData`.
 */

/** Continuation carries a thread forward; relation says two episodes speak to each other. */
export type LineageEdgeKind = 'continuation' | 'relation';

export const LINEAGE_BANDS = ['east', 'south', 'west', 'north'] as const;
export type LineageBand = (typeof LINEAGE_BANDS)[number];

export interface LineageWebEpisode {
  id: string;
  /** Short mark shown in the chip, e.g. `E044`. */
  label: string;
  title?: string;
  /** `east` | `south` | `west` | `north`; anything else sits between south and west. */
  direction?: string;
  /** `YYYY-MM-DD`, when known. The axis is labelled by month. */
  date?: string;
  /** Episodes of one thread are chained by a faint line, in order. */
  thread?: string;
  /** One more line for the chip, e.g. `East · Ceremony`. */
  caption?: string;
}

export interface LineageWebEdge {
  id?: string;
  from: string;
  to: string;
  kind: LineageEdgeKind;
  /** The words that say why the relation holds. */
  words?: string;
}

export interface LineageWebView {
  /** The whole chronicle, or the selected episode and its relatives. */
  scope: 'all' | 'around';
  /** How many relations away "around" and a search's relatives reach. */
  depth: 1 | 2;
  /** Which kinds of relation are drawn. */
  kinds: Record<LineageEdgeKind, boolean>;
  /** Thread chains on or off. */
  threads: boolean;
}

export const DEFAULT_LINEAGE_VIEW: LineageWebView = {
  scope: 'all',
  depth: 1,
  kinds: { continuation: true, relation: true },
  threads: true,
};

/**
 * Every episode within `depth` relations of a seed, the seeds included. A
 * relation is walked from either end: an episode that names a seed is as
 * related as one a seed names.
 */
export function lineageNeighbourhood(
  seeds: Iterable<string>,
  edges: readonly LineageWebEdge[],
  depth = 1,
): Set<string> {
  const adjacent = new Map<string, string[]>();
  for (const e of edges) {
    if (e.from === e.to) continue;
    (adjacent.get(e.from) ?? adjacent.set(e.from, []).get(e.from)!).push(e.to);
    (adjacent.get(e.to) ?? adjacent.set(e.to, []).get(e.to)!).push(e.from);
  }
  const reached = new Set(seeds);
  let frontier = [...reached];
  for (let step = 0; step < depth && frontier.length; step++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const other of adjacent.get(id) ?? []) {
        if (!reached.has(other)) {
          reached.add(other);
          next.push(other);
        }
      }
    }
    frontier = next;
  }
  return reached;
}

export interface VisibleLineageOptions {
  view: LineageWebView;
  /** The selected episode, which `scope: "around"` centres on. */
  focus?: string | null;
  /** The episodes a search matched, or null when nothing is typed. */
  matches?: ReadonlySet<string> | null;
  /**
   * `kin` (default): show the matches and their relatives, nothing else.
   * `fade`: show everything and fade what did not match.
   */
  matchMode?: 'kin' | 'fade';
}

export interface VisibleLineage {
  episodes: LineageWebEpisode[];
  edges: LineageWebEdge[];
  /** Under a `kin` search, the episodes the search found. The others shown are relatives. */
  found: Set<string> | null;
  /** Under a `fade` search, the episodes it did not match. */
  faded: Set<string>;
}

/** What a view shows: which episodes, which arcs, and how each episode is marked. */
export function visibleLineage(
  episodes: readonly LineageWebEpisode[],
  edges: readonly LineageWebEdge[],
  { view, focus = null, matches = null, matchMode = 'kin' }: VisibleLineageOptions,
): VisibleLineage {
  const ids = new Set(episodes.map((e) => e.id));
  const drawn = edges.filter(
    (e) => view.kinds[e.kind] && e.from !== e.to && ids.has(e.from) && ids.has(e.to),
  );

  let keep: Set<string> = ids;
  let found: Set<string> | null = null;
  const faded = new Set<string>();

  if (matches) {
    const hits = [...matches].filter((id) => ids.has(id));
    if (matchMode === 'kin') {
      found = new Set(hits);
      keep = lineageNeighbourhood(hits, drawn, view.depth);
    } else {
      for (const id of ids) if (!matches.has(id)) faded.add(id);
    }
  }

  if (view.scope === 'around' && focus && keep.has(focus)) {
    const around = lineageNeighbourhood([focus], drawn, view.depth);
    keep = new Set([...keep].filter((id) => around.has(id)));
  }

  return {
    episodes: episodes.filter((e) => keep.has(e.id)),
    edges: drawn.filter((e) => keep.has(e.from) && keep.has(e.to)),
    found,
    faded,
  };
}

export interface LineageWebLayoutConfig {
  marginL: number;
  marginR: number;
  /** Room above the east band, where continuation arcs rise. */
  headroom: number;
  /** Distance between two bands. */
  bandGap: number;
  /** Room below the north band, where relation arcs fall. */
  footroom: number;
  /** Height of the month axis under everything. */
  axis: number;
  /** Fewest pixels between neighbours before the canvas widens. */
  minStep: number;
  minWidth: number;
  /** Neighbours in one band step -stagger, 0, +stagger so same-day episodes stay apart. */
  stagger: number;
}

export const DEFAULT_LINEAGE_WEB_LAYOUT: LineageWebLayoutConfig = {
  marginL: 64,
  marginR: 40,
  headroom: 120,
  bandGap: 120,
  footroom: 110,
  axis: 22,
  minStep: 19,
  minWidth: 960,
  stagger: 14,
};

export interface LineageWebLayout {
  width: number;
  height: number;
  positions: Map<string, { x: number; y: number }>;
  bandY: Record<LineageBand, number>;
  /** Where each month starts along the spine. */
  months: Array<{ x: number; label: string }>;
  config: LineageWebLayoutConfig;
}

/** Positions for episodes already in chronicle order. */
export function layoutLineageWeb(
  episodes: readonly LineageWebEpisode[],
  config: Partial<LineageWebLayoutConfig> = {},
): LineageWebLayout {
  const cfg = { ...DEFAULT_LINEAGE_WEB_LAYOUT, ...config };
  const bandY = Object.fromEntries(
    LINEAGE_BANDS.map((band, i) => [band, cfg.headroom + i * cfg.bandGap]),
  ) as Record<LineageBand, number>;
  const undirectedY = cfg.headroom + 1.5 * cfg.bandGap;
  const height = cfg.headroom + 3 * cfg.bandGap + cfg.footroom + cfg.axis;

  const n = episodes.length;
  const width = Math.max(cfg.minWidth, cfg.marginL + cfg.marginR + Math.max(0, n - 1) * cfg.minStep);
  const step = n > 1 ? (width - cfg.marginL - cfg.marginR) / (n - 1) : 0;

  const positions = new Map<string, { x: number; y: number }>();
  const months: Array<{ x: number; label: string }> = [];
  const seenInBand = new Map<string, number>();
  let lastMonth = '';
  episodes.forEach((episode, i) => {
    const band = (LINEAGE_BANDS as readonly string[]).includes(episode.direction ?? '')
      ? (episode.direction as LineageBand)
      : null;
    const key = band ?? 'undirected';
    const nth = seenInBand.get(key) ?? 0;
    seenInBand.set(key, nth + 1);
    const x = cfg.marginL + i * step;
    positions.set(episode.id, { x, y: (band ? bandY[band] : undirectedY) + ((nth % 3) - 1) * cfg.stagger });

    const month = episode.date?.slice(0, 7) ?? '';
    if (month && month !== lastMonth) {
      months.push({ x, label: month });
      lastMonth = month;
    }
  });

  return { width, height, positions, bandY, months, config: cfg };
}

/** Highest and lowest y a quadratic from `ay` through control `cy` to `by` reaches. */
function quadraticYRange(ay: number, cy: number, by: number): [number, number] {
  const denom = ay - 2 * cy + by;
  const t = denom === 0 ? -1 : (ay - cy) / denom;
  const ys = [ay, by];
  if (t > 0 && t < 1) ys.push((1 - t) ** 2 * ay + 2 * t * (1 - t) * cy + t ** 2 * by);
  return [Math.min(...ys), Math.max(...ys)];
}

/**
 * The path of one arc. It bows away from the straight line between its two
 * episodes: continuation to the upper side, relation to the lower side, so the
 * two kinds do not share one band of the canvas. Between two bands the bow
 * is sideways and the arc stays a gentle curve, not a loop over the top.
 * The bow grows with the square root of the arc's length: neighbours stay
 * close to the spine, and long relations fan out by length instead of
 * stacking at one height. The arc never leaves the canvas.
 */
export function lineageArcPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  kind: LineageEdgeKind,
  layout: Pick<LineageWebLayout, 'width' | 'height' | 'config'>,
): string {
  const { config } = layout;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  // The normal to the chord, turned to the upper side for continuation and the
  // lower side for relation. A vertical chord bows left or right.
  let nx = -dy / length;
  let ny = dx / length;
  const upper = ny < 0 || (ny === 0 && nx < 0);
  if ((kind === 'continuation') !== upper) {
    nx = -nx;
    ny = -ny;
  }
  const reach = Math.sqrt(length / Math.max(1, layout.width));
  const maxBow = Math.min(config.headroom, config.footroom) - 10;
  // A quadratic's middle sits halfway between the chord and its control point.
  let bow = 2 * (12 + reach * Math.max(0, maxBow - 12));
  const top = 6;
  const bottom = layout.height - config.axis - 6;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  for (let i = 0; i < 8; i++) {
    const [lo, hi] = quadraticYRange(a.y, my + ny * bow, b.y);
    if (lo >= top && hi <= bottom) break;
    bow *= 0.7;
  }
  const r = (v: number) => Math.round(v * 10) / 10;
  return `M ${r(a.x)} ${r(a.y)} Q ${r(mx + nx * bow)} ${r(my + ny * bow)} ${r(b.x)} ${r(b.y)}`;
}

/** Consecutive episodes of each thread, as pairs to chain. */
export function threadChains(episodes: readonly LineageWebEpisode[]): Array<{ from: string; to: string; thread: string }> {
  const last = new Map<string, string>();
  const chains: Array<{ from: string; to: string; thread: string }> = [];
  for (const e of episodes) {
    if (!e.thread) continue;
    const prev = last.get(e.thread);
    if (prev) chains.push({ from: prev, to: e.id, thread: e.thread });
    last.set(e.thread, e.id);
  }
  return chains;
}
