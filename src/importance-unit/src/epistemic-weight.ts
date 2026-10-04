/**
 * @medicine-wheel/importance-unit — Epistemic Weight Computation
 *
 * Computes epistemic weight for ImportanceUnits from a named weight
 * profile and the unit's circle depth.
 *
 * By default no source is ranked above another (profile `equal`): weight
 * grows only by circling back. Wilson needs both empirical and other forms
 * of knowing (2008, pp. 58, 111) and declines to judge any paradigm better
 * or worse than another (p. 35). The package's earlier order, dream above
 * land above vision above code, is kept as the profile `dream-first`, our
 * own design and unattributed, so that units stored before #155 keep the
 * weights they were given.
 *
 * Weight increases with circleDepth using diminishing returns
 * (logarithmic scaling), never exceeding 1.0.
 */

import type { EpistemicSource, WeightProfileId } from './types.js';

// ── Weight Profiles ─────────────────────────────────────────────────────────

/** A named set of base weights, with where it comes from. */
export interface WeightProfile {
  id: WeightProfileId;
  title: string;
  weights: Readonly<Record<EpistemicSource, number>>;
  provenance: string;
}

/** The weight profiles this package knows. Each one says whose it is. */
export const WEIGHT_PROFILES: Readonly<Record<WeightProfileId, WeightProfile>> = {
  equal: {
    id: 'equal',
    title: 'Equal: no source ranked above another',
    weights: { dream: 0.7, land: 0.7, vision: 0.7, code: 0.7 },
    provenance:
      'Default since #155. Wilson needs both empirical and other forms of knowing (2008, pp. 58, 111) and declines to judge paradigms better or worse (p. 35).',
  },
  'dream-first': {
    id: 'dream-first',
    title: 'Dream first: dream, land, vision, code',
    weights: { dream: 0.85, land: 0.75, vision: 0.65, code: 0.5 },
    provenance:
      "This package's design before #155; ours, not Wilson's, and unattributed. Units stored without a profile were weighted with it.",
  },
};

/** The profile new units are weighted with. */
export const DEFAULT_WEIGHT_PROFILE: WeightProfileId = 'equal';

/**
 * The profile a unit stored before #155 was weighted with. Such units carry
 * no `weightProfile`; reading them with this profile keeps their weights
 * unchanged when they are circled back to.
 */
export const LEGACY_WEIGHT_PROFILE: WeightProfileId = 'dream-first';

/** The profile a unit was weighted with: its own, or the legacy one if it has none. */
export function profileOf(unit: { weightProfile?: WeightProfileId }): WeightProfileId {
  return unit.weightProfile ?? LEGACY_WEIGHT_PROFILE;
}

// ── Base Weights ────────────────────────────────────────────────────────────

/**
 * Base weights of the default profile.
 * @deprecated Read `WEIGHT_PROFILES[profile].weights` (#155).
 */
export const BASE_WEIGHTS: Record<EpistemicSource, number> = { ...WEIGHT_PROFILES[DEFAULT_WEIGHT_PROFILE].weights };

/** Maximum depth bonus that can be added to base weight */
const MAX_DEPTH_BONUS = 0.15;

/** Logarithmic scaling factor for depth bonus */
const DEPTH_SCALE = 3;

// ── Weight Computation ──────────────────────────────────────────────────────

/**
 * Compute the depth bonus using diminishing returns.
 *
 * Uses logarithmic scaling so that early circles contribute
 * more than later ones — the first return yields more insight
 * than the tenth, though all returns matter.
 *
 * @param circleDepth - Number of times circled (minimum 1)
 * @returns Depth bonus between 0 and MAX_DEPTH_BONUS
 */
function depthBonus(circleDepth: number): number {
  if (circleDepth <= 1) return 0;
  return MAX_DEPTH_BONUS * (Math.log(circleDepth) / Math.log(circleDepth + DEPTH_SCALE));
}

/**
 * Compute the full epistemic weight for a given source and depth.
 *
 * Weight = baseWeight + depthBonus, clamped to [0, 1].
 *
 * @param source - The epistemic source dimension
 * @param circleDepth - How many times this topic has been circled
 * @param profile - The weight profile (default: `equal`)
 * @returns Epistemic weight between 0.0 and 1.0
 */
export function computeWeight(
  source: EpistemicSource,
  circleDepth: number,
  profile: WeightProfileId = DEFAULT_WEIGHT_PROFILE,
): number {
  const base = WEIGHT_PROFILES[profile].weights[source];
  const bonus = depthBonus(circleDepth);
  return Math.min(1.0, base + bonus);
}

/**
 * Adjust weight for a different source dimension.
 *
 * Re-bases the weight using the new source's base weight
 * while preserving the depth-derived bonus.
 *
 * @param currentWeight - The current epistemic weight
 * @param currentSource - The current source dimension
 * @param newSource - The new source dimension
 * @param profile - The weight profile (default: `equal`)
 * @returns Adjusted weight for the new source
 */
export function adjustForSource(
  currentWeight: number,
  currentSource: EpistemicSource,
  newSource: EpistemicSource,
  profile: WeightProfileId = DEFAULT_WEIGHT_PROFILE,
): number {
  const weights = WEIGHT_PROFILES[profile].weights;
  const currentBase = weights[currentSource];
  const bonus = currentWeight - currentBase;
  const newBase = weights[newSource];
  return Math.min(1.0, Math.max(0, newBase + Math.max(0, bonus)));
}

/**
 * Adjust weight for a new circle depth.
 *
 * Recalculates weight from the source base plus the new
 * depth bonus.
 *
 * @param source - The epistemic source dimension
 * @param newDepth - The new circle depth
 * @param profile - The weight profile (default: `equal`)
 * @returns Recalculated weight
 */
export function adjustForDepth(
  source: EpistemicSource,
  newDepth: number,
  profile: WeightProfileId = DEFAULT_WEIGHT_PROFILE,
): number {
  return computeWeight(source, newDepth, profile);
}
