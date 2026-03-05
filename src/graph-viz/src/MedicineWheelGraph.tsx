/**
 * medicine-wheel-graph-viz — MedicineWheelGraph Component
 *
 * A pure SVG React component for rendering relational graphs
 * in a medicine wheel circular layout. No D3 runtime dependency —
 * layout is computed by the layout engine, rendering is pure React SVG.
 */

import React, { useMemo, useState, useCallback } from 'react';

import {
  DIRECTION_COLORS,
  OJIBWE_NAMES,
  NODE_TYPE_COLORS,
  CEREMONY_ICONS,
} from 'medicine-wheel-ontology-core';

import type { MedicineWheelGraphProps, MWGraphNode, MWGraphLink } from './types.js';
import {
  applyWheelLayout,
  DEFAULT_LAYOUT,
  getQuadrantGeometries,
  quadrantArcPath,
  curvedLinkPath,
  directionLabelPosition,
} from './layout.js';

// ── Link Style Helpers ──────────────────────────────────────────────────────

function linkStrokeDash(style?: string): string | undefined {
  switch (style) {
    case 'dashed': return '6,3';
    case 'dotted': return '2,2';
    case 'ceremony': return '8,3,2,3';
    default: return undefined;
  }
}

function linkColor(link: MWGraphLink, darkMode: boolean): string {
  if (link.color) return link.color;
  if (link.ceremonyHonored) return '#c9a23a'; // gold for ceremony
  return darkMode ? '#555' : '#ccc';
}

// ── Node Rendering ──────────────────────────────────────────────────────────

interface NodeElementProps {
  node: MWGraphNode;
  showLabel: boolean;
  showOcap: boolean;
  showWilson: boolean;
  darkMode: boolean;
  isHovered: boolean;
  isSelected: boolean;
  onClick: (node: MWGraphNode) => void;
  onMouseEnter: (node: MWGraphNode) => void;
  onMouseLeave: () => void;
}

function NodeElement({
  node, showLabel, showOcap, showWilson,
  darkMode, isHovered, isSelected,
  onClick, onMouseEnter, onMouseLeave,
}: NodeElementProps) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const size = node.size ?? 8;
  const color = node.color ?? NODE_TYPE_COLORS[node.type] ?? '#888';
  const opacity = node.opacity ?? 1;
  const r = size * (isHovered ? 1.3 : 1);

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(node)}
      onMouseEnter={() => onMouseEnter(node)}
      onMouseLeave={onMouseLeave}
    >
      {/* Wilson alignment halo */}
      {showWilson && node.wilsonAlignment !== undefined && (
        <circle
          r={r + 4}
          fill="none"
          stroke={node.wilsonAlignment > 0.7 ? '#4a9e5c' : node.wilsonAlignment > 0.4 ? '#c9a23a' : '#dc143c'}
          strokeWidth={2}
          strokeDasharray={node.wilsonAlignment > 0.7 ? undefined : '3,2'}
          opacity={0.6}
        />
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle r={r + 6} fill="none" stroke="#fff" strokeWidth={2} opacity={0.8} />
      )}

      {/* Node circle */}
      <circle
        r={r}
        fill={color}
        opacity={opacity}
        stroke={darkMode ? '#222' : '#fff'}
        strokeWidth={1.5}
      />

      {/* OCAP indicator */}
      {showOcap && node.ocapCompliant !== undefined && (
        <circle
          cx={r * 0.7}
          cy={-r * 0.7}
          r={3}
          fill={node.ocapCompliant ? '#4a9e5c' : '#dc143c'}
          stroke={darkMode ? '#222' : '#fff'}
          strokeWidth={1}
        />
      )}

      {/* Label */}
      {showLabel && (
        <text
          y={r + 14}
          textAnchor="middle"
          fill={darkMode ? '#ccc' : '#333'}
          fontSize={11}
          fontFamily="system-ui, sans-serif"
        >
          {node.label}
        </text>
      )}
    </g>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function MedicineWheelGraph({
  data,
  width = 600,
  height = 600,
  layout: layoutConfig,
  showDirectionLabels = true,
  showQuadrants = true,
  showCenter = true,
  showLinkLabels = false,
  showNodeLabels = true,
  showOcapIndicators = false,
  showWilsonHalos = false,
  darkMode = true,
  className,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  onBackgroundClick,
}: MedicineWheelGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Merge layout config
  const cfg = useMemo(() => ({
    ...DEFAULT_LAYOUT,
    centerX: width / 2,
    centerY: height / 2,
    radius: Math.min(width, height) / 2 - 50,
    ...layoutConfig,
  }), [width, height, layoutConfig]);

  // Apply layout
  const laidOut = useMemo(
    () => applyWheelLayout({ ...data, nodes: data.nodes.map(n => ({ ...n })) }, cfg),
    [data, cfg]
  );

  // Quadrant geometries
  const quadrants = useMemo(() => getQuadrantGeometries(cfg), [cfg]);

  // Node position lookup
  const nodePos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const n of laidOut.nodes) {
      if (n.x !== undefined && n.y !== undefined) {
        map.set(n.id, { x: n.x, y: n.y });
      }
    }
    return map;
  }, [laidOut]);

  // Connected node IDs for hover highlighting
  const connectedTo = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of laidOut.links) {
      if (!map.has(link.source)) map.set(link.source, new Set());
      if (!map.has(link.target)) map.set(link.target, new Set());
      map.get(link.source)!.add(link.target);
      map.get(link.target)!.add(link.source);
    }
    return map;
  }, [laidOut]);

  // Handlers
  const handleNodeClick = useCallback((node: MWGraphNode) => {
    setSelectedNode(prev => prev === node.id ? null : node.id);
    onNodeClick?.(node);
  }, [onNodeClick]);

  const handleNodeHover = useCallback((node: MWGraphNode) => {
    setHoveredNode(node.id);
    onNodeHover?.(node);
  }, [onNodeHover]);

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null);
    onNodeHover?.(null);
  }, [onNodeHover]);

  const handleBgClick = useCallback(() => {
    setSelectedNode(null);
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Determine if a node should be dimmed (when hovering another node)
  const isNodeDimmed = (nodeId: string): boolean => {
    if (!hoveredNode) return false;
    if (nodeId === hoveredNode) return false;
    return !(connectedTo.get(hoveredNode)?.has(nodeId) ?? false);
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ background: darkMode ? '#0a0a1a' : '#fafafa' }}
      onClick={handleBgClick}
    >
      <defs>
        {/* Arrowhead marker for directed links */}
        <marker
          id="mw-arrow"
          viewBox="0 0 10 6"
          refX={10}
          refY={3}
          markerWidth={8}
          markerHeight={6}
          orient="auto"
        >
          <path d="M0,0 L10,3 L0,6 Z" fill={darkMode ? '#555' : '#999'} />
        </marker>
      </defs>

      {/* Quadrant backgrounds */}
      {showQuadrants && quadrants.map(q => (
        <path
          key={q.direction}
          d={quadrantArcPath(cfg.centerX, cfg.centerY, cfg.radius + 10, cfg.innerRadius ?? 60, q.startAngle, q.endAngle)}
          fill={q.color}
          opacity={darkMode ? 0.06 : 0.08}
        />
      ))}

      {/* Center circle */}
      {showCenter && (
        <circle
          cx={cfg.centerX}
          cy={cfg.centerY}
          r={cfg.innerRadius ?? 60}
          fill="none"
          stroke={darkMode ? '#333' : '#ddd'}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )}

      {/* Direction labels */}
      {showDirectionLabels && quadrants.map(q => {
        const pos = directionLabelPosition(cfg.centerX, cfg.centerY, cfg.radius, q.direction);
        return (
          <g key={`label-${q.direction}`}>
            <text
              x={pos.x}
              y={pos.y}
              textAnchor={pos.anchor}
              fill={q.color}
              fontSize={14}
              fontWeight="bold"
              fontFamily="system-ui, sans-serif"
              opacity={0.9}
            >
              {q.label}
            </text>
            <text
              x={pos.x}
              y={pos.y + 16}
              textAnchor={pos.anchor}
              fill={q.color}
              fontSize={10}
              fontFamily="system-ui, sans-serif"
              opacity={0.6}
            >
              {q.ojibwe}
            </text>
          </g>
        );
      })}

      {/* Links */}
      <g>
        {laidOut.links.map((link, i) => {
          const src = nodePos.get(link.source);
          const tgt = nodePos.get(link.target);
          if (!src || !tgt) return null;

          const isDimmed = hoveredNode
            && link.source !== hoveredNode
            && link.target !== hoveredNode;

          return (
            <g key={`link-${i}`} opacity={isDimmed ? 0.1 : 1}>
              <path
                d={curvedLinkPath(src.x, src.y, tgt.x, tgt.y, link.curvature ?? 0)}
                fill="none"
                stroke={linkColor(link, darkMode)}
                strokeWidth={link.width ?? 1}
                strokeDasharray={linkStrokeDash(link.style)}
                markerEnd="url(#mw-arrow)"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onLinkClick?.(link);
                }}
              />
              {showLinkLabels && link.label && (
                <text
                  x={(src.x + tgt.x) / 2}
                  y={(src.y + tgt.y) / 2 - 5}
                  textAnchor="middle"
                  fill={darkMode ? '#666' : '#999'}
                  fontSize={9}
                  fontFamily="system-ui, sans-serif"
                >
                  {link.label}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {laidOut.nodes.map(node => (
          <NodeElement
            key={node.id}
            node={{
              ...node,
              opacity: isNodeDimmed(node.id) ? 0.15 : (node.opacity ?? 1),
            }}
            showLabel={showNodeLabels}
            showOcap={showOcapIndicators}
            showWilson={showWilsonHalos}
            darkMode={darkMode}
            isHovered={hoveredNode === node.id}
            isSelected={selectedNode === node.id}
            onClick={handleNodeClick}
            onMouseEnter={handleNodeHover}
            onMouseLeave={handleNodeLeave}
          />
        ))}
      </g>
    </svg>
  );
}
