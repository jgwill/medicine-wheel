/**
 * Metrics — health, balance, and coverage assessment for the relational index.
 *
 * Provides composite scores, and what the reading found, stated as facts
 * about the index today. A finding is current reality, not a task: when there
 * is one, `next_tool` names turn_to_creative_orientation, where the desired
 * outcome is named on its own terms.
 */
import type { RelationalIndex, IndexHealth, DimensionGap, EpistemicSource } from './types.js';
import { dimensionBalance as computeDimensionBalance } from './dimensions.js';
import { coverageGaps as computeCoverageGaps } from './cross-dimensional.js';

/**
 * Compute overall health of the relational index.
 * Combines dimension balance, convergence richness, gap penalties,
 * and entry coverage into a single 0–1 score with recommendations.
 */
export function indexHealth(index: RelationalIndex): IndexHealth {
  const balance = computeDimensionBalance(index);
  const gaps = computeCoverageGaps(index);
  const entryCount = index.entries.size;
  const convergenceCount = index.crossMap.convergences.length;
  const tensionCount = index.crossMap.tensions.length;
  const gapCount = gaps.length;

  // Score components
  const balanceScore = balance;
  const gapPenalty = gapCount > 0 ? Math.max(0, 1 - gapCount * 0.25) : 1;
  const convergenceBonus = Math.min(convergenceCount * 0.1, 0.2);
  const baseScore = entryCount > 0 ? 0.5 : 0;

  const score = Math.min(1, Math.max(0,
    baseScore + (balanceScore * 0.3) + (gapPenalty * 0.2) + convergenceBonus,
  ));

  const recommendations = generateRecommendations(balance, gaps, entryCount, convergenceCount);
  const found =
    entryCount === 0 || balance < 0.5 || gapCount > 0 || (convergenceCount === 0 && entryCount > 4);

  return {
    score,
    dimensionBalance: balance,
    entryCount,
    convergenceCount,
    tensionCount,
    gapCount,
    recommendations,
    ...(found ? { next_tool: 'turn_to_creative_orientation' as const } : {}),
  };
}

/**
 * Measure balance across the four epistemic sources.
 * Delegates to the dimensions module.
 */
export function dimensionBalance(index: RelationalIndex): number {
  return computeDimensionBalance(index);
}

/**
 * Identify what epistemic dimensions are missing or underrepresented.
 * Delegates to the cross-dimensional module.
 */
export function coverageGaps(index: RelationalIndex): DimensionGap[] {
  return computeCoverageGaps(index);
}

// ── Internal ────────────────────────────────────────────────────

function generateRecommendations(
  balance: number,
  gaps: DimensionGap[],
  entryCount: number,
  convergenceCount: number,
): string[] {
  const recs: string[] = [];

  if (entryCount === 0) {
    recs.push('The index is empty: it holds no entries from any of the four epistemic sources.');
    return recs;
  }

  if (balance < 0.5) {
    recs.push('Dimension balance is below 0.5: the entries are spread unevenly across the four sources.');
  }

  for (const gap of gaps) {
    recs.push(`The ${gap.description}.`);
  }

  if (convergenceCount === 0 && entryCount > 4) {
    recs.push('No cross-dimensional convergence is detected: no tag is shared by entries from two sources.');
  }

  if (recs.length === 0) {
    recs.push('Index health is good — all four epistemic sources are represented and interconnected.');
  }

  return recs;
}
