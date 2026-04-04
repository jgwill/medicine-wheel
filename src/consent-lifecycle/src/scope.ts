/**
 * @medicine-wheel/consent-lifecycle — Scope Module
 *
 * Manages consent scope: defining, narrowing, widening,
 * and checking whether actions fall within scope.
 */

import type { ConsentScope } from './types.js';

/**
 * Create a new consent scope with the given parameters.
 * A scope defines the boundaries of what is consented.
 */
export function defineScope(
  description: string,
  dataTypes: string[],
  purposes: string[],
): ConsentScope {
  return {
    description,
    dataTypes,
    purposes,
    restrictions: [],
  };
}

/**
 * Narrow an existing scope by adding restrictions.
 * Narrowing does not require re-consent — it only limits scope.
 */
export function narrowScope(
  scope: ConsentScope,
  restrictions: string[],
): ConsentScope {
  return {
    ...scope,
    restrictions: [...scope.restrictions, ...restrictions],
  };
}

/**
 * Widen a scope by adding data types, purposes, or removing restrictions.
 * IMPORTANT: Widening scope requires re-consent from the grantor.
 * This function returns the proposed new scope; the caller must
 * initiate a renegotiation process.
 */
export function widenScope(
  scope: ConsentScope,
  additions: ScopeAdditions,
): WidenScopeResult {
  const newScope: ConsentScope = {
    ...scope,
    dataTypes: additions.dataTypes
      ? [...scope.dataTypes, ...additions.dataTypes]
      : scope.dataTypes,
    purposes: additions.purposes
      ? [...scope.purposes, ...additions.purposes]
      : scope.purposes,
    restrictions: additions.removeRestrictions
      ? scope.restrictions.filter((r) => !additions.removeRestrictions!.includes(r))
      : scope.restrictions,
    duration: additions.duration ?? scope.duration,
    geographic: additions.geographic ?? scope.geographic,
  };

  return {
    proposedScope: newScope,
    requiresReconsent: true,
    changes: describeChanges(scope, newScope),
  };
}

/**
 * Check whether a specific action falls within the consent scope.
 * Returns true if the action's data type and purpose are covered
 * and not restricted.
 */
export function scopeIncludes(
  scope: ConsentScope,
  query: ScopeQuery,
): ScopeCheckResult {
  const issues: string[] = [];

  // Check data type
  const dataTypeMatch = scope.dataTypes.some(
    (dt) => dt === query.dataType || dt === '*',
  );
  if (!dataTypeMatch) {
    issues.push(`Data type '${query.dataType}' is not within consent scope.`);
  }

  // Check purpose
  const purposeMatch = scope.purposes.some(
    (p) => p === query.purpose || p === '*',
  );
  if (!purposeMatch) {
    issues.push(`Purpose '${query.purpose}' is not within consent scope.`);
  }

  // Check restrictions
  for (const restriction of scope.restrictions) {
    const lower = restriction.toLowerCase();
    if (
      lower.includes(query.dataType.toLowerCase()) ||
      lower.includes(query.purpose.toLowerCase())
    ) {
      issues.push(`Action may violate restriction: '${restriction}'.`);
    }
  }

  // Check geographic if specified
  if (scope.geographic && query.geographic && scope.geographic !== query.geographic) {
    issues.push(`Geographic scope mismatch: consented for '${scope.geographic}', action in '${query.geographic}'.`);
  }

  return {
    withinScope: issues.length === 0,
    issues,
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Additions to propose when widening scope */
export interface ScopeAdditions {
  dataTypes?: string[];
  purposes?: string[];
  removeRestrictions?: string[];
  duration?: string;
  geographic?: string;
}

/** Result of a scope widening operation */
export interface WidenScopeResult {
  proposedScope: ConsentScope;
  requiresReconsent: boolean;
  changes: string[];
}

/** Query to check against a consent scope */
export interface ScopeQuery {
  dataType: string;
  purpose: string;
  geographic?: string;
}

/** Result of a scope inclusion check */
export interface ScopeCheckResult {
  withinScope: boolean;
  issues: string[];
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function describeChanges(oldScope: ConsentScope, newScope: ConsentScope): string[] {
  const changes: string[] = [];
  const addedTypes = newScope.dataTypes.filter((t) => !oldScope.dataTypes.includes(t));
  const addedPurposes = newScope.purposes.filter((p) => !oldScope.purposes.includes(p));
  const removedRestrictions = oldScope.restrictions.filter((r) => !newScope.restrictions.includes(r));

  if (addedTypes.length > 0) changes.push(`Added data types: ${addedTypes.join(', ')}`);
  if (addedPurposes.length > 0) changes.push(`Added purposes: ${addedPurposes.join(', ')}`);
  if (removedRestrictions.length > 0) changes.push(`Removed restrictions: ${removedRestrictions.join(', ')}`);
  if (newScope.duration !== oldScope.duration) changes.push(`Duration changed to: ${newScope.duration ?? 'unset'}`);
  if (newScope.geographic !== oldScope.geographic) changes.push(`Geographic scope changed to: ${newScope.geographic ?? 'unset'}`);

  return changes;
}
