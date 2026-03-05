/**
 * medicine-wheel-graph-viz — Circular Layout Engine
 *
 * Positions nodes in a medicine wheel pattern:
 * - East (right): 315°–45°
 * - South (bottom): 45°–135°
 * - West (left): 135°–225°
 * - North (top): 225°–315°
 *
 * Nodes without a direction are placed in the center.
 */

import type {
  DirectionName,
} from 'medicine-wheel-ontology-core';

import {
  DIRECTION_COLORS,
  OJIBWE_NAMES,
} from 'medicine-wheel-ontology-core';

import type {
  MWGraphNode,
  MWGraphData,
  WheelLayoutConfig,
  QuadrantGeometry,
} from './types.js';

// ── Direction → Angle Mapping ───────────────────────────────────────────────
// Medicine wheel: East at right (0°/360°), clockwise
// SVG angles: 0° = right, increases clockwise

const DIRECTION_ANGLES: Record<DirectionName, { start: number; end: number }> = {
  east:  { start: 315, end: 45 },
  south: { start: 45,  end: 135 },
  west:  { start: 135, end: 225 },
  north: { start: 225, end: 315 },
};

const DIRECTION_ORDER: DirectionName[] = ['east', 'south', 'west', 'north'];

// ── Default Layout Config ───────────────────────────────────────────────────

export const DEFAULT_LAYOUT: WheelLayoutConfig = {
  mode: 'wheel',
  centerX: 300,
  centerY: 300,
  radius: 250,
  innerRadius: 60,
  quadrantPadding: 5,
  startAngle: 0,
  jitter: true,
  jitterAmount: 15,
};

// ── Quadrant Geometry ───────────────────────────────────────────────────────

export function getQuadrantGeometries(
  config: WheelLayoutConfig = DEFAULT_LAYOUT
): QuadrantGeometry[] {
  const padding = config.quadrantPadding ?? 5;
  const offset = config.startAngle ?? 0;

  return DIRECTION_ORDER.map(dir => {
    const angles = DIRECTION_ANGLES[dir];
    const start = ((angles.start + offset) % 360);
    const end = ((angles.end + offset) % 360);
    const centerAngle = dir === 'east'
      ? (start + (end + 360 - start) / 2) % 360
      : (start + end) / 2;

    return {
      direction: dir,
      startAngle: start + padding / 2,
      endAngle: (dir === 'east' ? end + 360 : end) - padding / 2,
      centerAngle,
      color: DIRECTION_COLORS[dir],
      label: dir.charAt(0).toUpperCase() + dir.slice(1),
      ojibwe: OJIBWE_NAMES[dir],
    };
  });
}

// ── Polar → Cartesian ───────────────────────────────────────────────────────

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

// ── Seeded pseudo-random for deterministic jitter ───────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// ── Layout Engine ───────────────────────────────────────────────────────────

/**
 * Apply medicine wheel circular layout to graph data.
 * Mutates node x/y positions in place and returns the data.
 */
export function applyWheelLayout(
  data: MWGraphData,
  config: Partial<WheelLayoutConfig> = {}
): MWGraphData {
  const cfg: WheelLayoutConfig = { ...DEFAULT_LAYOUT, ...config };
  const { centerX, centerY, radius, innerRadius = 60, jitter, jitterAmount = 15 } = cfg;
  const quadrants = getQuadrantGeometries(cfg);

  // Group nodes by direction
  const grouped: Record<DirectionName | 'center', MWGraphNode[]> = {
    east: [], south: [], west: [], north: [], center: [],
  };

  for (const node of data.nodes) {
    if (node.direction && node.direction in grouped) {
      grouped[node.direction].push(node);
    } else {
      grouped.center.push(node);
    }
  }

  // Position nodes in each quadrant
  for (const quad of quadrants) {
    const nodes = grouped[quad.direction];
    if (nodes.length === 0) continue;

    // Effective angle range for this quadrant
    let startDeg = quad.startAngle;
    let endDeg = quad.endAngle;
    if (endDeg < startDeg) endDeg += 360; // handle wrap (east)

    const angleRange = endDeg - startDeg;
    const angleStep = nodes.length > 1 ? angleRange / (nodes.length) : 0;

    nodes.forEach((node, i) => {
      // Distribute evenly within quadrant
      const angle = startDeg + angleStep * (i + 0.5);

      // Vary radius between inner and outer
      const radiusRange = radius - innerRadius;
      const nodeRadius = innerRadius + radiusRange * (0.3 + 0.5 * seededRandom(i + quad.direction.length));

      const pos = polarToCartesian(centerX, centerY, nodeRadius, angle);

      // Apply jitter
      if (jitter) {
        const jx = (seededRandom(i * 7 + 1) - 0.5) * jitterAmount;
        const jy = (seededRandom(i * 13 + 3) - 0.5) * jitterAmount;
        pos.x += jx;
        pos.y += jy;
      }

      node.x = pos.x;
      node.y = pos.y;
    });
  }

  // Position center nodes in a small circle
  const centerNodes = grouped.center;
  if (centerNodes.length > 0) {
    const centerRadius = Math.min(innerRadius * 0.6, 40);
    const angleStep = (2 * Math.PI) / Math.max(centerNodes.length, 1);

    centerNodes.forEach((node, i) => {
      if (centerNodes.length === 1) {
        node.x = centerX;
        node.y = centerY;
      } else {
        node.x = centerX + centerRadius * Math.cos(angleStep * i);
        node.y = centerY + centerRadius * Math.sin(angleStep * i);
      }
    });
  }

  return data;
}

// ── SVG Path Helpers ────────────────────────────────────────────────────────

/**
 * Generate an SVG arc path for a quadrant background sector.
 */
export function quadrantArcPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  // Handle wrap-around for east quadrant
  let endDeg = endAngleDeg;
  if (endDeg < startAngleDeg) endDeg += 360;

  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngleDeg);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endDeg);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endDeg);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngleDeg);

  const largeArc = (endDeg - startAngleDeg) > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

/**
 * Generate a curved link path between two nodes.
 */
export function curvedLinkPath(
  x1: number, y1: number,
  x2: number, y2: number,
  curvature: number = 0
): string {
  if (curvature === 0) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Perpendicular offset for the control point
  const cx = mx - dy * curvature;
  const cy = my + dx * curvature;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

/**
 * Generate a direction label position (outside the wheel).
 */
export function directionLabelPosition(
  cx: number,
  cy: number,
  radius: number,
  direction: DirectionName
): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const angles: Record<DirectionName, number> = {
    east: 0,
    south: 90,
    west: 180,
    north: 270,
  };
  const pos = polarToCartesian(cx, cy, radius + 30, angles[direction]);
  const anchor = direction === 'east' ? 'start'
    : direction === 'west' ? 'end'
    : 'middle';
  return { ...pos, anchor };
}
