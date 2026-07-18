/**
 * @medicine-wheel/graph-viz — Interactive React Flow renderer
 *
 * `<MedicineWheelFlowGraph>` is the interactive output strategy for the
 * Medicine Wheel relational web. It reuses the renderer-agnostic
 * `applyWheelLayout` to seed node positions, then hands control to React
 * Flow for drag / pan / zoom / minimap while preserving the four-direction
 * circular semantics (drawn by `<DirectionQuadrant>`).
 *
 * Ship behind the `./interactive` subpath export. `@xyflow/react` is an
 * optional peer — static/server consumers importing from the package root
 * never pull it.
 *
 * The consumer is responsible for importing the React Flow stylesheet once
 * at the app level:  `import '@xyflow/react/dist/style.css'`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  reconnectEdge,
  ConnectionMode,
  SelectionMode,
  Panel,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnNodesChange,
  type OnConnect,
  type OnConnectEnd,
  type OnReconnect,
  type IsValidConnection,
} from '@xyflow/react';

import { NODE_TYPE_COLORS } from '@medicine-wheel/ontology-core';

import type { DirectionName, NodeType } from '@medicine-wheel/ontology-core';

import {
  applyWheelLayout,
  DEFAULT_LAYOUT,
  directionForPoint,
  constrainToWheel,
} from '../layout.js';
import {
  GraphContextMenu,
  GraphMenuItem,
  GraphMenuDivider,
  CreateNodeInlineForm,
  type GraphMenuState,
} from './GraphContextMenu.js';
import type {
  MWGraphData,
  MWGraphNode,
  MWGraphLink,
  MWGraphNodePositions,
  WheelLayoutConfig,
} from '../types.js';
import {
  MedicineWheelNode,
  type MedicineWheelNodeData,
} from './MedicineWheelNode.js';
import { MedicineWheelEdge } from './MedicineWheelEdge.js';
import { DirectionQuadrant } from './DirectionQuadrant.js';

// ── Props ───────────────────────────────────────────────────────────────────

export interface MedicineWheelFlowGraphProps {
  /** Graph data (nodes + links). Re-layout happens whenever this changes. */
  data: MWGraphData;
  /** Layout configuration passed to `applyWheelLayout`. */
  layout?: Partial<WheelLayoutConfig>;
  /** Canvas height (CSS). Width fills the container. Default: 600. */
  height?: number | string;
  /** Dark mode styling. Default: true. */
  darkMode?: boolean;
  /** Show node labels. Default: true. */
  showNodeLabels?: boolean;
  /** Show OCAP® indicators. Default: true. */
  showOcapIndicators?: boolean;
  /** Show Wilson alignment halos. Default: true. */
  showWilsonHalos?: boolean;
  /** Show the four direction-quadrant backdrop. Default: true. */
  showQuadrants?: boolean;
  /** Show direction labels (East/South/West/North + Ojibwe). Default: true. */
  showDirectionLabels?: boolean;
  /** Show the minimap. Default: true. */
  showMiniMap?: boolean;
  /** Show pan/zoom controls. Default: true. */
  showControls?: boolean;
  /** Enable React Flow edge animation for ceremonied links. Default: true. */
  animationsEnabled?: boolean;
  /** Custom CSS class on the wrapper. */
  className?: string;
  /** Node positions to apply after the default layout seed. */
  nodePositions?: MWGraphNodePositions;
  /** Fired when a node is clicked, with the original MWGraphNode. */
  onNodeClick?: (node: MWGraphNode) => void;
  /** Fired when a node is double-clicked, with the original MWGraphNode. */
  onNodeDoubleClick?: (node: MWGraphNode) => void;
  /** Fired when user-dragged node positions should be persisted. */
  onNodePositionsChange?: (positions: MWGraphNodePositions) => void;
  /**
   * Enable weaving relations by dragging between nodes. Default: false.
   * The optimistic edge appears immediately; the consumer persists it via
   * `onRelationCreate` (and reloads `data` to canonicalize or revert).
   */
  enableConnections?: boolean;
  /** Fired when a connection gesture completes between two nodes. */
  onRelationCreate?: (sourceId: string, targetId: string) => void;
  /**
   * Fired when an existing relation is rewired to a new pair of beings
   * (an edge end dragged onto another node). The consumer persists the
   * rewire — relations are keyed by pair, so this means releasing the old
   * pair and weaving the new one — then reloads `data` to canonicalize.
   */
  onRelationReconnect?: (
    link: MWGraphLink,
    newSourceId: string,
    newTargetId: string,
  ) => void;
  /** Fired from the node menu's "Open node". Falls back to onNodeDoubleClick. */
  onNodeOpen?: (node: MWGraphNode) => void;
  /**
   * Enables the selected being's inline rename (NodeToolbar). The consumer
   * persists the new name and reloads `data` to canonicalize.
   * Keep the identity stable (useCallback) — it rides on node data.
   */
  onNodeRenameRequest?: (node: MWGraphNode, name: string) => void;
  /**
   * Fired from the "Create node here" inline form — via the pane menu, or
   * via a connection drag released on empty pane (then `connectFrom` names
   * the being the new node should be related from).
   */
  onNodeCreateRequest?: (request: {
    name: string;
    type: NodeType;
    direction?: DirectionName;
    position: { x: number; y: number };
    connectFrom?: string;
  }) => void;
  /** Fired from the edge menu's "Honor ceremony". */
  onEdgeCeremonyRequest?: (link: MWGraphLink) => void;
  /** Fired from the edge menu's confirmed "Release relation". */
  onEdgeDeleteRequest?: (link: MWGraphLink) => void;
  /**
   * Ambient emphasis on one direction's beings (e.g. deep-link from the
   * home wheel via ?direction=). Hover emphasis takes precedence.
   */
  highlightDirection?: DirectionName;
  /**
   * Radial snapping while dragging/nudging. Default: 'off'.
   * 'ring': beings stay in their band (direction ring / center heart).
   * 'sector': additionally, beings stay inside their direction quadrant.
   */
  radialSnap?: 'off' | 'ring' | 'sector';
}

const NODE_TYPES: NodeTypes = { medicineWheel: MedicineWheelNode };
const EDGE_TYPES: EdgeTypes = { medicineWheel: MedicineWheelEdge };

// ── Mappers ─────────────────────────────────────────────────────────────────

function toFlowNode(
  node: MWGraphNode,
  opts: {
    showLabel: boolean;
    showOcap: boolean;
    showWilson: boolean;
    darkMode: boolean;
    onRename?: (node: MWGraphNode, name: string) => void;
  },
): Node<MedicineWheelNodeData> {
  return {
    id: node.id,
    type: 'medicineWheel',
    position: { x: node.x ?? 0, y: node.y ?? 0 },
    // Announced by screen readers when the node takes keyboard focus —
    // the native title tooltip is not reliably read.
    ariaLabel: `${node.label}, ${node.type}${node.direction ? `, ${node.direction} direction` : ''}`,
    data: {
      node,
      showLabel: opts.showLabel,
      showOcap: opts.showOcap,
      showWilson: opts.showWilson,
      darkMode: opts.darkMode,
      onRename: opts.onRename,
    },
  };
}

function linkStrokeDash(style?: MWGraphLink['style']): string | undefined {
  switch (style) {
    case 'dashed':
      return '6,3';
    case 'dotted':
      return '2,2';
    case 'ceremony':
      return '8,3,2,3';
    default:
      return undefined;
  }
}

function toFlowEdge(
  link: MWGraphLink,
  index: number,
  animationsEnabled: boolean,
): Edge {
  const ceremony = link.ceremonyHonored === true;
  const stroke = link.color ?? (ceremony ? '#FFD700' : '#777');
  return {
    // MWGraphLink has no id; synthesize a stable, collision-safe id so
    // parallel edges between the same pair are preserved.
    id: `${link.source}->${link.target}#${index}`,
    type: 'medicineWheel',
    source: link.source,
    target: link.target,
    label: link.label,
    animated: animationsEnabled && ceremony,
    style: {
      stroke,
      strokeWidth: link.width ?? 1 + (link.strength ?? 0.5) * 2,
      strokeDasharray: linkStrokeDash(link.style),
      opacity: ceremony ? 0.85 : 0.6,
    },
    data: { link },
  };
}

function applyNodePositions(
  nodes: MWGraphNode[],
  positions?: MWGraphNodePositions,
): MWGraphNode[] {
  if (!positions) return nodes;

  return nodes.map((node) => {
    const position = positions[node.id];
    if (!position) return node;

    return {
      ...node,
      x: position.x,
      y: position.y,
    };
  });
}

function flowNodePositions(
  nodes: Node<MedicineWheelNodeData>[],
): MWGraphNodePositions {
  const positions: MWGraphNodePositions = {};

  for (const node of nodes) {
    const { x, y } = node.position;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      positions[node.id] = { x, y };
    }
  }

  return positions;
}

// Persistence layers may round coordinates (e.g. to 2 decimals), so the
// echoed positions are compared with sub-pixel tolerance, not strictly.
const POSITION_EPSILON = 0.01;

// Undo keeps this many position snapshots; older moves fall away.
const UNDO_LIMIT = 50;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const SHORTCUTS: { keys: string; does: string }[] = [
  { keys: 'Drag node', does: 'Move a being (position is remembered)' },
  {
    keys: 'Drag from edge dots',
    does: 'Weave a relation — drop on empty ground to create the being there',
  },
  { keys: 'Drag an edge end', does: 'Rewire the relation to another being' },
  { keys: 'Right-click', does: 'Menu — node, relation, or canvas' },
  { keys: 'Shift + drag', does: 'Select several beings with a box' },
  { keys: 'Ctrl/⌘ + click', does: 'Add or remove from the selection' },
  { keys: 'Tab / Shift+Tab', does: 'Walk the beings by keyboard' },
  { keys: 'Enter / Space', does: 'Select the focused being' },
  { keys: 'Arrow keys', does: 'Nudge the selected being' },
  { keys: 'Ctrl/⌘ + Z', does: 'Undo a move' },
  { keys: 'Ctrl/⌘ + Shift + Z', does: 'Redo a move' },
  { keys: 'Esc', does: 'Close menus and this panel' },
];

/** Medicine-wheel glyph (circle + four-direction cross) for the control. */
function WheelGlyph() {
  // React Flow's controls CSS fills svg shapes; fill must be forced off so
  // the glyph reads as a wheel, not a dot.
  return (
    <svg
      viewBox="0 0 16 16"
      style={{ fill: 'none', stroke: 'currentColor' }}
      strokeWidth={1.4}
    >
      <circle cx="8" cy="8" r="6.3" style={{ fill: 'none' }} />
      <line x1="8" y1="1.7" x2="8" y2="14.3" />
      <line x1="1.7" y1="8" x2="14.3" y2="8" />
    </svg>
  );
}

function samePositions(
  a: MWGraphNodePositions,
  b: MWGraphNodePositions,
): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every(
    (k) =>
      b[k] &&
      Math.abs(a[k].x - b[k].x) <= POSITION_EPSILON &&
      Math.abs(a[k].y - b[k].y) <= POSITION_EPSILON,
  );
}

// ── Inner (inside ReactFlowProvider) ─────────────────────────────────────────

function FlowGraphInner({
  data,
  layout,
  height = 600,
  darkMode = true,
  showNodeLabels = true,
  showOcapIndicators = true,
  showWilsonHalos = true,
  showQuadrants = true,
  showDirectionLabels = true,
  showMiniMap = true,
  showControls = true,
  animationsEnabled = true,
  className,
  nodePositions,
  onNodeClick,
  onNodeDoubleClick,
  onNodePositionsChange,
  enableConnections = false,
  onRelationCreate,
  onRelationReconnect,
  onNodeOpen,
  onNodeRenameRequest,
  onNodeCreateRequest,
  onEdgeCeremonyRequest,
  onEdgeDeleteRequest,
  highlightDirection,
  radialSnap = 'off',
}: MedicineWheelFlowGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MedicineWheelNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { getNodes, fitView, setCenter, screenToFlowPosition } =
    useReactFlow<Node<MedicineWheelNodeData>, Edge>();

  // ── Context menus ────────────────────────────────────────────────────────
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<GraphMenuState | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const clampToPane = useCallback((clientX: number, clientY: number) => {
    const pane = wrapperRef.current?.getBoundingClientRect();
    if (!pane) return { x: clientX, y: clientY };
    return {
      x: Math.max(0, Math.min(clientX - pane.left, pane.width - 230)),
      y: Math.max(0, Math.min(clientY - pane.top, pane.height - 250)),
    };
  }, []);

  const handleNodeContextMenu = useCallback<NodeMouseHandler<Node<MedicineWheelNodeData>>>(
    (event, flowNode) => {
      event.preventDefault();
      setMenu({
        kind: 'node',
        nodeId: flowNode.id,
        ...clampToPane(event.clientX, event.clientY),
      });
    },
    [clampToPane],
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setMenu({
        kind: 'edge',
        edgeId: edge.id,
        ...clampToPane(event.clientX, event.clientY),
      });
    },
    [clampToPane],
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const { clientX, clientY } = event as React.MouseEvent;
      const flow = screenToFlowPosition({ x: clientX, y: clientY });
      setMenu({
        kind: 'pane',
        ...clampToPane(clientX, clientY),
        flowX: flow.x,
        flowY: flow.y,
      });
    },
    [clampToPane, screenToFlowPosition],
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu && !showShortcuts) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(null);
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu, showShortcuts]);

  // ── Ceremonial re-layout: rAF polar-lerp back to the wheel ──────────────
  const animRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  /**
   * Animate nodes to `target` positions by interpolating radius and angle
   * around the wheel center, so nodes sweep along arcs — the wheel
   * gathering its relations — rather than sliding in straight lines.
   */
  const animatePositions = useCallback(
    (target: MWGraphNodePositions, ms = 600) => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);

      const apply = (positions: MWGraphNodePositions) =>
        setNodes((nds) =>
          nds.map((n) =>
            positions[n.id] ? { ...n, position: positions[n.id] } : n,
          ),
        );

      if (ms <= 0 || prefersReducedMotion()) {
        apply(target);
        return;
      }

      const cfg: WheelLayoutConfig = { ...DEFAULT_LAYOUT, ...layout };
      const toPolar = (p: { x: number; y: number }) => ({
        r: Math.hypot(p.x - cfg.centerX, p.y - cfg.centerY),
        a: Math.atan2(p.y - cfg.centerY, p.x - cfg.centerX),
      });
      const from = new Map(
        getNodes().map((n) => [n.id, toPolar(n.position)]),
      );

      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = easeInOutCubic(t);
        const frame: MWGraphNodePositions = {};

        for (const [id, dest] of Object.entries(target)) {
          const a = from.get(id);
          if (!a) {
            frame[id] = dest;
            continue;
          }
          const b = toPolar(dest);
          // Shortest angular path so nodes never take the long way around.
          const da =
            ((b.a - a.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          const r = a.r + (b.r - a.r) * e;
          const ang = a.a + da * e;
          frame[id] = {
            x: cfg.centerX + r * Math.cos(ang),
            y: cfg.centerY + r * Math.sin(ang),
          };
        }

        apply(t < 1 ? frame : target);
        animRef.current = t < 1 ? requestAnimationFrame(tick) : null;
      };

      animRef.current = requestAnimationFrame(tick);
    },
    [getNodes, setNodes, layout],
  );

  // Positions we last emitted through onNodePositionsChange. When the parent
  // persists them and hands the same values back via the `nodePositions`
  // prop, the re-layout effect must not rebuild every flow node — React Flow
  // already holds those positions, and the rebuild wipes selection state.
  const lastEmittedPositions = React.useRef<MWGraphNodePositions | null>(null);
  const lastLayoutConfig = React.useRef<unknown[] | null>(null);

  // ── Undo/redo: position-snapshot stack ──────────────────────────────────
  // Positions are the only canvas-local mutable state; each settled gesture
  // (drag-end, nudge burst, return-to-the-wheel) pushes the pre-gesture
  // snapshot. Undo restores in-canvas AND through the same persistence path
  // drag-end uses, so the disposition store never silently diverges.
  const pastRef = useRef<MWGraphNodePositions[]>([]);
  const futureRef = useRef<MWGraphNodePositions[]>([]);
  const pendingSnapshotRef = useRef<MWGraphNodePositions | null>(null);
  // Bumped whenever the stacks change so the control buttons re-render.
  const [, setHistoryVersion] = useState(0);

  const pushHistory = useCallback((before: MWGraphNodePositions) => {
    pastRef.current.push(before);
    if (pastRef.current.length > UNDO_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    setHistoryVersion((v) => v + 1);
  }, []);

  /** Capture the pre-gesture positions once per gesture (idempotent). */
  const beginGesture = useCallback(() => {
    if (pendingSnapshotRef.current === null) {
      pendingSnapshotRef.current = flowNodePositions(getNodes());
    }
  }, [getNodes]);

  /**
   * The gesture settled: keep its snapshot if anything actually moved.
   * `now` overrides the store read for callers that hold fresher positions
   * than `getNodes()` (drag-stop can be a frame stale).
   */
  const commitGesture = useCallback(
    (now?: MWGraphNodePositions) => {
      const before = pendingSnapshotRef.current;
      pendingSnapshotRef.current = null;
      if (!before) return;
      if (samePositions(before, now ?? flowNodePositions(getNodes()))) return;
      pushHistory(before);
    },
    [getNodes, pushHistory],
  );

  /** Apply history positions in-canvas and through persistence. */
  const applyHistoryPositions = useCallback(
    (positions: MWGraphNodePositions) => {
      setNodes((nds) =>
        nds.map((n) =>
          positions[n.id] ? { ...n, position: positions[n.id] } : n,
        ),
      );
      lastEmittedPositions.current = positions;
      onNodePositionsChange?.(positions);
    },
    [setNodes, onNodePositionsChange],
  );

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    pendingSnapshotRef.current = null;
    const now = flowNodePositions(getNodes());
    futureRef.current.push(now);
    // Merge over current so beings born after the snapshot keep their seat.
    applyHistoryPositions({ ...now, ...prev });
    setHistoryVersion((v) => v + 1);
  }, [getNodes, applyHistoryPositions]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pendingSnapshotRef.current = null;
    const now = flowNodePositions(getNodes());
    pastRef.current.push(now);
    if (pastRef.current.length > UNDO_LIMIT) pastRef.current.shift();
    applyHistoryPositions({ ...now, ...next });
    setHistoryVersion((v) => v + 1);
  }, [getNodes, applyHistoryPositions]);

  // mod+z / mod+shift+z — ignored while typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z')
        return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      )
        return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Re-layout whenever data or display flags change. `applyWheelLayout`
  // mutates node.x/node.y in place, so spread each node defensively to avoid
  // mutating objects owned by the parent's React state.
  useEffect(() => {
    const config = [
      data,
      layout,
      showNodeLabels,
      showOcapIndicators,
      showWilsonHalos,
      darkMode,
      animationsEnabled,
      onNodeRenameRequest,
    ];
    const configUnchanged =
      lastLayoutConfig.current !== null &&
      lastLayoutConfig.current.length === config.length &&
      config.every((v, i) => Object.is(v, lastLayoutConfig.current![i]));

    // Drag-stop echo: only the nodePositions prop changed, and it matches
    // what we ourselves emitted. Skip the rebuild.
    if (
      configUnchanged &&
      nodePositions &&
      lastEmittedPositions.current &&
      (nodePositions === lastEmittedPositions.current ||
        samePositions(nodePositions, lastEmittedPositions.current))
    ) {
      return;
    }
    lastLayoutConfig.current = config;

    const laidOut = applyWheelLayout(
      { nodes: data.nodes.map((n) => ({ ...n })), links: data.links },
      layout,
    );
    const positionedNodes = applyNodePositions(laidOut.nodes, nodePositions);

    setNodes(
      positionedNodes.map((n) =>
        toFlowNode(n, {
          showLabel: showNodeLabels,
          showOcap: showOcapIndicators,
          showWilson: showWilsonHalos,
          darkMode,
          onRename: onNodeRenameRequest,
        }),
      ),
    );
    setEdges(data.links.map((l, i) => toFlowEdge(l, i, animationsEnabled)));
  }, [
    data,
    layout,
    showNodeLabels,
    showOcapIndicators,
    showWilsonHalos,
    darkMode,
    animationsEnabled,
    onNodeRenameRequest,
    nodePositions,
    setNodes,
    setEdges,
  ]);

  /**
   * "Return to the wheel": re-run the canonical layout and sweep every node
   * back to its place. The result is persisted as the new disposition.
   */
  const relayoutToWheel = useCallback(() => {
    const laidOut = applyWheelLayout(
      { nodes: data.nodes.map((n) => ({ ...n })), links: data.links },
      layout,
    );
    const target: MWGraphNodePositions = {};
    for (const n of laidOut.nodes) {
      if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
        target[n.id] = { x: n.x!, y: n.y! };
      }
    }

    // Undoable: the wheel gathering its relations is still a move.
    pushHistory(flowNodePositions(getNodes()));

    animatePositions(target, 600);
    fitView({ padding: 0.15, duration: 600 });

    // Mark as our own emit so the persisted echo does not rebuild nodes.
    lastEmittedPositions.current = target;
    onNodePositionsChange?.(target);
  }, [data, layout, animatePositions, fitView, onNodePositionsChange, pushHistory, getNodes]);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, flowNode) => {
      setMenu(null);
      const original = (flowNode.data as MedicineWheelNodeData | undefined)?.node;
      if (original && onNodeClick) onNodeClick(original);
    },
    [onNodeClick],
  );

  const handleNodeDoubleClick = useCallback<NodeMouseHandler>(
    (_event, flowNode) => {
      const original = (flowNode.data as MedicineWheelNodeData | undefined)?.node;
      if (original && onNodeDoubleClick) onNodeDoubleClick(original);
    },
    [onNodeDoubleClick],
  );

  // Keyboard moves (arrow keys on a focused node) never pass through
  // onNodeDragStop — persist settled position changes on a debounce so a
  // nudged being is remembered too. The echo check keeps this cheap.
  const persistTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (persistTimer.current !== null) window.clearTimeout(persistTimer.current);
    },
    [],
  );

  const schedulePersist = useCallback(() => {
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      persistTimer.current = null;
      // The nudge burst settled — one undo entry for the whole burst.
      commitGesture();
      if (!onNodePositionsChange) return;
      const positions = flowNodePositions(getNodes());
      lastEmittedPositions.current = positions;
      onNodePositionsChange(positions);
    }, 600);
  }, [getNodes, onNodePositionsChange, commitGesture]);

  const directionById = useMemo(
    () => new Map(data.nodes.map((n) => [n.id, n.direction])),
    [data.nodes],
  );

  const handleNodesChange = useCallback<
    OnNodesChange<Node<MedicineWheelNodeData>>
  >(
    (changes) => {
      // First position change of a gesture: getNodes() still holds the
      // pre-change state, so this is the undo snapshot moment.
      if (changes.some((c) => c.type === 'position')) beginGesture();

      // Radial snapping: constrain drags AND keyboard nudges in polar
      // space — the wheel guides the hand, not a Cartesian grid.
      // Flow positions are top-LEFT corners; the wheel's geometry speaks in
      // centers, so convert through the node's radius or the band sits half
      // a node off the drawn rings (the reported top-left bias).
      const nodesById =
        radialSnap === 'off'
          ? null
          : new Map(getNodes().map((n) => [n.id, n]));
      const next =
        radialSnap === 'off' || nodesById === null
          ? changes
          : changes.map((c) => {
              if (c.type !== 'position' || !c.position) return c;
              const r = (nodesById.get(c.id)?.measured?.width ?? 26) / 2;
              const center = constrainToWheel(
                { x: c.position.x + r, y: c.position.y + r },
                layout,
                directionById.get(c.id),
                radialSnap,
              );
              return {
                ...c,
                position: { x: center.x - r, y: center.y - r },
              };
            });
      onNodesChange(next);
      if (next.some((c) => c.type === 'position' && !c.dragging)) {
        schedulePersist();
      }
    },
    [onNodesChange, schedulePersist, radialSnap, layout, directionById, beginGesture, getNodes],
  );

  const handleNodeDragStop = useCallback<OnNodeDrag<Node<MedicineWheelNodeData>>>(
    (_event, _flowNode, flowNodes) => {
      const draggedNodesById = new Map(flowNodes.map((node) => [node.id, node]));
      const currentNodes = getNodes().map((node) => draggedNodesById.get(node.id) ?? node);

      let positions = flowNodePositions(currentNodes);

      // XYDrag hands back the RAW pointer positions for the dragged nodes,
      // bypassing the onNodesChange interceptor — without re-constraining
      // here, releasing the mouse would snap the being back off the wheel
      // and persist that raw position.
      if (radialSnap !== 'off') {
        const constrained: MWGraphNodePositions = {};
        for (const [id, pos] of Object.entries(positions)) {
          if (!draggedNodesById.has(id)) {
            constrained[id] = pos;
            continue;
          }
          const r = (draggedNodesById.get(id)?.measured?.width ?? 26) / 2;
          const center = constrainToWheel(
            { x: pos.x + r, y: pos.y + r },
            layout,
            directionById.get(id),
            radialSnap,
          );
          constrained[id] = { x: center.x - r, y: center.y - r };
        }
        positions = constrained;
        // Settle the canvas on the constrained positions as well.
        setNodes((nds) =>
          nds.map((n) =>
            draggedNodesById.has(n.id) && positions[n.id]
              ? { ...n, position: positions[n.id] }
              : n,
          ),
        );
      }

      commitGesture(positions);
      if (!onNodePositionsChange) return;
      lastEmittedPositions.current = positions;
      onNodePositionsChange(positions);
    },
    [
      getNodes,
      setNodes,
      onNodePositionsChange,
      commitGesture,
      radialSnap,
      layout,
      directionById,
    ],
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      // Optimistic thread; the consumer persists and reloads canonical data.
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'medicineWheel',
            style: { stroke: '#777', strokeWidth: 1.5, opacity: 0.6 },
          },
          eds,
        ),
      );
      onRelationCreate?.(connection.source, connection.target);
    },
    [setEdges, onRelationCreate],
  );

  const isValidConnection = useCallback<IsValidConnection<Edge>>(
    (connection) => connection.source !== connection.target,
    [],
  );

  // Reconnect drags re-enter React Flow's connect machinery, so the user
  // onConnectEnd fires for them too. This flag keeps a rewire dropped on
  // empty pane a no-op (the thread stays) instead of opening create-node.
  const reconnectingRef = useRef(false);

  const handleReconnectStart = useCallback(() => {
    reconnectingRef.current = true;
  }, []);

  const handleReconnectEnd = useCallback(() => {
    // Cleared a tick later: the drag's own connect-end fires in the same
    // tick and must still see the flag.
    window.setTimeout(() => {
      reconnectingRef.current = false;
    }, 0);
  }, []);

  // An edge end dragged onto another node: rewire the relation. Moving a
  // relation to a new relative is a ceremony-relevant act — it goes through
  // the consumer's persistence, never a silent local mutation. Self-drops
  // never reach here: isValidConnection refuses them during the drag.
  const handleReconnect = useCallback<OnReconnect>(
    (oldEdge, newConnection) => {
      if (!newConnection.source || !newConnection.target) return;
      if (newConnection.source === newConnection.target) return;
      const link = (oldEdge.data as { link?: MWGraphLink } | undefined)?.link;
      if (!link) return;
      if (
        link.source === newConnection.source &&
        link.target === newConnection.target
      )
        return; // dropped back where it was

      // Optimistic rewire; the consumer persists and reloads canonical data.
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
      onRelationReconnect?.(link, newConnection.source, newConnection.target);
    },
    [setEdges, onRelationReconnect],
  );

  // A connection drag released on empty pane: open the create-node form
  // there, seeded with the drop position and the pending thread — the new
  // being arrives already related.
  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event, connectionState) => {
      if (!onNodeCreateRequest) return;
      if (reconnectingRef.current) return; // rewire drag, not a weave
      if (connectionState.isValid) return; // landed on a node — onConnect took it
      if (connectionState.toNode) return; // refused drop (e.g. self) — not a create
      const fromNode = connectionState.fromNode;
      if (!fromNode) return;

      const { clientX, clientY } =
        'changedTouches' in event ? event.changedTouches[0] : event;
      const flow = screenToFlowPosition({ x: clientX, y: clientY });
      const fromData = (fromNode.data as MedicineWheelNodeData | undefined)?.node;

      setMenu({
        kind: 'pane',
        ...clampToPane(clientX, clientY),
        flowX: flow.x,
        flowY: flow.y,
        creating: true,
        pendingEdge: {
          fromNodeId: fromNode.id,
          fromLabel: fromData?.label,
        },
      });
    },
    [onNodeCreateRequest, screenToFlowPosition, clampToPane],
  );

  // ── Emphasis: dim everything outside the current attention ─────────────
  // Two sources, hover winning over the ambient direction highlight:
  // hovering a node keeps its relations lit; `highlightDirection` keeps a
  // whole quadrant's beings lit (deep-link from the home wheel).
  const [hoverId, setHoverId] = useState<string | null>(null);

  const emphasis = useMemo(() => {
    if (hoverId) {
      const kept = new Set([hoverId]);
      for (const l of data.links) {
        if (l.source === hoverId) kept.add(l.target);
        if (l.target === hoverId) kept.add(l.source);
      }
      return { nodes: kept, edgeAnchors: new Set([hoverId]) };
    }
    if (highlightDirection) {
      const kept = new Set(
        data.nodes
          .filter((n) => n.direction === highlightDirection)
          .map((n) => n.id),
      );
      return kept.size > 0 ? { nodes: kept, edgeAnchors: kept } : null;
    }
    return null;
  }, [hoverId, highlightDirection, data]);

  useEffect(() => {
    if (!emphasis) {
      setNodes((nds) =>
        nds.map((n) => (n.className ? { ...n, className: undefined } : n)),
      );
      setEdges((eds) =>
        eds.map((e) => {
          const d = e.data as { dimmed?: boolean } | undefined;
          return d?.dimmed ? { ...e, data: { ...d, dimmed: false } } : e;
        }),
      );
      return;
    }

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        className: emphasis.nodes.has(n.id) ? 'mw-neighbor' : undefined,
      })),
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: {
          ...e.data,
          dimmed: !(
            emphasis.edgeAnchors.has(e.source) ||
            emphasis.edgeAnchors.has(e.target)
          ),
        },
      })),
    );
  }, [emphasis, setNodes, setEdges]);

  const handleNodeMouseEnter = useCallback<NodeMouseHandler>(
    (_event, flowNode) => setHoverId(flowNode.id),
    [],
  );
  const handleNodeMouseLeave = useCallback<NodeMouseHandler>(
    () => setHoverId(null),
    [],
  );

  /** Center the camera on a node — the "focus relations" gesture. */
  const focusNode = useCallback(
    (nodeId: string) => {
      const flowNode = getNodes().find((n) => n.id === nodeId);
      if (!flowNode) return;
      const r = (flowNode.measured?.width ?? 26) / 2;
      setCenter(flowNode.position.x + r, flowNode.position.y + r, {
        zoom: 1.4,
        duration: prefersReducedMotion() ? 0 : 700,
      });
      // Hold the relation highlight on the focused being.
      setHoverId(nodeId);
    },
    [getNodes, setCenter],
  );

  // Honor MWGraphData.focusedNodeId ("triggers zoom animation", types.ts):
  // once the node is seeded, sweep the camera to it — once per focus value.
  const lastFocusedRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = data.focusedNodeId;
    if (!id || id === lastFocusedRef.current) return;
    if (!nodes.some((n) => n.id === id)) return; // not seeded yet
    lastFocusedRef.current = id;
    // Let React Flow measure the node before centering on it.
    requestAnimationFrame(() => focusNode(id));
  }, [data.focusedNodeId, nodes, focusNode]);

  const menuNode =
    menu?.kind === 'node'
      ? (nodes.find((n) => n.id === menu.nodeId)?.data as
          | MedicineWheelNodeData
          | undefined)?.node
      : undefined;
  const menuLink =
    menu?.kind === 'edge'
      ? (edges.find((e) => e.id === menu.edgeId)?.data as
          | { link?: MWGraphLink }
          | undefined)?.link
      : undefined;

  const minimapNodeColor = useCallback((flowNode: Node) => {
    const n = (flowNode.data as MedicineWheelNodeData | undefined)?.node;
    return n?.color ?? (n ? NODE_TYPE_COLORS[n.type] : undefined) ?? '#888';
  }, []);

  const wrapperStyle = useMemo<React.CSSProperties>(
    () => ({ width: '100%', height }),
    [height],
  );

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ ...wrapperStyle, position: 'relative' }}
    >
      <ReactFlow
        className={emphasis ? 'mw-hovering' : undefined}
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onPaneClick={closeMenu}
        onMoveStart={closeMenu}
        fitView
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        nodesFocusable
        edgesFocusable
        selectionKeyCode="Shift"
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={['Meta', 'Control']}
        nodesConnectable={enableConnections}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={30}
        onConnect={enableConnections ? handleConnect : undefined}
        onConnectEnd={enableConnections ? handleConnectEnd : undefined}
        edgesReconnectable={enableConnections && Boolean(onRelationReconnect)}
        onReconnect={enableConnections ? handleReconnect : undefined}
        onReconnectStart={enableConnections ? handleReconnectStart : undefined}
        onReconnectEnd={enableConnections ? handleReconnectEnd : undefined}
        isValidConnection={isValidConnection}
        proOptions={{ hideAttribution: true }}
        colorMode={darkMode ? 'dark' : 'light'}
        minZoom={0.2}
        maxZoom={2.5}
      >
        {showQuadrants && (
          <DirectionQuadrant
            layout={layout}
            showLabels={showDirectionLabels}
          />
        )}
        {/* Star field (fine dots) + sparse constellation crosses. */}
        <Background
          id="mw-dots"
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
        />
        <Background
          id="mw-cross"
          variant={BackgroundVariant.Cross}
          gap={120}
          size={4}
          color={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
        />
        {showControls && (
          <Controls showInteractive={false}>
            <ControlButton
              onClick={relayoutToWheel}
              title="Return to the wheel"
              aria-label="Return to the wheel"
            >
              <WheelGlyph />
            </ControlButton>
            <ControlButton
              onClick={undo}
              disabled={pastRef.current.length === 0}
              title="Undo move (Ctrl/⌘+Z)"
              aria-label="Undo move"
            >
              <span style={{ fontSize: 14 }}>↶</span>
            </ControlButton>
            <ControlButton
              onClick={redo}
              disabled={futureRef.current.length === 0}
              title="Redo move (Ctrl/⌘+Shift+Z)"
              aria-label="Redo move"
            >
              <span style={{ fontSize: 14 }}>↷</span>
            </ControlButton>
            <ControlButton
              onClick={() => setShowShortcuts((s) => !s)}
              title="Keyboard shortcuts"
              aria-label="Keyboard shortcuts"
              aria-expanded={showShortcuts}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>?</span>
            </ControlButton>
          </Controls>
        )}
        {showShortcuts && (
          <Panel
            position="bottom-left"
            className="mw-shortcuts-panel nodrag nopan"
            style={{
              marginLeft: 52,
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--mw-card, #12122a)',
              border: '1px solid var(--mw-border, rgba(255, 255, 255, 0.12))',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.5)',
              color: 'var(--mw-fg, #e5e7eb)',
              fontSize: 12,
              maxWidth: 320,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--mw-muted, #9ca3af)',
                marginBottom: 6,
              }}
            >
              Working the wheel
            </div>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px', margin: 0 }}>
              {SHORTCUTS.map((s) => (
                <React.Fragment key={s.keys}>
                  <dt style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.keys}</dt>
                  <dd style={{ margin: 0, color: 'var(--mw-muted, #9ca3af)' }}>{s.does}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Panel>
        )}
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            nodeColor={minimapNodeColor}
            nodeStrokeColor={minimapNodeColor}
            nodeBorderRadius={999}
            bgColor={darkMode ? '#101020' : '#f7f9fb'}
            maskColor={darkMode ? 'rgba(10,10,26,0.7)' : 'rgba(255,255,255,0.6)'}
          />
        )}
      </ReactFlow>

      {/* ── Context menus ────────────────────────────────────────────── */}
      {menu?.kind === 'node' && menuNode && (
        <GraphContextMenu
          x={menu.x}
          y={menu.y}
          title={`${menuNode.label} · ${menuNode.type}${menuNode.direction ? ` · ${menuNode.direction}` : ''}`}
        >
          <GraphMenuItem
            label="Open node"
            onSelect={() => {
              setMenu(null);
              (onNodeOpen ?? onNodeDoubleClick)?.(menuNode);
            }}
          />
          <GraphMenuItem
            label="Focus relations"
            hint="Center the wheel on this being"
            onSelect={() => {
              setMenu(null);
              focusNode(menuNode.id);
            }}
          />
        </GraphContextMenu>
      )}

      {menu?.kind === 'edge' && menuLink && (
        <GraphContextMenu
          x={menu.x}
          y={menu.y}
          title={`${menuLink.label ?? 'relation'} · ${menuLink.source} → ${menuLink.target}`}
        >
          {menuLink.ceremonyHonored ? (
            <GraphMenuItem label="Ceremony honored ✦" disabled />
          ) : (
            <GraphMenuItem
              label="Honor ceremony"
              hint="Mark this relation as ceremony-honored"
              disabled={!onEdgeCeremonyRequest}
              onSelect={() => {
                setMenu(null);
                onEdgeCeremonyRequest?.(menuLink);
              }}
            />
          )}
          {onEdgeDeleteRequest && (
            <>
              <GraphMenuDivider />
              {menu.confirmRelease ? (
                <GraphMenuItem
                  label="Confirm release"
                  hint="The relation will be removed"
                  danger
                  onSelect={() => {
                    setMenu(null);
                    onEdgeDeleteRequest(menuLink);
                  }}
                />
              ) : (
                <GraphMenuItem
                  label="Release relation"
                  danger
                  onSelect={() =>
                    setMenu({ ...menu, confirmRelease: true })
                  }
                />
              )}
            </>
          )}
        </GraphContextMenu>
      )}

      {menu?.kind === 'pane' && (
        <GraphContextMenu x={menu.x} y={menu.y}>
          {menu.creating ? (
            <CreateNodeInlineForm
              direction={directionForPoint(menu.flowX, menu.flowY, layout)}
              threadFrom={
                menu.pendingEdge
                  ? menu.pendingEdge.fromLabel ?? menu.pendingEdge.fromNodeId
                  : undefined
              }
              onSubmit={({ name, type }) => {
                setMenu(null);
                onNodeCreateRequest?.({
                  name,
                  type,
                  direction: directionForPoint(menu.flowX, menu.flowY, layout),
                  position: { x: menu.flowX, y: menu.flowY },
                  connectFrom: menu.pendingEdge?.fromNodeId,
                });
              }}
              onCancel={() => setMenu(null)}
            />
          ) : (
            <>
              {onNodeCreateRequest && (
                <GraphMenuItem
                  label="Create node here"
                  hint={`${directionForPoint(menu.flowX, menu.flowY, layout)} quadrant`}
                  onSelect={() => setMenu({ ...menu, creating: true })}
                />
              )}
              <GraphMenuItem
                label="Return to the wheel"
                onSelect={() => {
                  setMenu(null);
                  relayoutToWheel();
                }}
              />
              <GraphMenuItem
                label="Fit view"
                onSelect={() => {
                  setMenu(null);
                  fitView({
                    padding: 0.15,
                    duration: prefersReducedMotion() ? 0 : 500,
                  });
                }}
              />
            </>
          )}
        </GraphContextMenu>
      )}
    </div>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

/**
 * Interactive Medicine Wheel graph. Self-contained: wraps its own
 * `<ReactFlowProvider>` so it is safe to mount anywhere (including via
 * `next/dynamic` with `ssr: false`).
 */
export function MedicineWheelFlowGraph(props: MedicineWheelFlowGraphProps) {
  return (
    <ReactFlowProvider>
      <FlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}
