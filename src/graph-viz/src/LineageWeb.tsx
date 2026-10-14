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
 *
 * Moved and read by hand (#163): drag the empty canvas along time; zoom with
 * − + Fit, Ctrl/⌘ + wheel or a pinch, the moment under the pointer staying put;
 * hover or tap an arc for the words that say why the relation holds; ← → step
 * along time, ↑ ↓ choose a relation, Enter follows it or opens the episode,
 * Esc steps back. A new selection scrolls into view, and the band names stay
 * at the left edge.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_LINEAGE_VIEW,
  DEFAULT_LINEAGE_WEB_LAYOUT,
  LINEAGE_BANDS,
  fitZoom,
  layoutLineageWeb,
  lineageArcPath,
  lineageEdgeKey,
  relationsAround,
  stepAlongSpine,
  threadChains,
  visibleLineage,
  zoomScrollLeft,
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
  /** The ground of the band names and the strip. */
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
  /** A second tap on the selected episode, or Enter. */
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
  /** The strip under the canvas naming the episode or relation in focus. Default true. */
  chip?: boolean;
  colors?: Partial<LineageWebColors>;
  /** Thread name → colour of its chain. */
  threadColors?: Record<string, string>;
  layout?: Partial<LineageWebLayoutConfig>;
  /** Where the canvas opens when it is wider than its box and nothing is selected. Default `start`. */
  startAt?: 'start' | 'end';
  /** Words for the band labels, e.g. `{ east: 'East · Waabinong' }`. */
  bandLabels?: Partial<Record<(typeof LINEAGE_BANDS)[number], string>>;
  /** Labels beside the dots. `auto` (default): all when 40 or fewer are drawn, else the episode in focus and its relatives. */
  labels?: 'auto' | 'always' | 'never';
  style?: React.CSSProperties;
}

const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const MAX_ZOOM = 8;
const KIND_LABEL: Record<LineageEdgeKind, string> = { continuation: 'continues from', relation: 'relates to' };
// useLayoutEffect warns during server rendering; the scroll it sets only matters in a browser.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

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
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [pinnedEdge, setPinnedEdge] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean; pointer: number } | null>(null);
  const suppressClick = useRef(false);
  const anchor = useRef<{ pointerX: number; scrollLeft: number; oldWidth: number } | null>(null);
  const revealed = useRef<string | null>(null);

  const select = (id: string | null) => {
    setPinnedEdge(null);
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
  const order = useMemo(() => shown.episodes.map((e) => e.id), [shown.episodes]);
  const byId = useMemo(() => new Map(shown.episodes.map((e) => [e.id, e])), [shown.episodes]);
  const edgeByKey = useMemo(() => new Map(shown.edges.map((e) => [lineageEdgeKey(e), e])), [shown.edges]);

  // The canvas fills its box: `layout.minWidth` is a floor, the box's width the fill.
  const [boxWidth, setBoxWidth] = useState(0);
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setBoxWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const base = { ...DEFAULT_LINEAGE_WEB_LAYOUT, ...layoutProp };
  const box = boxWidth || base.minWidth;
  const fit = fitZoom(shown.episodes.length, box, base);
  const minZoom = Math.min(1, fit);
  const maxZoom = Math.max(MAX_ZOOM, fit * MAX_ZOOM);
  const z = Math.min(maxZoom, Math.max(minZoom, zoom));
  const layout = useMemo(
    () =>
      layoutLineageWeb(shown.episodes, {
        ...layoutProp,
        minStep: base.minStep * z,
        minWidth: Math.max(base.minWidth, boxWidth),
      }),
    // `base` is rebuilt each render from `layoutProp`; its fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown.episodes, layoutProp, boxWidth, z],
  );
  const wider = layout.width > box + 1;

  // Zooming keeps the moment under the pointer (or the box's middle) in place.
  const zoomTo = (next: number, pointerX?: number) => {
    const target = Math.min(maxZoom, Math.max(minZoom, next));
    if (Math.abs(target - z) < 1e-6) return;
    const el = scroller.current;
    anchor.current = { pointerX: pointerX ?? (el?.clientWidth ?? box) / 2, scrollLeft: el?.scrollLeft ?? 0, oldWidth: layout.width };
    setZoom(target);
  };
  // Zooming in starts from what is on screen: below `fit`, the canvas already fills the box.
  const zoomBy = (factor: number, pointerX?: number) => zoomTo((factor > 1 ? Math.max(z, fit) : z) * factor, pointerX);
  const zoomByRef = useRef(zoomBy);
  zoomByRef.current = zoomBy;

  useIsoLayoutEffect(() => {
    const a = anchor.current;
    const el = scroller.current;
    if (!a || !el) return;
    anchor.current = null;
    el.scrollLeft = zoomScrollLeft(a.scrollLeft, a.pointerX, a.oldWidth, layout.width, base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.width]);

  // Ctrl/⌘ + wheel (and a trackpad pinch, which arrives as one) zooms at the pointer.
  // A plain wheel still scrolls the page. React's wheel listener is passive, so this one is added by hand.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomByRef.current(Math.exp(-event.deltaY * 0.0025), event.clientX - rect.left);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // A new selection, or a new set of episodes, scrolls the selection into view.
  // Zoom does not: it keeps its own anchor.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const key = `${selected ?? ''}|${order.length}|${order[0] ?? ''}`;
    if (key === revealed.current) return;
    const first = revealed.current === null;
    revealed.current = key;
    const p = selected ? layout.positions.get(selected) : undefined;
    if (p) {
      const margin = 48;
      if (p.x < el.scrollLeft + margin || p.x > el.scrollLeft + el.clientWidth - margin) {
        el.scrollTo({ left: Math.max(0, p.x - el.clientWidth / 2), behavior: first ? 'auto' : 'smooth' });
      }
    } else if (startAt === 'end') {
      el.scrollLeft = el.scrollWidth;
    }
  }, [selected, order, layout, startAt]);

  // What is in focus: a hovered episode, else a hovered or pinned relation, else the selection.
  const edgeKeyInFocus = hovered ? null : (hoveredEdge ?? pinnedEdge);
  const edgeInFocus = edgeKeyInFocus ? edgeByKey.get(edgeKeyInFocus) ?? null : null;
  const focus = edgeInFocus ? null : (hovered ?? selected);
  const near = useMemo(() => {
    if (edgeInFocus) return new Set([edgeInFocus.from, edgeInFocus.to]);
    if (!focus || !byId.has(focus)) return null;
    const set = new Set([focus]);
    for (const e of shown.edges) {
      if (e.from === focus) set.add(e.to);
      if (e.to === focus) set.add(e.from);
    }
    return set;
  }, [edgeInFocus, focus, byId, shown.edges]);
  const anyFocus = near !== null;

  // A month label that would overlap the one before it is left out.
  const monthLabels = useMemo(() => {
    const kept: typeof layout.months = [];
    for (const m of layout.months) {
      if (!kept.length || m.x - kept[kept.length - 1].x >= 56) kept.push(m);
    }
    return kept;
  }, [layout.months]);
  const chains = useMemo(() => (view.threads ? threadChains(shown.episodes) : []), [shown.episodes, view.threads]);
  const hasThreads = useMemo(() => episodes.some((e) => e.thread), [episodes]);

  const colorOf = (direction?: string) =>
    direction && (LINEAGE_BANDS as readonly string[]).includes(direction)
      ? colors[direction as (typeof LINEAGE_BANDS)[number]]
      : colors.undirected;

  const tap = (id: string) => {
    if (suppressClick.current) return;
    if (selected === id && !pinnedEdge) onOpen?.(id);
    else select(id);
  };

  const scrollIntoView = (id: string) => {
    const el = scroller.current;
    const p = layout.positions.get(id);
    if (!el || !p) return;
    if (p.x < el.scrollLeft + 48 || p.x > el.scrollLeft + el.clientWidth - 48) {
      el.scrollTo({ left: Math.max(0, p.x - el.clientWidth / 2), behavior: 'smooth' });
    }
  };

  // ── Drag the empty canvas along time (a mouse; a finger already scrolls) ──
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setKeyboard(false);
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if ((event.target as Element).closest?.('[data-episode]')) return;
    const el = scroller.current;
    if (!el) return;
    drag.current = { x: event.clientX, left: el.scrollLeft, moved: false, pointer: event.pointerId };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = scroller.current;
    if (!d || !el) return;
    const dx = event.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      el.setPointerCapture?.(d.pointer);
      setDragging(true);
      setHovered(null);
      setHoveredEdge(null);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setDragging(false);
    // The click that ends a drag is not a click on the canvas.
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
  };

  // ── Keys: walk the lineage ──
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = selected && byId.has(selected) ? selected : null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        const next = stepAlongSpine(order, current, event.key === 'ArrowRight' ? 1 : -1);
        if (next) select(next);
        break;
      }
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!current) return;
        const keys = relationsAround(current, shown.edges, order).map(lineageEdgeKey);
        if (!keys.length) break;
        const at = pinnedEdge ? keys.indexOf(pinnedEdge) : -1;
        const next = event.key === 'ArrowDown' ? (at + 1) % keys.length : at <= 0 ? keys.length - 1 : at - 1;
        setPinnedEdge(keys[next]);
        const e = edgeByKey.get(keys[next]);
        if (e) scrollIntoView(e.from === current ? e.to : e.from);
        break;
      }
      case 'Enter': {
        if (current && edgeInFocus && (edgeInFocus.from === current || edgeInFocus.to === current)) {
          select(edgeInFocus.from === current ? edgeInFocus.to : edgeInFocus.from);
        } else if (current) {
          onOpen?.(current);
        } else return;
        break;
      }
      case 'Escape':
        if (pinnedEdge) setPinnedEdge(null);
        else if (selected) select(null);
        else return;
        break;
      case '+':
      case '=':
        zoomBy(1.5);
        break;
      case '-':
      case '_':
        zoomBy(1 / 1.5);
        break;
      case '0':
        zoomTo(fit);
        break;
      default:
        return;
    }
    // The keys lead now: a pointer resting on a dot or an arc no longer overrides them.
    setHovered(null);
    setHoveredEdge(null);
    setKeyboard(true);
    event.preventDefault();
  };

  const showAllLabels = labels === 'always' || (labels === 'auto' && shown.episodes.length <= 40);
  const labelled = (id: string) => labels !== 'never' && (showAllLabels || id === selected || (near?.has(id) ?? false));
  const relatives = shown.found ? shown.episodes.length - shown.found.size : 0;
  const summary = shown.found
    ? `${shown.found.size} found · ${relatives} related · ${shown.edges.length} relations`
    : `${shown.episodes.length} episodes · ${shown.edges.length} relations`;
  const active = !edgeInFocus && focus ? byId.get(focus) ?? null : null;

  const option = (on: boolean, enabled = true): React.CSSProperties => ({
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontFamily: 'inherit',
    cursor: enabled ? 'pointer' : 'default',
    background: 'transparent',
    color: on ? colors.text : colors.muted,
    border: `1px solid ${on ? colors.accent : colors.border}`,
    fontWeight: on ? 700 : 500,
    whiteSpace: 'nowrap',
    opacity: enabled ? 1 : 0.4,
  });
  const separator = <span style={{ width: 1, height: 16, background: colors.border, margin: '0 4px' }} />;
  const mark = (e: LineageWebEpisode | undefined, fallback: string) => (
    <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: colorOf(e?.direction) }}>{e?.label ?? fallback}</span>
  );

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
          {separator}
          {(['continuation', 'relation'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={view.kinds[kind]}
              style={option(view.kinds[kind])}
              onClick={() => changeView({ kinds: { ...view.kinds, [kind]: !view.kinds[kind] } })}
            >
              <svg width={18} height={8} aria-hidden style={{ display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }}>
                <line x1={1} y1={4} x2={17} y2={4} stroke="currentColor" strokeWidth={1.6} strokeDasharray={kind === 'relation' ? '3 3' : undefined} />
              </svg>
              {KIND_LABEL[kind]}
            </button>
          ))}
          {hasThreads && (
            <button type="button" aria-pressed={view.threads} style={option(view.threads)} onClick={() => changeView({ threads: !view.threads })}>
              threads
            </button>
          )}
          {separator}
          <span role="group" aria-label="Zoom" style={{ display: 'inline-flex', gap: 4 }}>
            <button type="button" aria-label="Zoom out" title="Zoom out (−)" disabled={!wider} style={option(false, wider)} onClick={() => zoomBy(1 / 1.5)}>
              −
            </button>
            <button type="button" aria-label="Zoom in" title="Zoom in (+)" disabled={z >= maxZoom} style={option(false, z < maxZoom)} onClick={() => zoomBy(1.5)}>
              +
            </button>
            <button type="button" title="The whole span in the box (0)" disabled={!wider} style={option(false, wider)} onClick={() => zoomTo(fit)}>
              Fit
            </button>
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: FONT_MONO, fontSize: 11 }}>{summary}</span>
        </div>
      )}

      <div
        role="group"
        aria-label="Lineage web. Left and right arrows step along time, up and down choose a relation, Enter follows it or opens the episode, Escape steps back, minus, plus and 0 zoom."
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setKeyboard(false)}
        style={{
          position: 'relative',
          minWidth: 0,
          outline: keyboard ? `2px solid ${colors.accent}` : 'none',
          outlineOffset: 2,
          borderRadius: 4,
        }}
      >
        <div
          ref={scroller}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ overflowX: 'auto', cursor: dragging ? 'grabbing' : wider ? 'grab' : 'default', userSelect: 'none' }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="img"
            aria-label={`${summary}, in chronicle order`}
            style={{ display: 'block', maxWidth: 'none' }}
            onClick={(event) => {
              if (suppressClick.current || event.target !== event.currentTarget) return;
              if (pinnedEdge) setPinnedEdge(null);
              else select(null);
            }}
          >
            {LINEAGE_BANDS.map((band) => (
              <line
                key={band}
                x1={0}
                x2={layout.width}
                y1={layout.bandY[band]}
                y2={layout.bandY[band]}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="2 8"
                pointerEvents="none"
              />
            ))}

            {monthLabels.map((m) => (
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
                  opacity={anyFocus ? 0.08 : 0.2}
                  pointerEvents="none"
                />
              );
            })}

            {shown.edges.map((e, i) => {
              const a = layout.positions.get(e.from);
              const b = layout.positions.get(e.to);
              if (!a || !b) return null;
              const key = lineageEdgeKey(e);
              const lit = edgeInFocus ? key === edgeKeyInFocus : focus !== null && (e.from === focus || e.to === focus);
              const d = lineageArcPath(a, b, e.kind, layout);
              return (
                <g key={`${key}:${i}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={lit ? colors.accent : colorOf(byId.get(e.from)?.direction)}
                    strokeWidth={lit ? (key === edgeKeyInFocus ? 2.6 : 2) : 1.2}
                    strokeDasharray={e.kind === 'relation' ? '4 3' : undefined}
                    opacity={lit ? 1 : anyFocus ? 0.1 : e.kind === 'continuation' ? 0.55 : 0.4}
                    pointerEvents="none"
                  />
                  {/* A wider, invisible stroke a pointer can find. */}
                  <path
                    data-edge
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    pointerEvents="stroke"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => !drag.current?.moved && setHoveredEdge(key)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (suppressClick.current) return;
                      setPinnedEdge((current) => (current === key ? null : key));
                    }}
                  >
                    <title>{`${byId.get(e.from)?.label ?? e.from} ${KIND_LABEL[e.kind]} ${byId.get(e.to)?.label ?? e.to}${e.words ? ` — ${e.words}` : ''}`}</title>
                  </path>
                </g>
              );
            })}

            {shown.episodes.map((episode) => {
              const p = layout.positions.get(episode.id)!;
              const color = colorOf(episode.direction);
              const relative = shown.found !== null && !shown.found.has(episode.id);
              const dim = shown.faded.has(episode.id) || (near !== null && !near.has(episode.id));
              const isSelected = episode.id === selected;
              const isFocus = episode.id === focus || (edgeInFocus !== null && near?.has(episode.id));
              const atRight = p.x > layout.width - 48;
              return (
                <g
                  key={episode.id}
                  data-episode
                  transform={`translate(${p.x} ${p.y})`}
                  style={{ cursor: 'pointer' }}
                  opacity={dim ? 0.25 : 1}
                  onClick={() => tap(episode.id)}
                  onMouseEnter={() => !drag.current?.moved && setHovered(episode.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>{`${episode.label} · ${episode.title ?? episode.id}${relative ? ' (related)' : ''}`}</title>
                  {/* A target a finger can hit, larger than the dot it holds. */}
                  <circle r={10} fill="transparent" />
                  {isFocus && <circle r={11} fill={color} opacity={0.22} />}
                  {relative ? (
                    <circle r={4.5} fill="none" stroke={color} strokeWidth={1.6} />
                  ) : (
                    <circle r={isSelected ? 6 : 4} fill={color} />
                  )}
                  {isSelected && <circle r={8.5} fill="none" stroke={colors.text} strokeWidth={1.4} />}
                  {labelled(episode.id) && (
                    // Near the right edge the label sits to the left of its dot, inside the canvas.
                    <text
                      x={atRight ? -7 : 7}
                      y={-8}
                      textAnchor={atRight ? 'end' : 'start'}
                      fontSize={10}
                      fontFamily={FONT_MONO}
                      fill={isFocus || isSelected ? colors.text : colors.muted}
                      pointerEvents="none"
                    >
                      {episode.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* The band names stay at the left edge while the canvas moves under them. */}
        <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
          {LINEAGE_BANDS.map((band) => (
            <div
              key={band}
              style={{
                position: 'absolute',
                left: 6,
                top: layout.bandY[band] - 33,
                fontSize: 11,
                lineHeight: '14px',
                fontFamily: FONT_MONO,
                color: colors[band],
                background: colors.panel,
                padding: '1px 5px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {bandLabels[band] ?? band}
            </div>
          ))}
        </div>
      </div>

      {/* The episode or relation in focus, in a strip under the canvas: a chip
          floating over the web hid the dots of the lowest band. */}
      {chip && (
        <div
          aria-live="polite"
          style={{
            minHeight: 42,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            columnGap: 10,
            rowGap: 2,
            padding: '6px 4px 4px',
            borderTop: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${
              edgeInFocus ? colors.accent : active ? colorOf(active.direction) : 'transparent'
            }`,
            paddingLeft: 10,
            fontSize: 11,
            color: colors.muted,
          }}
        >
          {edgeInFocus ? (
            <>
              {mark(byId.get(edgeInFocus.from), edgeInFocus.from)}
              <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{byId.get(edgeInFocus.from)?.title ?? edgeInFocus.from}</span>
              <span style={{ fontStyle: 'italic' }}>{KIND_LABEL[edgeInFocus.kind]}</span>
              {mark(byId.get(edgeInFocus.to), edgeInFocus.to)}
              <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{byId.get(edgeInFocus.to)?.title ?? edgeInFocus.to}</span>
              <span style={{ flexBasis: '100%', fontSize: 12.5, lineHeight: 1.45, color: edgeInFocus.words ? colors.text : colors.muted }}>
                {edgeInFocus.words ?? 'No words say why this relation holds yet.'}
              </span>
              {pinnedEdge && !hoveredEdge && (
                <span style={{ flexBasis: '100%' }}>Enter follows it · Esc or a tap on the canvas lets it go</span>
              )}
            </>
          ) : active ? (
            <>
              {mark(active, active.id)}
              {active.date && <span style={{ fontFamily: FONT_MONO }}>{active.date}</span>}
              <span style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.25, color: colors.text }}>{active.title ?? active.id}</span>
              {active.caption && <span>{active.caption}</span>}
              {shown.found && !shown.found.has(active.id) && <span>related to an episode the search found</span>}
            </>
          ) : (
            <span>
              Hover or tap an episode to name it, again to open it; hover an arc for why it holds. Drag the canvas along
              time; Ctrl + wheel or − + to zoom; arrow keys walk the lineage.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
