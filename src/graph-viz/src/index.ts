/**
 * @medicine-wheel/graph-viz
 *
 * Medicine Wheel graph visualization — circular layout with
 * four-direction node positioning, ceremony-aware edges,
 * and OCAP® indicators.
 *
 * @packageDocumentation
 */

// ── Component ───────────────────────────────────────────────────────────────
export { MedicineWheelGraph } from './MedicineWheelGraph.js';
export { LineageWeb, DEFAULT_LINEAGE_WEB_COLORS } from './LineageWeb.js';
export type { LineageWebProps, LineageWebColors } from './LineageWeb.js';

// ── Lineage web (headless) ──────────────────────────────────────────────────
export {
  DEFAULT_LINEAGE_VIEW,
  DEFAULT_LINEAGE_WEB_LAYOUT,
  LINEAGE_BANDS,
  fitZoom,
  layoutLineageWeb,
  lineageArcPath,
  lineageEdgeKey,
  lineageNeighbourhood,
  lineageWebWidth,
  relationsAround,
  stepAlongSpine,
  threadChains,
  visibleLineage,
  zoomScrollLeft,
} from './lineage-web.js';
export type {
  LineageBand,
  LineageEdgeKind,
  LineageWebEdge,
  LineageWebEpisode,
  LineageWebLayout,
  LineageWebLayoutConfig,
  LineageWebView,
  VisibleLineage,
  VisibleLineageOptions,
} from './lineage-web.js';

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  MWGraphNode,
  MWGraphNodePosition,
  MWGraphNodePositions,
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
  applyLineageLayout,
  DEFAULT_LINEAGE_LAYOUT,
} from './lineage-layout.js';
export type { LineageLayoutConfig, LineageLayoutResult } from './lineage-layout.js';

export {
  applyWheelLayout,
  DEFAULT_LAYOUT,
  getQuadrantGeometries,
  quadrantArcPath,
  curvedLinkPath,
  directionLabelPosition,
  directionForPoint,
  constrainToWheel,
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
