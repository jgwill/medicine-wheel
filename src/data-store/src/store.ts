/**
 * Medicine Wheel Data Store — Relational Memory Store
 *
 * Core CRUD operations for Nodes, Edges, Ceremonies, and Accountability.
 * Uses the shared Redis connection from ./connection.
 */

import type { DirectionName, NodeType, CeremonyType } from 'medicine-wheel-ontology-core';
import { getRedis } from './connection.js';

// ── Domain Interfaces ──

export interface RelationalNode {
  id: string;
  type: NodeType;
  name: string;
  description: string;
  direction?: DirectionName;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RelationalEdge {
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;
  ceremony_honored: boolean;
  last_ceremony?: string;
  obligations: string[];
  created_at: string;
}

export interface CeremonyLog {
  id: string;
  type: CeremonyType;
  direction: DirectionName;
  participants: string[];
  medicines_used: string[];
  intentions: string[];
  timestamp: string;
  research_context?: string;
}

export interface AccountabilityData {
  wilson_score: number;
  ocap_compliant: boolean;
  elders_consulted: string[];
  community_approval: boolean;
  last_audit: string;
}

// ── Node Operations ──

export async function createNode(node: RelationalNode): Promise<void> {
  const redis = await getRedis();
  await redis.hSet(`node:${node.id}`, {
    id: node.id,
    type: node.type,
    name: node.name,
    description: node.description,
    direction: node.direction || '',
    metadata: JSON.stringify(node.metadata),
    created_at: node.created_at,
    updated_at: node.updated_at,
  });
  await redis.sAdd(`nodes:type:${node.type}`, node.id);
  if (node.direction) {
    await redis.sAdd(`nodes:direction:${node.direction}`, node.id);
  }
}

function parseNodeHash(data: Record<string, string>): RelationalNode {
  return {
    id: data.id,
    type: data.type as NodeType,
    name: data.name,
    description: data.description,
    direction: (data.direction || undefined) as DirectionName | undefined,
    metadata: JSON.parse(data.metadata || '{}'),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getNode(id: string): Promise<RelationalNode | null> {
  const redis = await getRedis();
  const data = await redis.hGetAll(`node:${id}`);
  if (!data || Object.keys(data).length === 0) return null;
  return parseNodeHash(data);
}

export async function getNodesByType(type: NodeType): Promise<RelationalNode[]> {
  const redis = await getRedis();
  const ids = await redis.sMembers(`nodes:type:${type}`);
  const nodes: RelationalNode[] = [];
  for (const id of ids) {
    const node = await getNode(id);
    if (node) nodes.push(node);
  }
  return nodes;
}

export async function getNodesByDirection(direction: DirectionName): Promise<RelationalNode[]> {
  const redis = await getRedis();
  const ids = await redis.sMembers(`nodes:direction:${direction}`);
  const nodes: RelationalNode[] = [];
  for (const id of ids) {
    const node = await getNode(id);
    if (node) nodes.push(node);
  }
  return nodes;
}

export async function getAllNodes(limit = 100): Promise<RelationalNode[]> {
  const nodes: RelationalNode[] = [];
  const types: NodeType[] = ['human', 'land', 'spirit', 'ancestor', 'future', 'knowledge'];
  for (const type of types) {
    const typeNodes = await getNodesByType(type);
    nodes.push(...typeNodes);
    if (nodes.length >= limit) break;
  }
  return nodes
    .slice(0, limit)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function searchNodes(query: string, options?: {
  type?: NodeType;
  direction?: DirectionName;
  limit?: number;
}): Promise<RelationalNode[]> {
  const { type, direction, limit = 50 } = options || {};
  let nodes: RelationalNode[];

  if (type) {
    nodes = await getNodesByType(type);
  } else if (direction) {
    nodes = await getNodesByDirection(direction);
  } else {
    nodes = await getAllNodes(500);
  }

  const q = query.toLowerCase();
  return nodes
    .filter(n => n.name.toLowerCase().includes(q) || n.description.toLowerCase().includes(q))
    .sort((a, b) => {
      const score = (n: RelationalNode) =>
        (n.name.toLowerCase() === q ? 3 : 0) +
        (n.name.toLowerCase().includes(q) ? 2 : 0) +
        (n.description.toLowerCase().includes(q) ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}

// ── Edge Operations ──

export async function createEdge(edge: RelationalEdge): Promise<void> {
  const redis = await getRedis();
  await redis.hSet(`edge:${edge.from_id}:${edge.to_id}`, {
    from_id: edge.from_id,
    to_id: edge.to_id,
    relationship_type: edge.relationship_type,
    strength: edge.strength.toString(),
    ceremony_honored: edge.ceremony_honored ? '1' : '0',
    last_ceremony: edge.last_ceremony || '',
    obligations: JSON.stringify(edge.obligations),
    created_at: edge.created_at,
  });
  await redis.sAdd(`edges:from:${edge.from_id}`, edge.to_id);
  await redis.sAdd(`edges:to:${edge.to_id}`, edge.from_id);
}

function parseEdgeHash(data: Record<string, string>): RelationalEdge {
  return {
    from_id: data.from_id,
    to_id: data.to_id,
    relationship_type: data.relationship_type,
    strength: parseFloat(data.strength),
    ceremony_honored: data.ceremony_honored === '1',
    last_ceremony: data.last_ceremony || undefined,
    obligations: JSON.parse(data.obligations || '[]'),
    created_at: data.created_at,
  };
}

export async function getEdge(fromId: string, toId: string): Promise<RelationalEdge | null> {
  const redis = await getRedis();
  const data = await redis.hGetAll(`edge:${fromId}:${toId}`);
  if (!data || Object.keys(data).length === 0) return null;
  return parseEdgeHash(data);
}

export async function getRelatedNodes(nodeId: string, direction: 'from' | 'to' | 'both' = 'both'): Promise<string[]> {
  const redis = await getRedis();
  const related = new Set<string>();
  if (direction === 'from' || direction === 'both') {
    (await redis.sMembers(`edges:from:${nodeId}`)).forEach(id => related.add(id));
  }
  if (direction === 'to' || direction === 'both') {
    (await redis.sMembers(`edges:to:${nodeId}`)).forEach(id => related.add(id));
  }
  return Array.from(related);
}

export async function updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): Promise<void> {
  const redis = await getRedis();
  await redis.hSet(`edge:${fromId}:${toId}`, {
    ceremony_honored: '1',
    last_ceremony: ceremonyId,
  });
}

// ── Ceremony Operations ──

export async function logCeremony(ceremony: CeremonyLog): Promise<void> {
  const redis = await getRedis();
  await redis.hSet(`ceremony:${ceremony.id}`, {
    id: ceremony.id,
    type: ceremony.type,
    direction: ceremony.direction,
    participants: JSON.stringify(ceremony.participants),
    medicines_used: JSON.stringify(ceremony.medicines_used),
    intentions: JSON.stringify(ceremony.intentions),
    timestamp: ceremony.timestamp,
    research_context: ceremony.research_context || '',
  });
  await redis.sAdd(`ceremonies:direction:${ceremony.direction}`, ceremony.id);
  await redis.sAdd(`ceremonies:type:${ceremony.type}`, ceremony.id);
  await redis.zAdd('ceremonies:timeline', {
    score: Date.parse(ceremony.timestamp),
    value: ceremony.id,
  });
}

function parseCeremonyHash(data: Record<string, string>): CeremonyLog {
  return {
    id: data.id,
    type: data.type as CeremonyType,
    direction: data.direction as DirectionName,
    participants: JSON.parse(data.participants || '[]'),
    medicines_used: JSON.parse(data.medicines_used || '[]'),
    intentions: JSON.parse(data.intentions || '[]'),
    timestamp: data.timestamp,
    research_context: data.research_context || undefined,
  };
}

export async function getCeremony(id: string): Promise<CeremonyLog | null> {
  const redis = await getRedis();
  const data = await redis.hGetAll(`ceremony:${id}`);
  if (!data || Object.keys(data).length === 0) return null;
  return parseCeremonyHash(data);
}

export async function getCeremoniesTimeline(limit = 20): Promise<CeremonyLog[]> {
  const redis = await getRedis();
  const ids = await redis.zRange('ceremonies:timeline', 0, limit - 1, { REV: true });
  const ceremonies: CeremonyLog[] = [];
  for (const id of ids) {
    const c = await getCeremony(id);
    if (c) ceremonies.push(c);
  }
  return ceremonies;
}

export async function getCeremoniesByDirection(direction: DirectionName): Promise<CeremonyLog[]> {
  const redis = await getRedis();
  const ids = await redis.sMembers(`ceremonies:direction:${direction}`);
  const ceremonies: CeremonyLog[] = [];
  for (const id of ids) {
    const c = await getCeremony(id);
    if (c) ceremonies.push(c);
  }
  return ceremonies.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export async function getCeremoniesByType(type: CeremonyType): Promise<CeremonyLog[]> {
  const redis = await getRedis();
  const ids = await redis.sMembers(`ceremonies:type:${type}`);
  const ceremonies: CeremonyLog[] = [];
  for (const id of ids) {
    const c = await getCeremony(id);
    if (c) ceremonies.push(c);
  }
  return ceremonies.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export async function getAllCeremonies(limit = 100): Promise<CeremonyLog[]> {
  return getCeremoniesTimeline(limit);
}

// ── Relational Web Traversal ──

export async function getRelationalWeb(centerNodeId: string, depth = 2): Promise<{
  nodes: RelationalNode[];
  edges: RelationalEdge[];
}> {
  const visited = new Set<string>();
  const nodes: RelationalNode[] = [];
  const edges: RelationalEdge[] = [];

  const traverse = async (nodeId: string, currentDepth: number) => {
    if (currentDepth > depth || visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = await getNode(nodeId);
    if (node) nodes.push(node);

    if (currentDepth < depth) {
      const related = await getRelatedNodes(nodeId);
      for (const relatedId of related) {
        const edge = await getEdge(nodeId, relatedId);
        if (edge) edges.push(edge);
        await traverse(relatedId, currentDepth + 1);
      }
    }
  };

  await traverse(centerNodeId, 0);
  return { nodes, edges };
}

// ── Accountability Tracking ──

export async function trackAccountability(researchId: string, data: AccountabilityData): Promise<void> {
  const redis = await getRedis();
  await redis.hSet(`accountability:${researchId}`, {
    wilson_score: data.wilson_score.toString(),
    ocap_compliant: data.ocap_compliant ? '1' : '0',
    elders_consulted: JSON.stringify(data.elders_consulted),
    community_approval: data.community_approval ? '1' : '0',
    last_audit: data.last_audit,
  });
}

export async function getAccountability(researchId: string): Promise<AccountabilityData | null> {
  const redis = await getRedis();
  const data = await redis.hGetAll(`accountability:${researchId}`);
  if (!data || Object.keys(data).length === 0) return null;
  return {
    wilson_score: parseFloat(data.wilson_score),
    ocap_compliant: data.ocap_compliant === '1',
    elders_consulted: JSON.parse(data.elders_consulted || '[]'),
    community_approval: data.community_approval === '1',
    last_audit: data.last_audit,
  };
}
