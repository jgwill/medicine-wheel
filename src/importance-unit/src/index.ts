/**
 * @medicine-wheel/importance-unit
 *
 * The ImportanceUnit is the relational unit of knowledge in Wilson's
 * epistemology. This package provides types, validation schemas, CRUD
 * operations, epistemic weight computation, accountability link
 * management, and circle/spiral depth tracking.
 *
 * @packageDocumentation
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  EpistemicSource,
  AccountabilityLinkType,
  AxiologicalPillar,
  AccountabilityLink,
  CircleRefinement,
  GatingConditionStatus,
  CeremonyState,
  ImportanceUnitContent,
  ImportanceUnitMeta,
  ImportanceUnit,
  CreateUnitInput,
  UpdateUnitInput,
} from './types.js';

// ── Zod Schemas ─────────────────────────────────────────────────────────────
export {
  EpistemicSourceSchema,
  AccountabilityLinkTypeSchema,
  AxiologicalPillarSchema,
  AccountabilityLinkSchema,
  CircleRefinementSchema,
  GatingConditionStatusSchema,
  CeremonyStateSchema,
  ImportanceUnitContentSchema,
  ImportanceUnitMetaSchema,
  ImportanceUnitSchema,
  CreateUnitInputSchema,
  UpdateUnitInputSchema,
} from './schemas.js';

// Re-export validated types
export type {
  ValidatedImportanceUnit,
  ValidatedAccountabilityLink,
  ValidatedCircleRefinement,
  ValidatedGatingConditionStatus,
  ValidatedCeremonyState,
  ValidatedCreateUnitInput,
  ValidatedUpdateUnitInput,
} from './schemas.js';

// ── Core CRUD ───────────────────────────────────────────────────────────────
export {
  createUnit,
  updateUnit,
  circleBack,
  archive,
} from './unit.js';

// ── Epistemic Weight ────────────────────────────────────────────────────────
export {
  BASE_WEIGHTS,
  computeWeight,
  adjustForSource,
  adjustForDepth,
} from './epistemic-weight.js';

// ── Accountability ──────────────────────────────────────────────────────────
export {
  linkAccountability,
  resolveLinks,
  findGaps,
} from './accountability.js';

export type { AccountabilityGap } from './accountability.js';

// ── Circle / Spiral Tracking ────────────────────────────────────────────────
export {
  incrementCircle,
  recordRefinement,
  detectDeepening,
  detectStagnation,
} from './circle-tracking.js';

export type {
  DeepeningAnalysis,
  StagnationAnalysis,
} from './circle-tracking.js';
