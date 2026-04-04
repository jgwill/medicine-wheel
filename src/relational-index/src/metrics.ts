/**
 * Metrics — health, balance, and coverage assessment for the relational index.
 *
 * Provides composite scores and actionable recommendations.
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

  return {
    score,
    dimensionBalance: balance,
    entryCount,
    convergenceCount,
    tensionCount,
    gapCount,
    recommendations,
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
    recs.push('Index is empty — add entries across all four epistemic sources to begin.');
    return recs;
  }

  if (balance < 0.5) {
    recs.push('Dimension balance is low — consider adding entries to underrepresented sources.');
  }

  for (const gap of gaps) {
    recs.push(`Address '${gap.source}' dimension gap: ${gap.description}`);
  }

  if (convergenceCount === 0 && entryCount > 4) {
    recs.push('No cross-dimensional convergences detected — use shared tags to bridge epistemic sources.');
  }

  if (recs.length === 0) {
    recs.push('Index health is good — all four epistemic sources are represented and interconnected.');
  }

  return recs;
}
