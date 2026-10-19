/**
 * The lifecycle state machine, and the comparison of a declared lifecycle
 * with what git shows. Drawn in
 * `rispecs/developer-suite/repository-mapping/repository-lifecycle.smdf.json`.
 *
 * No clock: activity is measured from the reading's own `observedAt`, the way
 * `infra`'s `reconcile` takes `now` as an argument.
 */

import type {
  ActivityClass,
  ActivityReading,
  Lifecycle,
  LifecycleDrift,
  LifecycleEvent,
  RepositoryFacet,
} from './types';

/** Every allowed move. A state not listed for an event does not accept it. */
export const LIFECYCLE_TRANSITIONS: Readonly<Record<Lifecycle, Readonly<Partial<Record<LifecycleEvent, Lifecycle>>>>> = {
  unclassified: { explore: 'prototype', implement: 'implementation', release: 'maintained', archive: 'archived' },
  prototype: { concretize: 'implementation', archive: 'archived' },
  implementation: { release: 'maintained', archive: 'archived' },
  maintained: { archive: 'archived' },
  archived: { reopen: 'unclassified' },
};

export type TransitionResult =
  | { ok: true; from: Lifecycle; event: LifecycleEvent; to: Lifecycle }
  | { ok: false; from: Lifecycle; event: LifecycleEvent; reason: string; allowed: LifecycleEvent[] };

export function transition(from: Lifecycle, event: LifecycleEvent): TransitionResult {
  const moves = LIFECYCLE_TRANSITIONS[from];
  const to = moves[event];
  const allowed = Object.keys(moves) as LifecycleEvent[];
  if (to) return { ok: true, from, event, to };
  return { ok: false, from, event, allowed, reason: `${from} does not accept ${event}; it accepts ${allowed.join(', ')}` };
}

export interface ActivityThresholds {
  /** A last commit within this many days is `active`. */
  activeDays: number;
  /** Within this many is `quiet`; older is `dormant`. */
  quietDays: number;
}

export const ACTIVITY_THRESHOLDS: ActivityThresholds = { activeDays: 90, quietDays: 365 };

const DAY_MS = 86_400_000;

/** Whole days from the last commit to the reading, or `undefined` with no commit. */
export function daysSinceLastCommit(reading: ActivityReading): number | undefined {
  if (!reading.lastCommitAt) return undefined;
  const days = (Date.parse(reading.observedAt) - Date.parse(reading.lastCommitAt)) / DAY_MS;
  return Number.isFinite(days) ? Math.max(0, Math.floor(days)) : undefined;
}

export function classifyActivity(
  reading: ActivityReading,
  thresholds: ActivityThresholds = ACTIVITY_THRESHOLDS,
): ActivityClass {
  const days = daysSinceLastCommit(reading);
  if (reading.commits === 0 || days === undefined) return 'empty';
  if (days <= thresholds.activeDays) return 'active';
  if (days <= thresholds.quietDays) return 'quiet';
  return 'dormant';
}

export interface LifecycleReading {
  nodeId: string;
  declared: Lifecycle;
  activity?: ActivityClass;
  daysSinceLastCommit?: number;
  drift: LifecycleDrift;
  /** One sentence a person can check. */
  reason: string;
}

/**
 * Compare what a mapping declares with the latest git reading.
 *
 * Drift is named only where the two cannot both be true: a `maintained`
 * repository nobody committed to in a year (or ever), an `archived` one
 * committed to this season, a `prototype` or `implementation` with no commit
 * at all. A quiet maintained package is not drift — stable things are quiet.
 */
export function reconcileLifecycle(
  repository: Pick<RepositoryFacet, 'nodeId' | 'lifecycle' | 'observed'>,
  thresholds: ActivityThresholds = ACTIVITY_THRESHOLDS,
): LifecycleReading {
  const { nodeId, lifecycle: declared, observed } = repository;
  if (!observed) {
    return { nodeId, declared, drift: 'unobserved', reason: `declared ${declared}, git not read yet` };
  }
  const activity = classifyActivity(observed, thresholds);
  const days = daysSinceLastCommit(observed);
  const base = { nodeId, declared, activity, ...(days === undefined ? {} : { daysSinceLastCommit: days }) };
  const since = days === undefined ? 'no commit' : `last commit ${days} days before the reading`;

  if (declared === 'unclassified') {
    return { ...base, drift: 'undeclared', reason: `read from git (${activity}, ${since}), not classified yet` };
  }
  const drifted =
    (declared === 'maintained' && (activity === 'dormant' || activity === 'empty')) ||
    (declared === 'archived' && activity === 'active') ||
    ((declared === 'prototype' || declared === 'implementation') && activity === 'empty');
  return drifted
    ? { ...base, drift: 'drifted', reason: `declared ${declared}, but ${since}` }
    : { ...base, drift: 'converged', reason: `declared ${declared}, ${activity} (${since})` };
}
