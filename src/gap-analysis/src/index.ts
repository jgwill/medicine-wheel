/**
 * @medicine-wheel/gap-analysis
 *
 * The fire path, built properly and without apology.
 *
 * When something worked and stopped working, closing the difference between
 * current and prior state is the correct move. Oscillation back to a baseline
 * is the goal when you are below the baseline. This package exists so that
 * work has a real instrument instead of a euphemism.
 *
 * It carries one question at its door — is a prior state actually being
 * restored? — and asks it through `@medicine-wheel/creative-orientation`.
 * It **advises and proceeds**. It never refuses. A package that blocks you is
 * a package you learn to route around.
 *
 * @packageDocumentation
 */
import {
  readOrientation,
  worthSaying,
  type OrientationReading,
  type SituationClaim,
} from '@medicine-wheel/creative-orientation';

export interface Baseline {
  /** The state being restored, described concretely. */
  description: string;
  /** Evidence it existed — a date, a commit, a reading, a receipt. */
  evidence: string;
}

export interface Observation {
  /** What is true now, stated as measurement rather than interpretation. */
  description: string;
  /** Where this reading came from. */
  source?: string;
}

export interface EliminationStep {
  action: string;
  /** How you will know this step worked. */
  verifiedBy: string;
  done?: boolean;
}

export interface GapAnalysis {
  id: string;
  baseline: Baseline;
  current: Observation;
  /** What is missing or wrong, derived from the two states above. */
  difference: string;
  rootCause?: string;
  steps: EliminationStep[];
  opened: string;
  /**
   * The orientation reading taken when this analysis was opened. Kept on the
   * record so a later reader can see whether the instrument suited the
   * situation, rather than having to reconstruct it.
   */
  orientation: OrientationReading;
}

export interface OpenGapOptions {
  id?: string;
  idFactory?: () => string;
  timestamp?: string;
}

function defaultId(): string {
  return `gap:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Open a gap analysis.
 *
 * A baseline with evidence is required, and that requirement is the whole
 * point: it is the question that separates a fire from a creating act. If you
 * cannot name a state that existed, the returned analysis carries advice
 * saying so — and is still returned, because the caller may know something
 * this check does not.
 */
export function openGapAnalysis(
  baseline: Baseline,
  current: Observation,
  difference: string,
  options: OpenGapOptions = {},
): GapAnalysis {
  if (!baseline.description?.trim()) {
    throw new Error(
      'A gap analysis needs a baseline — the state you are restoring. Without one there is ' +
        'nothing to close toward, and the situation is a creating act rather than a repair.',
    );
  }
  if (!current.description?.trim()) {
    throw new Error('A gap analysis needs an observation of what is true now.');
  }

  const claim: SituationClaim = {
    outcome: difference,
    restores: baseline.description,
    evidence: baseline.evidence,
  };

  return {
    id: options.id ?? (options.idFactory ? options.idFactory() : defaultId()),
    baseline,
    current,
    difference,
    steps: [],
    opened: options.timestamp ?? new Date().toISOString(),
    orientation: readOrientation(claim),
  };
}

/** Add a step, with the check that makes it verifiable rather than hopeful. */
export function addStep(analysis: GapAnalysis, step: EliminationStep): GapAnalysis {
  if (!step.verifiedBy?.trim()) {
    throw new Error(
      `Step "${step.action}" has no verification. An elimination step you cannot check is a ` +
        'wish; the fire is out only when something says so.',
    );
  }
  return { ...analysis, steps: [...analysis.steps, step] };
}

export function markDone(analysis: GapAnalysis, action: string): GapAnalysis {
  return {
    ...analysis,
    steps: analysis.steps.map(s => (s.action === action ? { ...s, done: true } : s)),
  };
}

/** Closed when every step is done. Says nothing about whether it was the right analysis. */
export function isClosed(analysis: GapAnalysis): boolean {
  return analysis.steps.length > 0 && analysis.steps.every(s => s.done === true);
}

/**
 * The advice to surface at the door, if any.
 *
 * Returns null when the situation and the instrument agree — advice on
 * correctly-framed work is noise, and noise is how checks get switched off.
 */
export function doorAdvice(analysis: GapAnalysis): string | null {
  return worthSaying(analysis.orientation) ? analysis.orientation.advice ?? null : null;
}
