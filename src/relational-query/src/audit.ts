/**
 * Accountability Audit — relational health metrics and OCAP® compliance.
 */
import type {
  DirectionName,
  Relation,
  RelationalNode,
  RelationalEdge,
} from 'medicine-wheel-ontology-core';
import {
  aggregateWilsonAlignment,
  checkOcapCompliance,
} from 'medicine-wheel-ontology-core';
import type { AccountabilityReport } from './types.js';

/** Generate an accountability report for a relational web */
export function auditAccountability(
  nodes: RelationalNode[],
  edges: RelationalEdge[],
  relations: Relation[],
): AccountabilityReport {
  const recommendations: string[] = [];

  // OCAP compliance
  let ocapCompliant = 0;
  let ocapNonCompliant = 0;
  for (const relation of relations) {
    if (relation.ocap && checkOcapCompliance(relation.ocap).compliant) {
      ocapCompliant++;
    } else {
      ocapNonCompliant++;
    }
  }

  // Wilson alignment
  const averageWilsonAlignment = aggregateWilsonAlignment(relations);

  // Direction coverage
  const directionCoverage: Record<DirectionName, number> = { east: 0, south: 0, west: 0, north: 0 };
  for (const node of nodes) {
    if (node.direction) {
      directionCoverage[node.direction]++;
    }
  }

  // Ceremony honoring
  const ceremoniedRelations = edges.filter(e => e.ceremony_honored).length;
  const unceremoniedRelations = edges.filter(e => !e.ceremony_honored).length;

  // Outstanding obligations (count total obligations across relations)
  let obligationsOutstanding = 0;
  for (const relation of relations) {
    if (relation.obligations) {
      obligationsOutstanding += relation.obligations.reduce((sum, o) => sum + o.obligations.length, 0);
    }
  }

  // Recommendations
  if (ocapNonCompliant > 0) {
    recommendations.push(`${ocapNonCompliant} relation(s) lack full OCAP® compliance — review ownership, control, access, and possession flags`);
  }

  if (averageWilsonAlignment < 0.5) {
    recommendations.push(`Wilson alignment is ${(averageWilsonAlignment * 100).toFixed(0)}% — strengthen respect, reciprocity, and responsibility`);
  }

  const emptyDirections = (Object.entries(directionCoverage) as Array<[DirectionName, number]>)
    .filter(([, count]) => count === 0)
    .map(([dir]) => dir);
  if (emptyDirections.length > 0) {
    recommendations.push(`No nodes in ${emptyDirections.join(', ')} direction(s) — consider expanding relational awareness`);
  }

  if (unceremoniedRelations > ceremoniedRelations && edges.length > 0) {
    recommendations.push(`${unceremoniedRelations} of ${edges.length} relations lack ceremony — consider honoring these connections`);
  }

  if (obligationsOutstanding > 0) {
    recommendations.push(`${obligationsOutstanding} obligation(s) outstanding — attend to relational responsibilities`);
  }

  return {
    totalRelations: relations.length,
    ocapCompliant,
    ocapNonCompliant,
    averageWilsonAlignment: Math.round(averageWilsonAlignment * 100) / 100,
    directionCoverage,
    ceremoniedRelations,
    unceremoniedRelations,
    obligationsOutstanding,
    recommendations,
  };
}

/** Quick OCAP compliance check for a single relation */
export function isOcapCompliant(relation: Relation): boolean {
  return !!relation.ocap && checkOcapCompliance(relation.ocap).compliant;
}

/** Identify relations that need attention (low alignment or non-compliant) */
export function relationsNeedingAttention(
  relations: Relation[],
  wilsonThreshold: number = 0.5,
): Relation[] {
  return relations.filter(r => {
    if (r.ocap && !checkOcapCompliance(r.ocap).compliant) return true;
    if (r.accountability && r.accountability.wilson_alignment < wilsonThreshold) return true;
    return false;
  });
}
