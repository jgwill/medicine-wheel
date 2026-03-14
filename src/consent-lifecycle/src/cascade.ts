/**
 * @medicine-wheel/consent-lifecycle — Cascade Module
 *
 * Manages cascading effects of consent changes. When consent
 * is withdrawn or scope changes, all dependent relations must
 * be updated. This honors the interconnected nature of consent.
 */

import type {
  ConsentRecord,
  ConsentScope,
  ConsentCascade,
} from './types.js';

/**
 * Compute the cascading effects of consent withdrawal.
 * All dependent relations must be notified and updated.
 */
export function onWithdrawal(record: ConsentRecord): ConsentCascade {
  return {
    triggerId: record.id,
    affected: [...record.dependentRelations],
    action: 'withdraw',
  };
}

/**
 * Propagate a scope change to all dependent relations.
 * Determines whether dependent relations need review or narrowing.
 */
export function propagateScopeChange(
  record: ConsentRecord,
  newScope: ConsentScope,
): ScopeChangeResult {
  const narrowed = isNarrower(record.scope, newScope);
  const widened = isWider(record.scope, newScope);

  const cascade: ConsentCascade = {
    triggerId: record.id,
    affected: [...record.dependentRelations],
    action: narrowed ? 'narrow' : 'review',
  };

  const affectedDetails: AffectedRelation[] = record.dependentRelations.map(
    (relId) => ({
      relationId: relId,
      action: narrowed ? 'narrow' as const : 'review' as const,
      reason: narrowed
        ? 'Parent consent scope narrowed — dependent scope must be reviewed.'
        : 'Parent consent scope changed — dependent relations need review.',
    }),
  );

  return {
    cascade,
    narrowed,
    widened,
    affectedRelations: affectedDetails,
    requiresReconsent: widened,
    summary: record.dependentRelations.length === 0
      ? 'No dependent relations affected by scope change.'
      : `${record.dependentRelations.length} dependent relation(s) affected. Action: ${cascade.action}.`,
  };
}

/**
 * Find all relations that depend on a given consent record.
 * Returns the dependent relation IDs with their dependency nature.
 */
export function findDependentRelations(
  record: ConsentRecord,
  allRecords: ConsentRecord[],
): DependencyResult {
  // Direct dependents
  const directDependents = record.dependentRelations;

  // Transitive dependents: relations that depend on our dependents
  const transitiveDependents: string[] = [];
  for (const depId of directDependents) {
    const depRecord = allRecords.find((r) => r.id === depId);
    if (depRecord) {
      for (const transId of depRecord.dependentRelations) {
        if (!directDependents.includes(transId) && !transitiveDependents.includes(transId)) {
          transitiveDependents.push(transId);
        }
      }
    }
  }

  return {
    directCount: directDependents.length,
    transitiveCount: transitiveDependents.length,
    directDependents,
    transitiveDependents,
    totalAffected: directDependents.length + transitiveDependents.length,
    summary: directDependents.length === 0
      ? 'No dependent relations found.'
      : `${directDependents.length} direct and ${transitiveDependents.length} transitive dependent(s).`,
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Details of how a dependent relation is affected */
export interface AffectedRelation {
  relationId: string;
  action: 'narrow' | 'review' | 'withdraw' | 'expire';
  reason: string;
}

/** Result of scope change propagation */
export interface ScopeChangeResult {
  cascade: ConsentCascade;
  narrowed: boolean;
  widened: boolean;
  affectedRelations: AffectedRelation[];
  requiresReconsent: boolean;
  summary: string;
}

/** Result of dependency analysis */
export interface DependencyResult {
  directCount: number;
  transitiveCount: number;
  directDependents: string[];
  transitiveDependents: string[];
  totalAffected: number;
  summary: string;
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function isNarrower(oldScope: ConsentScope, newScope: ConsentScope): boolean {
  const fewerTypes = newScope.dataTypes.length < oldScope.dataTypes.length;
  const fewerPurposes = newScope.purposes.length < oldScope.purposes.length;
  const moreRestrictions = newScope.restrictions.length > oldScope.restrictions.length;
  return fewerTypes || fewerPurposes || moreRestrictions;
}

function isWider(oldScope: ConsentScope, newScope: ConsentScope): boolean {
  const moreTypes = newScope.dataTypes.some((t) => !oldScope.dataTypes.includes(t));
  const morePurposes = newScope.purposes.some((p) => !oldScope.purposes.includes(p));
  const fewerRestrictions = oldScope.restrictions.some((r) => !newScope.restrictions.includes(r));
  return moreTypes || morePurposes || fewerRestrictions;
}
