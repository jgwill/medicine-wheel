/**
 * medicine-wheel-graph-viz — Types
 *
 * Graph data types for Medicine Wheel visualization.
 * Built on ontology-core types.
 */

import type {
  DirectionName,
  NodeType,
  CeremonyType,
  RelationalNode,
  OcapFlags,
} from 'medicine-wheel-ontology-core';

// ── Graph Node ──────────────────────────────────────────────────────────────

export interface MWGraphNode {
  id: string;
  label: string;
  /** Node type determines shape/icon */
  type: NodeType;
  /** Direction determines quadrant positioning */
  direction?: DirectionName;
  /** Computed x position (set by layout) */
  x?: number;
  /** Computed y position (set by layout) */
  y?: number;
  /** Node size override (default: 8) */
  size?: number;
  /** Color override (default: from NODE_TYPE_COLORS) */
  color?: string;
  /** Opacity (0–1, default: 1) */
  opacity?: number;
  /** Whether this node is selected */
  selected?: boolean;
  /** Whether this node is highlighted (e.g., on hover) */
  highlighted?: boolean;
  /** OCAP® compliance status */
  ocapCompliant?: boolean;
  /** Wilson alignment score (0–1) */
  wilsonAlignment?: number;
  /** Original RelationalNode data */
  data?: RelationalNode;
  /** Arbitrary extra metadata for rendering */
  metadata?: Record<string, unknown>;
}

// ── Graph Link ──────────────────────────────────────────────────────────────

export type LinkStyle = 'solid' | 'dashed' | 'dotted' | 'ceremony';

export interface MWGraphLink {
  source: string;
  target: string;
  /** Relationship type label */
  label?: string;
  /** Line style */
  style?: LinkStyle;
  /** Strength (0–1) maps to opacity/width */
  strength?: number;
  /** Whether ceremony was honored on this edge */
  ceremonyHonored?: boolean;
  /** Ceremony type if applicable */
  ceremonyType?: CeremonyType;
  /** Color override */
  color?: string;
  /** Width override (default: computed from strength) */
  width?: number;
  /** Curvature (0 = straight, positive = clockwise arc) */
  curvature?: number;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

// ── Graph Data ──────────────────────────────────────────────────────────────

export interface MWGraphData {
  nodes: MWGraphNode[];
  links: MWGraphLink[];
  /** Optional focused node ID (triggers zoom animation) */
  focusedNodeId?: string;
}

// ── Layout Configuration ────────────────────────────────────────────────────

export type LayoutMode = 'wheel' | 'force' | 'radial';

export interface WheelLayoutConfig {
  /** Layout mode */
  mode: LayoutMode;
  /** Center X coordinate */
  centerX: number;
  /** Center Y coordinate */
  centerY: number;
  /** Outer radius of the wheel */
  radius: number;
  /** Inner radius (nodes placed between inner and outer) */
  innerRadius?: number;
  /** Padding between direction quadrants in degrees */
  quadrantPadding?: number;
  /** Starting angle offset in degrees (0 = East at right) */
  startAngle?: number;
  /** Whether to jitter positions slightly to avoid overlap */
  jitter?: boolean;
  /** Jitter amount in pixels */
  jitterAmount?: number;
}

// ── Component Props ─────────────────────────────────────────────────────────

export interface MedicineWheelGraphProps {
  /** Graph data */
  data: MWGraphData;
  /** Width of the SVG canvas */
  width?: number;
  /** Height of the SVG canvas */
  height?: number;
  /** Layout configuration */
  layout?: Partial<WheelLayoutConfig>;
  /** Show direction labels */
  showDirectionLabels?: boolean;
  /** Show direction quadrant backgrounds */
  showQuadrants?: boolean;
  /** Show center point */
  showCenter?: boolean;
  /** Show link labels */
  showLinkLabels?: boolean;
  /** Show node labels */
  showNodeLabels?: boolean;
  /** Show OCAP indicators */
  showOcapIndicators?: boolean;
  /** Show Wilson alignment halos */
  showWilsonHalos?: boolean;
  /** Dark mode */
  darkMode?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Node click handler */
  onNodeClick?: (node: MWGraphNode) => void;
  /** Node hover handler */
  onNodeHover?: (node: MWGraphNode | null) => void;
  /** Link click handler */
  onLinkClick?: (link: MWGraphLink) => void;
  /** Background click handler */
  onBackgroundClick?: () => void;
}

// ── Quadrant Geometry ───────────────────────────────────────────────────────

export interface QuadrantGeometry {
  direction: DirectionName;
  startAngle: number;
  endAngle: number;
  centerAngle: number;
  color: string;
  label: string;
  ojibwe: string;
}
