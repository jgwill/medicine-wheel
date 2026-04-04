/**
 * @medicine-wheel/community-review — Consensus & Talking Circle
 *
 * Manages the talking circle process and consensus-seeking.
 * In Wilson's framework, validation comes through community
 * consensus, not individual expert judgment.
 */

import type {
  ReviewCircle,
  TalkingCircleEntry,
  ReviewOutcomeType,
} from './types.js';

/**
 * Attempt to reach consensus by analyzing all voices in the circle.
 * Returns whether consensus exists and the emerging outcome type.
 */
export function seekConsensus(circle: ReviewCircle): {
  consensusReached: boolean;
  emergingOutcome: ReviewOutcomeType | null;
  voiceCount: number;
  reviewerCount: number;
  allReviewersSpoken: boolean;
} {
  const reviewerIds = new Set(circle.reviewers.map((r) => r.id));
  const spokePeople = new Set(
    circle.talkingCircleLog.map((e) => e.speakerId),
  );
  const allSpoken = [...reviewerIds].every((id) => spokePeople.has(id));

  // Consensus requires all reviewers to have spoken
  const consensusReached = allSpoken && circle.reviewers.length > 0;

  // Determine emerging outcome based on whether voices align
  let emergingOutcome: ReviewOutcomeType | null = null;
  if (consensusReached && circle.elderValidator) {
    const elderSpoke = circle.talkingCircleLog.some(
      (e) => e.speakerId === circle.elderValidator && e.role === 'elder',
    );
    emergingOutcome = elderSpoke ? 'approved-with-blessings' : 'deepen-required';
  } else if (consensusReached) {
    emergingOutcome = 'deepen-required';
  }

  return {
    consensusReached,
    emergingOutcome,
    voiceCount: circle.talkingCircleLog.length,
    reviewerCount: circle.reviewers.length,
    allReviewersSpoken: allSpoken,
  };
}

/**
 * Add a talking circle entry — one person's voice in the circle.
 * Validates the speaker is a participant.
 */
export function talkingCircle(
  circle: ReviewCircle,
  entry: TalkingCircleEntry,
): ReviewCircle {
  if (circle.status !== 'reviewing' && circle.status !== 'deliberating') {
    throw new Error(
      `Cannot add to talking circle — circle is '${circle.status}'`,
    );
  }

  return {
    ...circle,
    talkingCircleLog: [...circle.talkingCircleLog, entry],
  };
}

/**
 * Summarize all voices heard in the circle, grouped by direction.
 */
export function recordVoices(circle: ReviewCircle): {
  total: number;
  byDirection: Record<string, TalkingCircleEntry[]>;
  byRole: Record<string, TalkingCircleEntry[]>;
  unheardReviewers: string[];
} {
  const byDirection: Record<string, TalkingCircleEntry[]> = {};
  const byRole: Record<string, TalkingCircleEntry[]> = {};

  for (const entry of circle.talkingCircleLog) {
    const dir = entry.direction ?? 'unaligned';
    if (!byDirection[dir]) byDirection[dir] = [];
    byDirection[dir].push(entry);

    if (!byRole[entry.role]) byRole[entry.role] = [];
    byRole[entry.role].push(entry);
  }

  const spoke = new Set(circle.talkingCircleLog.map((e) => e.speakerId));
  const unheardReviewers = circle.reviewers
    .filter((r) => !spoke.has(r.id))
    .map((r) => r.id);

  return {
    total: circle.talkingCircleLog.length,
    byDirection,
    byRole,
    unheardReviewers,
  };
}

/**
 * Process for handling disagreement within the circle.
 * Returns guidance for resolution based on the process type.
 */
export function resolveDisagreement(
  circle: ReviewCircle,
  process: 'deeper-listening' | 'elder-mediation' | 'return-to-ceremony' | 'rest-and-return',
): {
  guidance: string;
  nextStatus: 'reviewing' | 'deliberating';
  suggestedActions: string[];
} {
  switch (process) {
    case 'deeper-listening':
      return {
        guidance: 'Return to the talking circle with renewed attention. Each voice deserves to be fully heard.',
        nextStatus: 'reviewing',
        suggestedActions: [
          'Invite unheard reviewers to speak',
          'Ask clarifying questions without judgment',
          'Reflect back what has been heard',
        ],
      };
    case 'elder-mediation':
      return {
        guidance: 'Request Elder guidance to help the circle find its way forward.',
        nextStatus: 'deliberating',
        suggestedActions: [
          'Request Elder validation if not already assigned',
          'Share the points of tension with the Elder',
          'Allow the Elder to guide the process',
        ],
      };
    case 'return-to-ceremony':
      return {
        guidance: 'The disagreement may require ceremonial attention before resolution is possible.',
        nextStatus: 'reviewing',
        suggestedActions: [
          'Conduct a smudging ceremony',
          'Reground in the Four Directions',
          'Check Wilson alignment as a group',
        ],
      };
    case 'rest-and-return':
      return {
        guidance: 'Sometimes wisdom comes through rest. The circle can reconvene when ready.',
        nextStatus: 'reviewing',
        suggestedActions: [
          'Set a date to reconvene',
          'Invite individual reflection',
          'Allow time for the land to speak',
        ],
      };
  }
}
