/**
 * @medicine-wheel/ontology-core — Zod Schemas
 *
 * Runtime validation schemas for all Medicine Wheel ontology types.
 * These enforce data integrity at ingestion boundaries (MCP tools,
 * API endpoints, Redis reads) and serve as executable documentation
 * of the data model.
 */

import { z } from 'zod';
import { KINSHIP_EDGE_TYPES } from './kinship';

// ── Enums as Zod schemas ────────────────────────────────────────────────────

export const DirectionNameSchema = z.enum(['east', 'south', 'west', 'north']);

export const NodeTypeSchema = z.enum([
  'human', 'land', 'spirit', 'ancestor', 'future', 'knowledge',
]);

export const CeremonyTypeSchema = z.enum([
  'smudging', 'talking_circle', 'spirit_feeding', 'opening', 'closing',
]);

export const ObligationCategorySchema = z.enum([
  'human', 'land', 'spirit', 'future',
]);

export const TensionPhaseSchema = z.enum([
  'germination', 'assimilation', 'completion',
]);

export const EpistemicSourceSchema = z.enum([
  'land', 'dream', 'code', 'vision',
]);

export const AxiologicalPillarSchema = z.enum([
  'ontology', 'epistemology', 'methodology', 'axiology',
]);

export const ConsentStateSchema = z.enum([
  'active', 'withdrawn', 'expired', 'pending',
]);

export const AccessLevelSchema = z.enum([
  'community', 'researchers', 'public', 'restricted',
]);

export const PossessionLocationSchema = z.enum([
  'on-premise', 'community-server', 'cloud-sovereign', 'cloud-shared',
]);

// ── Kinship Edge Vocabulary ─────────────────────────────────────────────────

/** Validates a governed kinship-edge name against the registry. */
export const KinshipEdgeNameSchema = z.enum(
  Object.keys(KINSHIP_EDGE_TYPES) as [string, ...string[]],
);

/** Validates a full kinship-edge-type descriptor. */
export const KinshipEdgeTypeSchema = z.object({
  name: z.string(),
  symmetry: z.enum(['symmetric', 'asymmetric']),
  inverse: z.string().optional(),
  description: z.string(),
  defaultObligations: z.array(ObligationCategorySchema).optional(),
});

// ── Core Schemas ────────────────────────────────────────────────────────────

export const DirectionSchema = z.object({
  name: DirectionNameSchema,
  ojibwe: z.string(),
  season: z.string(),
  color: z.string(),
  lifeStage: z.string(),
  ages: z.string(),
  medicine: z.array(z.string()),
  teachings: z.array(z.string()),
  practices: z.array(z.string()),
});

export const RelationalNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: NodeTypeSchema,
  direction: DirectionNameSchema.optional(),
  metadata: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const RelationalEdgeSchema = z.object({
  id: z.string(),
  from_id: z.string(),
  to_id: z.string(),
  relationship_type: z.string(),
  strength: z.number().min(0).max(1),
  ceremony_honored: z.boolean(),
  obligations: z.array(z.string()),
  created_at: z.string(),
});

// ── Relational-First Schemas ────────────────────────────────────────────────

export const RelationalObligationSchema = z.object({
  category: ObligationCategorySchema,
  obligations: z.array(z.string()),
});

export const OcapFlagsSchema = z.object({
  ownership: z.string(),
  control: z.string(),
  access: AccessLevelSchema,
  possession: PossessionLocationSchema,
  compliant: z.boolean(),
  steward: z.string().optional(),
  consent_given: z.boolean().optional(),
  consent_scope: z.string().optional(),
  consent_state: z.enum(['active', 'withdrawn', 'expired', 'pending']).optional(),
  consent_last_affirmed: z.string().optional(),
});

export const AccountabilityTrackingSchema = z.object({
  respect: z.number().min(0).max(1),
  reciprocity: z.number().min(0).max(1),
  responsibility: z.number().min(0).max(1),
  wilson_alignment: z.number().min(0).max(1),
  relations_honored: z.array(z.string()),
  last_ceremony_id: z.string().optional(),
  notes: z.string().optional(),
});

export const CeremonyContextSchema = z.object({
  ceremony_id: z.string().optional(),
  ceremony_type: CeremonyTypeSchema.optional(),
  ceremony_honored: z.boolean(),
});

/** Validates the context that authorizes and bounds a relation. */
export const RelationContextSchema = z.object({
  authorized_by: z.string().optional(),
  active_context: z.string().optional(),
  valid_when: z.string().optional(),
  forbidden_when: z.string().optional(),
  authorized_kin: z.array(z.string()).optional(),
});

export const RelationSchema = z.object({
  id: z.string(),
  from_id: z.string(),
  to_id: z.string(),
  relationship_type: z.string(),
  kinship_type: KinshipEdgeNameSchema.optional(),
  strength: z.number().min(0).max(1),
  direction: DirectionNameSchema.optional(),
  ceremony_context: CeremonyContextSchema.optional(),
  obligations: z.array(RelationalObligationSchema),
  ocap: OcapFlagsSchema,
  accountability: AccountabilityTrackingSchema,
  context: RelationContextSchema.optional(),
  metadata: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});

// ── Ceremony Schemas ────────────────────────────────────────────────────────

export const CeremonyGuidanceSchema = z.object({
  opening_practice: z.string(),
  intention: z.string(),
  protocol: z.string(),
  medicines_used: z.array(z.string()),
  timeline: z.string().optional(),
});

export const CeremonyLogSchema = z.object({
  id: z.string(),
  type: CeremonyTypeSchema,
  direction: DirectionNameSchema,
  participants: z.array(z.string()),
  medicines_used: z.array(z.string()),
  intentions: z.array(z.string()),
  timestamp: z.string(),
  research_context: z.string().optional(),
  relations_honored: z.array(z.string()).optional(),
  ocap: OcapFlagsSchema.optional(),
});

// ── Narrative Schemas ───────────────────────────────────────────────────────

export const BeatOriginSchema = z.object({
  producer: z.string(),
  source_ref: z.string().optional(),
  method: z.string().optional(),
});

export const NarrativeBeatSchema = z.object({
  id: z.string(),
  direction: DirectionNameSchema,
  title: z.string(),
  description: z.string(),
  prose: z.string().optional(),
  ceremonies: z.array(z.string()),
  learnings: z.array(z.string()),
  timestamp: z.string(),
  act: z.number().int().min(1).max(4),
  relations_honored: z.array(z.string()),
  cycle_id: z.string().optional(),
  parent_beat_id: z.string().optional(),
  sub_beats: z.array(z.string()).optional(),
  origin: BeatOriginSchema.optional(),
});

// ── Cycle Schemas ───────────────────────────────────────────────────────────

export const MedicineWheelCycleSchema = z.object({
  id: z.string(),
  research_question: z.string(),
  start_date: z.string(),
  current_direction: DirectionNameSchema,
  beats: z.array(z.string()),
  ceremonies_conducted: z.number().int().min(0),
  relations_mapped: z.number().int().min(0),
  wilson_alignment: z.number().min(0).max(1),
  ocap_compliant: z.boolean(),
});

// ── Structural Tension Schemas ──────────────────────────────────────────────

export const ActionStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
  direction: DirectionNameSchema.optional(),
  due_date: z.string().optional(),
});

export const StructuralTensionChartSchema = z.object({
  id: z.string(),
  desired_outcome: z.string(),
  current_reality: z.string(),
  action_steps: z.array(ActionStepSchema),
  phase: TensionPhaseSchema,
  direction: DirectionNameSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ── Direction Response Schema ───────────────────────────────────────────────

export const DirectionResponseSchema = z.object({
  direction: z.string(),
  stage: z.string(),
  ceremony_guidance: CeremonyGuidanceSchema,
  relational_obligations: z.array(RelationalObligationSchema),
  suggested_practices: z.array(z.unknown()),
  accountability_checkpoint: z.unknown().optional(),
  relational_accountability_summary: z.unknown().optional(),
});

// ── Inferred Types (derive from schemas) ────────────────────────────────────

export type ValidatedDirection = z.infer<typeof DirectionSchema>;
export type ValidatedRelationalNode = z.infer<typeof RelationalNodeSchema>;
export type ValidatedRelationalEdge = z.infer<typeof RelationalEdgeSchema>;
export type ValidatedRelation = z.infer<typeof RelationSchema>;
export type ValidatedOcapFlags = z.infer<typeof OcapFlagsSchema>;
export type ValidatedAccountabilityTracking = z.infer<typeof AccountabilityTrackingSchema>;
export type ValidatedCeremonyLog = z.infer<typeof CeremonyLogSchema>;
export type ValidatedNarrativeBeat = z.infer<typeof NarrativeBeatSchema>;
export type ValidatedMedicineWheelCycle = z.infer<typeof MedicineWheelCycleSchema>;
export type ValidatedStructuralTensionChart = z.infer<typeof StructuralTensionChartSchema>;
