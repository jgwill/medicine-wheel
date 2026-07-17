/**
 * DirectionCard — displays a direction with its associated metadata,
 * color coding, and cultural context.
 *
 * Colors resolve through tokens.css presentation vars (--mw-<dir>) with the
 * canonical ontology color as fallback for consumers without the stylesheet.
 */
import type { Direction, DirectionName } from '@medicine-wheel/ontology-core';
import { DIRECTION_COLORS, DIRECTIONS } from '@medicine-wheel/ontology-core';

const DIR_ICONS: Record<DirectionName, string> = {
  east: '🌅', south: '🔥', west: '🌊', north: '❄️',
};

const dirVar = (d: DirectionName) => `var(--mw-${d}, ${DIRECTION_COLORS[d]})`;
const dirInk = (d: DirectionName) => `var(--mw-${d}-ink, ${DIRECTION_COLORS[d]})`;

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

  const icon = DIR_ICONS[direction];

  return (
    <div
      onClick={() => onClick?.(direction)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick(direction);
        }
      }}
      className={`mw-dir-card${selected ? ' mw-dir-card--selected' : ''} ${className}`.trim()}
      style={{
        ['--dir' as string]: dirVar(direction),
        padding: 'var(--space-4, 16px)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2, 8px)', marginBottom: 'var(--space-2, 8px)' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div>
          <h3 style={{ margin: 0, color: dirInk(direction), textTransform: 'capitalize', fontSize: 'var(--text-base, 16px)', fontWeight: 600 }}>
            {dir.name}
          </h3>
          {showOjibwe && (
            <span style={{ fontSize: 'var(--text-xs, 12px)', opacity: 0.75, fontStyle: 'italic' }}>
              {dir.ojibwe}
            </span>
          )}
        </div>
      </div>
      <p style={{ margin: '4px 0', fontSize: '13px', opacity: 0.85 }}>{dir.medicine.join(' · ')}</p>
      <p style={{ margin: '4px 0', fontSize: 'var(--text-xs, 12px)', opacity: 0.65 }}>{dir.season} · {dir.lifeStage}</p>
    </div>
  );
}
