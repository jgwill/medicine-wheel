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

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
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
    source: link.source,
    target: link.target,
    label: link.label,
    animated: animationsEnabled && ceremony,
    style: {
      stroke,
      strokeWidth: link.width ?? 1 + (link.strength ?? 0.5) * 2,
      strokeDasharray: linkStrokeDash(link.style),
      opacity: 0.6,
    },
    labelStyle: { fill: '#aaa', fontSize: 10 },
    labelBgStyle: { fill: 'transparent' },
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
  const { getNodes } = useReactFlow<Node<MedicineWheelNodeData>, Edge>();

  // Re-layout whenever data or display flags change. `applyWheelLayout`
  // mutates node.x/node.y in place, so spread each node defensively to avoid
  // mutating objects owned by the parent's React state.
  useEffect(() => {
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

      onNodePositionsChange(flowNodePositions(currentNodes));
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        fitView
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
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        {showControls && <Controls showInteractive={false} />}
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            nodeColor={minimapNodeColor}
            maskColor={darkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'}
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
