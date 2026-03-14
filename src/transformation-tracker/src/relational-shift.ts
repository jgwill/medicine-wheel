/**
 * @medicine-wheel/transformation-tracker — Relational Shift Module
 *
 * Tracks changes in relational strength and quality over time.
 * In Wilson's framework, strengthened relations are a primary
 * indicator of valid research.
 */

import type { TransformationLog, RelationalShift } from './types.js';

/**
 * Record a relational shift in the transformation log.
 * Captures the before/after state and what catalyzed the change.
 */
export function trackRelationalChange(
  log: TransformationLog,
  shift: RelationalShift,
): TransformationLog {
  return {
    ...log,
    relationalShifts: [...log.relationalShifts, shift],
  };
}

/**
 * Get the before/after state for a specific relation.
 * Returns the most recent shift for the given relation ID.
 */
export function beforeAfter(
  log: TransformationLog,
  relationId: string,
): RelationalShiftSummary | null {
  const shifts = log.relationalShifts
    .filter((s) => s.relationId === relationId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (shifts.length === 0) return null;

  const first = shifts[0];
  const last = shifts[shifts.length - 1];

  return {
    relationId,
    originalState: first.before,
    currentState: last.after,
    totalShifts: shifts.length,
    netStrengthChange: last.after.strength - first.before.strength,
    catalysts: shifts.map((s) => s.catalyst),
  };
}

/**
 * Compute aggregate relational strength changes across all tracked relations.
 * Returns overall direction of relational health.
 */
export function strengthDelta(log: TransformationLog): StrengthDeltaResult {
  if (log.relationalShifts.length === 0) {
    return {
      totalShifts: 0,
      averageDelta: 0,
      strengthened: 0,
      weakened: 0,
      unchanged: 0,
      summary: 'No relational shifts tracked yet.',
    };
  }

  const relationMap = new Map<string, RelationalShift[]>();
  for (const shift of log.relationalShifts) {
    const existing = relationMap.get(shift.relationId) || [];
    existing.push(shift);
    relationMap.set(shift.relationId, existing);
  }

  let strengthened = 0;
  let weakened = 0;
  let unchanged = 0;
  let totalDelta = 0;

  for (const [, shifts] of relationMap) {
    const sorted = shifts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const delta = last.after.strength - first.before.strength;
    totalDelta += delta;

    if (delta > 0.05) strengthened++;
    else if (delta < -0.05) weakened++;
    else unchanged++;
  }

  const averageDelta = totalDelta / relationMap.size;

  return {
    totalShifts: log.relationalShifts.length,
    averageDelta,
    strengthened,
    weakened,
    unchanged,
    summary: `${relationMap.size} relations tracked: ${strengthened} strengthened, ${weakened} weakened, ${unchanged} stable. Average delta: ${averageDelta.toFixed(3)}.`,
  };
}

/**
 * Count and describe new relations formed during the research.
 * New relations are detected by relation IDs that appear only in
 * "after" states with no prior "before" baseline.
 */
export function newRelationsFormed(log: TransformationLog): NewRelationsResult {
  const firstAppearance = new Map<string, RelationalShift>();
  for (const shift of log.relationalShifts) {
    if (!firstAppearance.has(shift.relationId)) {
      firstAppearance.set(shift.relationId, shift);
    }
  }

  const newRelations = [...firstAppearance.values()]
    .filter((s) => s.before.strength === 0 && s.before.description === '')
    .map((s) => ({
      relationId: s.relationId,
      currentStrength: s.after.strength,
      description: s.after.description,
      catalyst: s.catalyst,
      direction: s.direction,
      formedAt: s.timestamp,
    }));

  return {
    count: newRelations.length,
    relations: newRelations,
    summary: newRelations.length === 0
      ? 'No new relations formed yet.'
      : `${newRelations.length} new relation(s) formed during this research cycle.`,
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Summary of a relation's full shift history */
export interface RelationalShiftSummary {
  relationId: string;
  originalState: { strength: number; description: string };
  currentState: { strength: number; description: string };
  totalShifts: number;
  netStrengthChange: number;
  catalysts: string[];
}

/** Aggregate relational strength delta result */
export interface StrengthDeltaResult {
  totalShifts: number;
  averageDelta: number;
  strengthened: number;
  weakened: number;
  unchanged: number;
  summary: string;
}

/** New relation descriptor */
export interface NewRelationDescriptor {
  relationId: string;
  currentStrength: number;
  description: string;
  catalyst: string;
  direction: string;
  formedAt: string;
}

/** Result of new relations analysis */
export interface NewRelationsResult {
  count: number;
  relations: NewRelationDescriptor[];
  summary: string;
}
