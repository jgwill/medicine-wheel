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

function MedicineWheelNodeComponent({ data, selected }: NodeProps) {
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
      {/* Hidden handles centered on the node so edges route to its middle. */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, left: '50%', top: '50%', border: 'none' }}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, left: '50%', top: '50%', border: 'none' }}
        isConnectable={false}
      />

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

      {/* Selection ring */}
      {selected && (
        <span
          style={{
            position: 'absolute',
            inset: -9,
            borderRadius: '9999px',
            border: '2px solid #FFD700',
            opacity: 0.9,
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
