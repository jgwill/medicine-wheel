/**
 * jgwill/medicine-wheel#155: no source of knowing is ranked above another by
 * default, and units stored before the change keep the weights they were given.
 *
 * Wilson needs both empirical and other forms of knowing (2008, pp. 58, 111)
 * and declines to judge any paradigm better or worse (p. 35). The earlier
 * order (dream, land, vision, code) is this package's own design, kept as the
 * named profile `dream-first`.
 */

import { describe, expect, it } from 'vitest';
import {
  createUnit,
  circleBack,
  computeWeight,
  WEIGHT_PROFILES,
  DEFAULT_WEIGHT_PROFILE,
  LEGACY_WEIGHT_PROFILE,
  type ImportanceUnit,
} from '@medicine-wheel/importance-unit';

const SOURCES = ['dream', 'land', 'vision', 'code'] as const;

describe('importance-unit weight profiles (#155)', () => {
  it('weights every source the same by default', () => {
    expect(DEFAULT_WEIGHT_PROFILE).toBe('equal');
    const weights = SOURCES.map((s) => computeWeight(s, 1));
    expect(new Set(weights).size).toBe(1);
  });

  it('records the profile on a new unit', () => {
    const unit = createUnit({ direction: 'east', source: 'dream', summary: 's', createdBy: 'test' });
    expect(unit.weightProfile).toBe('equal');
    expect(unit.epistemicWeight).toBe(WEIGHT_PROFILES.equal.weights.dream);
  });

  it('grows weight only by circling back', () => {
    const unit = createUnit({ direction: 'east', source: 'code', summary: 's', createdBy: 'test' });
    const deeper = circleBack(circleBack(unit, 'first return'), 'second return');
    expect(deeper.epistemicWeight).toBeGreaterThan(unit.epistemicWeight);
    expect(deeper.epistemicWeight).toBeLessThanOrEqual(1);
  });

  it('keeps the old weights for a unit stored before profiles existed', () => {
    // A unit as MCP stored it before #155: dream-first weight, no profile field.
    const stored = {
      ...createUnit({ direction: 'north', source: 'dream', summary: 's', createdBy: 'test' }),
      epistemicWeight: 0.85,
      weightProfile: undefined,
    } as ImportanceUnit;

    const deepened = circleBack(stored, 'a return');

    expect(LEGACY_WEIGHT_PROFILE).toBe('dream-first');
    expect(deepened.weightProfile).toBe('dream-first');
    expect(deepened.epistemicWeight).toBe(computeWeight('dream', 2, 'dream-first'));
    expect(deepened.epistemicWeight).toBeGreaterThan(0.85);
  });

  it('reproduces the earlier numbers under the dream-first profile', () => {
    expect(SOURCES.map((s) => computeWeight(s, 1, 'dream-first'))).toEqual([0.85, 0.75, 0.65, 0.5]);
  });

  it('says whose each profile is', () => {
    for (const profile of Object.values(WEIGHT_PROFILES)) {
      expect(profile.provenance.length).toBeGreaterThan(0);
    }
    expect(WEIGHT_PROFILES['dream-first'].provenance).toMatch(/not Wilson's/);
  });
});
