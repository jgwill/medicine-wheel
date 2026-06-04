/**
 * @medicine-wheel/graph-viz — Direction quadrant backdrop
 *
 * Draws the four medicine-wheel direction sectors (East/South/West/North)
 * behind the nodes, in flow coordinates, so the backdrop pans and zooms
 * with the canvas. Reuses `getQuadrantGeometries` + `quadrantArcPath`.
 *
 * The entire backdrop is `pointer-events: none` so it never steals drag /
 * pan gestures from React Flow.
 */

import React from 'react';
import { ViewportPortal } from '@xyflow/react';

import {
  DEFAULT_LAYOUT,
  getQuadrantGeometries,
  quadrantArcPath,
  directionLabelPosition,
} from '../layout.js';
import type { WheelLayoutConfig } from '../types.js';

export interface DirectionQuadrantProps {
  layout?: Partial<WheelLayoutConfig>;
  showLabels?: boolean;
}

export function DirectionQuadrant({
  layout,
  showLabels = true,
}: DirectionQuadrantProps) {
  const cfg: WheelLayoutConfig = { ...DEFAULT_LAYOUT, ...layout };
  const quadrants = getQuadrantGeometries(cfg);
  const { centerX, centerY, radius, innerRadius = 60 } = cfg;

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
      >
        <g pointerEvents="none">
          {quadrants.map((q) => (
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
              fill={q.color}
              opacity={0.08}
              stroke={q.color}
              strokeOpacity={0.25}
              strokeWidth={1}
              pointerEvents="none"
            />
          ))}

          {showLabels &&
            quadrants.map((q) => {
              const pos = directionLabelPosition(
                centerX,
                centerY,
                radius,
                q.direction,
              );
              return (
                <text
                  key={`label-${q.direction}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor={pos.anchor}
                  fill={q.color}
                  fontSize={14}
                  fontWeight={700}
                  opacity={0.7}
                  pointerEvents="none"
                >
                  {q.label}
                  <tspan
                    x={pos.x}
                    dy={16}
                    fontSize={11}
                    fontWeight={400}
                    opacity={0.8}
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
