/**
 * medicine-wheel-fire-keeper — Extended Ceremony State Management
 *
 * Manages the full lifecycle of ceremony state with extended phases:
 * gathering → kindling → tending → harvesting → resting.
 * Tracks quadrant status and detects completion readiness.
 */

import type { DirectionName } from 'medicine-wheel-ontology-core';
import type {
  CeremonyPhaseExtended,
  CeremonyStateExtended,
  QuadrantStatus,
  TrajectoryCheckpoint,
} from './types.js';

// ── Phase Order ─────────────────────────────────────────────────────────────

const EXTENDED_PHASE_ORDER: CeremonyPhaseExtended[] = [
  'gathering',
  'kindling',
  'tending',
  'harvesting',
  'resting',
];

// ── Ceremony State Manager ──────────────────────────────────────────────────

/** Manages extended ceremony state transitions and quadrant tracking */
export class CeremonyStateManager {
  private state: CeremonyStateExtended;

  constructor(state: CeremonyStateExtended) {
    this.state = { ...state };
  }

  /** Get the current ceremony state (immutable copy) */
  getState(): CeremonyStateExtended {
    return { ...this.state };
  }

  /**
   * Transition to the next ceremony phase with validation.
   * Phases must proceed in order: gathering → kindling → tending → harvesting → resting.
   * @returns The new phase, or null if transition is invalid
   */
  transitionPhase(): CeremonyPhaseExtended | null {
    const currentIdx = EXTENDED_PHASE_ORDER.indexOf(this.state.ceremonyPhase);
    if (currentIdx < 0 || currentIdx >= EXTENDED_PHASE_ORDER.length - 1) {
      return null;
    }

    if (!this.validateTransition(this.state.ceremonyPhase)) {
      return null;
    }

    const nextPhase = EXTENDED_PHASE_ORDER[currentIdx + 1];
    this.state.ceremonyPhase = nextPhase;

    this.state.trajectoryHistory.push({
      timestamp: new Date().toISOString(),
      confidence: this.computeCurrentConfidence(),
      direction: this.state.activeDirection,
      note: `Phase transition: ${EXTENDED_PHASE_ORDER[currentIdx]} → ${nextPhase}`,
    });

    return nextPhase;
  }

  /**
   * Update the status of a quadrant.
   * @param direction - The direction to update
   * @param updates - Partial quadrant status updates
   */
  updateQuadrant(
    direction: DirectionName,
    updates: Partial<QuadrantStatus>,
  ): void {
    const current = this.state.quadrantState[direction];
    this.state.quadrantState[direction] = { ...current, ...updates };

    if (updates.status === 'active') {
      this.state.activeDirection = direction;
    }
  }

  /**
   * Check if a relational circle is complete — all four quadrants visited.
   * A quadrant counts as visited when its status is 'visited' or 'complete'
   * and its deepest circle depth is >= 1.
   */
  checkCircleComplete(): boolean {
    const directions: DirectionName[] = ['east', 'south', 'west', 'north'];
    return directions.every((d) => {
      const q = this.state.quadrantState[d];
      return (
        (q.status === 'visited' || q.status === 'complete' || q.status === 'active') &&
        q.deepestCircle >= 1
      );
    });
  }

  /**
   * Detect whether the ceremony is ready to transition to the next phase.
   * Evaluates gating conditions, quadrant coverage, and trajectory health.
   */
  detectCompletionReadiness(): CompletionReadiness {
    const gatesOk = this.state.gatingConditions.every((g) => g.satisfied);
    const circleComplete = this.checkCircleComplete();
    const trajectoryOk = this.computeCurrentConfidence() >= 0.65;
    const milestonesComplete = this.state.relationalMilestones.every(
      (m) => m.complete,
    );

    const ready = gatesOk && trajectoryOk;
    const reasons: string[] = [];

    if (!gatesOk) reasons.push('Not all gating conditions satisfied');
    if (!circleComplete) reasons.push('Relational circle not complete');
    if (!trajectoryOk) reasons.push('Trajectory confidence below threshold');
    if (!milestonesComplete) reasons.push('Relational milestones incomplete');

    return {
      ready,
      circleComplete,
      gatesOk,
      trajectoryOk,
      milestonesComplete,
      blockers: reasons,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private validateTransition(currentPhase: CeremonyPhaseExtended): boolean {
    switch (currentPhase) {
      case 'gathering':
        // Foundational gating conditions must be satisfied
        return this.state.gatingConditions.some((g) => g.satisfied);
      case 'kindling':
        // Vision units must have some depth
        return this.state.quadrantState.east.deepestCircle >= 1;
      case 'tending':
        // Active work being refined
        return this.computeCurrentConfidence() >= 0.5;
      case 'harvesting':
        // Key units should have completed circles
        return this.checkCircleComplete() || this.computeCurrentConfidence() >= 0.7;
      default:
        return false;
    }
  }

  private computeCurrentConfidence(): number {
    const history = this.state.trajectoryHistory;
    if (history.length === 0) return 0.5;
    return history[history.length - 1].confidence;
  }
}

// ── Completion Readiness ────────────────────────────────────────────────────

/** Assessment of ceremony completion readiness */
export interface CompletionReadiness {
  /** Whether the ceremony is ready to advance */
  ready: boolean;
  /** Whether a full relational circle has been completed */
  circleComplete: boolean;
  /** Whether all gating conditions are satisfied */
  gatesOk: boolean;
  /** Whether trajectory confidence is acceptable */
  trajectoryOk: boolean;
  /** Whether all relational milestones are complete */
  milestonesComplete: boolean;
  /** List of blocking reasons */
  blockers: string[];
}

/**
 * Create a fresh extended ceremony state for a new inquiry.
 * @param inquiryRef - Reference to the inquiry
 * @param startDirection - Initial direction (default: east)
 */
export function createCeremonyState(
  inquiryRef: string,
  startDirection: DirectionName = 'east',
): CeremonyStateExtended {
  const emptyQuadrant: QuadrantStatus = {
    status: 'pending',
    unitCount: 0,
    deepestCircle: 0,
    lastVisited: null,
  };

  return {
    inquiryRef,
    ceremonyPhase: 'gathering',
    activeDirection: startDirection,
    quadrantState: {
      east: { ...emptyQuadrant },
      south: { ...emptyQuadrant },
      west: { ...emptyQuadrant },
      north: { ...emptyQuadrant },
    },
    gatingConditions: [],
    relationalMilestones: [],
    trajectoryHistory: [],
  };
}
