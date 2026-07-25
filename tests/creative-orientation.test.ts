/**
 * Orientation, gap analysis, and the brainstorming gate.
 *
 * The calibration cases are real. Both come from 2026-07-24: an outcome that
 * drifted into elimination framing while nothing was being restored, and a
 * genuine fire that deserved gap analysis. If these two ever disagree with the
 * packages, the packages are wrong.
 */
import { describe, it, expect } from 'vitest';
import {
  readOrientation,
  reorient,
  routeFor,
  worthSaying,
} from '../src/creative-orientation/src/index';
import {
  openGapAnalysis,
  addStep,
  markDone,
  isClosed,
  doorAdvice,
} from '../src/gap-analysis/src/index';
import {
  openSession,
  checkEmission,
  checkOptions,
  ask,
  answer,
  suspendedOn,
  advance,
  isComplete,
  PHASE_ORDER,
} from '../src/brainstorming/src/index';

describe('the discriminator decides the route, not the vocabulary', () => {
  it('routes to structural tension when no prior state is restored', () => {
    const r = readOrientation({ outcome: 'a harness that verifies contracts', restores: null });
    expect(r.orientation).toBe('advancing');
    expect(r.route).toBe('structural-tension');
  });

  it('routes to gap analysis when a prior state is named', () => {
    const r = readOrientation({
      outcome: 'the published image matches the published packages',
      restores: 'the image tracked npm through 0.5.0',
      evidence: 'tagged 2026-07-17',
    });
    expect(r.orientation).toBe('oscillating');
    expect(r.route).toBe('gap-analysis');
  });

  it('lets elimination vocabulary through when it is a real fire', () => {
    // "reduce" is correct here. A blocklist would be wrong in exactly this case.
    const r = readOrientation({
      outcome: 'reduce latency back under 200ms',
      restores: 'p99 was 180ms last week',
      evidence: 'dashboard, 2026-07-18',
    });
    expect(r.route).toBe('gap-analysis');
    expect(worthSaying(r)).toBe(false);
  });
});

describe('the calibration case from 2026-07-24', () => {
  const drifted = {
    outcome: 'catch cross-service contract breaks',
    restores: null,
  };

  it('flags elimination framing on a thing that never existed', () => {
    const r = readOrientation(drifted);
    expect(r.orientation).toBe('advancing');
    expect(worthSaying(r)).toBe(true);
    expect(r.advice).toMatch(/nothing is being restored/i);
  });

  it('offers a restatement rather than rewriting the intent', () => {
    const r = readOrientation(drifted);
    expect(r.suggestedOutcome).toContain('catch');
    expect(r.suggestedOutcome).toMatch(/what state exists/i);
  });

  it('says nothing when the outcome is already advancing', () => {
    const r = readOrientation({
      outcome: 'every cross-repository change arrives verified against its consumers',
      restores: null,
    });
    expect(worthSaying(r)).toBe(false);
  });

  it('asks for evidence when a baseline is claimed without any', () => {
    const r = readOrientation({ outcome: 'restore user trust', restores: 'users trusted us' });
    expect(r.advice).toMatch(/not evidenced/i);
  });

  it('leaves an outcome alone when it carries no elimination marker', () => {
    expect(reorient('the wheel holds an arc')).toBe('the wheel holds an arc');
  });

  it('exposes the route directly for callers that only dispatch', () => {
    expect(routeFor(drifted)).toBe('structural-tension');
  });
});

describe('gap analysis', () => {
  const baseline = { description: 'the image matched the packages', evidence: 'true through 0.5.0' };
  const current = { description: 'no 0.5.1 image exists', source: 'Docker Hub, 2026-07-25' };

  it('records the orientation reading on the analysis itself', () => {
    const a = openGapAnalysis(baseline, current, 'the image no longer tracks npm');
    expect(a.orientation.route).toBe('gap-analysis');
    expect(doorAdvice(a)).toBeNull();
  });

  it('refuses to open without a baseline — there would be nothing to close toward', () => {
    expect(() => openGapAnalysis({ description: '  ', evidence: 'x' }, current, 'd')).toThrow(/baseline/i);
  });

  it('rejects a step that cannot be verified', () => {
    const a = openGapAnalysis(baseline, current, 'd');
    expect(() => addStep(a, { action: 'be more careful', verifiedBy: '' })).toThrow(/verification/i);
  });

  it('closes only when every step is done', () => {
    let a = openGapAnalysis(baseline, current, 'd');
    a = addStep(a, { action: 'build from the tag in CI', verifiedBy: 'a v* push produces both tags' });
    expect(isClosed(a)).toBe(false);
    a = markDone(a, 'build from the tag in CI');
    expect(isClosed(a)).toBe(true);
  });

  it('is not closed when it holds no steps at all', () => {
    expect(isClosed(openGapAnalysis(baseline, current, 'd'))).toBe(false);
  });
});

describe('brainstorming routes what it says, including its own questions', () => {
  const session = openSession('every cross-repository change arrives verified against its consumers');

  it('finds the drifting option and leaves the advancing one alone', () => {
    const findings = checkOptions(session, [
      'Catch cross-service contract breaks',
      'Every change arrives already verified',
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].statement).toMatch(/^Catch/);
  });

  it('marks a clean statement as not needing rework', () => {
    expect(checkEmission(session, 'the arc is readable from either side').reword).toBe(false);
  });

  it('refuses to open a session with no outcome', () => {
    expect(() => openSession('   ')).toThrow(/outcome/i);
  });
});

describe('gates hold for a person', () => {
  it('suspends on an unanswered question and refuses to advance', () => {
    const s = ask(openSession('a harness that verifies contracts'), 'thin convention, or a framework?');
    expect(suspendedOn(s)?.question).toMatch(/thin convention/);
    expect(() => advance(s)).toThrow(/suspended/i);
  });

  it('advances once the person has answered', () => {
    let s = ask(openSession('a harness'), 'thin or framework?');
    s = answer(s, 'thin or framework?', 'thin');
    expect(suspendedOn(s)).toBeNull();
    expect(advance(s).phase).toBe('clarify');
  });

  it('walks the whole protocol and terminates at plan', () => {
    let s = openSession('a harness');
    for (let i = 0; i < PHASE_ORDER.length; i++) s = advance(s);
    expect(s.phase).toBe('plan');
    expect(isComplete(s)).toBe(true);
  });

  it('answers only the open gate when a question repeats', () => {
    let s = openSession('a harness');
    s = ask(s, 'same question');
    s = answer(s, 'same question', 'first');
    s = ask(s, 'same question');
    s = answer(s, 'same question', 'second');
    expect(s.gates.map(g => g.answer)).toEqual(['first', 'second']);
  });
});
