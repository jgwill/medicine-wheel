/**
 * medicine-wheel-relational-index
 *
 * Four-source epistemic dimensional indexing for the Medicine Wheel
 * Developer Suite. Enables querying, traversal, and cross-dimensional
 * mapping across Wilson's four epistemic sources: Land, Dream, Code, Vision.
 */

// Types
export type {
  EpistemicSource,
  IndexEntry,
  DimensionIndex,
  CrossDimensionalMap,
  Convergence,
  Tension,
  DimensionGap,
  RelationalIndex,
  SpiralDepthMetrics,
  Refinement,
  RelationalPath,
  IndexHealth,
} from './types.js';

// Index Manager
export {
  createIndex,
  addEntry,
  removeEntry,
  rebuildDimensions,
} from './index-manager.js';

// Query
export {
  queryBySource,
  queryByDirection,
  queryByWeight,
  queryByDepth,
  queryCrossDimensional,
} from './query.js';

// Dimensions
export {
  landIndex,
  dreamIndex,
  codeIndex,
  visionIndex,
  dimensionBalance,
} from './dimensions.js';

// Cross-Dimensional
export {
  mapAcrossDimensions,
  findConvergences,
  detectTensions,
  coverageGaps,
} from './cross-dimensional.js';

// Spiral Depth
export {
  measureSpiralDepth,
  compareCircles,
  detectDeepening,
  detectStagnation,
} from './spiral-depth.js';

// Metrics
export {
  indexHealth,
  dimensionBalance as metricsDimensionBalance,
  coverageGaps as metricsCoverageGaps,
} from './metrics.js';
