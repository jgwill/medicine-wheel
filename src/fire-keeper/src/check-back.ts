/**
 * medicine-wheel-fire-keeper — Relational Check-Back Protocol
 *
 * Four-step verification that runs before any autonomous action.
 * Ensures every action strengthens the relational web rather than
 * degrading it. Rooted in Wilson's relational accountability framework.
 */

import type { FireKeeperContext } from './types.js';

// ── Check-Back Result ───────────────────────────────────────────────────────

/** Result of a single check-back step */
export interface CheckBackStep {
  /** Step number (1–4) */
  step: number;
  /** Human-readable question for this step */
  question: string;
  /** Whether this step passed */
  passed: boolean;
  /** Explanation of the assessment */
  reason: string;
}

/** Full result of the relational check-back protocol */
export interface CheckBackResult {
  /** Whether the action is approved to proceed */
  approved: boolean;
  /** Results of all four steps */
  steps: CheckBackStep[];
  /** Summary of the check-back */
  summary: string;
}

// ── Check-Back Protocol ─────────────────────────────────────────────────────

/**
 * Execute the four-step relational check-back protocol.
 * Before any autonomous action, verify it strengthens the relational web.
 *
 * Step 1: Does this action honor existing relations?
 * Step 2: Does it strengthen the Spirit-Body relationship of the project?
 * Step 3: Is it accountable to all four directions?
 * Step 4: Would an Elder approve?
 *
 * @param action - Description of the proposed action
 * @param context - Current Fire Keeper context
 * @returns Check-back result with per-step assessments
 */
export function relationalCheckBack(
  action: string,
  context: FireKeeperContext,
): CheckBackResult {
  const steps: CheckBackStep[] = [
    checkHonorsRelations(action, context),
    checkSpiritBodyRelationship(action, context),
    checkFourDirections(action, context),
    checkElderApproval(action, context),
  ];

  const approved = steps.every((s) => s.passed);
  const failedSteps = steps.filter((s) => !s.passed);

  const summary = approved
    ? `Action "${action}" passes all four check-back steps — proceed with care`
    : `Action "${action}" failed ${failedSteps.length} check-back step(s): ${failedSteps.map((s) => `Step ${s.step}`).join(', ')}`;

  return { approved, steps, summary };
}

// ── Individual Steps ────────────────────────────────────────────────────────

/**
 * Step 1: Does this action honor existing relations?
 * Checks that gating conditions reflecting relational commitments are met.
 */
function checkHonorsRelations(
  action: string,
  context: FireKeeperContext,
): CheckBackStep {
  const unsatisfied = context.ceremonyState.gatingConditions.filter(
    (g) => !g.satisfied,
  );

  const passed = unsatisfied.length === 0;

  return {
    step: 1,
    question: 'Does this action honor existing relations?',
    passed,
    reason: passed
      ? 'All relational gating conditions are satisfied'
      : `${unsatisfied.length} gating condition(s) unsatisfied: ${unsatisfied.map((g) => g.condition).join('; ')}`,
  };
}

/**
 * Step 2: Does it strengthen the Spirit-Body relationship?
 * Checks trajectory confidence — a declining trajectory suggests
 * the action may disconnect vision (Spirit) from implementation (Body).
 */
function checkSpiritBodyRelationship(
  action: string,
  context: FireKeeperContext,
): CheckBackStep {
  const history = context.ceremonyState.trajectoryHistory;

  if (history.length < 2) {
    return {
      step: 2,
      question: 'Does it strengthen the Spirit-Body relationship of the project?',
      passed: true,
      reason: 'Insufficient trajectory history — proceeding with trust',
    };
  }

  const recent = history.slice(-3);
  const trend = recent[recent.length - 1].confidence - recent[0].confidence;
  const passed = trend >= -0.1;

  return {
    step: 2,
    question: 'Does it strengthen the Spirit-Body relationship of the project?',
    passed,
    reason: passed
      ? `Trajectory trend is stable or improving (${trend >= 0 ? '+' : ''}${trend.toFixed(2)})`
      : `Trajectory is declining (${trend.toFixed(2)}) — Spirit-Body relationship may be weakening`,
  };
}

/**
 * Step 3: Is it accountable to all four directions?
 * Checks that the ceremony hasn't become stuck in a single quadrant.
 */
function checkFourDirections(
  action: string,
  context: FireKeeperContext,
): CheckBackStep {
  const { quadrantState } = context.ceremonyState;
  const directions = Object.keys(quadrantState) as Array<keyof typeof quadrantState>;
  const activeOrVisited = directions.filter(
    (d) => quadrantState[d].status !== 'pending',
  );

  // During gathering/kindling, we don't expect all directions yet
  const earlyPhase = ['gathering', 'kindling'].includes(
    context.ceremonyState.ceremonyPhase,
  );

  if (earlyPhase) {
    return {
      step: 3,
      question: 'Is it accountable to all four directions?',
      passed: true,
      reason: `Early ceremony phase (${context.ceremonyState.ceremonyPhase}) — directional balance not yet expected`,
    };
  }

  const passed = activeOrVisited.length >= 2;

  return {
    step: 3,
    question: 'Is it accountable to all four directions?',
    passed,
    reason: passed
      ? `${activeOrVisited.length} direction(s) engaged: ${activeOrVisited.join(', ')}`
      : 'Work is concentrated in fewer than 2 directions — relational balance at risk',
  };
}

/**
 * Step 4: Would an Elder approve?
 * Synthesizes Wilson alignment, OCAP compliance, and ceremony state.
 * This is the holistic check — if the numbers look right but something
 * feels wrong, this step catches it.
 */
function checkElderApproval(
  action: string,
  context: FireKeeperContext,
): CheckBackStep {
  const wilsonOk = (context.wilsonAlignment ?? 0) >= 0.5;
  const ocapOk = context.ocapCompliant !== false;
  const noStopWork = context.ceremonyState.ceremonyPhase !== 'resting';

  const passed = wilsonOk && ocapOk && noStopWork;
  const issues: string[] = [];

  if (!wilsonOk) issues.push(`Wilson alignment too low (${context.wilsonAlignment})`);
  if (!ocapOk) issues.push('OCAP compliance not verified');
  if (!noStopWork) issues.push('Ceremony is in resting phase');

  return {
    step: 4,
    question: 'Would an Elder approve?',
    passed,
    reason: passed
      ? 'Wilson alignment, OCAP compliance, and ceremony state all indicate approval'
      : `Concerns: ${issues.join('; ')}`,
  };
}
