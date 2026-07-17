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
  ConnectionMode,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnConnect,
  type IsValidConnection,
} from '@xyflow/react';

import { NODE_TYPE_COLORS } from '@medicine-wheel/ontology-core';

import type { DirectionName, NodeType } from '@medicine-wheel/ontology-core';

import {
  applyWheelLayout,
  DEFAULT_LAYOUT,
  directionForPoint,
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
  /** Fired from the node menu's "Open node". Falls back to onNodeDoubleClick. */
  onNodeOpen?: (node: MWGraphNode) => void;
  /** Fired from the pane menu's "Create node here" inline form. */
  onNodeCreateRequest?: (request: {
    name: string;
    type: NodeType;
    direction?: DirectionName;
    position: { x: number; y: number };
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
  },
): Node<MedicineWheelNodeData> {
  return {
    id: node.id,
    type: 'medicineWheel',
    position: { x: node.x ?? 0, y: node.y ?? 0 },
    data: {
      node,
      showLabel: opts.showLabel,
      showOcap: opts.showOcap,
      showWilson: opts.showWilson,
      darkMode: opts.darkMode,
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
  onNodeOpen,
  onNodeCreateRequest,
  onEdgeCeremonyRequest,
  onEdgeDeleteRequest,
  highlightDirection,
}: MedicineWheelFlowGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MedicineWheelNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { getNodes, fitView, setCenter, screenToFlowPosition } =
    useReactFlow<Node<MedicineWheelNodeData>, Edge>();

  // ── Context menus ────────────────────────────────────────────────────────
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<GraphMenuState | null>(null);

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
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

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

    animatePositions(target, 600);
    fitView({ padding: 0.15, duration: 600 });

    // Mark as our own emit so the persisted echo does not rebuild nodes.
    lastEmittedPositions.current = target;
    onNodePositionsChange?.(target);
  }, [data, layout, animatePositions, fitView, onNodePositionsChange]);

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

  const handleNodeDragStop = useCallback<OnNodeDrag<Node<MedicineWheelNodeData>>>(
    (_event, _flowNode, flowNodes) => {
      if (!onNodePositionsChange) return;
      const draggedNodesById = new Map(flowNodes.map((node) => [node.id, node]));
      const currentNodes = getNodes().map((node) => draggedNodesById.get(node.id) ?? node);

      const positions = flowNodePositions(currentNodes);
      lastEmittedPositions.current = positions;
      onNodePositionsChange(positions);
    },
    [getNodes, onNodePositionsChange],
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
        onNodesChange={onNodesChange}
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
        nodesConnectable={enableConnections}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={30}
        onConnect={enableConnections ? handleConnect : undefined}
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
          </Controls>
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
              onSubmit={({ name, type }) => {
                setMenu(null);
                onNodeCreateRequest?.({
                  name,
                  type,
                  direction: directionForPoint(menu.flowX, menu.flowY, layout),
                  position: { x: menu.flowX, y: menu.flowY },
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
