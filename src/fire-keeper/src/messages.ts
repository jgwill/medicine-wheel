/**
 * medicine-wheel-fire-keeper — Message Types
 *
 * A2A message type definitions for Fire Keeper communication.
 * All messages flow through the message broker; the Fire Keeper
 * is the primary consumer and producer of these message types.
 */

import type { DirectionName } from 'medicine-wheel-ontology-core';
import type { DecisionPointType, GatingConditionStatus } from './types.js';

// ── Messages the Fire Keeper Receives ───────────────────────────────────────

/** A sub-agent submits a new ImportanceUnit for evaluation */
export interface ImportanceSubmittedMessage {
  type: 'importance.submitted';
  payload: {
    /** The ImportanceUnit payload (schema-conformant) */
    unit: Record<string, unknown>;
  };
}

/** A sub-agent signals it has circled back with new depth */
export interface CircleReturnMessage {
  type: 'circle.return';
  payload: {
    /** The ImportanceUnit being circled */
    unitId: string;
    /** New circle depth after this return */
    newCircleDepth: number;
    /** What changed or deepened in this pass */
    shift: string;
    /** Direction of the circle return */
    direction: DirectionName;
    /** Source modality */
    source: string;
  };
}

/** Periodic status from a working sub-agent */
export interface AgentReportMessage {
  type: 'agent.report';
  payload: {
    /** Reporting agent identifier */
    agentId: string;
    /** Current direction the agent is working in */
    currentDirection: DirectionName;
    /** Active ImportanceUnit IDs */
    activeUnits: string[];
    /** Agent's self-assessed trajectory confidence (0–1) */
    trajectoryConfidence: number;
    /** Flags indicating potential value divergence */
    valueDivergenceFlags: string[];
  };
}

/** The human responds to a human.needed request */
export interface HumanResponseMessage {
  type: 'human.response';
  payload: {
    /** Matches the original human.needed requestId */
    requestId: string;
    /** The human's decision */
    decision: string;
    /** Modality chosen by the human */
    modality: string;
    /** Optional additional context */
    additionalContext: string | null;
  };
}

// ── Messages the Fire Keeper Sends ──────────────────────────────────────────

/** The submitted ImportanceUnit passes gating conditions */
export interface ImportanceAcceptedMessage {
  type: 'importance.accepted';
  payload: {
    /** The accepted unit's ID */
    unitId: string;
    /** Direction assigned for this unit's work */
    assignedDirection: DirectionName;
    /** Summary of gating evaluation */
    gatingStatus: string;
  };
}

/** The unit cannot proceed — a gating condition is unsatisfied */
export interface ImportanceHeldMessage {
  type: 'importance.held';
  payload: {
    /** The held unit's ID */
    unitId: string;
    /** Reason for the hold */
    reason: string;
    /** Which conditions were not satisfied */
    unsatisfiedConditions: Array<{ condition: string; satisfied: boolean }>;
    /** Suggested action to resolve the hold */
    suggestedAction: string;
  };
}

/** Fire Keeper asks a sub-agent to circle back for more depth */
export interface DeepenRequestedMessage {
  type: 'deepen.requested';
  payload: {
    /** The unit needing deeper work */
    unitId: string;
    /** Current circle depth */
    currentCircleDepth: number;
    /** Quadrants not yet visited */
    missingQuadrants: DirectionName[];
    /** Guidance for the sub-agent */
    guidance: string;
  };
}

/** A decision point requires the human in the loop */
export interface HumanNeededMessage {
  type: 'human.needed';
  payload: {
    /** Unique request identifier */
    requestId: string;
    /** Why human involvement is needed */
    reason: string;
    /** Type of decision required */
    decisionType: DecisionPointType;
    /** Context for the decision */
    context: {
      unitId?: string;
      summary: string;
      options: string[];
    };
    /** Suggested modality for the work */
    suggestedModality: string;
  };
}

/** Broadcast ceremony state change to all sub-agents */
export interface CeremonyStateUpdateMessage {
  type: 'ceremony.state.update';
  payload: {
    /** Inquiry reference */
    inquiryRef: string;
    /** Currently active quadrant */
    activeQuadrant: DirectionName;
    /** Quadrants that have been completed */
    quadrantsCompleted: DirectionName[];
    /** Total ImportanceUnits in play */
    totalUnits: number;
    /** Number of completed relational circles */
    completedCircles: number;
    /** Overall trajectory confidence (0–1) */
    overallTrajectoryConfidence: number;
    /** Current gating condition statuses */
    activeGatingConditions: Array<{ condition: string; satisfied: boolean }>;
  };
}

/** Emergency halt — a sub-agent's trajectory has diverged from core values */
export interface StopWorkOrderMessage {
  type: 'stopwork.order';
  payload: {
    /** Target agent to halt */
    targetAgentId: string;
    /** Reason for the stop work order */
    reason: string;
    /** ImportanceUnit involved, if any */
    unitId: string | null;
    /** Condition for resuming work */
    resumeCondition: string;
  };
}

// ── Union Type ──────────────────────────────────────────────────────────────

/** Union of all Fire Keeper message types */
export type FireKeeperMessage =
  | ImportanceSubmittedMessage
  | CircleReturnMessage
  | AgentReportMessage
  | HumanResponseMessage
  | ImportanceAcceptedMessage
  | ImportanceHeldMessage
  | DeepenRequestedMessage
  | HumanNeededMessage
  | CeremonyStateUpdateMessage
  | StopWorkOrderMessage;
