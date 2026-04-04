/**
 * @medicine-wheel/importance-unit — Epistemic Weight Computation
 *
 * Computes epistemic weight for ImportanceUnits based on their
 * source dimension and circle depth. In Wilson's epistemology,
 * not all knowledge is equal — dream-state and embodied knowledge
 * carry more epistemic authority than rational analysis.
 *
 * Base weights:
 * - dream: 0.85 (liminal/spirit-state knowing has highest authority)
 * - land:  0.75 (place-grounded/embodied knowing)
 * - vision: 0.65 (intentional/architectural knowing)
 * - code:  0.50 (technical/implementation knowing)
 *
 * Weight increases with circleDepth using diminishing returns
 * (logarithmic scaling), never exceeding 1.0.
 */

import type { EpistemicSource } from './types.js';

// ── Base Weights ────────────────────────────────────────────────────────────

/** Base epistemic weights by source dimension */
export const BASE_WEIGHTS: Record<EpistemicSource, number> = {
  dream: 0.85,
  land: 0.75,
  vision: 0.65,
  code: 0.50,
};

/** Maximum depth bonus that can be added to base weight */
const MAX_DEPTH_BONUS = 0.15;

/** Logarithmic scaling factor for depth bonus */
const DEPTH_SCALE = 3;

// ── Weight Computation ──────────────────────────────────────────────────────

/**
 * Compute the depth bonus using diminishing returns.
 *
 * Uses logarithmic scaling so that early circles contribute
 * more than later ones — the first return yields more insight
 * than the tenth, though all returns matter.
 *
 * @param circleDepth - Number of times circled (minimum 1)
 * @returns Depth bonus between 0 and MAX_DEPTH_BONUS
 */
function depthBonus(circleDepth: number): number {
  if (circleDepth <= 1) return 0;
  return MAX_DEPTH_BONUS * (Math.log(circleDepth) / Math.log(circleDepth + DEPTH_SCALE));
}

/**
 * Compute the full epistemic weight for a given source and depth.
 *
 * Weight = baseWeight + depthBonus, clamped to [0, 1].
 *
 * @param source - The epistemic source dimension
 * @param circleDepth - How many times this topic has been circled
 * @returns Epistemic weight between 0.0 and 1.0
 */
export function computeWeight(source: EpistemicSource, circleDepth: number): number {
  const base = BASE_WEIGHTS[source];
  const bonus = depthBonus(circleDepth);
  return Math.min(1.0, base + bonus);
}

/**
 * Adjust weight for a different source dimension.
 *
 * Re-bases the weight using the new source's base weight
 * while preserving the depth-derived bonus.
 *
 * @param currentWeight - The current epistemic weight
 * @param currentSource - The current source dimension
 * @param newSource - The new source dimension
 * @returns Adjusted weight for the new source
 */
export function adjustForSource(
  currentWeight: number,
  currentSource: EpistemicSource,
  newSource: EpistemicSource,
): number {
  const currentBase = BASE_WEIGHTS[currentSource];
  const bonus = currentWeight - currentBase;
  const newBase = BASE_WEIGHTS[newSource];
  return Math.min(1.0, Math.max(0, newBase + Math.max(0, bonus)));
}

/**
 * Adjust weight for a new circle depth.
 *
 * Recalculates weight from the source base plus the new
 * depth bonus.
 *
 * @param source - The epistemic source dimension
 * @param newDepth - The new circle depth
 * @returns Recalculated weight
 */
export function adjustForDepth(source: EpistemicSource, newDepth: number): number {
  return computeWeight(source, newDepth);
}
