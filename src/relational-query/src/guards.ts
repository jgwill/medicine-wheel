/**
 * @medicine-wheel/relational-query — Protocol Guards
 *
 * Avoidance protocols expressed as code logic: conditional edge filters
 * evaluated BEFORE a traversal crosses a relation. A guard does not veto at
 * inference time — when a boundary is reached it returns an escalation
 * directive (delegate to a qualified custodian), the "in-the-loop" pattern.
 *
 * Built-in guards reproduce the former `respectCeremonyBoundaries` and
 * `ocapOnly` booleans; the avoidance-protocol guard reads the optional
 * `RelationContext` carried by a first-class Relation.
 */
import type { Relation, RelationalEdge } from '@medicine-wheel/ontology-core';
import { checkOcapCompliance } from '@medicine-wheel/ontology-core';

/** Runtime context an agent/being presents when traversing the kinship graph. */
export interface TraversalContext {
  /** Identity of the being attempting traversal (matched against authorized_kin). */
  identity?: string;
  /** Current ceremony state / scope (matched against relation.context.active_context). */
  ceremonyState?: string;
  /** Free-form additional context for custom guards. */
  [key: string]: unknown;
}

/** The decision a guard returns for a single edge crossing. */
export interface GuardDecision {
  allowed: boolean;
  /** When blocked, who to escalate to — delegation, not a veto. */
  escalateTo?: string;
  /** Human-readable reason. */
  reason?: string;
}

/**
 * A protocol guard: a conditional edge filter evaluated before traversal.
 * Receives the edge, its first-class Relation (if one is mapped), and the
 * runtime context; returns whether the edge may be crossed.
 */
export interface ProtocolGuard {
  name: string;
  evaluate(
    edge: RelationalEdge,
    relation: Relation | undefined,
    context: TraversalContext,
  ): GuardDecision;
}

/** A boundary a guard refused to cross, surfaced for delegation. */
export interface GuardEscalation {
  fromId: string;
  toId: string;
  /** Name of the guard that blocked the crossing. */
  guard: string;
  reason?: string;
  escalateTo?: string;
}

// ── Built-in guards ─────────────────────────────────────────────────────────

/** Stop at edges that have not been honored through ceremony. */
export const ceremonyBoundaryGuard: ProtocolGuard = {
  name: 'ceremony-boundary',
  evaluate(edge) {
    if (edge.ceremony_honored) return { allowed: true };
    return {
      allowed: false,
      reason: 'Edge has not been honored through ceremony',
      escalateTo: 'fire_keeper',
    };
  },
};

/** Only follow OCAP®-compliant relations; edges with no mapped relation are open. */
export const ocapComplianceGuard: ProtocolGuard = {
  name: 'ocap-compliance',
  evaluate(_edge, relation) {
    if (!relation) return { allowed: true };
    if (relation.ocap && checkOcapCompliance(relation.ocap).compliant) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Relation is not OCAP®-compliant',
      escalateTo: 'data_steward',
    };
  },
};

/**
 * The avoidance protocol. A relation that carries a `context` is traversable
 * only when (a) its `active_context` matches the runtime ceremony state and
 * (b) the traversing identity is among `authorized_kin`. On failure it does
 * not block silently — it escalates to `authorized_by` (or a qualified
 * custodian). Relations with no declared context are open.
 */
export const avoidanceProtocolGuard: ProtocolGuard = {
  name: 'avoidance-protocol',
  evaluate(_edge, relation, context) {
    const ctx = relation?.context;
    if (!ctx) return { allowed: true };

    const custodian = ctx.authorized_by ?? 'qualified_custodian';

    if (ctx.active_context && context.ceremonyState && ctx.active_context !== context.ceremonyState) {
      return {
        allowed: false,
        reason: `Relation is valid in '${ctx.active_context}', not '${context.ceremonyState}'`,
        escalateTo: custodian,
      };
    }

    if (ctx.authorized_kin && ctx.authorized_kin.length > 0) {
      if (!context.identity || !ctx.authorized_kin.includes(context.identity)) {
        return {
          allowed: false,
          reason: 'Traversing identity is not among authorized_kin',
          escalateTo: custodian,
        };
      }
    }

    return { allowed: true };
  },
};

/**
 * Evaluate a stack of guards against one edge crossing. The first guard that
 * blocks wins; if every guard allows, the crossing is permitted.
 */
export function evaluateGuards(
  guards: ProtocolGuard[],
  edge: RelationalEdge,
  relation: Relation | undefined,
  context: TraversalContext,
): { decision: GuardDecision; guard?: string } {
  for (const guard of guards) {
    const decision = guard.evaluate(edge, relation, context);
    if (!decision.allowed) return { decision, guard: guard.name };
  }
  return { decision: { allowed: true } };
}
