/**
 * medicine-wheel-community-review
 *
 * Community-based ceremonial review protocol — implements Wilson's
 * validation through Elder review circles, consensus-seeking,
 * and relational accountability assessment.
 *
 * @packageDocumentation
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  PersonRole,
  ArtifactType,
  ReviewCircleStatus,
  ReviewOutcomeType,
  ReviewCircle,
  Reviewer,
  ReviewOutcome,
  WilsonCheck,
  TalkingCircleEntry,
} from './types.js';

// ── Zod Schemas ─────────────────────────────────────────────────────────────
export {
  PersonRoleSchema,
  ArtifactTypeSchema,
  ReviewCircleStatusSchema,
  ReviewOutcomeTypeSchema,
  ReviewerSchema,
  TalkingCircleEntrySchema,
  WilsonCheckSchema,
  ReviewOutcomeSchema,
  ReviewCircleSchema,
} from './schemas.js';

export type {
  ValidatedReviewer,
  ValidatedTalkingCircleEntry,
  ValidatedWilsonCheck,
  ValidatedReviewOutcome,
  ValidatedReviewCircle,
} from './schemas.js';

// ── Circle Management ───────────────────────────────────────────────────────
export {
  createReviewCircle,
  addReviewer,
  submitForReview,
  closeCircle,
  circleStatus,
} from './circle.js';

// ── Elder Validation ────────────────────────────────────────────────────────
export {
  requestElderValidation,
  elderGuidance,
  elderBlessing,
} from './elder.js';

// ── Consensus & Talking Circle ──────────────────────────────────────────────
export {
  seekConsensus,
  talkingCircle,
  recordVoices,
  resolveDisagreement,
} from './consensus.js';

// ── Accountability ──────────────────────────────────────────────────────────
export {
  reviewerAccountability,
  reviewAgainstWilson,
  reviewAgainstOcap,
  relationalHealthReview,
} from './accountability.js';

// ── Outcomes ────────────────────────────────────────────────────────────────
export {
  approveWithBlessings,
  requestDeepening,
  returnToCircle,
  ceremonialHold,
} from './outcomes.js';
