/**
 * medicine-wheel-graph-viz — RSIS Visualization Utilities
 *
 * Transforms relational graph data into renderable formats
 * for D3, Sigma, Mermaid, and polar charts.
 */

import type {
  KinshipHubInfo,
  KinshipRelation,
  ReciprocityFlow,
  DirectionName,
  DirectionDistribution,
} from 'medicine-wheel-ontology-core';

// ── Kinship Graph ───────────────────────────────────────────────────────────

export interface KinshipGraphNode {
  id: string;
  label: string;
  identity: string;
  group: string;
}

export interface KinshipGraphEdge {
  source: string;
  target: string;
  label: string;
}

/** Transform kinship hubs and relations into D3/Sigma-compatible graph data */
export function toKinshipGraphLayout(
  hubs: KinshipHubInfo[],
  relations: KinshipRelation[],
): { nodes: KinshipGraphNode[]; edges: KinshipGraphEdge[] } {
  const nodes: KinshipGraphNode[] = hubs.map(hub => ({
    id: hub.path,
    label: hub.identity || hub.path,
    identity: hub.identity,
    group: hub.lineage || 'root',
  }));
  const edges: KinshipGraphEdge[] = relations.map(rel => ({
    source: rel.from,
    target: rel.to,
    label: rel.type,
  }));
  return { nodes, edges };
}

// ── Reciprocity Flow Diagram ────────────────────────────────────────────────

export interface FlowDiagramNode {
  id: string;
  label: string;
  value: number;
}

export interface FlowDiagramLink {
  source: string;
  target: string;
  value: number;
}

/** Transform reciprocity flows into Sankey/flow diagram data */
export function toReciprocityFlowDiagram(
  flows: ReciprocityFlow[],
): { nodes: FlowDiagramNode[]; links: FlowDiagramLink[] } {
  const nodeSet = new Set<string>();
  for (const flow of flows) {
    nodeSet.add(flow.from);
    nodeSet.add(flow.to);
  }
  const nodes: FlowDiagramNode[] = Array.from(nodeSet).map(name => ({
    id: name,
    label: name,
    value: flows.filter(f => f.from === name || f.to === name)
      .reduce((sum, f) => sum + f.count, 0),
  }));
  const links: FlowDiagramLink[] = flows.map(f => ({
    source: f.from,
    target: f.to,
    value: f.count,
  }));
  return { nodes, links };
}

// ── Direction Wheel ─────────────────────────────────────────────────────────

export interface DirectionWheelSegment {
  direction: DirectionName;
  emoji: string;
  value: number;
  label: string;
}

/** Transform direction distribution into polar chart data */
export function toDirectionWheelData(
  distribution: DirectionDistribution,
): DirectionWheelSegment[] {
  const emojiMap: Record<DirectionName, string> = {
    east: '🌸', south: '🧠', west: '⚡', north: '🕸️',
  };
  const labelMap: Record<DirectionName, string> = {
    east: 'Vision', south: 'Architecture', west: 'Implementation', north: 'Reflection',
  };
  return (['east', 'south', 'west', 'north'] as DirectionName[]).map(dir => ({
    direction: dir,
    emoji: emojiMap[dir],
    value: distribution[dir],
    label: labelMap[dir],
  }));
}

// ── Ceremony Timeline ───────────────────────────────────────────────────────

export interface TimelineEntry {
  id: string;
  name: string;
  sun: string;
  cycle: string;
  phase: string;
  startDate?: string;
  endDate?: string;
}

/** Transform ceremony data into timeline chart data */
export function toCeremonyTimelineData(
  ceremonies: Array<{ id: string; name: string; hostSun: string; cycle: string; phase: string; startDate?: string; endDate?: string }>,
): TimelineEntry[] {
  return ceremonies.map(c => ({
    id: c.id,
    name: c.name,
    sun: c.hostSun,
    cycle: c.cycle,
    phase: c.phase,
    startDate: c.startDate,
    endDate: c.endDate,
  }));
}

// ── Mermaid Export ───────────────────────────────────────────────────────────

/** Generate a Mermaid diagram for kinship relationships */
export function toMermaidDiagram(
  hubs: KinshipHubInfo[],
  relations: KinshipRelation[],
): string {
  const lines: string[] = ['graph TD'];
  for (const hub of hubs) {
    const id = hub.path.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`    ${id}["${hub.identity || hub.path}"]`);
  }
  for (const rel of relations) {
    const fromId = rel.from.replace(/[^a-zA-Z0-9]/g, '_');
    const toId = rel.to.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`    ${fromId} -->|${rel.type}| ${toId}`);
  }
  return lines.join('\n');
}
