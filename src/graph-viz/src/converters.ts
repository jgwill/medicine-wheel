/**
 * medicine-wheel-graph-viz — Conversion Utilities
 *
 * Convert ontology-core data structures into graph visualization format.
 */

import type {
  RelationalNode,
  RelationalEdge,
  Relation,
} from 'medicine-wheel-ontology-core';

import {
  NODE_TYPE_COLORS,
} from 'medicine-wheel-ontology-core';

import type { MWGraphNode, MWGraphLink, MWGraphData, LinkStyle } from './types.js';

/**
 * Convert RelationalNode[] to MWGraphNode[]
 */
export function nodesToGraphNodes(nodes: RelationalNode[]): MWGraphNode[] {
  return nodes.map(node => ({
    id: node.id,
    label: node.name,
    type: node.type,
    direction: node.direction,
    color: NODE_TYPE_COLORS[node.type],
    size: 8,
    opacity: 1,
    data: node,
    metadata: node.metadata,
  }));
}

/**
 * Convert RelationalEdge[] to MWGraphLink[]
 */
export function edgesToGraphLinks(edges: RelationalEdge[]): MWGraphLink[] {
  return edges.map(edge => ({
    source: edge.from_id,
    target: edge.to_id,
    label: edge.relationship_type,
    strength: edge.strength,
    ceremonyHonored: edge.ceremony_honored,
    style: edge.ceremony_honored ? 'ceremony' as LinkStyle : 'solid' as LinkStyle,
    width: 1 + edge.strength * 2,
    curvature: 0.15,
  }));
}

/**
 * Convert first-class Relation[] to MWGraphLink[]
 */
export function relationsToGraphLinks(relations: Relation[]): MWGraphLink[] {
  return relations.map(rel => ({
    source: rel.from_id,
    target: rel.to_id,
    label: rel.relationship_type,
    strength: rel.strength,
    ceremonyHonored: rel.ceremony_context?.ceremony_honored ?? false,
    ceremonyType: rel.ceremony_context?.ceremony_type,
    style: (rel.ceremony_context?.ceremony_honored ? 'ceremony' : 'solid') as LinkStyle,
    width: 1 + rel.strength * 2,
    curvature: 0.15,
    metadata: rel.metadata,
  }));
}

/**
 * Build complete MWGraphData from ontology-core entities.
 */
export function buildGraphData(
  nodes: RelationalNode[],
  edges: RelationalEdge[] | Relation[]
): MWGraphData {
  const graphNodes = nodesToGraphNodes(nodes);

  // Type guard: first-class Relations carry 'accountability' + 'ocap' fields
  const isRelation = (e: RelationalEdge | Relation): e is Relation =>
    'accountability' in e && 'ocap' in e;

  const graphLinks = edges.length > 0 && isRelation(edges[0])
    ? relationsToGraphLinks(edges as Relation[])
    : edgesToGraphLinks(edges as RelationalEdge[]);

  return { nodes: graphNodes, links: graphLinks };
}
