/**
 * @medicine-wheel/ontology-core — Semantic Query Helpers
 *
 * Functions for traversing relational webs, computing Wilson alignment
 * metrics, and checking OCAP® compliance. These helpers operate on
 * in-memory collections — the storage layer (Redis, etc.) is external.
 */

import type {
  DirectionName,
  NodeType,
  RelationalNode,
  Relation,
  RelationalEdge,
  NarrativeBeat,
  MedicineWheelCycle,
  CeremonyLog,
  OcapFlags,
  AccountabilityTracking,
} from './types';

// ── Node Queries ────────────────────────────────────────────────────────────

/** Find all nodes aligned with a given direction */
export function nodesByDirection(
  nodes: RelationalNode[],
  direction: DirectionName
): RelationalNode[] {
  return nodes.filter(n => n.direction === direction);
}

/** Find all nodes of a given type */
export function nodesByType(
  nodes: RelationalNode[],
  type: NodeType
): RelationalNode[] {
  return nodes.filter(n => n.type === type);
}

/** Find a node by ID */
export function nodeById(
  nodes: RelationalNode[],
  id: string
): RelationalNode | undefined {
  return nodes.find(n => n.id === id);
}

// ── Relational Traversal ────────────────────────────────────────────────────

/** Get all relations connected to a given node (as source or target) */
export function relationsForNode(
  relations: Relation[],
  nodeId: string
): Relation[] {
  return relations.filter(r => r.from_id === nodeId || r.to_id === nodeId);
}

/** Get all relations of a given type */
export function relationsByType(
  relations: Relation[],
  type: string
): Relation[] {
  return relations.filter(r => r.relationship_type === type);
}

/** Get neighbor node IDs for a given node through its relations */
export function neighborIds(
  relations: Relation[] | RelationalEdge[],
  nodeId: string
): string[] {
  const ids = new Set<string>();
  for (const r of relations) {
    if (r.from_id === nodeId) ids.add(r.to_id);
    if (r.to_id === nodeId) ids.add(r.from_id);
  }
  return [...ids];
}

/** Traverse the relational web from a starting node up to a given depth */
export function traverseRelationalWeb(
  nodes: RelationalNode[],
  relations: Relation[] | RelationalEdge[],
  startNodeId: string,
  maxDepth: number = 3
): { visited: Set<string>; paths: string[][] } {
  const visited = new Set<string>();
  const paths: string[][] = [];
  const queue: { nodeId: string; path: string[]; depth: number }[] = [
    { nodeId: startNodeId, path: [startNodeId], depth: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, path, depth } = queue.shift()!;
    if (visited.has(nodeId) || depth > maxDepth) continue;
    visited.add(nodeId);
    if (path.length > 1) paths.push(path);

    for (const nId of neighborIds(relations, nodeId)) {
      if (!visited.has(nId)) {
        queue.push({ nodeId: nId, path: [...path, nId], depth: depth + 1 });
      }
    }
  }

  return { visited, paths };
}

// ── Wilson Alignment Metrics ────────────────────────────────────────────────

/**
 * Compute Wilson alignment score for a single accountability tracking object.
 * Wilson's three R's (Respect, Reciprocity, Responsibility) are averaged.
 */
export function computeWilsonAlignment(
  accountability: AccountabilityTracking
): number {
  const { respect, reciprocity, responsibility } = accountability;
  return (respect + reciprocity + responsibility) / 3;
}

/**
 * Compute aggregate Wilson alignment across a collection of relations.
 * Returns 0 if no relations exist.
 */
export function aggregateWilsonAlignment(relations: Relation[]): number {
  if (relations.length === 0) return 0;
  const total = relations.reduce(
    (sum, r) => sum + computeWilsonAlignment(r.accountability),
    0
  );
  return total / relations.length;
}

/**
 * Compute Wilson alignment for a Medicine Wheel cycle based on its
 * ceremonies conducted and relations mapped.
 */
export function cycleWilsonAlignment(
  cycle: MedicineWheelCycle,
  relations: Relation[]
): number {
  if (relations.length === 0) return cycle.wilson_alignment;
  return aggregateWilsonAlignment(relations);
}

/**
 * Identify relations with low Wilson alignment (below threshold).
 * These represent accountability gaps requiring ceremonial attention.
 */
export function findAccountabilityGaps(
  relations: Relation[],
  threshold: number = 0.5
): Relation[] {
  return relations.filter(
    r => computeWilsonAlignment(r.accountability) < threshold
  );
}

// ── OCAP® Compliance ────────────────────────────────────────────────────────

/**
 * Check whether OCAP® flags meet compliance requirements.
 * Full compliance requires: ownership specified, control specified,
 * access not 'public' (for Indigenous data), and compliant flag true.
 */
export function checkOcapCompliance(ocap: OcapFlags): {
  compliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!ocap.ownership || ocap.ownership.trim() === '') {
    issues.push('Ownership not specified');
  }
  if (!ocap.control || ocap.control.trim() === '') {
    issues.push('Control not specified');
  }
  if (!ocap.compliant) {
    issues.push('OCAP® compliance flag not set');
  }
  if (ocap.consent_given === false) {
    issues.push('Consent not given for this use');
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}

/**
 * Check OCAP® compliance across all relations.
 * Returns summary with overall status and per-relation issues.
 */
export function auditOcapCompliance(
  relations: Relation[]
): {
  overall_compliant: boolean;
  compliant_count: number;
  non_compliant_count: number;
  issues: { relation_id: string; issues: string[] }[];
} {
  const results = relations.map(r => ({
    relation_id: r.id,
    ...checkOcapCompliance(r.ocap),
  }));

  const non_compliant = results.filter(r => !r.compliant);

  return {
    overall_compliant: non_compliant.length === 0,
    compliant_count: results.length - non_compliant.length,
    non_compliant_count: non_compliant.length,
    issues: non_compliant.map(r => ({
      relation_id: r.relation_id,
      issues: r.issues,
    })),
  };
}

// ── Narrative Queries ───────────────────────────────────────────────────────

/** Get beats for a specific direction */
export function beatsByDirection(
  beats: NarrativeBeat[],
  direction: DirectionName
): NarrativeBeat[] {
  return beats.filter(b => b.direction === direction);
}

/** Get beats for a specific act number */
export function beatsByAct(
  beats: NarrativeBeat[],
  act: number
): NarrativeBeat[] {
  return beats.filter(b => b.act === act);
}

/** Check whether all four directions have been visited in a set of beats */
export function allDirectionsVisited(beats: NarrativeBeat[]): boolean {
  const visited = new Set(beats.map(b => b.direction));
  return visited.has('east') && visited.has('south') &&
         visited.has('west') && visited.has('north');
}

// ── Ceremony Queries ────────────────────────────────────────────────────────

/** Get ceremonies for a specific direction */
export function ceremoniesByDirection(
  ceremonies: CeremonyLog[],
  direction: DirectionName
): CeremonyLog[] {
  return ceremonies.filter(c => c.direction === direction);
}

/** Count ceremonies across all directions */
export function ceremonyCounts(
  ceremonies: CeremonyLog[]
): Record<DirectionName, number> {
  return {
    east: ceremonies.filter(c => c.direction === 'east').length,
    south: ceremonies.filter(c => c.direction === 'south').length,
    west: ceremonies.filter(c => c.direction === 'west').length,
    north: ceremonies.filter(c => c.direction === 'north').length,
  };
}

// ── Relational Completeness ─────────────────────────────────────────────────

/**
 * Assess relational completeness of a node — how well connected it is
 * across all obligation categories (human, land, spirit, future).
 */
export function relationalCompleteness(
  nodeId: string,
  relations: Relation[]
): {
  total_relations: number;
  obligation_categories_covered: string[];
  missing_categories: string[];
  ceremony_coverage: number;
} {
  const nodeRelations = relationsForNode(relations, nodeId);
  const categories = new Set<string>();

  for (const r of nodeRelations) {
    for (const o of r.obligations) {
      categories.add(o.category);
    }
  }

  const allCategories = ['human', 'land', 'spirit', 'future'];
  const missing = allCategories.filter(c => !categories.has(c));

  const ceremonied = nodeRelations.filter(
    r => r.ceremony_context?.ceremony_honored
  ).length;

  return {
    total_relations: nodeRelations.length,
    obligation_categories_covered: [...categories],
    missing_categories: missing,
    ceremony_coverage: nodeRelations.length > 0
      ? ceremonied / nodeRelations.length
      : 0,
  };
}
