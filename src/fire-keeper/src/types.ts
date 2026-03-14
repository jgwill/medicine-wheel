/**
 * medicine-wheel-fire-keeper — Type Definitions
 *
 * Types for the Fire Keeper coordination agent.
 * The Fire Keeper tends the ceremony fire, ensures relational integrity,
 * and maintains Wilson alignment as an active agent — not a passive metric.
 */

import type { DirectionName } from 'medicine-wheel-ontology-core';

// ── Ceremony Phase (Extended) ───────────────────────────────────────────────

/**
 * Extended ceremony phases reflecting the full lifecycle of a ceremony.
 * - gathering: Reading context, collecting materials, honoring what exists
 * - kindling: East work — establishing vision and intent
 * - tending: South/West work — analysis, validation, deepening
 * - harvesting: North work — producing grounded artifacts
 * - resting: Ceremony pause — integration period
 */
export type CeremonyPhaseExtended =
  | 'gathering'
  | 'kindling'
  | 'tending'
  | 'harvesting'
  | 'resting';

// ── Quadrant Status ─────────────────────────────────────────────────────────

/** Status of a single quadrant (direction) within the ceremony */
export interface QuadrantStatus {
  /** Whether this quadrant has been visited, is active, or is pending */
  status: 'pending' | 'active' | 'visited' | 'complete';
  /** Number of ImportanceUnits associated with this quadrant */
  unitCount: number;
  /** Deepest circle depth reached in this quadrant */
  deepestCircle: number;
  /** ISO timestamp of last visit, or null if never visited */
  lastVisited: string | null;
}

// ── Gating Conditions ───────────────────────────────────────────────────────

/** Context passed to gating condition evaluators */
export interface FireKeeperContext {
  /** Current ceremony state */
  ceremonyState: CeremonyStateExtended;
  /** The unit or action being evaluated */
  unitId?: string;
  /** Current Wilson alignment score (0–1) */
  wilsonAlignment?: number;
  /** OCAP compliance status */
  ocapCompliant?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** A condition that must be satisfied before ceremony work can proceed */
export interface GatingCondition {
  /** Human-readable description of the condition */
  condition: string;
  /** Whether this condition must be satisfied (vs. advisory) */
  required: boolean;
  /** Function that evaluates whether the condition is met */
  evaluator: (context: FireKeeperContext) => boolean;
}

/** Tracked status of a gating condition within ceremony state */
export interface GatingConditionStatus {
  /** Human-readable description of the condition */
  condition: string;
  /** Whether the condition has been satisfied */
  satisfied: boolean;
  /** ISO timestamp when satisfied, or null */
  satisfiedAt: string | null;
  /** Who/what satisfied the condition, or null */
  satisfiedBy: string | null;
}

// ── Permission Tiers ────────────────────────────────────────────────────────

/**
 * Permission tiers for agent escalation decisions.
 * - observe: Read files, gather context (no human required)
 * - analyze: Produce analysis, create ImportanceUnits (no human required)
 * - propose: Draft artifacts, suggest schemas (Fire Keeper reviews)
 * - act: Generate code, create commits, modify infrastructure (human required)
 */
export type PermissionTier = 'observe' | 'analyze' | 'propose' | 'act';

// ── Decision Points ─────────────────────────────────────────────────────────

/**
 * Types of decision points where human-in-the-loop is triggered.
 * - value-conflict: Trajectory diverges from values or gating override requested
 * - permission-escalation: Agent requests action beyond current tier
 * - circle-completion-review: All four quadrants visited — human confirms
 * - modality-choice: Work requires specific skills/modality selection
 */
export type DecisionPointType =
  | 'value-conflict'
  | 'permission-escalation'
  | 'circle-completion-review'
  | 'modality-choice';

/** A decision point that may require human involvement */
export interface DecisionPoint {
  /** Category of decision */
  type: DecisionPointType;
  /** Function that determines whether this decision point is triggered */
  trigger: (context: FireKeeperContext) => boolean;
  /** Whether human involvement is mandatory at this point */
  requiresHuman: boolean;
}

// ── Trajectory ──────────────────────────────────────────────────────────────

/** A checkpoint in the ceremony's trajectory history */
export interface TrajectoryCheckpoint {
  /** ISO timestamp */
  timestamp: string;
  /** Confidence score (0–1) that the ceremony is on track */
  confidence: number;
  /** Direction active at this checkpoint */
  direction: DirectionName;
  /** Human-readable note about what occurred */
  note: string;
}

// ── Relational Milestones ───────────────────────────────────────────────────

/** A milestone in the relational journey of the ceremony */
export interface RelationalMilestone {
  /** Human-readable description of the milestone */
  milestone: string;
  /** Whether the milestone has been achieved */
  complete: boolean;
  /** Which quadrants are required for this milestone */
  quadrantsRequired: DirectionName[];
  /** Which quadrants have been touched so far */
  quadrantsTouched: DirectionName[];
}

// ── Stop Work Order ─────────────────────────────────────────────────────────

/** Emergency halt order when relational accountability is violated */
export interface StopWorkOrder {
  /** Agent targeted by the stop work order */
  targetAgentId: string;
  /** Reason for the halt */
  reason: string;
  /** ImportanceUnit ID involved, if any */
  unitId: string | null;
  /** Condition that must be met before work can resume */
  resumeCondition: string;
}

// ── Ceremony State (Extended) ───────────────────────────────────────────────

/** Full ceremony state tracked by the Fire Keeper per active inquiry */
export interface CeremonyStateExtended {
  /** Reference to the active inquiry */
  inquiryRef: string;
  /** Current ceremony phase */
  ceremonyPhase: CeremonyPhaseExtended;
  /** Currently active direction */
  activeDirection: DirectionName;
  /** State of each quadrant */
  quadrantState: Record<DirectionName, QuadrantStatus>;
  /** Status of all gating conditions */
  gatingConditions: GatingConditionStatus[];
  /** Relational milestones for the ceremony */
  relationalMilestones: RelationalMilestone[];
  /** History of trajectory checkpoints */
  trajectoryHistory: TrajectoryCheckpoint[];
}

// ── Fire Keeper Configuration ───────────────────────────────────────────────

/** Configuration for the Fire Keeper agent */
export interface FireKeeperConfig {
  /** Minimum trajectory confidence before human intervention (default: 0.65) */
  trajectoryThreshold: number;
  /** Ordered permission tiers */
  permissionTiers: PermissionTier[];
  /** Gating conditions to enforce */
  gatingConditions: GatingCondition[];
  /** Decision points that trigger human-in-the-loop */
  humanDecisionPoints: DecisionPoint[];
}

// ── Fire Keeper State ───────────────────────────────────────────────────────

/** Runtime state of the Fire Keeper agent */
export interface FireKeeperState {
  /** Whether the Fire Keeper is actively tending a ceremony */
  active: boolean;
  /** Active ceremony states, keyed by inquiry reference */
  ceremonies: Record<string, CeremonyStateExtended>;
  /** Current permission tier of the Fire Keeper itself */
  currentTier: PermissionTier;
  /** Active stop work orders */
  activeStopWorkOrders: StopWorkOrder[];
  /** Timestamp of last state update */
  lastUpdated: string;
}
