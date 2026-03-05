/**
 * medicine-wheel-relational-query — Cypher Query Builders
 *
 * Generates Cypher queries for RSIS relational science dimensions.
 * Used by rsis-gitnexus tool handlers to query the KuzuDB graph.
 */

import type { DirectionName, SunName } from 'medicine-wheel-ontology-core';

/** Escape a string for safe use in Cypher string literals */
function escapeCypher(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Build a Cypher query to find stewards of a symbol */
export function queryStewards(symbolId: string): string {
  const escaped = escapeCypher(symbolId);
  return `MATCH (p:Person)-[:RSISRelation {type: 'STEWARDS'}]->(n {id: '${escaped}'})
RETURN p.id AS id, p.name AS name, p.email AS email, p.roles AS roles`;
}

/** Build a Cypher query to find ceremony provenance */
export function queryCeremonyProvenance(symbolId: string): string {
  const escaped = escapeCypher(symbolId);
  return `MATCH (n {id: '${escaped}'})-[:RSISRelation {type: 'BORN_FROM'}]->(c:Ceremony)
RETURN c.id AS id, c.name AS name, c.hostSun AS hostSun, c.cycle AS cycle, c.phase AS phase, c.intention AS intention
ORDER BY c.cycle`;
}

/** Build a Cypher query to find inquiries a symbol serves */
export function queryInquiries(symbolId: string): string {
  const escaped = escapeCypher(symbolId);
  return `MATCH (n {id: '${escaped}'})-[:RSISRelation {type: 'SERVES'}]->(i:Inquiry)
RETURN i.id AS id, i.name AS name, i.sun AS sun, i.coreQuestion AS coreQuestion`;
}

/** Build a Cypher query to find kinship hubs */
export function queryKinshipHubs(): string {
  return `MATCH (k:KinshipHub)
RETURN k.id AS id, k.name AS name, k.filePath AS filePath, k.identity AS identity,
       k.lineage AS lineage, k.humanAccountabilities AS humanAccountabilities,
       k.moreThanHumanAccountabilities AS moreThanHumanAccountabilities, k.boundaries AS boundaries`;
}

/** Build a Cypher query to find kinship relations */
export function queryKinshipRelations(): string {
  return `MATCH (a:KinshipHub)-[r:RSISRelation {type: 'KINSHIP_OF'}]->(b:KinshipHub)
RETURN a.name AS from_name, b.name AS to_name, r.reason AS reason`;
}

/** Build a Cypher query to find direction alignment */
export function queryDirectionAlignment(symbolId: string): string {
  const escaped = escapeCypher(symbolId);
  return `MATCH (n {id: '${escaped}'})-[:RSISRelation {type: 'ALIGNED_WITH'}]->(d:Direction)
RETURN d.name AS name, d.focus AS focus`;
}

/** Build a Cypher query to find reciprocity flows */
export function queryReciprocityFlows(): string {
  return `MATCH (p:Person)-[r:RSISRelation {type: 'GIVES_BACK_TO'}]->(target)
RETURN p.name AS from_name, labels(target)[0] AS target_type, target.name AS to_name, r.reason AS reason
LIMIT 50`;
}

/** Build a Cypher query for all inquiries in a Sun */
export function queryInquiriesBySun(sun: SunName): string {
  return `MATCH (i:Inquiry {sun: '${sun}'})
RETURN i.id AS id, i.name AS name, i.coreQuestion AS coreQuestion, i.status AS status`;
}

/** Build a Cypher query for all ceremonies */
export function queryCeremonies(): string {
  return `MATCH (c:Ceremony) RETURN c.id AS id, c.name AS name, c.hostSun AS hostSun, c.cycle AS cycle, c.phase AS phase`;
}

/** Build a Cypher query for all inquiries */
export function queryAllInquiries(): string {
  return `MATCH (i:Inquiry) RETURN i.id AS id, i.name AS name, i.sun AS sun, i.coreQuestion AS coreQuestion, i.status AS status`;
}

/**
 * Format a reciprocity observation — always framed as invitation, never performance
 */
export function formatReciprocityObservation(
  flows: Array<{ from: string; to: string; type: string }>
): string {
  if (flows.length === 0) {
    return 'No reciprocity data has been populated yet. Consider running rsis-gitnexus analyze with RSIS mode enabled.';
  }
  return `${flows.length} reciprocity flow(s) identified. This area invites reflection on how contributions move through the ecosystem.`;
}

/**
 * Format a direction distribution observation
 */
export function formatDirectionObservation(
  distribution: Record<DirectionName, number>
): string {
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const weakest = sorted[sorted.length - 1][0];
  const emoji: Record<string, string> = { east: '🌸', south: '🧠', west: '⚡', north: '🕸️' };
  return `Recent work is concentrated in ${dominant} ${emoji[dominant]} (${distribution[dominant as DirectionName]}%). ` +
    `The ecosystem may benefit from a ${weakest} ${emoji[weakest]} ceremony.`;
}
