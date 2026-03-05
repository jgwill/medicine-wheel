/**
 * NodeInspector — detail panel for a RelationalNode showing
 * type, direction, metadata, and connected edges.
 */
import React from 'react';
import type { RelationalNode, RelationalEdge, DirectionName } from 'medicine-wheel-ontology-core';
import { DIRECTION_COLORS, NODE_TYPE_COLORS } from 'medicine-wheel-ontology-core';

const DIR_ICONS: Record<DirectionName, string> = {
  east: '🌅', south: '🔥', west: '🌊', north: '❄️',
};

export interface NodeInspectorProps {
  node: RelationalNode;
  edges?: RelationalEdge[];
  /** All nodes for resolving edge endpoints */
  allNodes?: RelationalNode[];
  /** Close handler */
  onClose?: () => void;
  /** Navigate to connected node */
  onNavigate?: (nodeId: string) => void;
  /** Custom className */
  className?: string;
}

export function NodeInspector({
  node,
  edges = [],
  allNodes = [],
  onClose,
  onNavigate,
  className = '',
}: NodeInspectorProps) {
  const color = node.direction ? DIRECTION_COLORS[node.direction] : '#888';
  const icon = node.direction ? DIR_ICONS[node.direction] : '◯';
  const typeColor = NODE_TYPE_COLORS[node.type] ?? '#888';
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));

  // Find connected edges
  const connectedEdges = edges.filter(e => e.from_id === node.id || e.to_id === node.id);

  return (
    <div className={className} style={{ borderRadius: '12px', border: `1px solid ${color}40`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${color}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{node.name}</h3>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: `${typeColor}20`, color: typeColor }}>
                {node.type}
              </span>
              {node.direction && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: `${color}20`, color, textTransform: 'capitalize' }}>
                  {node.direction}
                </span>
              )}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.5, color: 'inherit' }}
            aria-label="Close inspector"
          >
            ✕
          </button>
        )}
      </div>

      {/* Metadata */}
      {node.metadata && Object.keys(node.metadata).length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '12px', opacity: 0.5, textTransform: 'uppercase' }}>Metadata</h4>
          {Object.entries(node.metadata).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '2px 0' }}>
              <span style={{ opacity: 0.6 }}>{key}</span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Relations */}
      {connectedEdges.length > 0 && (
        <div style={{ padding: '12px 16px' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '12px', opacity: 0.5, textTransform: 'uppercase' }}>
            Relations ({connectedEdges.length})
          </h4>
          {connectedEdges.map((edge, i) => {
            const otherId = edge.from_id === node.id ? edge.to_id : edge.from_id;
            const otherNode = nodeMap.get(otherId);
            const otherColor = otherNode?.direction ? DIRECTION_COLORS[otherNode.direction] : '#888';

            return (
              <div
                key={i}
                onClick={() => onNavigate?.(otherId)}
                role={onNavigate ? 'button' : undefined}
                tabIndex={onNavigate ? 0 : undefined}
                onKeyDown={(e) => { if (e.key === 'Enter' && onNavigate) onNavigate(otherId); }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: onNavigate ? 'pointer' : 'default',
                  marginBottom: '4px',
                  background: 'rgba(128,128,128,0.05)',
                }}
              >
                <div>
                  <span style={{ opacity: 0.5, fontSize: '11px' }}>{edge.relationship_type}</span>
                  <span style={{ margin: '0 6px' }}>→</span>
                  <span style={{ color: otherColor, fontWeight: 500 }}>
                    {otherNode?.name ?? otherId}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', opacity: 0.5 }}>
                    {(edge.strength * 100).toFixed(0)}%
                  </span>
                  {edge.ceremony_honored && <span style={{ fontSize: '10px' }}>🔥</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '8px 16px', fontSize: '11px', opacity: 0.4, borderTop: '1px solid rgba(128,128,128,0.1)' }}>
        ID: {node.id} · Created: {new Date(node.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
