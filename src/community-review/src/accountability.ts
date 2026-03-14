/**
 * @medicine-wheel/community-review — Accountability
 *
 * Review functions that assess artifacts against Wilson's three R's,
 * OCAP® principles, and relational health.
 */

import type { ReviewCircle, Reviewer, WilsonCheck } from './types.js';

/**
 * Determine who a reviewer is accountable to.
 * Returns the accountability chain for a given reviewer.
 */
export function reviewerAccountability(reviewer: Reviewer): {
  reviewerId: string;
  role: string;
  accountableTo: string[];
  direction?: string;
  accountabilityStatement: string;
} {
  const roleStatements: Record<string, string> = {
    steward: 'As steward, accountable to the community and future generations for the care of this knowledge.',
    contributor: 'As contributor, accountable to the circle for the integrity of contributions.',
    elder: 'As elder, accountable to the ancestors and the community for wise guidance.',
    firekeeper: 'As firekeeper, accountable to the ceremony and all participants for maintaining sacred space.',
    'community-member': 'As community member, accountable to the community for honest voice.',
    youth: 'As youth, accountable to future generations for carrying the teachings forward.',
  };

  return {
    reviewerId: reviewer.id,
    role: reviewer.role,
    accountableTo: reviewer.accountableTo,
    direction: reviewer.direction,
    accountabilityStatement: roleStatements[reviewer.role] ?? 'Accountable to all relations.',
  };
}

/**
 * Check an artifact (via its review circle) against Wilson's three R's:
 * Respect, Reciprocity, Responsibility.
 */
export function reviewAgainstWilson(circle: ReviewCircle): {
  wilsonCheck: WilsonCheck;
  score: number;
  observations: string[];
} {
  const observations: string[] = [];

  // Respect: Are all directions and roles represented?
  const directions = new Set(
    circle.reviewers.filter((r) => r.direction).map((r) => r.direction),
  );
  const respectHonored = directions.size >= 2 && circle.reviewers.length >= 2;
  if (!respectHonored) {
    observations.push('Respect: Not all perspectives are represented in the circle');
  }

  // Reciprocity: Has the artifact given back to the community?
  const hasElderVoice = circle.talkingCircleLog.some((e) => e.role === 'elder');
  const hasCommunityVoice = circle.talkingCircleLog.some(
    (e) => e.role === 'community-member' || e.role === 'youth',
  );
  const reciprocityPresent = hasElderVoice || hasCommunityVoice;
  if (!reciprocityPresent) {
    observations.push('Reciprocity: Elder or community voices have not been heard');
  }

  // Responsibility: Has accountability been explicitly stated?
  const reviewersWithAccountability = circle.reviewers.filter(
    (r) => r.accountableTo.length > 0,
  );
  const responsibilityTaken =
    reviewersWithAccountability.length === circle.reviewers.length &&
    circle.reviewers.length > 0;
  if (!responsibilityTaken) {
    observations.push('Responsibility: Not all reviewers have stated their accountability');
  }

  const wilsonCheck: WilsonCheck = {
    respectHonored,
    reciprocityPresent,
    responsibilityTaken,
  };

  const trueCount = [respectHonored, reciprocityPresent, responsibilityTaken].filter(Boolean).length;
  const score = trueCount / 3;

  if (observations.length === 0) {
    observations.push("Wilson's three R's are honored in this review circle");
  }

  return { wilsonCheck, score, observations };
}

/**
 * Check an artifact's review against OCAP® principles:
 * Ownership, Control, Access, Possession.
 */
export function reviewAgainstOcap(circle: ReviewCircle): {
  compliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check that community ownership is represented
  const hasSteward = circle.reviewers.some((r) => r.role === 'steward');
  if (!hasSteward) {
    issues.push('Ownership: No steward present to represent community ownership');
  }

  // Check that review process includes community control
  const hasElderOrFirekeeper = circle.reviewers.some(
    (r) => r.role === 'elder' || r.role === 'firekeeper',
  );
  if (!hasElderOrFirekeeper) {
    issues.push('Control: No elder or firekeeper to ensure community control');
  }

  // Check that access considerations are addressed
  if (!circle.ocapCompliant) {
    issues.push('Access/Possession: OCAP® compliance has not been confirmed');
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}

/**
 * Assess the relational health of the review circle itself.
 * A healthy circle has diverse perspectives, active participation,
 * and explicit accountability.
 */
export function relationalHealthReview(circle: ReviewCircle): {
  healthy: boolean;
  score: number;
  dimensions: {
    diversity: number;
    participation: number;
    accountability: number;
    elderPresence: number;
  };
  recommendations: string[];
} {
  const recommendations: string[] = [];

  // Diversity: How many directions and roles are represented?
  const uniqueDirections = new Set(
    circle.reviewers.filter((r) => r.direction).map((r) => r.direction),
  ).size;
  const uniqueRoles = new Set(circle.reviewers.map((r) => r.role)).size;
  const diversity = Math.min(1, (uniqueDirections + uniqueRoles) / 8);
  if (diversity < 0.5) {
    recommendations.push('Invite reviewers from underrepresented directions and roles');
  }

  // Participation: What fraction of reviewers have spoken?
  const spoke = new Set(circle.talkingCircleLog.map((e) => e.speakerId));
  const participation = circle.reviewers.length > 0
    ? [...new Set(circle.reviewers.map((r) => r.id))].filter((id) => spoke.has(id)).length / circle.reviewers.length
    : 0;
  if (participation < 0.75) {
    recommendations.push('Not all reviewers have been heard — invite remaining voices');
  }

  // Accountability: Do all reviewers have stated accountability?
  const withAccountability = circle.reviewers.filter((r) => r.accountableTo.length > 0).length;
  const accountability = circle.reviewers.length > 0
    ? withAccountability / circle.reviewers.length
    : 0;
  if (accountability < 1) {
    recommendations.push('Some reviewers have not stated who they are accountable to');
  }

  // Elder presence
  const elderPresence = circle.elderValidator ? 1 : 0;
  if (!elderPresence) {
    recommendations.push('Consider requesting Elder validation');
  }

  const score = (diversity + participation + accountability + elderPresence) / 4;

  return {
    healthy: score >= 0.6,
    score,
    dimensions: { diversity, participation, accountability, elderPresence },
    recommendations,
  };
}
