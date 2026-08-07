/**
 * Reconciliation — level-triggered, so `satisfied` cannot age into a lie.
 *
 * The outage this answers (jgwill/gaia#74) was not caused by a missing fact. It
 * was caused by a fact that had been true. Something was recorded as running,
 * the recording was never re-read, and every downstream decision was made
 * against a snapshot.
 *
 * **Level-triggered** is the whole design: `reconcile()` compares the current
 * declared set against the current observed set, every time, and remembers no
 * transitions. There is no "it was converged a minute ago" state to go stale,
 * because there is no state at all — only the two levels and the comparison.
 *
 * Four drift states, and the two asymmetric ones carry the most information:
 *
 * - `converged`  — declared and observed agree on every compared field.
 * - `drifted`    — both sides exist and disagree. The differences are named.
 * - `unrealized` — declared, not observed. Written down and not running.
 * - `undeclared` — observed, not declared. **Running and nobody wrote it down**
 *                  — the state that finds the service somebody started by hand
 *                  at 2am, which is exactly the service holding the port the
 *                  next tenant is about to be given.
 *
 * A pure function over plain data. No I/O, no clock: `now` is passed in, so two
 * runs over the same input are identical.
 *
 * Spec: /opt/eury/rispecs/foundations/02-specifications.md §S6.
 */

import { detectPortConflicts } from './ports';
import type { MetisHold, NodeId, PortBinding, PortConflict, ServiceFacet, TenantFacet } from './types';

export type DriftState = 'converged' | 'drifted' | 'unrealized' | 'undeclared';

/** Every drift state, in the order a report should read them: agreement, then disagreement, then the two absences. */
export const DRIFT_STATES: readonly DriftState[] = ['converged', 'drifted', 'unrealized', 'undeclared'];

/**
 * A reading of a host, taken at a moment, by someone.
 *
 * `observedBy` and `observedAt` are required rather than optional. An
 * observation with no reader and no time is a rumour, and reconciling against a
 * rumour is how the snapshot problem comes back wearing a different hat.
 */
export interface ObservedState {
  /** → `HostFacet.nodeId` — the host this reading was taken on */
  observedBy: NodeId;
  /** ISO 8601 */
  observedAt: string;
  services: ServiceFacet[];
  tenants?: TenantFacet[];
}

export interface FieldDifference {
  field: string;
  declared?: unknown;
  observed?: unknown;
}

export interface DriftRow {
  /** → `ServiceFacet.nodeId` */
  nodeId: NodeId;
  /** the unit name from whichever side has it, so a row is readable without a join */
  unit: string;
  state: DriftState;
  /** present only when `state` is `drifted` */
  differences?: FieldDifference[];
  /**
   * Métis from **both** sides, carried through untouched.
   *
   * An array, not a single hold, and not a merge. Two sides holding different
   * tacit notes is not drift — it is two people knowing different things. Keeping
   * only the declared side would delete the observing agent's note; merging the
   * two into one `MetisHold` would concatenate two people into one `heldBy`
   * string and lose attribution. Both are the same erasure in different shapes,
   * and this field exists to refuse it.
   *
   * Ordered declared-first, so a reader sees the recorded knowledge before the
   * observed knowledge.
   */
  metis?: MetisHold[];
}

export interface ReconcileResult {
  observedBy: NodeId;
  observedAt: string;
  /**
   * Milliseconds between `observedAt` and `now`, when `now` was given.
   *
   * Exposed so a caller can refuse to act on an old reading. Negative when the
   * observation is stamped in the future — surfaced rather than clamped, because
   * a future timestamp means clock skew and that is worth seeing.
   */
  observationAgeMs?: number;
  rows: DriftRow[];
  /** counts per drift state; every state present, including the zeroes */
  summary: Record<DriftState, number>;
  /**
   * Port conflicts over declared ∪ observed — the §S3 traversal folded in here
   * because this is the one place both sides are in hand at once.
   */
  conflicts: PortConflict[];
  /** true when nothing drifted, nothing is unrealized, nothing is undeclared, and no port collides */
  converged: boolean;
}

/** Fields compared between a declared and an observed service. `metis` is deliberately absent. */
const COMPARED_FIELDS = [
  'unit',
  'scope',
  'ownedBy',
  'workingDirectory',
  'execStop',
] as const;

/** `host|proto|port` — the identity of a claim, matching the slot key `detectPortConflicts` uses. */
function portKey(binding: PortBinding): string {
  return `${binding.host} ${binding.proto ?? 'tcp'} ${binding.port}`;
}

/** Ports compared as sets of claims, so ordering differences between systemd and a manifest are not drift. */
function portsDiffer(declared: PortBinding[], observed: PortBinding[]): boolean {
  const a = [...new Set(declared.map(portKey))].sort();
  const b = [...new Set(observed.map(portKey))].sort();
  return a.length !== b.length || a.some((k, i) => k !== b[i]);
}

function diffService(declared: ServiceFacet, observed: ServiceFacet): FieldDifference[] {
  const differences: FieldDifference[] = [];

  for (const field of COMPARED_FIELDS) {
    if (declared[field] !== observed[field]) {
      differences.push({ field, declared: declared[field], observed: observed[field] });
    }
  }

  if (portsDiffer(declared.ports, observed.ports)) {
    differences.push({
      field: 'ports',
      declared: [...declared.ports].map(portKey).sort(),
      observed: [...observed.ports].map(portKey).sort(),
    });
  }

  return differences;
}

/**
 * Compare what was declared against what was observed, right now.
 *
 * Rows are keyed by `nodeId` and sorted by it, so two runs over the same input
 * are byte-identical and a caller can diff them.
 *
 * @param declared  desired state, authored by eury
 * @param observed  a reading taken on a host by gaia, with its provenance
 * @param opts.now  ISO 8601 — supplied by the caller so this stays clock-free
 */
export function reconcile(
  declared: ServiceFacet[],
  observed: ObservedState,
  opts: { now?: string } = {},
): ReconcileResult {
  const declaredById = new Map(declared.map((s) => [s.nodeId, s]));
  const observedById = new Map(observed.services.map((s) => [s.nodeId, s]));

  const rows: DriftRow[] = [];

  /** Both sides' holds, declared first, with the empty case left undefined. */
  const heldBy = (...sides: (MetisHold | undefined)[]): MetisHold[] | undefined => {
    const held = sides.filter((m): m is MetisHold => m !== undefined);
    return held.length > 0 ? held : undefined;
  };

  for (const [nodeId, d] of declaredById) {
    const o = observedById.get(nodeId);
    if (!o) {
      rows.push({ nodeId, unit: d.unit, state: 'unrealized', metis: heldBy(d.metis) });
      continue;
    }
    const differences = diffService(d, o);
    const metis = heldBy(d.metis, o.metis);
    rows.push(
      differences.length === 0
        ? { nodeId, unit: d.unit, state: 'converged', metis }
        : { nodeId, unit: d.unit, state: 'drifted', differences, metis },
    );
  }

  for (const [nodeId, o] of observedById) {
    if (declaredById.has(nodeId)) continue;
    rows.push({ nodeId, unit: o.unit, state: 'undeclared', metis: heldBy(o.metis) });
  }

  rows.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  const summary = DRIFT_STATES.reduce(
    (acc, state) => ({ ...acc, [state]: rows.filter((r) => r.state === state).length }),
    {} as Record<DriftState, number>,
  );

  const conflicts = detectPortConflicts([
    ...declared.flatMap((s) => s.ports),
    ...observed.services.flatMap((s) => s.ports),
  ]);

  const result: ReconcileResult = {
    observedBy: observed.observedBy,
    observedAt: observed.observedAt,
    rows,
    summary,
    conflicts,
    converged:
      summary.drifted === 0 &&
      summary.unrealized === 0 &&
      summary.undeclared === 0 &&
      conflicts.length === 0,
  };

  if (opts.now) {
    const age = Date.parse(opts.now) - Date.parse(observed.observedAt);
    if (!Number.isNaN(age)) result.observationAgeMs = age;
  }

  return result;
}
