/**
 * @medicine-wheel/importance-unit — Zod Schemas
 *
 * Runtime validation schemas for ImportanceUnit and related types.
 * These enforce data integrity at ingestion boundaries and serve
 * as executable documentation of the relational knowledge model.
 */

import { z } from 'zod';
import { DirectionNameSchema } from 'medicine-wheel-ontology-core';

// ── Enums as Zod schemas ────────────────────────────────────────────────────

/** Validation schema for epistemic source dimensions */
export const EpistemicSourceSchema = z.enum(['land', 'dream', 'code', 'vision']);

/** Validation schema for accountability link types */
export const AccountabilityLinkTypeSchema = z.enum([
  'accountable-to', 'deepens', 'tensions-with',
  'emerges-from', 'gates', 'circles-back-to',
]);

/** Validation schema for Wilson's axiological pillars */
export const AxiologicalPillarSchema = z.enum([
  'ontology', 'epistemology', 'methodology', 'axiology',
]);

// ── Compound Schemas ────────────────────────────────────────────────────────

/** Validation schema for accountability links */
export const AccountabilityLinkSchema = z.object({
  targetId: z.string(),
  relationType: AccountabilityLinkTypeSchema,
  description: z.string().optional(),
});

/** Validation schema for circle refinements */
export const CircleRefinementSchema = z.object({
  circle: z.number().int().min(1),
  shift: z.string(),
  timestamp: z.string(),
});

/** Validation schema for gating condition status */
export const GatingConditionStatusSchema = z.object({
  condition: z.string(),
  satisfied: z.boolean(),
});

/** Validation schema for ceremony state */
export const CeremonyStateSchema = z.object({
  quadrantsVisited: z.array(DirectionNameSchema),
  circleComplete: z.boolean(),
  gatingConditions: z.array(GatingConditionStatusSchema),
});

/** Validation schema for ImportanceUnit content */
export const ImportanceUnitContentSchema = z.object({
  summary: z.string(),
  rawInput: z.string().optional(),
  refinements: z.array(CircleRefinementSchema),
});

/** Validation schema for ImportanceUnit metadata */
export const ImportanceUnitMetaSchema = z.object({
  createdBy: z.string(),
  createdAt: z.string(),
  lastCircledAt: z.string().optional(),
  traceId: z.string().optional(),
});

/** Validation schema for the full ImportanceUnit */
export const ImportanceUnitSchema = z.object({
  id: z.string(),
  direction: DirectionNameSchema,
  epistemicWeight: z.number().min(0).max(1),
  source: EpistemicSourceSchema,
  accountabilityLinks: z.array(AccountabilityLinkSchema),
  circleDepth: z.number().int().min(1),
  content: ImportanceUnitContentSchema,
  ceremonyState: CeremonyStateSchema.optional(),
  axiologicalPillar: AxiologicalPillarSchema.optional(),
  inquiryRef: z.string().optional(),
  meta: ImportanceUnitMetaSchema,
});

/** Validation schema for CreateUnitInput */
export const CreateUnitInputSchema = z.object({
  direction: DirectionNameSchema,
  source: EpistemicSourceSchema,
  summary: z.string(),
  rawInput: z.string().optional(),
  createdBy: z.string(),
  axiologicalPillar: AxiologicalPillarSchema.optional(),
  inquiryRef: z.string().optional(),
  accountabilityLinks: z.array(AccountabilityLinkSchema).optional(),
  traceId: z.string().optional(),
});

/** Validation schema for UpdateUnitInput */
export const UpdateUnitInputSchema = z.object({
  direction: DirectionNameSchema.optional(),
  summary: z.string().optional(),
  axiologicalPillar: AxiologicalPillarSchema.optional(),
  inquiryRef: z.string().optional(),
});

// ── Inferred Types (derive from schemas) ────────────────────────────────────

export type ValidatedImportanceUnit = z.infer<typeof ImportanceUnitSchema>;
export type ValidatedAccountabilityLink = z.infer<typeof AccountabilityLinkSchema>;
export type ValidatedCircleRefinement = z.infer<typeof CircleRefinementSchema>;
export type ValidatedGatingConditionStatus = z.infer<typeof GatingConditionStatusSchema>;
export type ValidatedCeremonyState = z.infer<typeof CeremonyStateSchema>;
export type ValidatedCreateUnitInput = z.infer<typeof CreateUnitInputSchema>;
export type ValidatedUpdateUnitInput = z.infer<typeof UpdateUnitInputSchema>;
