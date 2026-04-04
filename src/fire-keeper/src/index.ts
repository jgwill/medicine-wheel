/**
 * medicine-wheel-fire-keeper
 *
 * The Fire Keeper coordination agent for Medicine Wheel.
 * Tends the ceremony fire, ensures relational integrity through gating
 * conditions, and maintains Wilson alignment as an active agent.
 *
 * The Fire Keeper does not write code or produce artifacts directly.
 * It receives, evaluates, routes, and gates the work of sub-agents.
 *
 * @packageDocumentation
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type {
  CeremonyPhaseExtended,
  QuadrantStatus,
  FireKeeperContext,
  GatingCondition,
  GatingConditionStatus,
  PermissionTier,
  DecisionPointType,
  DecisionPoint,
  TrajectoryCheckpoint,
  RelationalMilestone,
  StopWorkOrder,
  CeremonyStateExtended,
  FireKeeperConfig,
  FireKeeperState,
} from './types.js';

// ── Message Types ───────────────────────────────────────────────────────────

export type {
  ImportanceSubmittedMessage,
  CircleReturnMessage,
  AgentReportMessage,
  HumanResponseMessage,
  ImportanceAcceptedMessage,
  ImportanceHeldMessage,
  DeepenRequestedMessage,
  HumanNeededMessage,
  CeremonyStateUpdateMessage,
  StopWorkOrderMessage,
  FireKeeperMessage,
} from './messages.js';

// ── Fire Keeper ─────────────────────────────────────────────────────────────

export { FireKeeper } from './keeper.js';
export type { ImportanceEvaluationResult, RelationalAlignmentResult } from './keeper.js';

// ── Gating ──────────────────────────────────────────────────────────────────

export {
  evaluateGates,
  createGate,
  resolveHold,
  GATE_WILSON_ALIGNMENT,
  GATE_OCAP_COMPLIANCE,
  GATE_CEREMONY_PHASE,
  DEFAULT_GATES,
} from './gating.js';
export type { GateEvaluationResult } from './gating.js';

// ── Decisions ───────────────────────────────────────────────────────────────

export { humanNeeded, permissionEscalation, circleReview } from './decisions.js';
export type {
  HumanDecisionResult,
  EscalationResult,
  CircleReviewResult,
} from './decisions.js';

// ── Check-Back Protocol ─────────────────────────────────────────────────────

export { relationalCheckBack } from './check-back.js';
export type { CheckBackStep, CheckBackResult } from './check-back.js';

// ── Ceremony State ──────────────────────────────────────────────────────────

export { CeremonyStateManager, createCeremonyState } from './ceremony-state.js';
export type { CompletionReadiness } from './ceremony-state.js';

// ── Trajectory ──────────────────────────────────────────────────────────────

export { trajectoryConfidence, valueDivergenceDetect } from './trajectory.js';
export type { DivergenceResult } from './trajectory.js';
