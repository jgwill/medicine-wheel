/**
 * Medicine Wheel — Web UI Data Store
 *
 * Wraps the shared JSONL persistence layer so that data created in the
 * Web UI is immediately visible to the MCP server (and vice versa).
 *
 * All data persists in .mw/store/*.jsonl files on disk.
 * The public API is unchanged — API routes call these functions as before.
 *
 * @see lib/jsonl-store.ts — the underlying JSONL persistence engine
 * @see https://github.com/jgwill/medicine-wheel/issues/26
 */

import type {
  RelationalNode,
  RelationalEdge,
  CeremonyLog,
  NarrativeBeat,
  MedicineWheelCycle,
} from '@/lib/types';

import { getJsonlStore } from './jsonl-store';

const store = getJsonlStore();

// ── Nodes ──

export function getAllNodes(): RelationalNode[] {
  return store.getAllNodes(200) as unknown as RelationalNode[];
}

export function getNodesByType(type: string): RelationalNode[] {
  return store.getNodesByType(type) as unknown as RelationalNode[];
}

export function getNodesByDirection(direction: string): RelationalNode[] {
  return store.getNodesByDirection(direction) as unknown as RelationalNode[];
}

export function getNode(id: string): RelationalNode | null {
  return (store.getNode(id) as unknown as RelationalNode) ?? null;
}

export function createNode(data: Omit<RelationalNode, 'id' | 'created_at' | 'updated_at' | 'metadata'> & { id?: string; metadata?: Record<string, unknown> }): RelationalNode {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const node: RelationalNode = {
    id,
    name: data.name,
    type: data.type,
    direction: data.direction,
    metadata: data.metadata ?? {},
    created_at: now,
    updated_at: now,
  };
  store.createNode(node as any);
  return node;
}

// ── Edges ──

export function getAllEdges(): RelationalEdge[] {
  return store.edges.getAll() as unknown as RelationalEdge[];
}

export function getEdgesByNode(nodeId: string): RelationalEdge[] {
  return store.getEdgesForNode(nodeId) as unknown as RelationalEdge[];
}

export function createEdge(data: Omit<RelationalEdge, 'id' | 'created_at'> & { id?: string }): RelationalEdge {
  const id = data.id || `${data.from_id}:${data.to_id}`;
  const now = new Date().toISOString();
  const edge: RelationalEdge = {
    id,
    from_id: data.from_id,
    to_id: data.to_id,
    relationship_type: data.relationship_type,
    strength: data.strength ?? 0.5,
    ceremony_honored: data.ceremony_honored ?? false,
    obligations: data.obligations ?? [],
    created_at: now,
  };
  store.createEdge(edge as any);
  return edge;
}

// ── Ceremonies ──

export function getAllCeremonies(): CeremonyLog[] {
  return store.getAllCeremonies() as unknown as CeremonyLog[];
}

export function getCeremoniesByDirection(direction: string): CeremonyLog[] {
  return store.getCeremoniesByDirection(direction) as unknown as CeremonyLog[];
}

export function getCeremoniesByType(type: string): CeremonyLog[] {
  return store.getCeremoniesByType(type) as unknown as CeremonyLog[];
}

export function createCeremony(data: Omit<CeremonyLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): CeremonyLog {
  const id = data.id || crypto.randomUUID();
  const ceremony: CeremonyLog = {
    id,
    type: data.type,
    direction: data.direction,
    participants: data.participants ?? [],
    medicines_used: data.medicines_used ?? [],
    intentions: data.intentions ?? [],
    timestamp: data.timestamp || new Date().toISOString(),
    research_context: data.research_context,
  };
  store.logCeremony(ceremony as any);
  return ceremony;
}

// ── Narrative Beats ──

export function getAllBeats(): NarrativeBeat[] {
  return store.getAllBeats(200) as unknown as NarrativeBeat[];
}

export function getBeatsByDirection(direction: string): NarrativeBeat[] {
  return store.getBeatsByDirection(direction) as unknown as NarrativeBeat[];
}

export function createBeat(data: Omit<NarrativeBeat, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): NarrativeBeat {
  const id = data.id || crypto.randomUUID();
  const beat: NarrativeBeat = {
    id,
    direction: data.direction,
    title: data.title,
    description: data.description,
    prose: data.prose,
    ceremonies: data.ceremonies ?? [],
    learnings: data.learnings ?? [],
    timestamp: data.timestamp || new Date().toISOString(),
    act: data.act ?? 1,
    relations_honored: data.relations_honored ?? [],
  };
  store.createBeat(beat as any);
  return beat;
}

// ── Cycles ──

export function getAllCycles(): MedicineWheelCycle[] {
  const { active, archived } = store.getAllCycles();
  return [...active, ...archived] as unknown as MedicineWheelCycle[];
}

export function createCycle(data: { research_question: string; current_direction?: string }): MedicineWheelCycle {
  const id = `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cycle: MedicineWheelCycle = {
    id,
    research_question: data.research_question,
    start_date: new Date().toISOString(),
    current_direction: (data.current_direction as any) || 'east',
    beats: [],
    ceremonies_conducted: 0,
    relations_mapped: 0,
    wilson_alignment: 0,
    ocap_compliant: false,
  };
  store.createCycle(cycle as any);
  return cycle;
}

// ── Seed Data ──

export function seedDemoData() {
  if (store.nodes.size() > 0) return; // Already seeded

  // Create some demo nodes
  createNode({ name: 'Elder Sarah', type: 'human', direction: 'north' });
  createNode({ name: 'Youth Circle', type: 'human', direction: 'south' });
  createNode({ name: 'Turtle Island', type: 'land', direction: 'east' });
  createNode({ name: 'Sacred River', type: 'land', direction: 'west' });
  createNode({ name: 'Ancestor Teachings', type: 'ancestor', direction: 'north' });
  createNode({ name: 'Dream Vision', type: 'spirit', direction: 'east' });
  createNode({ name: 'Seven Generations', type: 'future', direction: 'south' });
  createNode({ name: 'Oral Traditions', type: 'knowledge', direction: 'west' });

  const allN = getAllNodes();
  // Create edges between nodes
  if (allN.length >= 4) {
    createEdge({ from_id: allN[0].id, to_id: allN[1].id, relationship_type: 'mentorship', strength: 0.9, ceremony_honored: true, obligations: ['teaching', 'guidance'] });
    createEdge({ from_id: allN[0].id, to_id: allN[4].id, relationship_type: 'carries_teachings', strength: 0.8, ceremony_honored: true, obligations: ['remembering'] });
    createEdge({ from_id: allN[2].id, to_id: allN[3].id, relationship_type: 'stewardship', strength: 0.7, ceremony_honored: false, obligations: ['land care'] });
    createEdge({ from_id: allN[1].id, to_id: allN[6].id, relationship_type: 'responsibility', strength: 0.6, ceremony_honored: false, obligations: ['future planning'] });
    createEdge({ from_id: allN[5].id, to_id: allN[7].id, relationship_type: 'inspiration', strength: 0.8, ceremony_honored: true, obligations: ['listening'] });
  }

  // Create a demo ceremony
  createCeremony({
    type: 'smudging',
    direction: 'east',
    participants: ['Elder Sarah', 'Youth Circle'],
    medicines_used: ['sage', 'tobacco'],
    intentions: ['Opening the research journey with gratitude'],
    research_context: 'Beginning relational inquiry',
  });

  // Create a demo beat
  createBeat({
    direction: 'east',
    title: 'Vision Quest Beginning',
    description: 'Initial visioning for the research journey',
    prose: 'We begin in the East, where the sun rises...',
    ceremonies: [],
    learnings: ['Relational accountability starts with listening'],
    act: 1,
    relations_honored: [],
  });

  // Create a demo cycle
  createCycle({ research_question: 'How do we honor relational accountability in software development?' });
}

// Auto-seed on import
seedDemoData();
