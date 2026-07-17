/**
 * @medicine-wheel/graph-viz — Custom radial edge
 *
 * Floating edge for circular nodes: endpoints sit on each node's
 * circumference (not its center), the path honors `MWGraphLink.curvature`
 * as a quadratic arc around the wheel, and labels render as HTML pills via
 * `EdgeLabelRenderer` so they stay legible over quadrant tints.
 *
 * Ceremony-honored links are the only elements allowed to glow gold:
 * they get a gold→ember gradient stroke and, when animation is enabled
 * and the user does not prefer reduced motion, a slow particle traveling
 * the thread.
 */

import React, { useEffect, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
} from '@xyflow/react';

import { curvedLinkPath } from '../layout.js';
import type { MWGraphLink } from '../types.js';

/** Point on a circle's circumference toward a target point. */
function circleEdgePoint(
  cx: number,
  cy: number,
  r: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / len) * r, y: cy + (dy / len) * r };
}

/** Midpoint (t = 0.5) of the quadratic arc used by `curvedLinkPath`. */
function arcMidpoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number,
): { x: number; y: number } {
  if (curvature === 0) {
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = (x1 + x2) / 2 - dy * curvature;
  const cy = (y1 + y2) / 2 + dx * curvature;
  return {
    x: 0.25 * x1 + 0.5 * cx + 0.25 * x2,
    y: 0.25 * y1 + 0.5 * cy + 0.25 * y2,
  };
}

/** SSR-safe `prefers-reduced-motion` subscription. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export function MedicineWheelEdge({
  id,
  source,
  target,
  style,
  label,
  data,
  markerEnd,
  animated,
  selected,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!sourceNode || !targetNode) return null;

  const edgeData = data as
    | { link?: MWGraphLink; dimmed?: boolean }
    | undefined;
  const link = edgeData?.link;
  const ceremony = link?.ceremonyHonored === true;
  const curvature = link?.curvature ?? 0;
  const dimmed = edgeData?.dimmed === true;

  const sr = (sourceNode.measured.width ?? 26) / 2;
  const tr = (targetNode.measured.width ?? 26) / 2;
  const sc = {
    x: sourceNode.internals.positionAbsolute.x + sr,
    y: sourceNode.internals.positionAbsolute.y + sr,
  };
  const tc = {
    x: targetNode.internals.positionAbsolute.x + tr,
    y: targetNode.internals.positionAbsolute.y + tr,
  };
  const from = circleEdgePoint(sc.x, sc.y, sr, tc.x, tc.y);
  const to = circleEdgePoint(tc.x, tc.y, tr, sc.x, sc.y);

  const path = curvedLinkPath(from.x, from.y, to.x, to.y, curvature);
  const mid = arcMidpoint(from.x, from.y, to.x, to.y, curvature);

  const gradientId = `mw-ceremony-${id}`;
  const edgeStyle: React.CSSProperties = {
    ...style,
    ...(ceremony ? { stroke: `url(#${gradientId})` } : undefined),
    ...(dimmed ? { opacity: 0.1 } : undefined),
    transition: 'opacity 200ms ease',
  };

  const showParticle = ceremony && animated && !prefersReducedMotion && !dimmed;

  return (
    <>
      {ceremony && (
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
          >
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FF8C42" />
          </linearGradient>
        </defs>
      )}
      <BaseEdge
        id={id}
        path={path}
        style={edgeStyle}
        markerEnd={markerEnd}
        interactionWidth={16}
      />
      {showParticle && (
        <circle r={3} fill="#FFD700" opacity={0.9} pointerEvents="none">
          <animateMotion dur="3.6s" repeatCount="indefinite" path={path} />
        </circle>
      )}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan mw-edge-label"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)`,
              background: 'var(--mw-edge-label-bg, rgba(10, 10, 26, 0.85))',
              color: ceremony
                ? 'var(--mw-ceremony, #FFD700)'
                : 'var(--mw-edge-label-fg, #cbd5e1)',
              border: selected
                ? '1px solid var(--mw-north, #f7f5f0)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1px 6px',
              borderRadius: 6,
              fontSize: 10,
              lineHeight: '14px',
              whiteSpace: 'nowrap',
              pointerEvents: 'all',
              opacity: dimmed ? 0.1 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
