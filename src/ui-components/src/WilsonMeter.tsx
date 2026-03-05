/**
 * WilsonMeter — visual gauge for Wilson relational alignment (0–1).
 */
import React from 'react';

export interface WilsonMeterProps {
  /** Alignment value 0–1 */
  alignment: number;
  /** Size in px */
  size?: number;
  /** Show numeric label */
  showLabel?: boolean;
  /** Custom className */
  className?: string;
}

function alignmentColor(value: number): string {
  if (value >= 0.7) return '#22c55e';
  if (value >= 0.4) return '#f59e0b';
  return '#ef4444';
}

export function WilsonMeter({
  alignment,
  size = 48,
  showLabel = true,
  className = '',
}: WilsonMeterProps) {
  const clamped = Math.max(0, Math.min(1, alignment));
  const color = alignmentColor(clamped);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
      title={`Wilson Alignment: ${(clamped * 100).toFixed(0)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          opacity={0.1}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${offset}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        {/* Center text */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.28}
          fontWeight={600}
          fill={color}
        >
          {(clamped * 100).toFixed(0)}
        </text>
      </svg>
      {showLabel && (
        <span style={{ fontSize: '10px', opacity: 0.5 }}>Wilson</span>
      )}
    </div>
  );
}
