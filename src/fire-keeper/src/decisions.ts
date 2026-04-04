/**
 * medicine-wheel-fire-keeper — Human-in-the-Loop Decisions
 *
 * Determines when human involvement is required, manages permission
 * escalation, and triggers circle review processes. The Fire Keeper
 * decides autonomously except at defined decision points.
 */

import type {
  FireKeeperContext,
  PermissionTier,
  DecisionPointType,
  DecisionPoint,
} from './types.js';
import type { HumanNeededMessage } from './messages.js';

// ── Permission Tier Ordering ────────────────────────────────────────────────

const TIER_ORDER: PermissionTier[] = ['observe', 'analyze', 'propose', 'act'];

/** Tiers that require human approval */
const HUMAN_REQUIRED_TIERS: PermissionTier[] = ['act'];

// ── Human Decision Detection ────────────────────────────────────────────────

/** Result of checking whether human involvement is needed */
export interface HumanDecisionResult {
  /** Whether human involvement is required */
  needed: boolean;
  /** Which decision point was triggered, if any */
  decisionType: DecisionPointType | null;
  /** Reason human involvement is needed */
  reason: string | null;
}

/**
 * Determine if a human decision is required given the current context.
 * Checks trajectory confidence, value divergence, and decision point triggers.
 * @param context - Current Fire Keeper context
 * @param decisionPoints - Configured decision points to check
 * @param trajectoryThreshold - Minimum acceptable trajectory confidence (default: 0.65)
 */
export function humanNeeded(
  context: FireKeeperContext,
  decisionPoints: DecisionPoint[],
  trajectoryThreshold: number = 0.65,
): HumanDecisionResult {
  // Check trajectory confidence
  const history = context.ceremonyState.trajectoryHistory;
  if (history.length > 0) {
    const latest = history[history.length - 1];
    if (latest.confidence < trajectoryThreshold) {
      return {
        needed: true,
        decisionType: 'value-conflict',
        reason: `Trajectory confidence (${latest.confidence}) below threshold (${trajectoryThreshold})`,
      };
    }
  }

  // Check configured decision points
  for (const dp of decisionPoints) {
    if (dp.requiresHuman && dp.trigger(context)) {
      return {
        needed: true,
        decisionType: dp.type,
        reason: `Decision point triggered: ${dp.type}`,
      };
    }
  }

  return { needed: false, decisionType: null, reason: null };
}

// ── Permission Escalation ───────────────────────────────────────────────────

/** Result of a permission escalation request */
export interface EscalationResult {
  /** Whether escalation is allowed */
  allowed: boolean;
  /** Whether human approval is required for this escalation */
  humanRequired: boolean;
  /** The tier being escalated from */
  fromTier: PermissionTier;
  /** The tier being escalated to */
  toTier: PermissionTier;
  /** Reason for the decision */
  reason: string;
}

/**
 * Evaluate a permission escalation request.
 * The 'act' tier always requires human approval.
 * @param currentTier - Agent's current permission tier
 * @param requestedAction - The action the agent wants to perform
 */
export function permissionEscalation(
  currentTier: PermissionTier,
  requestedAction: PermissionTier,
): EscalationResult {
  const currentIdx = TIER_ORDER.indexOf(currentTier);
  const requestedIdx = TIER_ORDER.indexOf(requestedAction);

  if (requestedIdx <= currentIdx) {
    return {
      allowed: true,
      humanRequired: false,
      fromTier: currentTier,
      toTier: requestedAction,
      reason: 'Requested action is within current permission tier',
    };
  }

  const humanRequired = HUMAN_REQUIRED_TIERS.includes(requestedAction);

  return {
    allowed: !humanRequired,
    humanRequired,
    fromTier: currentTier,
    toTier: requestedAction,
    reason: humanRequired
      ? `Escalation to '${requestedAction}' tier requires human approval`
      : `Escalation from '${currentTier}' to '${requestedAction}' permitted`,
  };
}

// ── Circle Review ───────────────────────────────────────────────────────────

/** Result of a circle review check */
export interface CircleReviewResult {
  /** Whether a circle review should be triggered */
  reviewNeeded: boolean;
  /** The human.needed message to send, if review is needed */
  message: HumanNeededMessage | null;
}

/**
 * Trigger a circle review process when an ImportanceUnit reaches
 * circle completion (all four quadrants visited). Human must confirm
 * before the unit can be archived or pruned.
 * @param context - Current Fire Keeper context
 */
export function circleReview(context: FireKeeperContext): CircleReviewResult {
  const milestones = context.ceremonyState.relationalMilestones;
  const completeMilestones = milestones.filter(
    (m) =>
      m.quadrantsTouched.length >= m.quadrantsRequired.length &&
      !m.complete,
  );

  if (completeMilestones.length === 0) {
    return { reviewNeeded: false, message: null };
  }

  const milestone = completeMilestones[0];
  const requestId = `review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    reviewNeeded: true,
    message: {
      type: 'human.needed',
      payload: {
        requestId,
        reason: `Relational circle complete: "${milestone.milestone}" — all quadrants visited`,
        decisionType: 'circle-completion-review',
        context: {
          unitId: context.unitId,
          summary: `Milestone "${milestone.milestone}" has touched all required quadrants: ${milestone.quadrantsTouched.join(', ')}. Human confirmation needed before archival.`,
          options: ['approve-archive', 'request-deepening', 'continue-tending'],
        },
        suggestedModality: 'protocol',
      },
    },
  };
}
