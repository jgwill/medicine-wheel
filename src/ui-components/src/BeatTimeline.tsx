/**
 * BeatTimeline — displays narrative beats along a horizontal timeline
 * with direction-coded markers.
 */
import React from 'react';
import type { NarrativeBeat, DirectionName } from 'medicine-wheel-ontology-core';
import { DIRECTION_COLORS } from 'medicine-wheel-ontology-core';

const DIR_ICONS: Record<DirectionName, string> = {
  east: '🌅', south: '🔥', west: '🌊', north: '❄️',
};

export interface BeatTimelineProps {
  beats: NarrativeBeat[];
  /** Selected beat ID */
  selectedId?: string;
  /** Click handler */
  onBeatClick?: (beat: NarrativeBeat) => void;
  /** Timeline height in px */
  height?: number;
  /** Custom className */
  className?: string;
}

export function BeatTimeline({
  beats,
  selectedId,
  onBeatClick,
  height = 120,
  className = '',
}: BeatTimelineProps) {
  const sorted = [...beats].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (sorted.length === 0) {
    return (
      <div className={className} style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: '14px' }}>
        No beats yet
      </div>
    );
  }

  return (
    <div className={className} style={{ height, position: 'relative', overflow: 'hidden' }}>
      {/* Timeline line */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '24px',
        right: '24px',
        height: '2px',
        background: 'currentColor',
        opacity: 0.2,
      }} />

      {/* Beat markers */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 16px', gap: '0' }}>
        {sorted.map((beat, i) => {
          const color = DIRECTION_COLORS[beat.direction];
          const icon = DIR_ICONS[beat.direction];
          const isSelected = beat.id === selectedId;
          const leftPercent = sorted.length === 1 ? 50 : (i / (sorted.length - 1)) * 100;

          return (
            <div
              key={beat.id}
              onClick={() => onBeatClick?.(beat)}
              role={onBeatClick ? 'button' : undefined}
              tabIndex={onBeatClick ? 0 : undefined}
              onKeyDown={(e) => { if (e.key === 'Enter' && onBeatClick) onBeatClick(beat); }}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: onBeatClick ? 'pointer' : 'default',
              }}
            >
              {/* Act label */}
              <span style={{ fontSize: '10px', opacity: 0.5, marginBottom: '4px' }}>
                Act {beat.act}
              </span>

              {/* Marker */}
              <div style={{
                width: isSelected ? '36px' : '28px',
                height: isSelected ? '36px' : '28px',
                borderRadius: '50%',
                background: `${color}30`,
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isSelected ? '16px' : '14px',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 0 12px ${color}40` : 'none',
              }}>
                {icon}
              </div>

              {/* Title */}
              <span style={{
                fontSize: '11px',
                marginTop: '4px',
                maxWidth: '80px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                fontWeight: isSelected ? 600 : 400,
              }}>
                {beat.title}
              </span>

              {/* Ceremony indicator */}
              {beat.ceremonies.length > 0 && (
                <span style={{ fontSize: '8px', marginTop: '2px' }}>🔥</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
