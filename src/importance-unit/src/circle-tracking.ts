/**
 * @medicine-wheel/importance-unit — Circle / Spiral Tracking
 *
 * Tracks the spiral journey of ImportanceUnits through repeated
 * circling. In Wilson's framework, returning to a topic is not
 * redundancy — it is ceremony and deepening. Each circle reveals
 * the "subtle difference between the 3rd and 4th circling."
 *
 * Detects both deepening (genuine shifts in understanding) and
 * stagnation (circling without change).
 */

import type { DirectionName } from 'medicine-wheel-ontology-core';
import type { ImportanceUnit, CircleRefinement, CeremonyState } from './types.js';
import { computeWeight } from './epistemic-weight.js';

// ── Circle Increment ────────────────────────────────────────────────────────

/**
 * Increment the circle depth and record the current direction
 * in the ceremony state's quadrantsVisited.
 *
 * @param unit - The unit to deepen
 * @param direction - The direction being visited in this circle
 * @returns Updated unit with incremented depth and visited direction
 */
export function incrementCircle(
  unit: ImportanceUnit,
  direction: DirectionName,
): ImportanceUnit {
  const newDepth = unit.circleDepth + 1;
  const visited = unit.ceremonyState?.quadrantsVisited ?? [];
  const updatedVisited = visited.includes(direction)
    ? visited
    : [...visited, direction];
  const circleComplete = updatedVisited.length >= 4;

  const ceremonyState: CeremonyState = {
    quadrantsVisited: updatedVisited,
    circleComplete,
    gatingConditions: unit.ceremonyState?.gatingConditions ?? [],
  };

  return {
    ...unit,
    circleDepth: newDepth,
    direction,
    epistemicWeight: computeWeight(unit.source, newDepth),
    ceremonyState,
    meta: {
      ...unit.meta,
      lastCircledAt: new Date().toISOString(),
    },
  };
}

// ── Refinement Recording ────────────────────────────────────────────────────

/**
 * Record a refinement describing what shifted in this circle pass.
 *
 * @param unit - The unit being refined
 * @param shift - What changed or deepened
 * @returns Updated unit with the new refinement appended
 */
export function recordRefinement(
  unit: ImportanceUnit,
  shift: string,
): ImportanceUnit {
  const refinement: CircleRefinement = {
    circle: unit.circleDepth,
    shift,
    timestamp: new Date().toISOString(),
  };

  return {
    ...unit,
    content: {
      ...unit.content,
      refinements: [...unit.content.refinements, refinement],
    },
  };
}

// ── Deepening Detection ─────────────────────────────────────────────────────

/**
 * Result of analyzing an ImportanceUnit's spiral depth.
 */
export interface DeepeningAnalysis {
  /** Total number of circles completed */
  totalCircles: number;
  /** Number of refinements recorded */
  refinementCount: number;
  /** Whether genuine deepening is detected */
  isDeepening: boolean;
  /** Average refinement length as a crude signal of substance */
  averageShiftLength: number;
  /** The most recent refinement, if any */
  latestShift?: string;
}

/**
 * Detect whether an ImportanceUnit is genuinely deepening through
 * its spiral journey. Deepening requires that refinements are being
 * recorded and that they carry substance.
 *
 * @param unit - The unit to analyze
 * @returns Analysis of the unit's spiral depth
 */
export function detectDeepening(unit: ImportanceUnit): DeepeningAnalysis {
  const refinements = unit.content.refinements;
  const refinementCount = refinements.length;

  if (refinementCount === 0) {
    return {
      totalCircles: unit.circleDepth,
      refinementCount: 0,
      isDeepening: false,
      averageShiftLength: 0,
    };
  }

  const totalLength = refinements.reduce((sum, r) => sum + r.shift.length, 0);
  const averageShiftLength = totalLength / refinementCount;
  const latestShift = refinements[refinements.length - 1]?.shift;

  // Deepening requires at least some substance in the shifts
  const isDeepening = refinementCount > 0 && averageShiftLength > 10;

  return {
    totalCircles: unit.circleDepth,
    refinementCount,
    isDeepening,
    averageShiftLength,
    latestShift,
  };
}

// ── Stagnation Detection ────────────────────────────────────────────────────

/**
 * Result of stagnation analysis.
 */
export interface StagnationAnalysis {
  /** Whether stagnation is detected */
  isStagnant: boolean;
  /** Number of circles without refinement */
  circlesWithoutRefinement: number;
  /** Ratio of refinements to circles */
  refinementRatio: number;
  /** Guidance for the practitioner */
  guidance: string;
}

/**
 * Detect whether an ImportanceUnit is stagnating — circling
 * without genuine deepening or change.
 *
 * Stagnation is signaled when circleDepth exceeds refinement
 * count by a significant margin, suggesting mechanical repetition
 * rather than ceremonial deepening.
 *
 * @param unit - The unit to analyze
 * @returns Stagnation analysis
 */
export function detectStagnation(unit: ImportanceUnit): StagnationAnalysis {
  const refinementCount = unit.content.refinements.length;
  const circlesWithoutRefinement = Math.max(0, unit.circleDepth - refinementCount - 1);
  const refinementRatio = unit.circleDepth > 1
    ? refinementCount / (unit.circleDepth - 1)
    : 1;

  // Stagnation: many circles, few refinements
  const isStagnant = unit.circleDepth >= 3 && refinementRatio < 0.5;

  let guidance: string;
  if (isStagnant) {
    guidance = 'This unit has been circled multiple times without substantial deepening. '
      + 'Consider approaching from a different direction or source dimension.';
  } else if (refinementRatio < 0.75) {
    guidance = 'Some circles lack recorded refinements. Ensure each return captures '
      + 'what shifted — the subtle differences are where meaning lives.';
  } else {
    guidance = 'Healthy spiral — each circle is producing recorded shifts.';
  }

  return {
    isStagnant,
    circlesWithoutRefinement,
    refinementRatio,
    guidance,
  };
}
