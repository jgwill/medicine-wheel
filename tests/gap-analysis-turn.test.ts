/**
 * The turn after a gap analysis (lane K9c, 2026-10-26).
 *
 * A gap analysis looks for what is missing. The model using it is then pulled
 * toward filling each missing item. `turnToCreativeOrientation` keeps the
 * findings as current reality, names that pull, and asks for the desired
 * outcome on its own terms. These tests hold the four things the design note
 * names: findings land as current reality, no action step is derived from
 * them, the reflection is present, and a desired outcome produces a draft
 * chart input.
 */
import { describe, it, expect } from 'vitest';
import {
  openGapAnalysis,
  addStep,
  markDone,
  turnToCreativeOrientation,
  DESIRED_OUTCOME_QUESTION,
} from '../src/gap-analysis/src/index';

const baseline = {
  description: 'the published image matched the published packages',
  evidence: 'true in the previously tagged release',
};
const current = {
  description: 'the newest image tag trails npm',
  source: 'Docker Hub tags API, read 2026-07-25',
};
const difference = 'an intermediate release has no image';

function analysisWithSteps() {
  let a = openGapAnalysis(baseline, current, difference, { id: 'gap:test:1' });
  a = addStep(a, { action: 'build the image from the tag in CI', verifiedBy: 'a v* push produces the image' });
  a = addStep(a, { action: 'backfill the missing image', verifiedBy: 'the tag exists on Docker Hub' });
  a = markDone(a, 'backfill the missing image');
  return { ...a, rootCause: 'the image build depends on a human remembering a flag' };
}

describe('turnToCreativeOrientation', () => {
  it('lands the findings as current-reality facts', () => {
    const turn = turnToCreativeOrientation(analysisWithSteps());
    expect(turn.analysisId).toBe('gap:test:1');
    const from = turn.currentReality.map(f => f.from);
    expect(from).toEqual(['observation', 'baseline', 'difference', 'root-cause', 'step-done', 'steps-open']);
    const facts = turn.currentReality.map(f => f.fact).join(' ');
    expect(facts).toContain(current.description);
    expect(facts).toContain(current.source);
    expect(facts).toContain(baseline.evidence);
    expect(facts).toContain(difference);
    expect(facts).toContain('the image build depends on a human remembering a flag');
    expect(facts).toContain('Done: backfill the missing image');
  });

  it('keeps open elimination steps out of the facts as tasks', () => {
    const turn = turnToCreativeOrientation(analysisWithSteps());
    const facts = turn.currentReality.map(f => f.fact).join(' ');
    // The open step is counted as a fact about the analysis, never restated as work to do.
    expect(facts).not.toContain('build the image from the tag in CI');
    expect(facts).toMatch(/1 open elimination step\b/);
    expect(facts).toMatch(/not carried into a chart/);
  });

  it('carries the reflection that names the pull to fill each missing item', () => {
    const turn = turnToCreativeOrientation(analysisWithSteps());
    expect(turn.reflection).toContain(difference);
    expect(turn.reflection).toMatch(/pull now is to fill each missing item/);
    expect(turn.reflection).toMatch(/That is not what we are doing/);
    expect(turn.reflection).toMatch(/not a list of tasks/);
    expect(turn.reflection).toContain(DESIRED_OUTCOME_QUESTION);
    expect(turn.reflection).toMatch(/action steps resolve the tension/);
  });

  it('points to create_structural_tension_chart, needing a desired outcome', () => {
    const turn = turnToCreativeOrientation(analysisWithSteps());
    expect(turn.nextStep.tool).toBe('create_structural_tension_chart');
    expect(turn.nextStep.needs).toEqual(['desired_outcome', 'direction']);
    expect(turn.nextStep.question).toBe(DESIRED_OUTCOME_QUESTION);
    expect(turn.chartDraft).toBeUndefined();
  });

  it('returns a draft chart input with no action steps when a desired outcome is given', () => {
    const desiredOutcome = 'every release publishes its image from the tag, with no one remembering a flag';
    const turn = turnToCreativeOrientation(analysisWithSteps(), { desiredOutcome });
    expect(turn.nextStep.needs).toEqual(['direction']);
    expect(turn.chartDraft).toBeDefined();
    expect(turn.chartDraft!.desired_outcome).toBe(desiredOutcome);
    expect(turn.chartDraft!.action_steps).toEqual([]);
    expect(turn.chartDraft!.current_reality).toBe(turn.currentReality.map(f => f.fact).join(' '));
    expect(turn.chartDraft!.current_reality).toContain(difference);
    expect(turn.desiredOutcomeAdvice).toBeUndefined();
  });

  it('advises, and still drafts, when the desired outcome is phrased as removing something', () => {
    const turn = turnToCreativeOrientation(analysisWithSteps(), {
      desiredOutcome: 'stop the image from trailing npm',
    });
    expect(turn.chartDraft!.desired_outcome).toBe('stop the image from trailing npm');
    expect(turn.chartDraft!.action_steps).toEqual([]);
    expect(turn.desiredOutcomeAdvice).toMatch(/phrased as removing something/);
  });

  it('treats a blank desired outcome as not named yet', () => {
    const turn = turnToCreativeOrientation(analysisWithSteps(), { desiredOutcome: '   ' });
    expect(turn.chartDraft).toBeUndefined();
    expect(turn.nextStep.needs).toContain('desired_outcome');
  });

  it('works on an analysis with no steps and no cause', () => {
    const turn = turnToCreativeOrientation(openGapAnalysis(baseline, current, difference));
    expect(turn.currentReality.map(f => f.from)).toEqual(['observation', 'baseline', 'difference']);
  });

  it('refuses something that is not a gap analysis', () => {
    expect(() => turnToCreativeOrientation({} as never)).toThrow(/baseline, current and difference/);
  });

  it('leaves the analysis itself unchanged', () => {
    const a = analysisWithSteps();
    const before = JSON.stringify(a);
    turnToCreativeOrientation(a, { desiredOutcome: 'the image arrives with every release' });
    expect(JSON.stringify(a)).toBe(before);
  });
});
