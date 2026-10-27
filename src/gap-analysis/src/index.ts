/**
 * @medicine-wheel/gap-analysis
 *
 * A gap analysis looks for what is missing. It measures an observation against
 * a baseline that existed, names the difference, and lists elimination steps
 * that can be verified. That technique can be useful, for instance when
 * something worked and stopped. It is not part of the creative orientation.
 *
 * The package has a second job, and it is the main one: to teach the model
 * using it. A model that has found what is missing is pulled toward filling
 * each missing item. `turnToCreativeOrientation` comes after the analysis. It
 * keeps the findings as current reality, names that pull, and asks for the
 * desired outcome on its own terms, so that a structural tension chart can
 * follow.
 *
 * It carries one question at its door (is a prior state actually being
 * restored?) and asks it through `@medicine-wheel/creative-orientation`.
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

// ─── The turn to the creative orientation ─────────────────────────

/** One finding of an analysis, kept as a fact about today. */
export interface CurrentRealityFact {
  /**
   * The part of the analysis the fact comes from. A check's findings arrive as
   * `finding`, and the holds it keeps as `hold`.
   */
  from:
    | 'observation'
    | 'baseline'
    | 'difference'
    | 'root-cause'
    | 'step-done'
    | 'steps-open'
    | 'finding'
    | 'hold';
  /** The fact, stated about today. Never phrased as a task. */
  fact: string;
}

/**
 * What a check found, as the check returns it: a validator, an audit, a
 * coverage reading. A check has no baseline that existed; it reads a plan or a
 * graph as it is today and says what it does not find there.
 */
export interface CheckFindings {
  /** The check that produced the findings, e.g. `accountability_validator`. */
  check: string;
  /** Each finding, stated as a fact about the plan or the graph today. */
  findings: string[];
  /**
   * What must be in place before the work continues, as the check states it:
   * community review, consent, governance. A hold is kept as it is. It is
   * reached with the community, not filled in, and it is never turned into a
   * task.
   */
  holds?: string[];
}

/** True when the input is a check's findings rather than a gap analysis. */
export function isCheckFindings(input: unknown): input is CheckFindings {
  return (
    !!input &&
    typeof input === 'object' &&
    typeof (input as CheckFindings).check === 'string' &&
    Array.isArray((input as CheckFindings).findings)
  );
}

export interface TurnOptions {
  /**
   * What we want to create, stated as something that will exist. It is named
   * on its own terms and is not derived from the findings. Without it, the
   * turn asks for it.
   */
  desiredOutcome?: string;
}

/**
 * Input for `create_structural_tension_chart`, except the direction, which
 * the caller chooses.
 */
export interface ChartDraft {
  desired_outcome: string;
  current_reality: string;
  /** Always empty: no action step is taken from the findings. */
  action_steps: string[];
}

export interface TurnNextStep {
  tool: 'create_structural_tension_chart';
  /** What the chart still needs before it can be created. */
  needs: Array<'desired_outcome' | 'direction'>;
  /** The question the desired outcome answers. */
  question: string;
}

export interface CreativeOrientationTurn {
  /** The analysis's id, or `check:<name>` when the input was a check's findings. */
  analysisId: string;
  /** The findings, as facts about today. */
  currentReality: CurrentRealityFact[];
  /** Names the pull to fill each missing item, and says that is not what we are doing. */
  reflection: string;
  nextStep: TurnNextStep;
  /** Present only when a desired outcome was given. */
  chartDraft?: ChartDraft;
  /** Present when the desired outcome given is phrased as removing something. */
  desiredOutcomeAdvice?: string;
}

export const DESIRED_OUTCOME_QUESTION =
  'What do we want to create, stated as something that will exist?' as const;

function asSentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function withNote(text: string, label: string, note?: string): string {
  const base = text.trim().replace(/[.]$/, '');
  return note?.trim() ? `${base} (${label}: ${note.trim()}).` : `${base}.`;
}

function findingsAsFacts(analysis: GapAnalysis): CurrentRealityFact[] {
  const facts: CurrentRealityFact[] = [
    { from: 'observation', fact: `Observed now: ${withNote(analysis.current.description, 'source', analysis.current.source)}` },
    { from: 'baseline', fact: `Before: ${withNote(analysis.baseline.description, 'evidence', analysis.baseline.evidence)}` },
    { from: 'difference', fact: `The analysis found: ${asSentence(analysis.difference)}` },
  ];
  if (analysis.rootCause?.trim()) {
    facts.push({ from: 'root-cause', fact: `Named cause: ${asSentence(analysis.rootCause)}` });
  }
  const steps = analysis.steps ?? [];
  for (const step of steps.filter(s => s.done === true)) {
    facts.push({ from: 'step-done', fact: `Done: ${withNote(step.action, 'verified by', step.verifiedBy)}` });
  }
  const open = steps.filter(s => s.done !== true).length;
  if (open > 0) {
    facts.push({
      from: 'steps-open',
      fact: `The analysis lists ${open} open elimination step${open === 1 ? '' : 's'}. They stay with the analysis and are not carried into a chart.`,
    });
  }
  return facts;
}

function checkFindingsAsFacts(input: CheckFindings): CurrentRealityFact[] {
  const facts: CurrentRealityFact[] = input.findings
    .filter(f => typeof f === 'string' && f.trim())
    .map(f => ({ from: 'finding' as const, fact: asSentence(f) }));
  for (const hold of input.holds ?? []) {
    if (typeof hold === 'string' && hold.trim()) facts.push({ from: 'hold', fact: asSentence(hold) });
  }
  return facts;
}

function reflectionForCheck(input: CheckFindings): string {
  const n = input.findings.filter(f => typeof f === 'string' && f.trim()).length;
  const holds = (input.holds ?? []).some(h => typeof h === 'string' && h.trim());
  return [
    `The check ${input.check} found what is missing: ${n} finding${n === 1 ? '' : 's'}, each a fact about the plan or the graph today.`,
    'The pull now is to fill each missing item, one task per item, until nothing is missing. That is not what we are doing.',
    'The findings are kept as current reality, stated as fact. They are not a list of tasks.',
    ...(holds
      ? ['The holds stay as the check states them: they say what must be in place before the work continues. They are reached with the community, not filled in, and consent is the community\'s to give.']
      : []),
    `Next comes the desired outcome, named on its own terms. ${DESIRED_OUTCOME_QUESTION} It does not come from the findings.`,
    'Then a structural tension chart holds current reality and the desired outcome, and its action steps resolve the tension toward that outcome. Some findings will matter to it, and others will not.',
  ].join(' ');
}

function reflectionFor(analysis: GapAnalysis): string {
  return [
    `This gap analysis found what is missing: ${asSentence(analysis.difference)}`,
    'The pull now is to fill each missing item, one task per item, until nothing is missing. That is not what we are doing.',
    'The findings are kept as current reality, stated as fact. They are not a list of tasks.',
    `Next comes the desired outcome, named on its own terms. ${DESIRED_OUTCOME_QUESTION} It does not come from the findings.`,
    'Then a structural tension chart holds current reality and the desired outcome, and its action steps resolve the tension toward that outcome. Some findings will matter to it, and others will not.',
  ].join(' ');
}

/**
 * The turn after a gap analysis, or after a check that reports what it did
 * not find.
 *
 * Returns the findings as current-reality facts (never as tasks), the
 * reflection that names the pull to fill each missing item, and the next step:
 * `create_structural_tension_chart`, which needs a desired outcome. With a
 * desired outcome, it also returns a draft chart input whose action steps are
 * empty, because no action step is taken from the findings.
 *
 * A check's findings (`CheckFindings`) turn the same way. Its holds are kept
 * as current reality beside the findings, as the check states them.
 *
 * It advises and proceeds. A desired outcome phrased as removing something is
 * still placed in the draft, with advice beside it.
 */
export function turnToCreativeOrientation(
  analysis: GapAnalysis | CheckFindings,
  options: TurnOptions = {},
): CreativeOrientationTurn {
  let analysisId: string;
  let currentReality: CurrentRealityFact[];
  let reflection: string;

  if (isCheckFindings(analysis)) {
    if (!analysis.check.trim() || !analysis.findings.some(f => typeof f === 'string' && f.trim())) {
      throw new Error('The turn needs a check\'s findings: the check\'s name and at least one finding.');
    }
    analysisId = `check:${analysis.check.trim()}`;
    currentReality = checkFindingsAsFacts(analysis);
    reflection = reflectionForCheck(analysis);
  } else {
    if (
      !analysis ||
      typeof analysis.difference !== 'string' ||
      !analysis.current?.description?.trim() ||
      !analysis.baseline?.description?.trim()
    ) {
      throw new Error(
        'The turn needs a gap analysis as openGapAnalysis returns it: baseline, current and difference.',
      );
    }
    analysisId = analysis.id;
    currentReality = findingsAsFacts(analysis);
    reflection = reflectionFor(analysis);
  }

  const desiredOutcome = options.desiredOutcome?.trim() || undefined;

  const turn: CreativeOrientationTurn = {
    analysisId,
    currentReality,
    reflection,
    nextStep: {
      tool: 'create_structural_tension_chart',
      needs: desiredOutcome ? ['direction'] : ['desired_outcome', 'direction'],
      question: DESIRED_OUTCOME_QUESTION,
    },
  };

  if (desiredOutcome) {
    turn.chartDraft = {
      desired_outcome: desiredOutcome,
      current_reality: currentReality.map(f => f.fact).join(' '),
      action_steps: [],
    };
    const reading = readOrientation({ outcome: desiredOutcome, restores: null });
    if (worthSaying(reading)) turn.desiredOutcomeAdvice = reading.advice;
  }

  return turn;
}
