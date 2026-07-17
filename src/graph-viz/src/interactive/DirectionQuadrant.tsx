/**
 * @medicine-wheel/graph-viz — Direction quadrant backdrop
 *
 * Draws the wheel made visible behind the nodes: four direction sectors,
 * concentric rings, the four-direction cross, and bilingual direction
 * labels (English + Ojibwe). Rendered in flow coordinates via
 * `ViewportPortal` so the backdrop pans and zooms with the canvas.
 *
 * Colors: the canonical semantic direction colors live in ontology-core
 * (`DIRECTION_COLORS`) and are NOT changed here. Presentation on the dark
 * ground reads the app's `--mw-*` tokens with self-contained fallbacks —
 * this is what makes West (semantically near-black) visible.
 *
 * The entire backdrop is `pointer-events: none` so it never steals drag /
 * pan gestures from React Flow.
 */

import React from 'react';
import { ViewportPortal } from '@xyflow/react';

import type { DirectionName } from '@medicine-wheel/ontology-core';

import {
  DEFAULT_LAYOUT,
  getQuadrantGeometries,
  quadrantArcPath,
} from '../layout.js';
import type { WheelLayoutConfig } from '../types.js';

export interface DirectionQuadrantProps {
  layout?: Partial<WheelLayoutConfig>;
  showLabels?: boolean;
}

/**
 * Presentation tints per direction — CSS custom properties from the app's
 * token system (`tokens.css`), with fallbacks so the package renders
 * standalone. Direction color = information: these tints only ever mark
 * the direction they belong to.
 */
export const DIRECTION_PRESENTATION: Record<
  DirectionName,
  { fill: string; stroke: string; ink: string }
> = {
  east: {
    fill: 'var(--mw-east-quadrant, rgba(255, 215, 0, 0.05))',
    stroke: 'var(--mw-east-border, rgba(255, 215, 0, 0.38))',
    ink: 'var(--mw-east-ink, #FFD700)',
  },
  south: {
    fill: 'var(--mw-south-quadrant, rgba(220, 38, 38, 0.06))',
    stroke: 'var(--mw-south-border, rgba(220, 38, 38, 0.38))',
    ink: 'var(--mw-south-ink, #FF7B72)',
  },
  west: {
    fill: 'var(--mw-west-quadrant, rgba(107, 122, 153, 0.09))',
    stroke: 'var(--mw-west-border, rgba(107, 122, 153, 0.44))',
    ink: 'var(--mw-west-ink, #9FAEC9)',
  },
  north: {
    fill: 'var(--mw-north-quadrant, rgba(247, 245, 240, 0.04))',
    stroke: 'var(--mw-north-border, rgba(247, 245, 240, 0.38))',
    ink: 'var(--mw-north-ink, #F7F5F0)',
  },
};

const RING_STROKE = 'rgba(255, 255, 255, 0.07)';
const CROSS_STROKE = 'rgba(255, 255, 255, 0.09)';

/** Quadrant boundary angles (degrees): the four-direction cross. */
const CROSS_ANGLES = [45, 135, 225, 315];

export function DirectionQuadrant({
  layout,
  showLabels = true,
}: DirectionQuadrantProps) {
  const cfg: WheelLayoutConfig = { ...DEFAULT_LAYOUT, ...layout };
  const quadrants = getQuadrantGeometries(cfg);
  const { centerX, centerY, radius, innerRadius = 60 } = cfg;

  // Concentric rings: heart, midway breaths, and the rim.
  const ringRadii = [
    innerRadius,
    innerRadius + (radius - innerRadius) / 3,
    innerRadius + ((radius - innerRadius) * 2) / 3,
  ];

  return (
    <ViewportPortal>
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <g pointerEvents="none">
          {/* Direction sectors */}
          {quadrants.map((q) => {
            const look = DIRECTION_PRESENTATION[q.direction];
            return (
              <path
                key={q.direction}
                d={quadrantArcPath(
                  centerX,
                  centerY,
                  radius,
                  innerRadius,
                  q.startAngle,
                  q.endAngle,
                )}
                style={{ fill: look.fill, stroke: look.stroke }}
                strokeWidth={1.25}
                pointerEvents="none"
              />
            );
          })}

          {/* Concentric rings */}
          {ringRadii.map((r) => (
            <circle
              key={`ring-${r}`}
              cx={centerX}
              cy={centerY}
              r={r}
              fill="none"
              stroke={RING_STROKE}
              strokeWidth={1}
            />
          ))}
          {/* The rim: slightly stronger so the wheel has an edge */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth={1.5}
          />

          {/* Four-direction cross along the quadrant boundaries */}
          {CROSS_ANGLES.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={`cross-${deg}`}
                x1={centerX + Math.cos(rad) * innerRadius}
                y1={centerY + Math.sin(rad) * innerRadius}
                x2={centerX + Math.cos(rad) * radius}
                y2={centerY + Math.sin(rad) * radius}
                stroke={CROSS_STROKE}
                strokeWidth={1}
              />
            );
          })}

          {/* Direction labels: English + Ojibwe, in the direction's ink.
              Placed just inside the rim so a node-fitted viewport keeps
              them in frame. */}
          {showLabels &&
            quadrants.map((q) => {
              const rad = (q.centerAngle * Math.PI) / 180;
              const labelRadius = radius - 44;
              const x = centerX + Math.cos(rad) * labelRadius;
              // Nudge south up so both text lines stay inside the rim.
              const y =
                centerY +
                Math.sin(rad) * labelRadius -
                (q.direction === 'south' ? 14 : 0);
              const ink = DIRECTION_PRESENTATION[q.direction].ink;
              return (
                <text
                  key={`label-${q.direction}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  style={{ fill: ink }}
                  fontSize={15}
                  fontWeight={700}
                  letterSpacing="0.08em"
                  opacity={0.92}
                  pointerEvents="none"
                >
                  {q.label.toUpperCase()}
                  <tspan
                    x={x}
                    dy={17}
                    fontSize={11.5}
                    fontWeight={400}
                    letterSpacing="0.02em"
                    opacity={0.85}
                  >
                    {q.ojibwe}
                  </tspan>
                </text>
              );
            })}
        </g>
      </svg>
    </ViewportPortal>
  );
}
