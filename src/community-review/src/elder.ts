/**
 * @medicine-wheel/community-review — Elder Validation
 *
 * Wilson describes research validation not through peer review
 * but through community review — Elders validate whether research
 * honors relational accountability.
 */

import type { ReviewCircle, TalkingCircleEntry } from './types.js';

/**
 * Request Elder validation for a review circle.
 * Sets the elderValidator field and transitions to 'deliberating'.
 */
export function requestElderValidation(
  circle: ReviewCircle,
  elderId: string,
): ReviewCircle {
  if (circle.status !== 'reviewing') {
    throw new Error(
      `Cannot request Elder validation — circle is '${circle.status}', must be 'reviewing'`,
    );
  }
  return {
    ...circle,
    elderValidator: elderId,
    status: 'deliberating',
  };
}

/**
 * Get Elder's guidance for the circle based on voices heard so far.
 * Returns a summary of what the Elder should consider.
 */
export function elderGuidance(circle: ReviewCircle): {
  artifactType: string;
  voicesHeard: number;
  directionsRepresented: string[];
  wilsonAlignment: number;
  suggestions: string[];
} {
  const directions = new Set(
    circle.talkingCircleLog
      .filter((e) => e.direction !== undefined)
      .map((e) => e.direction!),
  );
  const allDirections = ['east', 'south', 'west', 'north'] as const;
  const missing = allDirections.filter((d) => !directions.has(d));

  const suggestions: string[] = [];
  if (missing.length > 0) {
    suggestions.push(`Voices from ${missing.join(', ')} have not yet been heard`);
  }
  if (circle.wilsonAlignment < 0.5) {
    suggestions.push('Wilson alignment is below threshold — consider deeper reflection');
  }
  if (!circle.ocapCompliant) {
    suggestions.push('OCAP® compliance has not been confirmed');
  }
  if (circle.reviewers.length < 3) {
    suggestions.push('Small circle — consider whether all perspectives are represented');
  }

  return {
    artifactType: circle.artifactType,
    voicesHeard: circle.talkingCircleLog.length,
    directionsRepresented: [...directions],
    wilsonAlignment: circle.wilsonAlignment,
    suggestions,
  };
}

/**
 * Record an Elder's blessing on the review circle.
 * The blessing is added to the talking circle log and stored as Elder validation.
 */
export function elderBlessing(
  circle: ReviewCircle,
  elderId: string,
  blessing: string,
): ReviewCircle {
  if (circle.elderValidator !== elderId) {
    throw new Error(
      `Elder '${elderId}' is not the assigned validator for this circle`,
    );
  }

  const entry: TalkingCircleEntry = {
    speakerId: elderId,
    role: 'elder',
    voice: blessing,
    timestamp: new Date().toISOString(),
  };

  return {
    ...circle,
    talkingCircleLog: [...circle.talkingCircleLog, entry],
  };
}
