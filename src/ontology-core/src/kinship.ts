/**
 * @medicine-wheel/ontology-core — Kinship Edge Vocabulary
 *
 * A governed registry of named, directional kinship edges — the relational
 * replacement for the free-string `relationship_type`. Expressed as DATA,
 * not a class hierarchy: in a kinship graph the structure lives in the edges,
 * and no edge type is a subclass of another. Land, human, spirit, ancestor,
 * future, knowledge — all are connected by edges that read the same on every
 * being they touch.
 *
 * Symmetry:
 *   - 'symmetric'  — the relation reads the same in both directions
 *                    (e.g. `co-emerges-with`); no inverse.
 *   - 'asymmetric' — the relation has a directional reading and declares its
 *                    inverse (e.g. `holds-responsibility-for` ↔ `in-care-of`).
 */

import type { ObligationCategory } from './types';

export type EdgeSymmetry = 'symmetric' | 'asymmetric';

export interface KinshipEdgeType {
  /** Canonical name (kebab-case for kinship edges, RSIS verbs kept as-is). */
  name: string;
  /** Whether the relation reads the same both ways. */
  symmetry: EdgeSymmetry;
  /** For asymmetric edges, the name of the reverse-direction reading. */
  inverse?: string;
  /** Human-readable description of the relational meaning. */
  description: string;
  /** Obligation categories a relation of this type tends to carry. */
  defaultObligations?: ObligationCategory[];
}

/**
 * The canonical kinship-edge registry. The four core kinship edges express
 * non-hierarchical relation; the RSIS verbs are carried here too so the
 * vocabulary has a single governed source (consumed by Cypher generation).
 */
export const KINSHIP_EDGE_TYPES = {
  'tends-to': {
    name: 'tends-to',
    symmetry: 'asymmetric',
    inverse: 'tended-by',
    description: 'One being cares for, nurtures, or maintains another over time.',
    defaultObligations: ['land', 'future'],
  },
  'speaks-with': {
    name: 'speaks-with',
    symmetry: 'symmetric',
    description: 'Two beings are in dialogue — knowledge passes both ways.',
    defaultObligations: ['human'],
  },
  'holds-responsibility-for': {
    name: 'holds-responsibility-for',
    symmetry: 'asymmetric',
    inverse: 'in-care-of',
    description: 'One being carries accountability and obligation toward another.',
    defaultObligations: ['human', 'future'],
  },
  'co-emerges-with': {
    name: 'co-emerges-with',
    symmetry: 'symmetric',
    description: 'Two beings arise together; neither precedes the other.',
    defaultObligations: ['spirit'],
  },
  // ── RSIS verbs (kept as-is for KuzuDB Cypher back-compat) ──────────────────
  STEWARDS: {
    name: 'STEWARDS',
    symmetry: 'asymmetric',
    inverse: 'stewarded-by',
    description: 'A person tends and takes responsibility for a symbol or place.',
    defaultObligations: ['human'],
  },
  BORN_FROM: {
    name: 'BORN_FROM',
    symmetry: 'asymmetric',
    inverse: 'gave-rise-to',
    description: 'A being emerged from a ceremony, inquiry, or ancestor.',
    defaultObligations: ['spirit'],
  },
  SERVES: {
    name: 'SERVES',
    symmetry: 'asymmetric',
    inverse: 'served-by',
    description: 'A being is in service of an inquiry or purpose.',
    defaultObligations: ['human'],
  },
  GIVES_BACK_TO: {
    name: 'GIVES_BACK_TO',
    symmetry: 'asymmetric',
    inverse: 'receives-from',
    description: 'Reciprocity flow — a being returns value to its source.',
    defaultObligations: ['future'],
  },
  ALIGNED_WITH: {
    name: 'ALIGNED_WITH',
    symmetry: 'symmetric',
    description: 'A being is in directional alignment with another.',
  },
  KINSHIP_OF: {
    name: 'KINSHIP_OF',
    symmetry: 'symmetric',
    description: 'Two hubs hold a kinship relation with one another.',
  },
} as const satisfies Record<string, KinshipEdgeType>;

/** Union of governed kinship-edge names — the value stored on a Relation. */
export type KinshipEdgeName = keyof typeof KINSHIP_EDGE_TYPES;

/** All registered kinship-edge names. */
export const KINSHIP_EDGE_NAMES = Object.keys(KINSHIP_EDGE_TYPES) as KinshipEdgeName[];

/** Look up the metadata for a kinship-edge name. */
export function getKinshipEdgeType(name: string): KinshipEdgeType | undefined {
  return (KINSHIP_EDGE_TYPES as Record<string, KinshipEdgeType>)[name];
}

/** True when `name` is a governed kinship-edge name. */
export function isKinshipEdgeName(name: string): name is KinshipEdgeName {
  return Object.prototype.hasOwnProperty.call(KINSHIP_EDGE_TYPES, name);
}

/**
 * The reverse-direction reading of an edge name. Symmetric edges return their
 * own name; asymmetric edges return their declared inverse (or undefined if a
 * non-registered name is passed).
 */
export function inverseEdge(name: string): string | undefined {
  const edge = getKinshipEdgeType(name);
  if (!edge) return undefined;
  return edge.symmetry === 'symmetric' ? edge.name : edge.inverse;
}
