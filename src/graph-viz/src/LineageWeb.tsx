'use client';

/**
 * @medicine-wheel/graph-viz — LineageWeb
 *
 * Episodes on a spine in chronicle order, each in its direction's band, with
 * the relations between them drawn as arcs: continuation above, relation
 * below. Pure SVG, no router and no CSS framework: colours come from the
 * `--mw-*` tokens (with fallbacks) or the `colors` prop, and opening an
 * episode is the caller's `onOpen`.
 *
 * Hover or select an episode to light its arcs. A tap selects, a second tap
 * opens. A search (`matches`) keeps the episodes related to what it found.
 * The options bar chooses the whole chronicle or the selected episode's
 * relatives, which kinds of relation to draw, and the thread chains.
 * jgwill/medicine-wheel#162.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_LINEAGE_VIEW,
  LINEAGE_BANDS,
  layoutLineageWeb,
  lineageArcPath,
  threadChains,
  visibleLineage,
  type LineageEdgeKind,
  type LineageWebEdge,
  type LineageWebEpisode,
  type LineageWebLayoutConfig,
  type LineageWebView,
} from './lineage-web.js';

export interface LineageWebColors {
  east: string;
  south: string;
  west: string;
  north: string;
  /** Episodes with no direction. */
  undirected: string;
  text: string;
  muted: string;
  border: string;
  /** The lit arcs, the active option, the selection ring. */
  accent: string;
  /** The chip's ground. */
  panel: string;
}

export const DEFAULT_LINEAGE_WEB_COLORS: LineageWebColors = {
  east: 'var(--mw-east-ink, #FFD700)',
  south: 'var(--mw-south-ink, #FF7B72)',
  west: 'var(--mw-west-ink, #9FAEC9)',
  north: 'var(--mw-north-ink, #F7F5F0)',
  undirected: 'var(--mw-muted, #A9A7C5)',
  text: 'var(--mw-fg, #F0EFF7)',
  muted: 'var(--mw-muted, #A9A7C5)',
  border: 'var(--mw-border, #2B2B4E)',
  accent: 'var(--mw-primary, #E0B84C)',
  panel: 'var(--mw-card, #12122A)',
};

export interface LineageWebProps {
  /** In chronicle order, oldest first. */
  episodes: LineageWebEpisode[];
  edges: LineageWebEdge[];
  /** The selected episode. Pass it to control the selection; leave it out to let the web hold it. */
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  /** A second tap on the selected episode. */
  onOpen?: (id: string) => void;
  /** The episodes a search matched, or null when nothing is typed. */
  matches?: ReadonlySet<string> | null;
  /** `kin` (default) keeps the matches and their relatives; `fade` dims what did not match. */
  matchMode?: 'kin' | 'fade';
  /** Pass it to control the view; leave it out to let the options bar hold it. */
  view?: LineageWebView;
  defaultView?: Partial<LineageWebView>;
  onViewChange?: (view: LineageWebView) => void;
  /** The options bar above the canvas. Default true. */
  controls?: boolean;
  /** A chip naming the hovered or selected episode. Default true. */
  chip?: boolean;
  colors?: Partial<LineageWebColors>;
  /** Thread name → colour of its chain. */
  threadColors?: Record<string, string>;
  layout?: Partial<LineageWebLayoutConfig>;
  /** Where the canvas opens when it is wider than its box. Default `start`. */
  startAt?: 'start' | 'end';
  /** Words for the band labels, e.g. `{ east: 'East · Waabinong' }`. */
  bandLabels?: Partial<Record<(typeof LINEAGE_BANDS)[number], string>>;
  /** Each episode's `label` beside its dot. `auto` (default) shows them when 40 or fewer episodes are drawn. */
  labels?: 'auto' | 'always' | 'never';
  style?: React.CSSProperties;
}

const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export function LineageWeb({
  episodes,
  edges,
  selected: selectedProp,
  onSelect,
  onOpen,
  matches = null,
  matchMode = 'kin',
  view: viewProp,
  defaultView,
  onViewChange,
  controls = true,
  chip = true,
  colors: colorsProp,
  threadColors = {},
  layout: layoutProp,
  startAt = 'start',
  bandLabels = {},
  labels = 'auto',
  style,
}: LineageWebProps) {
  const colors = { ...DEFAULT_LINEAGE_WEB_COLORS, ...colorsProp };
  const [ownSelected, setOwnSelected] = useState<string | null>(null);
  const selected = selectedProp !== undefined ? selectedProp : ownSelected;
  const [ownView, setOwnView] = useState<LineageWebView>({ ...DEFAULT_LINEAGE_VIEW, ...defaultView });
  const view = viewProp ?? ownView;
  const [hovered, setHovered] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const select = (id: string | null) => {
    if (selectedProp === undefined) setOwnSelected(id);
    onSelect?.(id);
  };
  const changeView = (patch: Partial<LineageWebView>) => {
    const next = { ...view, ...patch, kinds: { ...view.kinds, ...patch.kinds } };
    if (!viewProp) setOwnView(next);
    onViewChange?.(next);
  };

  const shown = useMemo(
    () => visibleLineage(episodes, edges, { view, focus: selected, matches, matchMode }),
    [episodes, edges, view, selected, matches, matchMode],
  );
  const layout = useMemo(() => layoutLineageWeb(shown.episodes, layoutProp), [shown.episodes, layoutProp]);
  const chains = useMemo(() => (view.threads ? threadChains(shown.episodes) : []), [shown.episodes, view.threads]);
  const byId = useMemo(() => new Map(shown.episodes.map((e) => [e.id, e])), [shown.episodes]);
  const hasThreads = useMemo(() => episodes.some((e) => e.thread), [episodes]);

  useEffect(() => {
    const el = scroller.current;
    if (el && startAt === 'end') el.scrollLeft = el.scrollWidth;
  }, [layout.width, startAt]);

  const focus = hovered ?? selected;
  const near = useMemo(() => {
    if (!focus || !byId.has(focus)) return null;
    const set = new Set([focus]);
    for (const e of shown.edges) {
      if (e.from === focus) set.add(e.to);
      if (e.to === focus) set.add(e.from);
    }
    return set;
  }, [focus, byId, shown.edges]);

  const colorOf = (direction?: string) =>
    direction && (LINEAGE_BANDS as readonly string[]).includes(direction)
      ? colors[direction as (typeof LINEAGE_BANDS)[number]]
      : colors.undirected;

  const tap = (id: string) => {
    if (selected === id) onOpen?.(id);
    else select(id);
  };

  const active = focus ? byId.get(focus) ?? null : null;
  const showLabels = labels === 'always' || (labels === 'auto' && shown.episodes.length <= 40);
  const relatives = shown.found ? shown.episodes.length - shown.found.size : 0;
  const summary = shown.found
    ? `${shown.found.size} found · ${relatives} related · ${shown.edges.length} relations`
    : `${shown.episodes.length} episodes · ${shown.edges.length} relations`;

  const option = (on: boolean): React.CSSProperties => ({
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontFamily: 'inherit',
    cursor: 'pointer',
    background: 'transparent',
    color: on ? colors.text : colors.muted,
    border: `1px solid ${on ? colors.accent : colors.border}`,
    fontWeight: on ? 700 : 500,
  });
  const kindLabel: Record<LineageEdgeKind, string> = { continuation: 'continues from', relation: 'relates to' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, ...style }}>
      {controls && (
        <div
          role="toolbar"
          aria-label="Lineage view"
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: colors.muted }}
        >
          <button type="button" aria-pressed={view.scope === 'all'} style={option(view.scope === 'all')} onClick={() => changeView({ scope: 'all' })}>
            Whole chronicle
          </button>
          <button
            type="button"
            aria-pressed={view.scope === 'around'}
            style={option(view.scope === 'around')}
            onClick={() => changeView({ scope: 'around' })}
            title="The selected episode and the episodes related to it"
          >
            Around the selected episode
          </button>
          <button
            type="button"
            style={option(view.depth === 2)}
            aria-pressed={view.depth === 2}
            onClick={() => changeView({ depth: view.depth === 2 ? 1 : 2 })}
            title="How far relatives reach, around an episode and in a search"
          >
            {view.depth === 2 ? '2 steps' : '1 step'}
          </button>
          <span style={{ width: 1, height: 16, background: colors.border, margin: '0 4px' }} />
          {(['continuation', 'relation'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={view.kinds[kind]}
              style={option(view.kinds[kind])}
              onClick={() => changeView({ kinds: { ...view.kinds, [kind]: !view.kinds[kind] } })}
            >
              <svg width={18} height={8} aria-hidden style={{ marginRight: 6, verticalAlign: 'middle' }}>
                <line x1={1} y1={4} x2={17} y2={4} stroke="currentColor" strokeWidth={1.6} strokeDasharray={kind === 'relation' ? '3 3' : undefined} />
              </svg>
              {kindLabel[kind]}
            </button>
          ))}
          {hasThreads && (
            <button type="button" aria-pressed={view.threads} style={option(view.threads)} onClick={() => changeView({ threads: !view.threads })}>
              threads
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontFamily: FONT_MONO, fontSize: 11 }}>{summary}</span>
        </div>
      )}

      <div style={{ position: 'relative', minWidth: 0 }}>
        <div ref={scroller} style={{ overflowX: 'auto' }}>
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="img"
            aria-label={`${summary}, in chronicle order`}
            style={{ display: 'block', maxWidth: 'none' }}
            onClick={(event) => {
              if (event.target === event.currentTarget) select(null);
            }}
          >
            {LINEAGE_BANDS.map((band) => (
              <g key={band} pointerEvents="none">
                <line x1={0} x2={layout.width} y1={layout.bandY[band]} y2={layout.bandY[band]} stroke={colors.border} strokeWidth={1} strokeDasharray="2 8" />
                <text x={10} y={layout.bandY[band] - 22} fill={colors[band]} fontSize={11} fontFamily={FONT_MONO}>
                  {bandLabels[band] ?? band}
                </text>
              </g>
            ))}

            {layout.months.map((m) => (
              <text
                key={m.label}
                x={m.x}
                y={layout.height - 7}
                textAnchor={m.x > layout.width - 60 ? 'end' : 'start'}
                fontSize={10}
                fontFamily={FONT_MONO}
                fill={colors.muted}
                pointerEvents="none"
              >
                {m.label}
              </text>
            ))}

            {chains.map((c) => {
              const a = layout.positions.get(c.from);
              const b = layout.positions.get(c.to);
              if (!a || !b) return null;
              return (
                <line
                  key={`t:${c.from}:${c.to}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={threadColors[c.thread] ?? colors.muted}
                  strokeWidth={0.6}
                  opacity={focus ? 0.08 : 0.2}
                  pointerEvents="none"
                />
              );
            })}

            {shown.edges.map((e, i) => {
              const a = layout.positions.get(e.from);
              const b = layout.positions.get(e.to);
              if (!a || !b) return null;
              const lit = focus !== null && (e.from === focus || e.to === focus);
              const from = byId.get(e.from);
              return (
                <path
                  key={e.id ?? `${e.from}:${e.kind}:${e.to}:${i}`}
                  d={lineageArcPath(a, b, e.kind, layout)}
                  fill="none"
                  stroke={lit ? colors.accent : colorOf(from?.direction)}
                  strokeWidth={lit ? 2 : 1.2}
                  strokeDasharray={e.kind === 'relation' ? '4 3' : undefined}
                  opacity={lit ? 1 : focus ? 0.1 : e.kind === 'continuation' ? 0.55 : 0.4}
                  pointerEvents="none"
                >
                  {e.words && <title>{e.words}</title>}
                </path>
              );
            })}

            {shown.episodes.map((episode) => {
              const p = layout.positions.get(episode.id)!;
              const color = colorOf(episode.direction);
              const relative = shown.found !== null && !shown.found.has(episode.id);
              const dim = shown.faded.has(episode.id) || (near !== null && !near.has(episode.id));
              const isSelected = episode.id === selected;
              return (
                <g
                  key={episode.id}
                  transform={`translate(${p.x} ${p.y})`}
                  style={{ cursor: 'pointer' }}
                  opacity={dim ? 0.25 : 1}
                  onClick={() => tap(episode.id)}
                  onMouseEnter={() => setHovered(episode.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>{`${episode.label} · ${episode.title ?? episode.id}${relative ? ' (related)' : ''}`}</title>
                  {/* A target a finger can hit, larger than the dot it holds. */}
                  <circle r={10} fill="transparent" />
                  {episode.id === focus && <circle r={11} fill={color} opacity={0.22} />}
                  {relative ? (
                    <circle r={4.5} fill="none" stroke={color} strokeWidth={1.6} />
                  ) : (
                    <circle r={isSelected ? 6 : 4} fill={color} />
                  )}
                  {isSelected && <circle r={8.5} fill="none" stroke={colors.text} strokeWidth={1.4} />}
                  {showLabels && (
                    <text x={7} y={-8} fontSize={10} fontFamily={FONT_MONO} fill={colors.muted} pointerEvents="none">
                      {episode.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {chip && active && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 30,
              maxWidth: 320,
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderLeft: `3px solid ${colorOf(active.direction)}`,
              borderRadius: 10,
              padding: '10px 12px',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11, color: colors.muted }}>
              <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: colorOf(active.direction) }}>{active.label}</span>
              {active.date && <span style={{ fontFamily: FONT_MONO }}>{active.date}</span>}
              {active.caption && <span style={{ marginLeft: 'auto' }}>{active.caption}</span>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, color: colors.text }}>{active.title ?? active.id}</div>
            {shown.found && !shown.found.has(active.id) && (
              <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>related to an episode the search found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
