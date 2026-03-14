/**
 * @medicine-wheel/importance-unit — Type Definitions
 *
 * The ImportanceUnit is the relational unit of knowledge in Wilson's
 * epistemology. Not all knowledge carries equal weight — dream-state
 * and embodied knowing may hold more epistemic authority than rational
 * analysis. These types make that explicit.
 *
 * Grounded in Shawn Wilson's "Research Is Ceremony" framework.
 */

import type { DirectionName } from 'medicine-wheel-ontology-core';

// ── Epistemic Source Dimensions ─────────────────────────────────────────────

/**
 * The relational origin dimension of knowledge.
 * - `land` — place-grounded, embodied knowing
 * - `dream` — liminal, spirit-state knowing
 * - `code` — technical, implementation knowing
 * - `vision` — intentional, architectural knowing
 */
export type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';

// ── Accountability Link Types ───────────────────────────────────────────────

/**
 * The nature of a relational link between ImportanceUnits.
 * Not 'references' — relationships carry responsibility.
 */
export type AccountabilityLinkType =
  | 'accountable-to'
  | 'deepens'
  | 'tensions-with'
  | 'emerges-from'
  | 'gates'
  | 'circles-back-to';

// ── Axiological Pillars ─────────────────────────────────────────────────────

/**
 * Wilson's four pillars of a research paradigm.
 * Every ImportanceUnit addresses at least one pillar.
 */
export type AxiologicalPillar = 'ontology' | 'epistemology' | 'methodology' | 'axiology';

// ── Accountability Link ─────────────────────────────────────────────────────

/**
 * A relational string connecting an ImportanceUnit to what it is
 * accountable to. The question is "To what is this accountable?"
 * not "What is this about?"
 */
export interface AccountabilityLink {
  /** ID of the related entity (another ImportanceUnit, an inquiry, a trace, a person) */
  targetId: string;
  /** The nature of the relationship — relationships carry responsibility */
  relationType: AccountabilityLinkType;
  /** Human-readable description of why this link exists */
  description?: string;
}

// ── Circle Refinement ───────────────────────────────────────────────────────

/**
 * Tracks what shifts between circles — this is where the
 * "important lines" live. Repetition is ceremony and deepening,
 * not redundancy.
 */
export interface CircleRefinement {
  /** Which circle iteration produced this refinement */
  circle: number;
  /** What changed or deepened in this pass */
  shift: string;
  /** When this refinement occurred */
  timestamp: string;
}

// ── Gating Condition Status ─────────────────────────────────────────────────

/**
 * A condition that must be met before autonomous action can
 * proceed on an ImportanceUnit.
 */
export interface GatingConditionStatus {
  /** e.g. 'Research Is Ceremony context gathered', 'Medicine Wheel alignment verified' */
  condition: string;
  /** Whether this condition has been satisfied */
  satisfied: boolean;
}

// ── Ceremony State ──────────────────────────────────────────────────────────

/**
 * Tracks the ceremonial progression of an ImportanceUnit
 * through the four directions.
 */
export interface CeremonyState {
  /** Which Medicine Wheel quadrants have been touched */
  quadrantsVisited: DirectionName[];
  /** True when all four quadrants have been visited — triggers eligibility for archival */
  circleComplete: boolean;
  /** Conditions that must be met before autonomous action can proceed */
  gatingConditions: GatingConditionStatus[];
}

// ── ImportanceUnit Content ──────────────────────────────────────────────────

/**
 * The content payload of an ImportanceUnit.
 */
export interface ImportanceUnitContent {
  /** The relational meaning of this unit — what it holds, not just what it says */
  summary: string;
  /** Original unprocessed input if available (preserves the voice) */
  rawInput?: string;
  /** Track what shifts between circles */
  refinements: CircleRefinement[];
}

// ── ImportanceUnit Metadata ─────────────────────────────────────────────────

/**
 * Creation and lifecycle metadata for an ImportanceUnit.
 */
export interface ImportanceUnitMeta {
  /** Agent or person who created this unit */
  createdBy: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 timestamp of last circle-back */
  lastCircledAt?: string;
  /** COAIA trace ID linking to ceremonial documentation */
  traceId?: string;
}

// ── ImportanceUnit ──────────────────────────────────────────────────────────

/**
 * A relationally-accountable piece of meaning — the fundamental unit
 * of knowledge in Wilson's relational epistemology.
 *
 * Not a flat data object. Each unit carries epistemic weight,
 * source dimensions, accountability links, and circle depth tracking.
 * Dream-state knowledge starts at 0.85+ weight; rational-filtered
 * inputs start lower. Weight increases with circleDepth.
 */
export interface ImportanceUnit {
  /** Unique identifier for this importance unit */
  id: string;
  /** Medicine Wheel quadrant alignment */
  direction: DirectionName;
  /** Epistemic authority (0.0–1.0). Dream-state starts at 0.85+ */
  epistemicWeight: number;
  /** Relational origin dimension */
  source: EpistemicSource;
  /** Relational strings connecting to what this unit is accountable to */
  accountabilityLinks: AccountabilityLink[];
  /** How many times this topic has been circled. First visit = 1 */
  circleDepth: number;
  /** Content payload with refinement tracking */
  content: ImportanceUnitContent;
  /** Ceremonial progression through the four directions */
  ceremonyState?: CeremonyState;
  /** Which of Wilson's four pillars this unit primarily addresses */
  axiologicalPillar?: AxiologicalPillar;
  /** Reference to the parent inquiry */
  inquiryRef?: string;
  /** Creation and lifecycle metadata */
  meta: ImportanceUnitMeta;
}

// ── Input types for creation / update ───────────────────────────────────────

/**
 * Input for creating a new ImportanceUnit.
 * Fields with defaults are optional.
 */
export interface CreateUnitInput {
  /** Medicine Wheel quadrant alignment */
  direction: DirectionName;
  /** Relational origin dimension */
  source: EpistemicSource;
  /** The relational meaning of this unit */
  summary: string;
  /** Original unprocessed input (preserves the voice) */
  rawInput?: string;
  /** Agent or person creating this unit */
  createdBy: string;
  /** Which of Wilson's four pillars this unit addresses */
  axiologicalPillar?: AxiologicalPillar;
  /** Reference to the parent inquiry */
  inquiryRef?: string;
  /** Initial accountability links */
  accountabilityLinks?: AccountabilityLink[];
  /** COAIA trace ID */
  traceId?: string;
}

/**
 * Input for updating an existing ImportanceUnit.
 * All fields optional — only provided fields are updated.
 */
export interface UpdateUnitInput {
  /** Updated quadrant alignment */
  direction?: DirectionName;
  /** Updated content summary */
  summary?: string;
  /** Updated axiological pillar */
  axiologicalPillar?: AxiologicalPillar;
  /** Updated inquiry reference */
  inquiryRef?: string;
}
