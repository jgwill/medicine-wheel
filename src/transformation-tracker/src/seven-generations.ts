/**
 * @medicine-wheel/transformation-tracker — Seven Generations Module
 *
 * Assesses the long-term sustainability and future-generation impact
 * of research activities. The Seven Generations principle asks:
 * how will this affect those who come seven generations after us?
 */

import type { TransformationLog } from './types.js';

/**
 * Compute a seven-generation sustainability score (0–1).
 * Weighs community impact, reciprocity balance, relational health,
 * and future-oriented reflection indicators.
 */
export function sevenGenScore(log: TransformationLog): SevenGenResult {
  const communityScore = computeCommunityScore(log);
  const reciprocityScore = computeReciprocityScore(log);
  const relationalScore = computeRelationalScore(log);
  const futureScore = computeFutureOrientationScore(log);

  const score =
    communityScore * 0.3 +
    reciprocityScore * 0.25 +
    relationalScore * 0.25 +
    futureScore * 0.2;

  return {
    score,
    communityScore,
    reciprocityScore,
    relationalScore,
    futureScore,
    summary: score >= 0.7
      ? 'Strong seven-generation alignment — research honors future generations.'
      : score >= 0.4
        ? 'Moderate seven-generation alignment — some areas need deepening.'
        : 'Low seven-generation alignment — significant work needed to honor future generations.',
  };
}

/**
 * Assess the potential impact on future generations.
 * Examines whether the research creates lasting relational
 * infrastructure or extractive short-term gains.
 */
export function futureImpact(log: TransformationLog): FutureImpactAssessment {
  const futureEntries = log.reciprocityLedger.filter(
    (e) => e.category === 'future',
  );
  const futureImpacts = log.communityImpacts.filter(
    (i) => i.category === 'future',
  );

  const hasLongTermRelations = log.relationalShifts.some(
    (s) => s.after.strength > 0.7,
  );
  const hasFutureReflections = log.reflections.some((r) =>
    /future|generation|sustain|long.term|legacy|descend/i.test(r.response),
  );

  const indicators: string[] = [];
  if (futureEntries.length > 0) indicators.push('Future reciprocity entries present');
  if (futureImpacts.length > 0) indicators.push('Future-oriented community impacts recorded');
  if (hasLongTermRelations) indicators.push('Strong long-term relations established');
  if (hasFutureReflections) indicators.push('Future-generation awareness in reflections');

  return {
    futureReciprocityEntries: futureEntries.length,
    futureImpacts: futureImpacts.length,
    hasLongTermRelations,
    hasFutureReflections,
    indicators,
    assessment: indicators.length >= 3
      ? 'Research demonstrates strong future-generation consciousness.'
      : indicators.length >= 1
        ? 'Some future-generation awareness, but needs deepening.'
        : 'No future-generation indicators detected. Consider the seven-generation impact.',
  };
}

/**
 * Check long-term relational sustainability.
 * Evaluates whether relations are growing or decaying over time.
 */
export function sustainabilityCheck(log: TransformationLog): SustainabilityResult {
  if (log.relationalShifts.length === 0) {
    return {
      sustainable: false,
      growingRelations: 0,
      stableRelations: 0,
      decliningRelations: 0,
      recommendations: ['Begin tracking relational shifts to assess sustainability.'],
    };
  }

  const relationMap = new Map<string, { first: number; last: number }>();
  for (const shift of log.relationalShifts) {
    const existing = relationMap.get(shift.relationId);
    if (!existing) {
      relationMap.set(shift.relationId, {
        first: shift.before.strength,
        last: shift.after.strength,
      });
    } else {
      existing.last = shift.after.strength;
    }
  }

  let growing = 0;
  let stable = 0;
  let declining = 0;

  for (const [, state] of relationMap) {
    const delta = state.last - state.first;
    if (delta > 0.05) growing++;
    else if (delta < -0.05) declining++;
    else stable++;
  }

  const sustainable = declining === 0 || growing > declining * 2;
  const recommendations: string[] = [];

  if (declining > 0) {
    recommendations.push(`${declining} relation(s) declining — investigate and restore.`);
  }
  if (growing === 0) {
    recommendations.push('No relations actively growing — seek new ways to deepen connection.');
  }
  if (log.reciprocityLedger.filter((e) => e.category === 'future').length === 0) {
    recommendations.push('No future-generation reciprocity — consider obligations to those not yet born.');
  }

  return {
    sustainable,
    growingRelations: growing,
    stableRelations: stable,
    decliningRelations: declining,
    recommendations,
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Seven-generation score result */
export interface SevenGenResult {
  score: number;
  communityScore: number;
  reciprocityScore: number;
  relationalScore: number;
  futureScore: number;
  summary: string;
}

/** Future impact assessment */
export interface FutureImpactAssessment {
  futureReciprocityEntries: number;
  futureImpacts: number;
  hasLongTermRelations: boolean;
  hasFutureReflections: boolean;
  indicators: string[];
  assessment: string;
}

/** Sustainability check result */
export interface SustainabilityResult {
  sustainable: boolean;
  growingRelations: number;
  stableRelations: number;
  decliningRelations: number;
  recommendations: string[];
}

// ── Internal Scoring Helpers ────────────────────────────────────────────────

function computeCommunityScore(log: TransformationLog): number {
  if (log.communityImpacts.length === 0) return 0;
  const measurable = log.communityImpacts.filter((i) => i.measurable).length;
  const categories = new Set(log.communityImpacts.map((i) => i.category)).size;
  return Math.min(1, (log.communityImpacts.length * 0.1) + (measurable * 0.15) + (categories * 0.15));
}

function computeReciprocityScore(log: TransformationLog): number {
  const giving = log.reciprocityLedger.filter((e) => e.type === 'giving').length;
  const receiving = log.reciprocityLedger.filter((e) => e.type === 'receiving').length;
  if (giving === 0 && receiving === 0) return 0;
  const ratio = receiving > 0 ? giving / receiving : giving > 0 ? 2 : 0;
  const balanced = ratio >= 0.5 && ratio <= 2.0;
  return balanced ? Math.min(1, (giving + receiving) * 0.1) : Math.min(0.5, (giving + receiving) * 0.05);
}

function computeRelationalScore(log: TransformationLog): number {
  if (log.relationalShifts.length === 0) return 0;
  const positive = log.relationalShifts.filter(
    (s) => s.after.strength > s.before.strength,
  ).length;
  return Math.min(1, positive / log.relationalShifts.length);
}

function computeFutureOrientationScore(log: TransformationLog): number {
  let score = 0;
  if (log.reciprocityLedger.some((e) => e.category === 'future')) score += 0.3;
  if (log.communityImpacts.some((i) => i.category === 'future')) score += 0.3;
  if (log.reflections.some((r) => /future|generation|sustain/i.test(r.response))) score += 0.2;
  if (log.relationalShifts.some((s) => s.after.strength > 0.7)) score += 0.2;
  return Math.min(1, score);
}
