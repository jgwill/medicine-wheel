/**
 * OcapBadge — compact indicator for OCAP® compliance status.
 */
import React from 'react';
import type { OcapFlags } from 'medicine-wheel-ontology-core';

export interface OcapBadgeProps {
  ocap?: OcapFlags;
  /** Show detailed breakdown */
  detailed?: boolean;
  /** Custom className */
  className?: string;
}

export function OcapBadge({ ocap, detailed = false, className = '' }: OcapBadgeProps) {
  if (!ocap) {
    return (
      <span className={className} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#ff880020', color: '#ff8800' }}>
        No OCAP
      </span>
    );
  }

  const flags = [
    { key: 'O', label: 'Ownership', value: ocap.ownership },
    { key: 'C', label: 'Control', value: ocap.control },
    { key: 'A', label: 'Access', value: ocap.access },
    { key: 'P', label: 'Possession', value: ocap.possession },
  ];

  const compliant = ocap.compliant;

  if (!detailed) {
    return (
      <span
        className={className}
        title={flags.map(f => `${f.label}: ${f.value ? '✓' : '✗'}`).join(', ')}
        style={{
          fontSize: '12px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: compliant ? '#22c55e20' : '#ef444420',
          color: compliant ? '#22c55e' : '#ef4444',
          fontWeight: 500,
        }}
      >
        OCAP® {compliant ? '✓' : '✗'}
      </span>
    );
  }

  return (
    <div className={className} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {flags.map(f => (
        <span
          key={f.key}
          title={f.label}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
            background: f.value ? '#22c55e20' : '#ef444420',
            color: f.value ? '#22c55e' : '#ef4444',
          }}
        >
          {f.key}
        </span>
      ))}
    </div>
  );
}
