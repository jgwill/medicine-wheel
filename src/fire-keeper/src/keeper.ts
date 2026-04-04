/**
 * medicine-wheel-fire-keeper — Fire Keeper Class
 *
 * The core coordination engine. The Fire Keeper tends the ceremony fire,
 * receives and evaluates ImportanceUnits, gates work through relational
 * conditions, and issues stop-work orders when accountability is violated.
 *
 * The Fire Keeper does not write code or produce artifacts directly.
 * It receives, evaluates, routes, and gates the work of sub-agents.
 */

import type { DirectionName } from 'medicine-wheel-ontology-core';
import type {
  FireKeeperConfig,
  FireKeeperState,
  FireKeeperContext,
  CeremonyStateExtended,
  StopWorkOrder,
  PermissionTier,
} from './types.js';
import type {
  ImportanceAcceptedMessage,
  ImportanceHeldMessage,
  DeepenRequestedMessage,
  StopWorkOrderMessage,
  HumanNeededMessage,
} from './messages.js';
import { evaluateGates } from './gating.js';
import { humanNeeded } from './decisions.js';
import { relationalCheckBack } from './check-back.js';
import { trajectoryConfidence } from './trajectory.js';
import { CeremonyStateManager, createCeremonyState } from './ceremony-state.js';

// ── Importance Evaluation Result ────────────────────────────────────────────

/** Result of evaluating an ImportanceUnit */
export type ImportanceEvaluationResult =
  | ImportanceAcceptedMessage
  | ImportanceHeldMessage
  | DeepenRequestedMessage
  | HumanNeededMessage;

// ── Fire Keeper Class ───────────────────────────────────────────────────────

/**
 * The Fire Keeper — ceremony coordination agent.
 * Tends the fire so the ceremony can proceed with relational integrity.
 */
export class FireKeeper {
  private config: FireKeeperConfig;
  private state: FireKeeperState;
  private managers: Map<string, CeremonyStateManager> = new Map();

  constructor(config: FireKeeperConfig) {
    this.config = config;
    this.state = {
      active: false,
      ceremonies: {},
      currentTier: 'observe',
      activeStopWorkOrders: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /** Get the current Fire Keeper state */
  getState(): FireKeeperState {
    return { ...this.state };
  }

  /**
   * Begin tending a ceremony for a given inquiry.
   * @param inquiryRef - Reference to the inquiry
   * @param startDirection - Initial direction (default: east)
   */
  beginCeremony(
    inquiryRef: string,
    startDirection: DirectionName = 'east',
  ): CeremonyStateExtended {
    const ceremonyState = createCeremonyState(inquiryRef, startDirection);
    this.state.ceremonies[inquiryRef] = ceremonyState;
    this.state.active = true;
    this.state.lastUpdated = new Date().toISOString();

    const manager = new CeremonyStateManager(ceremonyState);
    this.managers.set(inquiryRef, manager);

    return ceremonyState;
  }

  /**
   * Evaluate an incoming ImportanceUnit against gating conditions,
   * ceremony state, and relational check-back protocol.
   * @param unit - The ImportanceUnit payload
   * @param inquiryRef - Reference to the active inquiry
   */
  evaluateImportance(
    unit: Record<string, unknown>,
    inquiryRef: string,
  ): ImportanceEvaluationResult {
    const ceremonyState = this.state.ceremonies[inquiryRef];
    if (!ceremonyState) {
      return {
        type: 'importance.held',
        payload: {
          unitId: (unit['id'] as string) || 'unknown',
          reason: `No active ceremony for inquiry: ${inquiryRef}`,
          unsatisfiedConditions: [],
          suggestedAction: 'Begin a ceremony before submitting importance units',
        },
      };
    }

    const context = this.buildContext(inquiryRef, unit);

    // Evaluate gating conditions
    const gateResult = evaluateGates(this.config.gatingConditions, context);
    if (!gateResult.allSatisfied) {
      return {
        type: 'importance.held',
        payload: {
          unitId: (unit['id'] as string) || 'unknown',
          reason: 'Gating conditions not satisfied',
          unsatisfiedConditions: gateResult.unsatisfied.map((s) => ({
            condition: s.condition,
            satisfied: s.satisfied,
          })),
          suggestedAction: 'Satisfy all required gating conditions before proceeding',
        },
      };
    }

    // Relational check-back
    const checkBack = relationalCheckBack(
      `Evaluate importance unit: ${(unit['title'] as string) || 'untitled'}`,
      context,
    );
    if (!checkBack.approved) {
      const failedStep = checkBack.steps.find((s) => !s.passed);
      return {
        type: 'importance.held',
        payload: {
          unitId: (unit['id'] as string) || 'unknown',
          reason: checkBack.summary,
          unsatisfiedConditions: checkBack.steps
            .filter((s) => !s.passed)
            .map((s) => ({ condition: s.question, satisfied: false })),
          suggestedAction: failedStep?.reason || 'Address relational check-back concerns',
        },
      };
    }

    // Check if human decision is needed
    const decision = humanNeeded(
      context,
      this.config.humanDecisionPoints,
      this.config.trajectoryThreshold,
    );
    if (decision.needed) {
      return {
        type: 'human.needed',
        payload: {
          requestId: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          reason: decision.reason || 'Human decision required',
          decisionType: decision.decisionType || 'value-conflict',
          context: {
            unitId: (unit['id'] as string) || undefined,
            summary: `ImportanceUnit evaluation requires human input: ${decision.reason}`,
            options: ['approve', 'deepen', 'hold', 'reject'],
          },
          suggestedModality: 'protocol',
        },
      };
    }

    // Unit accepted
    const direction = (unit['direction'] as DirectionName) || ceremonyState.activeDirection;
    return {
      type: 'importance.accepted',
      payload: {
        unitId: (unit['id'] as string) || 'unknown',
        assignedDirection: direction,
        gatingStatus: 'all-satisfied',
      },
    };
  }

  /**
   * Check the current ceremony state for a given inquiry.
   * @param inquiryRef - Reference to the inquiry
   */
  checkCeremonyState(inquiryRef: string): CeremonyStateExtended | null {
    return this.state.ceremonies[inquiryRef] || null;
  }

  /**
   * Request that a participant deepen their work in a specific direction.
   * @param unitId - The ImportanceUnit to deepen
   * @param direction - Direction to return to
   * @param guidance - Guidance for the deepening
   */
  requestDeepening(
    unitId: string,
    direction: DirectionName,
    guidance: string,
  ): DeepenRequestedMessage {
    return {
      type: 'deepen.requested',
      payload: {
        unitId,
        currentCircleDepth: 0,
        missingQuadrants: this.getMissingQuadrants(direction),
        guidance,
      },
    };
  }

  /**
   * Issue a stop-work order when relational accountability is violated.
   * This is an emergency halt — the Fire Keeper's most serious action.
   * @param targetAgentId - Agent to halt
   * @param reason - Reason for the stop work order
   * @param unitId - Related ImportanceUnit, if any
   */
  issueStopWork(
    targetAgentId: string,
    reason: string,
    unitId: string | null = null,
  ): StopWorkOrderMessage {
    const order: StopWorkOrder = {
      targetAgentId,
      reason,
      unitId,
      resumeCondition: 'Human review required via human.needed',
    };

    this.state.activeStopWorkOrders.push(order);
    this.state.lastUpdated = new Date().toISOString();

    return {
      type: 'stopwork.order',
      payload: {
        targetAgentId: order.targetAgentId,
        reason: order.reason,
        unitId: order.unitId,
        resumeCondition: order.resumeCondition,
      },
    };
  }

  /**
   * Verify Wilson alignment across the current ceremony.
   * Checks trajectory confidence, gating conditions, and relational milestones.
   * @param inquiryRef - Reference to the inquiry
   */
  checkRelationalAlignment(inquiryRef: string): RelationalAlignmentResult {
    const ceremonyState = this.state.ceremonies[inquiryRef];
    if (!ceremonyState) {
      return {
        aligned: false,
        confidence: 0,
        issues: [`No active ceremony for inquiry: ${inquiryRef}`],
      };
    }

    const confidence = trajectoryConfidence(ceremonyState.trajectoryHistory);
    const unsatisfiedGates = ceremonyState.gatingConditions.filter(
      (g) => !g.satisfied,
    );
    const incompleteMilestones = ceremonyState.relationalMilestones.filter(
      (m) => !m.complete,
    );

    const issues: string[] = [];

    if (confidence < this.config.trajectoryThreshold) {
      issues.push(
        `Trajectory confidence (${confidence.toFixed(2)}) below threshold (${this.config.trajectoryThreshold})`,
      );
    }

    if (unsatisfiedGates.length > 0) {
      issues.push(
        `${unsatisfiedGates.length} unsatisfied gating condition(s)`,
      );
    }

    if (this.state.activeStopWorkOrders.length > 0) {
      issues.push(
        `${this.state.activeStopWorkOrders.length} active stop-work order(s)`,
      );
    }

    return {
      aligned: issues.length === 0,
      confidence,
      issues,
      unsatisfiedGates: unsatisfiedGates.map((g) => g.condition),
      incompleteMilestones: incompleteMilestones.map((m) => m.milestone),
      activeStopWorkOrders: this.state.activeStopWorkOrders.length,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private buildContext(
    inquiryRef: string,
    unit?: Record<string, unknown>,
  ): FireKeeperContext {
    return {
      ceremonyState: this.state.ceremonies[inquiryRef],
      unitId: unit ? (unit['id'] as string) : undefined,
      wilsonAlignment: this.estimateWilsonAlignment(inquiryRef),
      ocapCompliant: true,
      metadata: unit,
    };
  }

  private estimateWilsonAlignment(inquiryRef: string): number {
    const ceremony = this.state.ceremonies[inquiryRef];
    if (!ceremony) return 0;
    return trajectoryConfidence(ceremony.trajectoryHistory);
  }

  private getMissingQuadrants(
    currentDirection: DirectionName,
  ): DirectionName[] {
    const all: DirectionName[] = ['east', 'south', 'west', 'north'];
    return all.filter((d) => d !== currentDirection);
  }
}

// ── Relational Alignment Result ─────────────────────────────────────────────

/** Result of a relational alignment check */
export interface RelationalAlignmentResult {
  /** Whether the ceremony is relationally aligned */
  aligned: boolean;
  /** Current trajectory confidence */
  confidence: number;
  /** Issues found during alignment check */
  issues: string[];
  /** Unsatisfied gating conditions */
  unsatisfiedGates?: string[];
  /** Incomplete relational milestones */
  incompleteMilestones?: string[];
  /** Number of active stop-work orders */
  activeStopWorkOrders?: number;
}
