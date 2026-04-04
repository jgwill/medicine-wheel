/**
 * Dimensions — epistemic dimension views and balance analysis.
 *
 * Provides focused views into each of Wilson's four epistemic sources
 * and measures the balance across all dimensions.
 */
import type { RelationalIndex, DimensionIndex, EpistemicSource } from './types.js';

const ALL_SOURCES: EpistemicSource[] = ['land', 'dream', 'code', 'vision'];

/** Get the Land dimension view — embodied, place-based knowledge */
export function landIndex(index: RelationalIndex): DimensionIndex {
  return index.dimensions.land;
}

/** Get the Dream dimension view — intuitive, liminal knowledge */
export function dreamIndex(index: RelationalIndex): DimensionIndex {
  return index.dimensions.dream;
}

/** Get the Code dimension view — implementation, algorithmic knowledge */
export function codeIndex(index: RelationalIndex): DimensionIndex {
  return index.dimensions.code;
}

/** Get the Vision dimension view — aspirational, future-oriented knowledge */
export function visionIndex(index: RelationalIndex): DimensionIndex {
  return index.dimensions.vision;
}

/**
 * Assess whether all four epistemic dimensions are represented.
 *
 * Returns a score from 0 to 1 where 1 means perfectly balanced
 * and 0 means only a single dimension has entries.
 */
export function dimensionBalance(index: RelationalIndex): number {
  const counts = ALL_SOURCES.map(s => index.dimensions[s].entries.length);
  const total = counts.reduce((a, b) => a + b, 0);

  if (total === 0) return 0;

  // Compute balance as 1 minus normalised standard deviation
  const mean = total / ALL_SOURCES.length;
  const variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / ALL_SOURCES.length;
  const stdDev = Math.sqrt(variance);
  const normalisedStdDev = mean > 0 ? stdDev / mean : 0;

  return Math.max(0, Math.min(1, 1 - normalisedStdDev));
}
