/**
 * jgwill/medicine-wheel#155: trajectory confidence advises; it does not hold work.
 *
 * The number measures how settled a ceremony's direction trajectory is, not
 * relational accountability. Low confidence is a question for a person, and
 * `humanNeeded` already raises it. A missing value is not low confidence.
 */

import { describe, expect, it } from 'vitest';
import {
  evaluateGates,
  DEFAULT_GATES,
  GATE_TRAJECTORY_CONFIDENCE,
  relationalCheckBack,
  type FireKeeperContext,
} from '@medicine-wheel/fire-keeper';

function context(over: Partial<FireKeeperContext> = {}): FireKeeperContext {
  return {
    ceremonyState: {
      inquiryRef: 'inq-155',
      ceremonyPhase: 'active',
      activeDirection: 'east',
      quadrantState: {} as FireKeeperContext['ceremonyState']['quadrantState'],
      gatingConditions: [],
      relationalMilestones: [],
      trajectoryHistory: [],
    } as FireKeeperContext['ceremonyState'],
    ocapCompliant: true,
    ...over,
  };
}

describe('trajectory confidence is advisory (#155)', () => {
  it('does not hold work when confidence is low', () => {
    const result = evaluateGates(DEFAULT_GATES, context({ wilsonAlignment: 0.2 }));
    expect(result.allSatisfied).toBe(true);
    expect(result.unsatisfied.map((s) => s.condition)).toContain(GATE_TRAJECTORY_CONFIDENCE.condition);
  });

  it('treats a missing value as unknown, not as zero', () => {
    const result = evaluateGates([GATE_TRAJECTORY_CONFIDENCE], context());
    expect(result.statuses[0].satisfied).toBe(true);
  });

  it('still holds work when OCAP compliance is not verified', () => {
    const result = evaluateGates(DEFAULT_GATES, context({ wilsonAlignment: 0.9, ocapCompliant: false }));
    expect(result.allSatisfied).toBe(false);
  });

  it('check-back step 4 passes with an advisory note when confidence is low', () => {
    const step4 = relationalCheckBack('publish', context({ wilsonAlignment: 0.2 })).steps[3];
    expect(step4.passed).toBe(true);
    expect(step4.reason).toMatch(/Advisory: trajectory confidence is low/);
  });

  it('check-back step 4 still fails in a resting ceremony', () => {
    const ctx = context({ wilsonAlignment: 0.9 });
    ctx.ceremonyState.ceremonyPhase = 'resting';
    expect(relationalCheckBack('publish', ctx).steps[3].passed).toBe(false);
  });
});
