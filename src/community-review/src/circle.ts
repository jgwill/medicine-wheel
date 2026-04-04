/**
 * @medicine-wheel/community-review — Circle Management
 *
 * Creates and manages review circles — the community body
 * that evaluates artifacts through ceremonial review.
 */

import type {
  ReviewCircle,
  ReviewCircleStatus,
  Reviewer,
  ReviewOutcome,
  ArtifactType,
} from './types.js';

/**
 * Create a new review circle for an artifact.
 * Initializes in 'gathering' status, awaiting reviewers.
 */
export function createReviewCircle(
  artifactId: string,
  artifactType: ArtifactType,
): ReviewCircle {
  return {
    id: `circle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    artifactId,
    artifactType,
    reviewers: [],
    status: 'gathering',
    talkingCircleLog: [],
    wilsonAlignment: 0,
    ocapCompliant: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Add a reviewer to the circle.
 * Only allowed while status is 'gathering'.
 */
export function addReviewer(
  circle: ReviewCircle,
  reviewer: Reviewer,
): ReviewCircle {
  if (circle.status !== 'gathering') {
    throw new Error(
      `Cannot add reviewer — circle is '${circle.status}', must be 'gathering'`,
    );
  }
  return {
    ...circle,
    reviewers: [...circle.reviewers, reviewer],
  };
}

/**
 * Transition the circle to 'reviewing' status.
 * Requires at least one reviewer.
 */
export function submitForReview(circle: ReviewCircle): ReviewCircle {
  if (circle.status !== 'gathering') {
    throw new Error(
      `Cannot submit — circle is '${circle.status}', must be 'gathering'`,
    );
  }
  if (circle.reviewers.length === 0) {
    throw new Error('Cannot submit — circle has no reviewers');
  }
  return {
    ...circle,
    status: 'reviewing',
  };
}

/**
 * Close the circle with a final outcome.
 * Transitions status to 'decided'.
 */
export function closeCircle(
  circle: ReviewCircle,
  outcome: ReviewOutcome,
): ReviewCircle {
  if (circle.status !== 'deliberating' && circle.status !== 'reviewing') {
    throw new Error(
      `Cannot close — circle is '${circle.status}', must be 'reviewing' or 'deliberating'`,
    );
  }
  return {
    ...circle,
    status: 'decided',
    outcome,
  };
}

/**
 * Get a summary of the circle's current state.
 */
export function circleStatus(circle: ReviewCircle): {
  status: ReviewCircleStatus;
  reviewerCount: number;
  hasElder: boolean;
  voicesHeard: number;
  outcomeType?: string;
} {
  return {
    status: circle.status,
    reviewerCount: circle.reviewers.length,
    hasElder: circle.elderValidator !== undefined,
    voicesHeard: circle.talkingCircleLog.length,
    outcomeType: circle.outcome?.type,
  };
}
