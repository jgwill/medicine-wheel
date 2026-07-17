/**
 * OcapBadge — compact indicator for OCAP® compliance status.
 * Status colors resolve through tokens.css (--mw-wilson-*) with fallbacks.
 */
import type { OcapFlags } from '@medicine-wheel/ontology-core';

const OK = 'var(--mw-wilson-high, #22c55e)';
const BAD = 'var(--mw-wilson-low, #ef4444)';
const WARN = 'var(--mw-wilson-mid, #f59e0b)';

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
      <span
        className={className}
        style={{
          fontSize: 'var(--text-xs, 12px)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm, 4px)',
          background: `color-mix(in srgb, ${WARN} 14%, transparent)`,
          color: WARN,
          fontWeight: 500,
        }}
      >
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
  const tone = compliant ? OK : BAD;

  if (!detailed) {
    return (
      <span
        className={className}
        title={flags.map(f => `${f.label}: ${f.value ? '✓' : '✗'}`).join(', ')}
        style={{
          fontSize: 'var(--text-xs, 12px)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm, 4px)',
          background: `color-mix(in srgb, ${tone} 14%, transparent)`,
          color: tone,
          fontWeight: 500,
        }}
      >
        OCAP® {compliant ? '✓' : '✗'}
      </span>
    );
  }

  return (
    <div className={className} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {flags.map(f => {
        const flagTone = f.value ? OK : BAD;
        return (
          <span
            key={f.key}
            title={f.label}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: 'var(--radius-sm, 4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              background: `color-mix(in srgb, ${flagTone} 14%, transparent)`,
              color: flagTone,
            }}
          >
            {f.key}
          </span>
        );
      })}
    </div>
  );
}
