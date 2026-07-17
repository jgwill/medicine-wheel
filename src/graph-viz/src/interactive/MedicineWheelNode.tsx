/**
 * @medicine-wheel/graph-viz — Interactive custom node
 *
 * Renders a single relational node inside the React Flow canvas:
 * direction-colored circle, OCAP® badge, Wilson alignment halo,
 * node-type icon, and label. Carries (hidden) handles so React Flow
 * can route edges to/from the node center.
 */

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import {
  NODE_TYPE_COLORS,
  CEREMONY_ICONS,
} from '@medicine-wheel/ontology-core';

import type { MWGraphNode } from '../types.js';
import { DIRECTION_PRESENTATION } from './DirectionQuadrant.js';

/** Data carried on each React Flow node. */
export interface MedicineWheelNodeData extends Record<string, unknown> {
  node: MWGraphNode;
  showLabel: boolean;
  showOcap: boolean;
  showWilson: boolean;
  darkMode: boolean;
}

function wilsonColor(alignment: number): string {
  if (alignment > 0.7) return '#4a9e5c';
  if (alignment > 0.4) return '#c9a23a';
  return '#dc143c';
}

/** Cardinal points for connection handles on the node's circumference. */
const HANDLE_POSITIONS: { id: string; position: Position }[] = [
  { id: 'n', position: Position.Top },
  { id: 'e', position: Position.Right },
  { id: 's', position: Position.Bottom },
  { id: 'w', position: Position.Left },
];

function MedicineWheelNodeComponent({ data, selected, isConnectable }: NodeProps) {
  const { node, showLabel, showOcap, showWilson, darkMode } =
    data as MedicineWheelNodeData;

  const size = (node.size ?? 8) * 1.6;
  const diameter = size * 2;
  const color = node.color ?? NODE_TYPE_COLORS[node.type] ?? '#888';
  const opacity = node.opacity ?? 1;
  const icon = (CEREMONY_ICONS as Record<string, string>)[node.type];

  const ringColor =
    showWilson && node.wilsonAlignment !== undefined
      ? wilsonColor(node.wilsonAlignment)
      : undefined;

  return (
    <div
      style={{
        position: 'relative',
        width: diameter,
        height: diameter,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={`${node.label} (${node.type}${node.direction ? ` · ${node.direction}` : ''})`}
    >
      {/* Hidden center target: magnetic drop point for incoming threads
          (connectionRadius snaps to it), and the routing anchor when
          connections are disabled. */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, left: '50%', top: '50%', border: 'none' }}
        isConnectable={isConnectable}
      />
      {/* Cardinal source handles on the circumference — revealed on
          hover/selection (see .mw-node-handle CSS) so relations can be
          woven by dragging outward in any direction. */}
      {isConnectable &&
        HANDLE_POSITIONS.map((h) => (
          <Handle
            key={h.id}
            id={h.id}
            type="source"
            position={h.position}
            className="mw-node-handle"
            isConnectable={isConnectable}
          />
        ))}

      {/* Wilson alignment halo */}
      {ringColor && (
        <span
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '9999px',
            border: `2px ${node.wilsonAlignment! > 0.7 ? 'solid' : 'dashed'} ${ringColor}`,
            opacity: 0.6,
          }}
        />
      )}

      {/* Selection halo — colored by the node's direction (never ceremony
          gold): being chosen is information about where the being lives. */}
      {selected && (
        <span
          className="mw-selection-halo"
          style={{
            position: 'absolute',
            inset: -9,
            borderRadius: '9999px',
            ['--mw-halo' as string]: node.direction
              ? DIRECTION_PRESENTATION[node.direction].ink
              : 'var(--mw-fg, #e5e7eb)',
            boxShadow:
              '0 0 0 2px var(--mw-halo), 0 0 16px 4px var(--mw-halo)',
            opacity: 0.75,
          }}
        />
      )}

      {/* Node circle */}
      <span
        style={{
          width: diameter,
          height: diameter,
          borderRadius: '9999px',
          background: color,
          opacity,
          border: `1.5px solid ${darkMode ? '#222' : '#fff'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.max(10, size * 0.9),
          lineHeight: 1,
        }}
      >
        {icon ?? ''}
      </span>

      {/* OCAP® indicator */}
      {showOcap && node.ocapCompliant !== undefined && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: '9999px',
            background: node.ocapCompliant ? '#4a9e5c' : '#dc143c',
            border: `1px solid ${darkMode ? '#222' : '#fff'}`,
          }}
        />
      )}

      {/* Label */}
      {showLabel && (
        <span
          style={{
            position: 'absolute',
            top: diameter + 2,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontSize: 11,
            fontFamily: 'system-ui, sans-serif',
            color: darkMode ? '#ccc' : '#333',
            pointerEvents: 'none',
          }}
        >
          {node.label.length > 22 ? node.label.slice(0, 21) + '…' : node.label}
        </span>
      )}
    </div>
  );
}

export const MedicineWheelNode = memo(MedicineWheelNodeComponent);
MedicineWheelNode.displayName = 'MedicineWheelNode';
