/**
 * @medicine-wheel/transformation-tracker — Community Module
 *
 * Tracks community impact, reciprocity balance, and surfaces
 * community perspectives on the research process.
 */

import type { TransformationLog, CommunityImpact } from './types.js';

/**
 * Record a community benefit from the research.
 * Wilson requires that research benefit the community, not just the researcher.
 */
export function logCommunityImpact(
  log: TransformationLog,
  impact: CommunityImpact,
): TransformationLog {
  return {
    ...log,
    communityImpacts: [...log.communityImpacts, impact],
  };
}

/**
 * Compute the giving/receiving balance across the reciprocity ledger.
 * Returns a ratio where 1.0 means perfectly balanced, <1 means more
 * receiving than giving, >1 means more giving than receiving.
 */
export function reciprocityBalance(log: TransformationLog): ReciprocityBalanceResult {
  const giving = log.reciprocityLedger.filter((e) => e.type === 'giving');
  const receiving = log.reciprocityLedger.filter((e) => e.type === 'receiving');

  const givingCount = giving.length;
  const receivingCount = receiving.length;
  const total = givingCount + receivingCount;

  if (total === 0) {
    return {
      ratio: 0,
      givingCount: 0,
      receivingCount: 0,
      balanced: false,
      summary: 'No reciprocity entries recorded yet.',
    };
  }

  const ratio = receivingCount > 0 ? givingCount / receivingCount : givingCount > 0 ? Infinity : 0;
  const balanced = ratio >= 0.5 && ratio <= 2.0;

  return {
    ratio,
    givingCount,
    receivingCount,
    balanced,
    summary: balanced
      ? `Reciprocity is balanced: ${givingCount} giving, ${receivingCount} receiving.`
      : ratio < 0.5
        ? `More receiving than giving (${receivingCount} received, ${givingCount} given). Consider what you can give back.`
        : `More giving than receiving (${givingCount} given, ${receivingCount} received). Ensure you are also open to receiving.`,
  };
}

/**
 * Surface the community perspective on the research impact.
 * Aggregates community impacts by category and highlights patterns.
 */
export function communityVoice(log: TransformationLog): CommunityVoiceResult {
  const byCategory: Record<string, CommunityImpact[]> = {};
  for (const impact of log.communityImpacts) {
    const key = impact.category;
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(impact);
  }

  const measurableCount = log.communityImpacts.filter((i) => i.measurable).length;
  const totalCount = log.communityImpacts.length;

  const beneficiaries = [...new Set(log.communityImpacts.map((i) => i.beneficiary))];

  return {
    totalImpacts: totalCount,
    measurableImpacts: measurableCount,
    categories: byCategory,
    beneficiaries,
    summary: totalCount === 0
      ? 'No community impacts recorded. Wilson requires research to benefit the community.'
      : `${totalCount} community impacts recorded across ${Object.keys(byCategory).length} categories, benefiting ${beneficiaries.length} distinct beneficiaries.`,
  };
}

/**
 * Generate a chronological narrative of community impacts.
 * Tells the story of how the research has touched the community over time.
 */
export function impactTimeline(log: TransformationLog): TimelineEntry[] {
  return [...log.communityImpacts]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((impact) => ({
      timestamp: impact.timestamp,
      description: impact.description,
      beneficiary: impact.beneficiary,
      category: impact.category,
      measurable: impact.measurable,
    }));
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Result of reciprocity balance computation */
export interface ReciprocityBalanceResult {
  ratio: number;
  givingCount: number;
  receivingCount: number;
  balanced: boolean;
  summary: string;
}

/** Aggregated community voice result */
export interface CommunityVoiceResult {
  totalImpacts: number;
  measurableImpacts: number;
  categories: Record<string, CommunityImpact[]>;
  beneficiaries: string[];
  summary: string;
}

/** A single entry in the impact timeline */
export interface TimelineEntry {
  timestamp: string;
  description: string;
  beneficiary: string;
  category: string;
  measurable: boolean;
}
