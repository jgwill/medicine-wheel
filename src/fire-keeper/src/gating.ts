/**
 * medicine-wheel-fire-keeper — Gate Evaluation
 *
 * Evaluates gating conditions that must be satisfied before ceremony
 * work can proceed. Implements Wilson's relational accountability
 * as active gates rather than passive metrics.
 */

import type {
  GatingCondition,
  GatingConditionStatus,
  FireKeeperContext,
} from './types.js';

// ── Gate Result ─────────────────────────────────────────────────────────────

/** Result of evaluating all gating conditions */
export interface GateEvaluationResult {
  /** Whether all required gates are satisfied */
  allSatisfied: boolean;
  /** Status of each individual gate */
  statuses: GatingConditionStatus[];
  /** Conditions that are not yet satisfied */
  unsatisfied: GatingConditionStatus[];
}

// ── Gate Evaluation ─────────────────────────────────────────────────────────

/**
 * Evaluate all gating conditions against the current context.
 * Returns detailed status of each gate and whether all required gates pass.
 */
export function evaluateGates(
  conditions: GatingCondition[],
  context: FireKeeperContext,
): GateEvaluationResult {
  const now = new Date().toISOString();
  const statuses: GatingConditionStatus[] = conditions.map((gate) => {
    const satisfied = gate.evaluator(context);
    return {
      condition: gate.condition,
      satisfied,
      satisfiedAt: satisfied ? now : null,
      satisfiedBy: satisfied ? 'fire-keeper' : null,
    };
  });

  const unsatisfied = statuses.filter((s) => !s.satisfied);
  const allSatisfied = conditions
    .filter((c) => c.required)
    .every((c) => c.evaluator(context));

  return { allSatisfied, statuses, unsatisfied };
}

/**
 * Create a new gating condition with a custom evaluator.
 * @param condition - Human-readable description
 * @param evaluator - Function that checks whether the condition is met
 * @param required - Whether the condition is mandatory (default: true)
 */
export function createGate(
  condition: string,
  evaluator: (context: FireKeeperContext) => boolean,
  required: boolean = true,
): GatingCondition {
  return { condition, required, evaluator };
}

/**
 * Resolve a held gate by updating its status in the ceremony state.
 * @param gateStatuses - Current gating condition statuses
 * @param gateCondition - The condition string to resolve
 * @param resolvedBy - Who/what resolved the gate
 * @returns Updated gating condition statuses
 */
export function resolveHold(
  gateStatuses: GatingConditionStatus[],
  gateCondition: string,
  resolvedBy: string,
): GatingConditionStatus[] {
  const now = new Date().toISOString();
  return gateStatuses.map((status) => {
    if (status.condition === gateCondition && !status.satisfied) {
      return {
        ...status,
        satisfied: true,
        satisfiedAt: now,
        satisfiedBy: resolvedBy,
      };
    }
    return status;
  });
}

// ── Default Gates ───────────────────────────────────────────────────────────

/**
 * Wilson alignment threshold gate.
 * Blocks when Wilson alignment score drops below the configured threshold.
 */
export const GATE_WILSON_ALIGNMENT: GatingCondition = createGate(
  'Wilson alignment above threshold',
  (context) => (context.wilsonAlignment ?? 0) >= 0.65,
  true,
);

/**
 * OCAP compliance gate.
 * Blocks when OCAP® compliance has not been verified.
 */
export const GATE_OCAP_COMPLIANCE: GatingCondition = createGate(
  'OCAP compliance verified',
  (context) => context.ocapCompliant === true,
  true,
);

/**
 * Ceremony phase appropriateness gate.
 * Blocks when the ceremony is in a resting phase (no active work allowed).
 */
export const GATE_CEREMONY_PHASE: GatingCondition = createGate(
  'Ceremony phase allows active work',
  (context) => context.ceremonyState.ceremonyPhase !== 'resting',
  true,
);

/** All default gating conditions */
export const DEFAULT_GATES: GatingCondition[] = [
  GATE_WILSON_ALIGNMENT,
  GATE_OCAP_COMPLIANCE,
  GATE_CEREMONY_PHASE,
];
