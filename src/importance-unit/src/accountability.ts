/**
 * @medicine-wheel/importance-unit — Accountability Link Management
 *
 * Manages the relational strings connecting ImportanceUnits to what
 * they are accountable to. The question is "To what is this accountable?"
 * not "What is this about?"
 *
 * Wilson's relational accountability requires that every piece of
 * knowledge be tethered to its responsibilities.
 */

import type {
  ImportanceUnit,
  AccountabilityLink,
  AccountabilityLinkType,
} from './types.js';

// ── Gap Analysis Result ─────────────────────────────────────────────────────

/**
 * Result of analyzing accountability gaps in a set of ImportanceUnits.
 */
export interface AccountabilityGap {
  /** ID of the unit with a gap */
  unitId: string;
  /** Description of the gap */
  description: string;
  /** Suggested link type to address the gap */
  suggestedLinkType: AccountabilityLinkType;
}

// ── Link Management ─────────────────────────────────────────────────────────

/**
 * Add an accountability link to an ImportanceUnit.
 *
 * Returns a new unit with the link appended. Does not add
 * duplicate links (same targetId and relationType).
 *
 * @param unit - The unit to link from
 * @param link - The accountability link to add
 * @returns The unit with the new link
 */
export function linkAccountability(
  unit: ImportanceUnit,
  link: AccountabilityLink,
): ImportanceUnit {
  const exists = unit.accountabilityLinks.some(
    (l) => l.targetId === link.targetId && l.relationType === link.relationType,
  );
  if (exists) return unit;

  return {
    ...unit,
    accountabilityLinks: [...unit.accountabilityLinks, link],
  };
}

/**
 * Resolve all accountability links for a unit against a collection
 * of known ImportanceUnits. Returns the links that point to valid
 * existing units.
 *
 * @param unit - The unit whose links to resolve
 * @param allUnits - Map of all known units by ID
 * @returns Object with resolved (found) and unresolved (dangling) links
 */
export function resolveLinks(
  unit: ImportanceUnit,
  allUnits: Map<string, ImportanceUnit>,
): { resolved: AccountabilityLink[]; unresolved: AccountabilityLink[] } {
  const resolved: AccountabilityLink[] = [];
  const unresolved: AccountabilityLink[] = [];

  for (const link of unit.accountabilityLinks) {
    if (allUnits.has(link.targetId)) {
      resolved.push(link);
    } else {
      unresolved.push(link);
    }
  }

  return { resolved, unresolved };
}

/**
 * Find accountability gaps across a set of ImportanceUnits.
 *
 * Identifies units that lack key relational connections:
 * - Units with no accountability links at all
 * - Units with no 'accountable-to' link
 * - Units with high epistemic weight but no 'deepens' or 'circles-back-to' links
 *
 * @param units - Collection of ImportanceUnits to analyze
 * @returns Array of identified gaps
 */
export function findGaps(units: ImportanceUnit[]): AccountabilityGap[] {
  const gaps: AccountabilityGap[] = [];

  for (const unit of units) {
    // Units with no links at all are relationally isolated
    if (unit.accountabilityLinks.length === 0) {
      gaps.push({
        unitId: unit.id,
        description: 'Unit has no accountability links — relationally isolated',
        suggestedLinkType: 'accountable-to',
      });
      continue;
    }

    // Every unit should be accountable to something
    const hasAccountableTo = unit.accountabilityLinks.some(
      (l) => l.relationType === 'accountable-to',
    );
    if (!hasAccountableTo) {
      gaps.push({
        unitId: unit.id,
        description: 'Unit lacks an "accountable-to" link — knowledge without accountability',
        suggestedLinkType: 'accountable-to',
      });
    }

    // High-weight units should have deepening connections
    if (unit.epistemicWeight >= 0.8) {
      const hasDeepening = unit.accountabilityLinks.some(
        (l) => l.relationType === 'deepens' || l.relationType === 'circles-back-to',
      );
      if (!hasDeepening) {
        gaps.push({
          unitId: unit.id,
          description: 'High-weight unit lacks deepening links — authority without depth',
          suggestedLinkType: 'deepens',
        });
      }
    }
  }

  return gaps;
}
