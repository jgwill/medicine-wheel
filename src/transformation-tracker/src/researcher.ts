/**
 * @medicine-wheel/transformation-tracker — Researcher Module
 *
 * Tracks researcher self-reflection, understanding snapshots,
 * and growth detection across the research cycle.
 */

import type { DirectionName } from 'medicine-wheel-ontology-core';
import type {
  TransformationLog,
  GrowthSnapshot,
  Reflection,
} from './types.js';

/**
 * Add a reflection entry to the transformation log.
 * Reflections capture the researcher's evolving relationship
 * with the research — Wilson's internal transformation signal.
 */
export function logReflection(
  log: TransformationLog,
  prompt: string,
  response: string,
  direction: DirectionName,
): TransformationLog {
  const reflection: Reflection = {
    id: `ref-${log.reflections.length + 1}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    prompt,
    response,
    direction,
    depth: estimateDepth(response),
  };
  return {
    ...log,
    reflections: [...log.reflections, reflection],
  };
}

/**
 * Capture a point-in-time snapshot of the researcher's understanding.
 * Snapshots form the basis for growth detection over time.
 */
export function snapshotUnderstanding(
  log: TransformationLog,
  snapshot: GrowthSnapshot,
): TransformationLog {
  return {
    ...log,
    snapshots: [...log.snapshots, snapshot],
  };
}

/**
 * Compare two snapshots to detect growth signals.
 * Returns a summary of changes across all measured dimensions.
 */
export function compareSnapshots(
  before: GrowthSnapshot,
  after: GrowthSnapshot,
): SnapshotComparison {
  const relationsGrowth = after.relationsCount - before.relationsCount;
  const alignmentGrowth = after.wilsonAlignment - before.wilsonAlignment;
  const newInsights = after.keyInsights.filter(
    (i) => !before.keyInsights.includes(i),
  );
  const resolvedQuestions = before.openQuestions.filter(
    (q) => !after.openQuestions.includes(q),
  );
  const newQuestions = after.openQuestions.filter(
    (q) => !before.openQuestions.includes(q),
  );

  return {
    relationsGrowth,
    alignmentGrowth,
    newInsights,
    resolvedQuestions,
    newQuestions,
    understandingShifted: before.understanding !== after.understanding,
    directionShifted: before.direction !== after.direction,
    overallGrowth: computeOverallGrowth(
      relationsGrowth,
      alignmentGrowth,
      newInsights.length,
      resolvedQuestions.length,
    ),
  };
}

/**
 * Analyze the full transformation log for genuine growth signals.
 * Wilson says growth must be relational, not just intellectual.
 */
export function detectGrowth(log: TransformationLog): GrowthSignal {
  if (log.snapshots.length < 2) {
    return {
      detected: false,
      relationalGrowth: 0,
      intellectualGrowth: 0,
      reciprocityGrowth: 0,
      summary: 'Insufficient snapshots — at least two required to detect growth.',
    };
  }

  const first = log.snapshots[0];
  const last = log.snapshots[log.snapshots.length - 1];
  const comparison = compareSnapshots(first, last);

  const relationalGrowth = normalizeScore(comparison.relationsGrowth / Math.max(first.relationsCount, 1));
  const intellectualGrowth = normalizeScore(
    (comparison.newInsights.length + comparison.resolvedQuestions.length) /
      Math.max(first.keyInsights.length + first.openQuestions.length, 1),
  );

  const givingCount = log.reciprocityLedger.filter((e) => e.type === 'giving').length;
  const receivingCount = log.reciprocityLedger.filter((e) => e.type === 'receiving').length;
  const reciprocityGrowth = normalizeScore(
    (givingCount + receivingCount) / Math.max(log.snapshots.length, 1),
  );

  const detected = relationalGrowth > 0.1 || intellectualGrowth > 0.1 || reciprocityGrowth > 0.1;

  return {
    detected,
    relationalGrowth,
    intellectualGrowth,
    reciprocityGrowth,
    summary: detected
      ? `Growth detected: relational=${relationalGrowth.toFixed(2)}, intellectual=${intellectualGrowth.toFixed(2)}, reciprocity=${reciprocityGrowth.toFixed(2)}`
      : 'No significant growth detected yet. Continue deepening relational engagement.',
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Result of comparing two growth snapshots */
export interface SnapshotComparison {
  relationsGrowth: number;
  alignmentGrowth: number;
  newInsights: string[];
  resolvedQuestions: string[];
  newQuestions: string[];
  understandingShifted: boolean;
  directionShifted: boolean;
  overallGrowth: number;
}

/** Growth signal analysis result */
export interface GrowthSignal {
  detected: boolean;
  relationalGrowth: number;
  intellectualGrowth: number;
  reciprocityGrowth: number;
  summary: string;
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function estimateDepth(response: string): number {
  const wordCount = response.split(/\s+/).length;
  const hasQuestions = /\?/.test(response);
  const hasRelationalLanguage = /relat|connect|together|reciproc|obligat|account/i.test(response);
  let depth = Math.min(wordCount / 500, 0.5);
  if (hasQuestions) depth += 0.2;
  if (hasRelationalLanguage) depth += 0.3;
  return Math.min(depth, 1);
}

function computeOverallGrowth(
  relations: number,
  alignment: number,
  insights: number,
  resolved: number,
): number {
  return normalizeScore(
    (Math.max(relations, 0) * 0.3) +
    (Math.max(alignment, 0) * 0.3) +
    (insights * 0.1) +
    (resolved * 0.1),
  );
}

function normalizeScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}
