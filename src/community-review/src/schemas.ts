/**
 * @medicine-wheel/community-review — Zod Schemas
 *
 * Runtime validation schemas for community review types.
 * Enforces data integrity at all boundaries.
 */

import { z } from 'zod';

// ── Enum Schemas ────────────────────────────────────────────────────────────

export const PersonRoleSchema = z.enum([
  'steward', 'contributor', 'elder', 'firekeeper', 'community-member', 'youth',
]);

export const ArtifactTypeSchema = z.enum([
  'research', 'ceremony', 'knowledge', 'code', 'narrative',
]);

export const ReviewCircleStatusSchema = z.enum([
  'gathering', 'reviewing', 'deliberating', 'decided',
]);

export const ReviewOutcomeTypeSchema = z.enum([
  'approved-with-blessings', 'deepen-required', 'return-to-circle',
  'ceremonial-hold', 'withdrawn',
]);

export const DirectionNameSchema = z.enum(['east', 'south', 'west', 'north']);

// ── Composite Schemas ───────────────────────────────────────────────────────

export const ReviewerSchema = z.object({
  id: z.string(),
  role: PersonRoleSchema,
  direction: DirectionNameSchema.optional(),
  voice: z.string().optional(),
  accountableTo: z.array(z.string()),
});

export const TalkingCircleEntrySchema = z.object({
  speakerId: z.string(),
  role: PersonRoleSchema,
  direction: DirectionNameSchema.optional(),
  voice: z.string(),
  timestamp: z.string(),
  inResponseTo: z.string().optional(),
});

export const WilsonCheckSchema = z.object({
  respectHonored: z.boolean(),
  reciprocityPresent: z.boolean(),
  responsibilityTaken: z.boolean(),
});

export const ReviewOutcomeSchema = z.object({
  type: ReviewOutcomeTypeSchema,
  consensus: z.boolean(),
  voices: z.array(TalkingCircleEntrySchema),
  wilsonCheck: WilsonCheckSchema,
  elderBlessing: z.string().optional(),
  conditions: z.array(z.string()),
  nextAction: z.string(),
});

export const ReviewCircleSchema = z.object({
  id: z.string(),
  artifactId: z.string(),
  artifactType: ArtifactTypeSchema,
  reviewers: z.array(ReviewerSchema),
  elderValidator: z.string().optional(),
  status: ReviewCircleStatusSchema,
  outcome: ReviewOutcomeSchema.optional(),
  talkingCircleLog: z.array(TalkingCircleEntrySchema),
  wilsonAlignment: z.number().min(0).max(1),
  ocapCompliant: z.boolean(),
  createdAt: z.string(),
});

// ── Validated types ─────────────────────────────────────────────────────────

export type ValidatedReviewer = z.infer<typeof ReviewerSchema>;
export type ValidatedTalkingCircleEntry = z.infer<typeof TalkingCircleEntrySchema>;
export type ValidatedWilsonCheck = z.infer<typeof WilsonCheckSchema>;
export type ValidatedReviewOutcome = z.infer<typeof ReviewOutcomeSchema>;
export type ValidatedReviewCircle = z.infer<typeof ReviewCircleSchema>;
