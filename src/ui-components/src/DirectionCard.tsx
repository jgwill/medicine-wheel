/**
 * DirectionCard — displays a direction with its associated metadata,
 * color coding, and cultural context.
 */
import React from 'react';
import type { Direction, DirectionName } from 'medicine-wheel-ontology-core';
import { DIRECTION_COLORS, DIRECTIONS, OJIBWE_NAMES } from 'medicine-wheel-ontology-core';

const DIR_ICONS: Record<DirectionName, string> = {
  east: '🌅', south: '🔥', west: '🌊', north: '❄️',
};

export interface DirectionCardProps {
  direction: DirectionName;
  /** Optional override data (defaults to DIRECTIONS constant) */
  data?: Direction;
  /** Show the Ojibwe name */
  showOjibwe?: boolean;
  /** Click handler */
  onClick?: (direction: DirectionName) => void;
  /** Whether this card is selected */
  selected?: boolean;
  /** Custom className */
  className?: string;
}

export function DirectionCard({
  direction,
  data,
  showOjibwe = true,
  onClick,
  selected = false,
  className = '',
}: DirectionCardProps) {
  const dir = data ?? DIRECTIONS.find(d => d.name === direction);
  if (!dir) return null;

  const color = DIRECTION_COLORS[direction];
  const icon = DIR_ICONS[direction];

  return (
    <div
      onClick={() => onClick?.(direction)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (e.key === 'Enter' && onClick) onClick(direction); }}
      className={className}
      style={{
        border: `2px solid ${selected ? color : 'transparent'}`,
        borderRadius: '12px',
        padding: '16px',
        background: selected ? `${color}15` : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div>
          <h3 style={{ margin: 0, color, textTransform: 'capitalize', fontSize: '16px', fontWeight: 600 }}>
            {dir.name}
          </h3>
          {showOjibwe && (
            <span style={{ fontSize: '12px', opacity: 0.7, fontStyle: 'italic' }}>
              {dir.ojibwe}
            </span>
          )}
        </div>
      </div>
      <p style={{ margin: '4px 0', fontSize: '13px', opacity: 0.8 }}>{dir.medicine.join(', ')}</p>
      <p style={{ margin: '4px 0', fontSize: '12px', opacity: 0.6 }}>{dir.season} · {dir.lifeStage}</p>
    </div>
  );
}
