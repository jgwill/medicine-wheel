/**
 * @medicine-wheel/transformation-tracker — Zod Schemas
 *
 * Runtime validation schemas for transformation tracking types.
 */

import { z } from 'zod';
import {
  DirectionNameSchema,
  ObligationCategorySchema,
} from 'medicine-wheel-ontology-core';

// ── Ceremony Phase Schema (local, from ontology-core type) ──────────────────

export const CeremonyPhaseSchema = z.enum([
  'opening', 'council', 'integration', 'closure',
]);

// ── Growth Snapshot ─────────────────────────────────────────────────────────

export const GrowthSnapshotSchema = z.object({
  timestamp: z.string(),
  direction: DirectionNameSchema,
  ceremonyPhase: CeremonyPhaseSchema,
  understanding: z.string(),
  relationsCount: z.number().int().min(0),
  wilsonAlignment: z.number().min(0).max(1),
  keyInsights: z.array(z.string()),
  openQuestions: z.array(z.string()),
});

// ── Reflection ──────────────────────────────────────────────────────────────

export const ReflectionSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  prompt: z.string(),
  response: z.string(),
  direction: DirectionNameSchema,
  depth: z.number().min(0).max(1),
});

// ── Community Impact ────────────────────────────────────────────────────────

export const CommunityImpactSchema = z.object({
  id: z.string(),
  description: z.string(),
  beneficiary: z.string(),
  category: ObligationCategorySchema,
  timestamp: z.string(),
  measurable: z.boolean(),
});

// ── Relational Shift ────────────────────────────────────────────────────────

export const RelationalShiftSchema = z.object({
  relationId: z.string(),
  before: z.object({
    strength: z.number().min(0).max(1),
    description: z.string(),
  }),
  after: z.object({
    strength: z.number().min(0).max(1),
    description: z.string(),
  }),
  catalyst: z.string(),
  direction: DirectionNameSchema,
  timestamp: z.string(),
});

// ── Reciprocity Entry ───────────────────────────────────────────────────────

export const ReciprocityEntrySchema = z.object({
  type: z.enum(['giving', 'receiving']),
  description: z.string(),
  relatedTo: z.string(),
  category: ObligationCategorySchema,
  timestamp: z.string(),
});

// ── Transformation Log ──────────────────────────────────────────────────────

export const TransformationLogSchema = z.object({
  id: z.string(),
  researchCycleId: z.string(),
  snapshots: z.array(GrowthSnapshotSchema),
  reflections: z.array(ReflectionSchema),
  communityImpacts: z.array(CommunityImpactSchema),
  relationalShifts: z.array(RelationalShiftSchema),
  reciprocityLedger: z.array(ReciprocityEntrySchema),
  sevenGenerationScore: z.number().min(0).max(1),
  overallTransformation: z.number().min(0).max(1),
});

// ── Wilson Validity ─────────────────────────────────────────────────────────

export const WilsonValiditySchema = z.object({
  researcherTransformed: z.boolean(),
  communityBenefited: z.boolean(),
  relationsStrengthened: z.boolean(),
  reciprocityBalanced: z.boolean(),
  sevenGenerationsConsidered: z.boolean(),
  overallValid: z.boolean(),
  score: z.number().min(0).max(1),
  recommendations: z.array(z.string()),
});

// ── Inferred Types ──────────────────────────────────────────────────────────

export type ValidatedTransformationLog = z.infer<typeof TransformationLogSchema>;
export type ValidatedGrowthSnapshot = z.infer<typeof GrowthSnapshotSchema>;
export type ValidatedReflection = z.infer<typeof ReflectionSchema>;
export type ValidatedCommunityImpact = z.infer<typeof CommunityImpactSchema>;
export type ValidatedRelationalShift = z.infer<typeof RelationalShiftSchema>;
export type ValidatedReciprocityEntry = z.infer<typeof ReciprocityEntrySchema>;
export type ValidatedWilsonValidity = z.infer<typeof WilsonValiditySchema>;
