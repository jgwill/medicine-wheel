/**
 * medicine-wheel-fire-keeper — Trajectory Analysis
 *
 * Assesses whether the ceremony is on track by analyzing trajectory
 * history and detecting value divergence. The Fire Keeper uses these
 * signals to decide when human intervention is needed.
 */

import type { TrajectoryCheckpoint } from './types.js';

// ── Trajectory Confidence ───────────────────────────────────────────────────

/**
 * Compute overall trajectory confidence from a history of checkpoints.
 * Returns a score between 0 and 1 indicating how confident we are
 * that the ceremony is aligned with its intended values.
 *
 * Algorithm:
 * - Weighted average favoring recent checkpoints
 * - Penalizes declining trends
 * - Empty history returns 0.5 (neutral)
 *
 * @param history - Array of trajectory checkpoints
 * @returns Confidence score between 0 and 1
 */
export function trajectoryConfidence(history: TrajectoryCheckpoint[]): number {
  if (history.length === 0) return 0.5;
  if (history.length === 1) return history[0].confidence;

  // Weighted average: more recent checkpoints count more
  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < history.length; i++) {
    const weight = i + 1; // Linear increasing weight
    weightedSum += history[i].confidence * weight;
    weightTotal += weight;
  }

  const weightedAvg = weightedSum / weightTotal;

  // Trend penalty: if confidence is declining, reduce the score
  const recent = history.slice(-3);
  if (recent.length >= 2) {
    const trend = recent[recent.length - 1].confidence - recent[0].confidence;
    if (trend < 0) {
      // Apply a penalty proportional to the decline
      const penalty = Math.abs(trend) * 0.2;
      return Math.max(0, Math.min(1, weightedAvg - penalty));
    }
  }

  return Math.max(0, Math.min(1, weightedAvg));
}

// ── Value Divergence Detection ──────────────────────────────────────────────

/** Result of value divergence analysis */
export interface DivergenceResult {
  /** Whether divergence was detected */
  diverged: boolean;
  /** Magnitude of the divergence (0–1, where 1 is maximum divergence) */
  magnitude: number;
  /** Human-readable description of the divergence */
  description: string;
  /** Suggested corrective action */
  suggestedAction: string;
}

/**
 * Detect when the ceremony's trajectory diverges from its intended values.
 * Compares current trajectory confidence against the intended confidence
 * established at ceremony inception.
 *
 * @param current - Current trajectory confidence (0–1)
 * @param intended - Intended/baseline trajectory confidence (0–1)
 * @param threshold - Divergence threshold before flagging (default: 0.15)
 * @returns Divergence analysis result
 */
export function valueDivergenceDetect(
  current: number,
  intended: number,
  threshold: number = 0.15,
): DivergenceResult {
  const magnitude = Math.abs(current - intended);
  const diverged = magnitude > threshold;

  if (!diverged) {
    return {
      diverged: false,
      magnitude,
      description: `Trajectory within acceptable range (divergence: ${magnitude.toFixed(3)})`,
      suggestedAction: 'Continue current trajectory',
    };
  }

  const declining = current < intended;

  return {
    diverged: true,
    magnitude,
    description: declining
      ? `Trajectory declining — current confidence (${current.toFixed(2)}) is ${magnitude.toFixed(2)} below intended (${intended.toFixed(2)})`
      : `Trajectory shifted — current confidence (${current.toFixed(2)}) differs from intended (${intended.toFixed(2)}) by ${magnitude.toFixed(2)}`,
    suggestedAction: declining
      ? 'Consider pausing for relational check-back or requesting human guidance'
      : 'Review whether trajectory shift reflects genuine deepening or drift',
  };
}
