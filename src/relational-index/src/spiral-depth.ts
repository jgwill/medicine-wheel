/**
 * Spiral Depth — measuring whether understanding genuinely deepens
 * through successive circles of revisiting.
 *
 * In Wilson's framework, knowledge deepens through relational spirals:
 * each return to a topic should carry new understanding. If circling
 * without deepening, that is stagnation, not learning.
 */
import type { RelationalIndex, SpiralDepthMetrics, Refinement, IndexEntry } from './types.js';

/**
 * Compute spiral depth metrics across the entire relational index.
 * Examines circleDepth values to assess overall deepening.
 */
export function measureSpiralDepth(index: RelationalIndex): SpiralDepthMetrics {
  const entries = Array.from(index.entries.values());

  if (entries.length === 0) {
    return {
      totalCircles: 0,
      averageDepth: 0,
      deepeningRate: 0,
      stagnationAlert: false,
      deepestUnit: '',
    };
  }

  const totalCircles = Math.max(...entries.map(e => e.circleDepth));
  const averageDepth = entries.reduce((sum, e) => sum + e.circleDepth, 0) / entries.length;

  // Sort by timestamp to compute deepening rate
  const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const deepeningRate = computeDeepeningRate(sorted);
  const stagnationAlert = deepeningRate <= 0 && entries.length > 3;

  const deepestEntry = entries.reduce((best, e) =>
    e.circleDepth > best.circleDepth ? e : best
  );

  return {
    totalCircles,
    averageDepth,
    deepeningRate,
    stagnationAlert,
    deepestUnit: deepestEntry.unitId,
  };
}

/**
 * Compare an entry's current state with a previous circle's observation.
 * Returns a description of what changed.
 */
export function compareCircles(
  entry: IndexEntry,
  previousCircle: IndexEntry,
): { depthDelta: number; weightDelta: number; description: string } {
  const depthDelta = entry.circleDepth - previousCircle.circleDepth;
  const weightDelta = entry.epistemicWeight - previousCircle.epistemicWeight;

  let description: string;
  if (depthDelta > 0 && weightDelta > 0) {
    description = `Deepened by ${depthDelta} circle(s) with increasing weight — genuine spiral progress`;
  } else if (depthDelta > 0 && weightDelta <= 0) {
    description = `Deeper by ${depthDelta} circle(s) but weight unchanged or decreased — structural deepening without epistemic gain`;
  } else if (depthDelta === 0) {
    description = 'Same circle depth — no spiral movement detected';
  } else {
    description = `Depth decreased by ${Math.abs(depthDelta)} — possible regression or context shift`;
  }

  return { depthDelta, weightDelta, description };
}

/**
 * Detect whether a series of refinements shows genuine deepening.
 * Returns true if the trend is upward.
 */
export function detectDeepening(refinements: Refinement[]): boolean {
  if (refinements.length < 2) return false;

  const sorted = [...refinements].sort((a, b) => a.circle - b.circle);
  let increases = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].depth > sorted[i - 1].depth) increases++;
  }

  return increases / (sorted.length - 1) > 0.5;
}

/**
 * Detect whether a series of refinements shows stagnation.
 * Returns true if depth is flat or oscillating without progress.
 */
export function detectStagnation(refinements: Refinement[]): boolean {
  if (refinements.length < 3) return false;

  const sorted = [...refinements].sort((a, b) => a.circle - b.circle);
  const depths = sorted.map(r => r.depth);

  // Check if range is very small relative to mean
  const min = Math.min(...depths);
  const max = Math.max(...depths);
  const mean = depths.reduce((a, b) => a + b, 0) / depths.length;

  if (mean === 0) return true;

  const range = max - min;
  return range / mean < 0.1;
}

// ── Internal ────────────────────────────────────────────────────

function computeDeepeningRate(sortedEntries: IndexEntry[]): number {
  if (sortedEntries.length < 2) return 0;

  let totalDelta = 0;
  for (let i = 1; i < sortedEntries.length; i++) {
    totalDelta += sortedEntries[i].circleDepth - sortedEntries[i - 1].circleDepth;
  }

  return totalDelta / (sortedEntries.length - 1);
}
