/**
 * @medicine-wheel/community-review — Outcomes
 *
 * Functions for producing review outcomes — the final decisions
 * of the community review circle.
 */

import type { ReviewCircle, ReviewOutcome, ReviewOutcomeType } from './types.js';
import { reviewAgainstWilson } from './accountability.js';

/**
 * Approve the artifact with blessings.
 * Requires Elder blessing and Wilson alignment.
 */
export function approveWithBlessings(
  circle: ReviewCircle,
  blessing: string,
): ReviewOutcome {
  const { wilsonCheck, score } = reviewAgainstWilson(circle);

  return {
    type: 'approved-with-blessings',
    consensus: true,
    voices: [...circle.talkingCircleLog],
    wilsonCheck,
    elderBlessing: blessing,
    conditions: [],
    nextAction: score >= 0.67
      ? 'Artifact is approved and may proceed with community blessing.'
      : 'Artifact is approved but Wilson alignment should be strengthened in future work.',
  };
}

/**
 * Request deepening — the artifact needs more work in specific areas.
 */
export function requestDeepening(
  circle: ReviewCircle,
  areas: string[],
): ReviewOutcome {
  const { wilsonCheck } = reviewAgainstWilson(circle);

  return {
    type: 'deepen-required',
    consensus: true,
    voices: [...circle.talkingCircleLog],
    wilsonCheck,
    conditions: areas,
    nextAction: `Deepen the artifact in these areas: ${areas.join('; ')}. Return to the circle when ready.`,
  };
}

/**
 * Return the artifact to the circle for revision.
 * The artifact needs significant rework.
 */
export function returnToCircle(
  circle: ReviewCircle,
  reason: string,
): ReviewOutcome {
  const { wilsonCheck } = reviewAgainstWilson(circle);

  return {
    type: 'return-to-circle',
    consensus: false,
    voices: [...circle.talkingCircleLog],
    wilsonCheck,
    conditions: [reason],
    nextAction: `Artifact returned to circle: ${reason}. Please revise and resubmit.`,
  };
}

/**
 * Place the artifact on ceremonial hold.
 * Further ceremonial attention is needed before the review can proceed.
 */
export function ceremonialHold(
  circle: ReviewCircle,
  reason: string,
): ReviewOutcome {
  const { wilsonCheck } = reviewAgainstWilson(circle);

  return {
    type: 'ceremonial-hold',
    consensus: false,
    voices: [...circle.talkingCircleLog],
    wilsonCheck,
    conditions: [reason],
    nextAction: `Ceremonial hold: ${reason}. The artifact requires ceremonial attention before review can continue.`,
  };
}
