/**
 * @medicine-wheel/community-review — Zod Schemas
 *
 * Runtime validation schemas for community review types.
 * Enforces data integrity at all boundaries.
 */

import { z } from 'zod';
import type { PersonRole } from './types.js';

// ── Enum Schemas ────────────────────────────────────────────────────────────

/**
 * Compile-time guard that a runtime tuple covers a union exhaustively.
 *
 * `z.enum` needs a literal tuple, and `ontology-core` exports `PERSON_ROLES` as
 * `PersonRole[]` — an array, so spreading it yields no guaranteed first element
 * and TS rejects the cast. Rather than widen the upstream constant or silence the
 * error with `as unknown`, the tuple is written out here and *checked*: add a role
 * to the `PersonRole` union and this line fails to compile until the tuple grows.
 *
 * The failure it prevents is the quiet one. This schema previously held a
 * hand-typed list that was correct when written and had no way to stay correct —
 * a governance role added upstream would type-check at every call site and be
 * rejected at runtime here alone.
 */
type Exhaustive<Union extends string, Tuple extends readonly Union[]> =
  Exclude<Union, Tuple[number]> extends never ? Tuple : never;

const PERSON_ROLE_VALUES = [
  // ontology-core governance roles
  'steward', 'contributor', 'elder', 'firekeeper',
  // this package's review-circle additions (see REVIEW_ONLY_ROLES in types.ts)
  'community-member', 'youth',
] as const satisfies Exhaustive<PersonRole, readonly PersonRole[]>;

export const PersonRoleSchema = z.enum(PERSON_ROLE_VALUES);

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
