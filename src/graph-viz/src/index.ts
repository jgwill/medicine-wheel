/**
 * medicine-wheel-graph-viz
 *
 * Medicine Wheel graph visualization — circular layout with
 * four-direction node positioning, ceremony-aware edges,
 * and OCAP® indicators.
 *
 * @packageDocumentation
 */

// ── Component ───────────────────────────────────────────────────────────────
export { MedicineWheelGraph } from './MedicineWheelGraph.js';

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  MWGraphNode,
  MWGraphLink,
  MWGraphData,
  LinkStyle,
  LayoutMode,
  WheelLayoutConfig,
  MedicineWheelGraphProps,
  QuadrantGeometry,
} from './types.js';

// ── Layout Engine ───────────────────────────────────────────────────────────
export {
  applyWheelLayout,
  DEFAULT_LAYOUT,
  getQuadrantGeometries,
  quadrantArcPath,
  curvedLinkPath,
  directionLabelPosition,
} from './layout.js';

// ── Data Converters ─────────────────────────────────────────────────────────
export {
  nodesToGraphNodes,
  edgesToGraphLinks,
  relationsToGraphLinks,
  buildGraphData,
} from './converters.js';

// ── RSIS Visualization Utilities ────────────────────────────────────────────
export type {
  KinshipGraphNode,
  KinshipGraphEdge,
  FlowDiagramNode,
  FlowDiagramLink,
  DirectionWheelSegment,
  TimelineEntry,
} from './rsis-viz.js';

export {
  toKinshipGraphLayout,
  toReciprocityFlowDiagram,
  toDirectionWheelData,
  toCeremonyTimelineData,
  toMermaidDiagram,
} from './rsis-viz.js';
