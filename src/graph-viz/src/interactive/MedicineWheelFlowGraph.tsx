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

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react';

import { NODE_TYPE_COLORS } from '@medicine-wheel/ontology-core';

import { applyWheelLayout, DEFAULT_LAYOUT } from '../layout.js';
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
}: MedicineWheelFlowGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MedicineWheelNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { getNodes, fitView } = useReactFlow<Node<MedicineWheelNodeData>, Edge>();

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

  const minimapNodeColor = useCallback((flowNode: Node) => {
    const n = (flowNode.data as MedicineWheelNodeData | undefined)?.node;
    return n?.color ?? (n ? NODE_TYPE_COLORS[n.type] : undefined) ?? '#888';
  }, []);

  const wrapperStyle = useMemo<React.CSSProperties>(
    () => ({ width: '100%', height }),
    [height],
  );

  return (
    <div className={className} style={wrapperStyle}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        fitView
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
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
