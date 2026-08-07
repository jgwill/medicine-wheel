/**
 * Preconditions — what must hold before West runs.
 *
 * A service is West: the thing that executes. A port claim, a linger flag, a
 * unit file on disk are South: claims that must hold *first*. This module makes
 * that ordering checkable without letting either half stand in for the other.
 *
 * The load-bearing separation, and the reason this file exists at all:
 *
 * > `linger` is a machine fact — a checkbox with no authority and no ability to
 * > withdraw. The human authorization to run the root step that sets it is a
 * > `ConsentRecord` in `@medicine-wheel/consent-lifecycle`. A `Precondition`
 * > references both **by id**. Neither collapses into the other.
 *
 * Collapsing them is the failure this guards against: once a granted consent is
 * inferred from a machine fact, withdrawing consent stops meaning anything,
 * because the flag is still set. So `unauthorized` is a verdict of its own — the
 * machine is ready and the human has not said yes — and it never reads as
 * `unsatisfied`.
 *
 * A pure function over plain data. No I/O, no ontology traversal, no clock.
 *
 * Spec: /opt/eury/rispecs/foundations/02-specifications.md §S4.
 */

import type { LingerState, MetisHold, NodeId, ServiceFacet } from './types';

// ── Machine facts ───────────────────────────────────────────────────────────

/**
 * The kinds of machine fact a precondition can read.
 *
 * Every one of these is something a host can be asked and will answer without a
 * person present. That is precisely what disqualifies them from carrying
 * consent.
 */
export type PreconditionKind =
  /** the tenant's user units survive logout — `loginctl show-user <account>` */
  | 'linger'
  /** the slot this service claims is not held by another service */
  | 'port-free'
  /** the unit file exists in the scope the facet declares */
  | 'unit-present'
  /** the directory the unit reads its environment from exists (jgwill/gaia#74) */
  | 'working-directory';

/**
 * A fact read off a machine, with its provenance attached.
 *
 * `observed` being absent means **never read**, which is not the same as read
 * and false. A guard that treats the two alike will report a service blocked
 * when nobody has looked yet, and the operator learns to ignore it.
 */
export interface MachineFact {
  kind: PreconditionKind;
  /** the facet whose field carries this fact — host, tenant or service */
  facetNodeId: NodeId;
  /** what the fact must read for the precondition to hold */
  expected: string;
  /** what it actually read. Absent means unread. */
  observed?: string;
  /** ISO 8601 — when `observed` was read. Staleness is a fact, not an inference. */
  observedAt?: string;
}

/**
 * The consent states that authorize an action.
 *
 * Mirrors `ConsentState` in `@medicine-wheel/consent-lifecycle` and is exported
 * as data so a caller can pass its own set rather than fork this file. `infra`
 * deliberately does **not** import that package: a package that can construct a
 * consent record can fabricate one, and this one must not be able to.
 */
export const AUTHORIZING_CONSENT_STATES: readonly string[] = ['granted', 'active'];

/**
 * Fact kinds that cannot stand alone.
 *
 * `linger` is here because enabling it required running a root step, and that
 * root step required a human to say yes. A precondition that reads the flag and
 * references no `ConsentRecord` therefore opens the gate on the machine fact
 * alone — which is the exact collapse this module's docstring forbids, arriving
 * not through a wrong verdict but through an incomplete declaration.
 *
 * Such a precondition returns `unknown`, never `satisfied`: nothing authorized
 * it, and nothing was checked. `unauthorized` would be wrong too — that verdict
 * means consent was read and did not authorize, and here it was never named.
 */
export const CONSENT_REQUIRING_KINDS: readonly PreconditionKind[] = ['linger'];

/**
 * A pointer at a `ConsentRecord`, never a copy of one.
 *
 * `state` is an opaque string on purpose. `infra` does not own consent semantics;
 * it records what the lifecycle said and when it was asked.
 */
export interface ConsentReference {
  /** → `ConsentRecord.id` in `@medicine-wheel/consent-lifecycle` */
  consentId: string;
  /** the state as read at `readAt`. Absent means unread. */
  state?: string;
  /** ISO 8601 */
  readAt?: string;
}

// ── Preconditions ───────────────────────────────────────────────────────────

/**
 * One condition that must hold before a service may be considered ready.
 *
 * A precondition may carry a machine fact, a consent reference, or both. Both is
 * the interesting case and the one the whole module is shaped around: running
 * the root step that enables linger needed a human to say yes, and that yes can
 * be withdrawn later while the flag stays enabled.
 */
export interface Precondition {
  /** stable id for the precondition itself */
  id: string;
  /** the service whose readiness this gates → `ServiceFacet.nodeId` */
  gates: NodeId;
  /** one line an operator can read — 'gmusic linger must survive logout' */
  description?: string;
  /** the machine half */
  fact?: MachineFact;
  /** the human half, referenced by id and never embedded */
  consent?: ConsentReference;
  /** what a person knows about this precondition that the fields cannot hold */
  metis?: MetisHold;
}

/**
 * How a precondition reads right now.
 *
 * Four values, and the distinctions between them are the point:
 *
 * - `satisfied`    — every half that was declared was read, and holds.
 * - `unsatisfied`  — a machine fact was read and does not match what is expected.
 * - `unauthorized` — the machine half holds (or was not required) and consent
 *                    does not authorize. Kept separate from `unsatisfied` so a
 *                    withdrawn consent can never be mistaken for a technical
 *                    failure, and so an operator cannot "fix" it by restarting
 *                    something.
 * - `unknown`      — a declared half has not been read. Never read as either
 *                    success or failure.
 */
export type PreconditionVerdict = 'satisfied' | 'unsatisfied' | 'unauthorized' | 'unknown';

export interface PreconditionResult {
  preconditionId: string;
  gates: NodeId;
  verdict: PreconditionVerdict;
  /** one sentence naming what decided it */
  reason: string;
  /** echoed so a caller rendering a table does not have to re-join */
  fact?: MachineFact;
  consent?: ConsentReference;
  metis?: MetisHold;
}

/**
 * Read one precondition.
 *
 * Order of decision, and it matters:
 *
 * 1. A declared-but-unread half yields `unknown`. Nothing else is decided from
 *    an unread fact.
 * 2. A read machine fact that does not match yields `unsatisfied`. The human
 *    half is not consulted — there is nothing yet to authorize.
 * 3. A consent that does not authorize yields `unauthorized`, whatever the
 *    machine says.
 * 4. A fact whose kind is in {@link CONSENT_REQUIRING_KINDS} and that names no
 *    consent yields `unknown`. The machine half holding is not the question.
 * 5. A precondition declaring neither half yields `unknown`, not `satisfied`.
 *    An empty gate that reports success is how a gate stops being one.
 */
export function preconditionGuard(
  precondition: Precondition,
  authorizingStates: readonly string[] = AUTHORIZING_CONSENT_STATES,
): PreconditionResult {
  const base = {
    preconditionId: precondition.id,
    gates: precondition.gates,
    fact: precondition.fact,
    consent: precondition.consent,
    metis: precondition.metis,
  };

  const { fact, consent } = precondition;

  if (!fact && !consent) {
    return {
      ...base,
      verdict: 'unknown',
      reason: 'precondition declares neither a machine fact nor a consent reference — nothing was checked',
    };
  }

  if (fact && fact.observed === undefined) {
    return {
      ...base,
      verdict: 'unknown',
      reason: `machine fact '${fact.kind}' on ${fact.facetNodeId} has not been read`,
    };
  }

  if (fact && fact.observed !== fact.expected) {
    return {
      ...base,
      verdict: 'unsatisfied',
      reason: `machine fact '${fact.kind}' on ${fact.facetNodeId} read '${fact.observed}', expected '${fact.expected}'`,
    };
  }

  if (fact && !consent && CONSENT_REQUIRING_KINDS.includes(fact.kind)) {
    return {
      ...base,
      verdict: 'unknown',
      reason:
        `machine fact '${fact.kind}' holds, but this precondition names no ConsentRecord — ` +
        `the root step that set it required a human to say yes, and no yes was referenced`,
    };
  }

  if (consent && consent.state === undefined) {
    return {
      ...base,
      verdict: 'unknown',
      reason: `consent ${consent.consentId} has not been read from the lifecycle`,
    };
  }

  if (consent && !authorizingStates.includes(consent.state as string)) {
    return {
      ...base,
      verdict: 'unauthorized',
      reason: `consent ${consent.consentId} is '${consent.state}' — the machine half may hold, but this is not authorization`,
    };
  }

  return {
    ...base,
    verdict: 'satisfied',
    reason: fact
      ? `machine fact '${fact.kind}' reads '${fact.observed}'${consent ? ` and consent ${consent.consentId} is '${consent.state}'` : ''}`
      : `consent ${consent?.consentId} is '${consent?.state}'`,
  };
}

// ── Service readiness ───────────────────────────────────────────────────────

export interface ServiceReadiness {
  /** → `ServiceFacet.nodeId` */
  service: NodeId;
  /** true only when every declared precondition is `satisfied` */
  ready: boolean;
  /** how many preconditions were declared for this service. Zero is a finding. */
  declared: number;
  /** every result, in the order the preconditions were given */
  results: PreconditionResult[];
  /** the subset that is not `satisfied` — what an operator has to act on */
  blocking: PreconditionResult[];
  /**
   * Every `MetisHold` carried by a blocking precondition or by the service.
   *
   * Surfaced rather than summarised: the reason a gate is stuck is exactly where
   * "you have to restart it twice" tends to live, and a readiness report that
   * drops it has flattened the one thing the operator needed.
   */
  metis: MetisHold[];
  /** one sentence for a caller that renders a single line */
  reason: string;
}

/**
 * Whether a service may be considered ready, given the preconditions that gate it.
 *
 * Preconditions gating other services are ignored rather than silently counted —
 * the filter is on `gates`, so passing the whole set for a host is fine.
 *
 * A service with **no** declared preconditions is reported `ready: true` with
 * `declared: 0`, and the reason says so. That is a vacuous truth and the caller
 * is told it is one; hiding it would let an unconfigured service look checked.
 */
export function readyService(
  service: ServiceFacet,
  preconditions: Precondition[],
  authorizingStates: readonly string[] = AUTHORIZING_CONSENT_STATES,
): ServiceReadiness {
  const mine = preconditions.filter((p) => p.gates === service.nodeId);
  const results = mine.map((p) => preconditionGuard(p, authorizingStates));
  const blocking = results.filter((r) => r.verdict !== 'satisfied');

  const metis: MetisHold[] = [];
  if (service.metis) metis.push(service.metis);
  for (const r of blocking) if (r.metis) metis.push(r.metis);

  const ready = blocking.length === 0;

  let reason: string;
  if (mine.length === 0) {
    reason = `no preconditions are declared for ${service.unit} — ready is vacuously true, not verified`;
  } else if (ready) {
    reason = `all ${mine.length} precondition(s) satisfied for ${service.unit}`;
  } else {
    const counts = blocking.reduce<Record<string, number>>((acc, r) => {
      acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
      return acc;
    }, {});
    const shape = Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([verdict, n]) => `${n} ${verdict}`)
      .join(', ');
    reason = `${service.unit} is blocked: ${shape}`;
  }

  return { service: service.nodeId, ready, declared: mine.length, results, blocking, metis, reason };
}

/** Convenience: the linger fact for a tenant, shaped so the expected value is not retyped at every call site. */
export function lingerFact(
  tenantNodeId: NodeId,
  observed?: LingerState,
  observedAt?: string,
): MachineFact {
  return {
    kind: 'linger',
    facetNodeId: tenantNodeId,
    expected: 'enabled',
    observed,
    observedAt,
  };
}
