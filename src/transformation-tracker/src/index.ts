/**
 * @medicine-wheel/transformation-tracker
 *
 * Research transformation tracking for the Medicine Wheel Developer Suite.
 * Built on Wilson's line that research which does not change you as a
 * person has not been done right (2008, p. 135, as cited by Wulff 2010;
 * not yet checked against the page). Reading it as a validity check, and
 * its five dimensions, are this package's design.
 *
 * @packageDocumentation
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  TransformationLog,
  GrowthSnapshot,
  Reflection,
  CommunityImpact,
  RelationalShift,
  ReciprocityEntry,
  WilsonValidity,
} from './types.js';

// ── Schemas ─────────────────────────────────────────────────────────────────
export {
  CeremonyPhaseSchema,
  GrowthSnapshotSchema,
  ReflectionSchema,
  CommunityImpactSchema,
  RelationalShiftSchema,
  ReciprocityEntrySchema,
  TransformationLogSchema,
  WilsonValiditySchema,
} from './schemas.js';

export type {
  ValidatedTransformationLog,
  ValidatedGrowthSnapshot,
  ValidatedReflection,
  ValidatedCommunityImpact,
  ValidatedRelationalShift,
  ValidatedReciprocityEntry,
  ValidatedWilsonValidity,
} from './schemas.js';

// ── Researcher ──────────────────────────────────────────────────────────────
export {
  logReflection,
  snapshotUnderstanding,
  compareSnapshots,
  detectGrowth,
} from './researcher.js';

export type {
  SnapshotComparison,
  GrowthSignal,
} from './researcher.js';

// ── Community ───────────────────────────────────────────────────────────────
export {
  logCommunityImpact,
  reciprocityBalance,
  communityVoice,
  impactTimeline,
} from './community.js';

export type {
  ReciprocityBalanceResult,
  CommunityVoiceResult,
  TimelineEntry,
} from './community.js';

// ── Relational Shift ────────────────────────────────────────────────────────
export {
  trackRelationalChange,
  beforeAfter,
  strengthDelta,
  newRelationsFormed,
} from './relational-shift.js';

export type {
  RelationalShiftSummary,
  StrengthDeltaResult,
  NewRelationDescriptor,
  NewRelationsResult,
} from './relational-shift.js';

// ── Seven Generations ───────────────────────────────────────────────────────
export {
  sevenGenScore,
  futureImpact,
  sustainabilityCheck,
} from './seven-generations.js';

export type {
  SevenGenResult,
  FutureImpactAssessment,
  SustainabilityResult,
} from './seven-generations.js';

// ── Reciprocity Ledger ──────────────────────────────────────────────────────
export {
  logGiving,
  logReceiving,
  balanceCheck,
  reciprocityDebt,
} from './reciprocity-ledger.js';

export type {
  CategoryBalance,
  BalanceCheckResult,
  Debt,
  ReciprocityDebtResult,
} from './reciprocity-ledger.js';

// ── Prompts ─────────────────────────────────────────────────────────────────
export {
  reflectionPrompts,
  phaseTransitionPrompts,
  milestonePrompts,
} from './prompts.js';

export type { RelationalMilestone } from './prompts.js';

// ── Validity ────────────────────────────────────────────────────────────────
export { wilsonValidityCheck } from './validity.js';
