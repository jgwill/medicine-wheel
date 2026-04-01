/**
 * In-memory data store for Medicine Wheel.
 * Works without Redis — all data stored in server-side maps.
 * Data persists across requests within the same server process.
 */

import type {
  RelationalNode,
  RelationalEdge,
  CeremonyLog,
  NarrativeBeat,
  MedicineWheelCycle,
} from '@/lib/types';

// ── Storage Maps ──

const nodes = new Map<string, RelationalNode>();
const edges = new Map<string, RelationalEdge>();
const ceremonies = new Map<string, CeremonyLog>();
const beats = new Map<string, NarrativeBeat>();
const cycles = new Map<string, MedicineWheelCycle>();

// ── Nodes ──

export function getAllNodes(): RelationalNode[] {
  return Array.from(nodes.values());
}

export function getNodesByType(type: string): RelationalNode[] {
  return getAllNodes().filter(n => n.type === type);
}

export function getNodesByDirection(direction: string): RelationalNode[] {
  return getAllNodes().filter(n => n.direction === direction);
}

export function getNode(id: string): RelationalNode | null {
  return nodes.get(id) ?? null;
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
  nodes.set(id, node);
  return node;
}

// ── Edges ──

export function getAllEdges(): RelationalEdge[] {
  return Array.from(edges.values());
}

export function getEdgesByNode(nodeId: string): RelationalEdge[] {
  return getAllEdges().filter(e => e.from_id === nodeId || e.to_id === nodeId);
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
  edges.set(id, edge);
  return edge;
}

// ── Ceremonies ──

export function getAllCeremonies(): CeremonyLog[] {
  return Array.from(ceremonies.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getCeremoniesByDirection(direction: string): CeremonyLog[] {
  return getAllCeremonies().filter(c => c.direction === direction);
}

export function getCeremoniesByType(type: string): CeremonyLog[] {
  return getAllCeremonies().filter(c => c.type === type);
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
  ceremonies.set(id, ceremony);
  return ceremony;
}

// ── Narrative Beats ──

export function getAllBeats(): NarrativeBeat[] {
  return Array.from(beats.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function getBeatsByDirection(direction: string): NarrativeBeat[] {
  return getAllBeats().filter(b => b.direction === direction);
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
  beats.set(id, beat);
  return beat;
}

// ── Cycles ──

export function getAllCycles(): MedicineWheelCycle[] {
  return Array.from(cycles.values());
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
  cycles.set(id, cycle);
  return cycle;
}

// ── Seed Data ──

export function seedDemoData() {
  if (nodes.size > 0) return; // Already seeded

  // ── Nodes: 18 entities across all directions and types ──
  const elderSarah = createNode({ id: 'n-elder-sarah', name: 'Elder Sarah', type: 'human', direction: 'north', metadata: { role: 'knowledge keeper', community: 'Treaty 6' } });
  const youthCircle = createNode({ id: 'n-youth-circle', name: 'Youth Circle', type: 'human', direction: 'south', metadata: { members: 8, focus: 'digital sovereignty' } });
  const devTeam = createNode({ id: 'n-dev-team', name: 'Development Team', type: 'human', direction: 'east', metadata: { size: 5, methodology: 'relational' } });
  const communityCouncil = createNode({ id: 'n-council', name: 'Community Council', type: 'human', direction: 'west', metadata: { role: 'governance' } });
  const turtleIsland = createNode({ id: 'n-turtle-island', name: 'Turtle Island', type: 'land', direction: 'east', metadata: { territory: 'traditional' } });
  const sacredRiver = createNode({ id: 'n-sacred-river', name: 'Sacred River', type: 'land', direction: 'west', metadata: { significance: 'ceremony site' } });
  const medicineLand = createNode({ id: 'n-medicine-land', name: 'Medicine Garden', type: 'land', direction: 'south', metadata: { plants: ['sage', 'sweetgrass', 'tobacco', 'cedar'] } });
  const ancestorTeachings = createNode({ id: 'n-ancestors', name: 'Ancestor Teachings', type: 'ancestor', direction: 'north', metadata: { lineage: 'Cree' } });
  const grandmotherWisdom = createNode({ id: 'n-grandmother', name: 'Grandmother Wisdom', type: 'ancestor', direction: 'west', metadata: { teaching: 'all my relations' } });
  const dreamVision = createNode({ id: 'n-dream', name: 'Dream Vision', type: 'spirit', direction: 'east', metadata: { received: 'solstice 2024' } });
  const spiritHelpers = createNode({ id: 'n-spirit-helpers', name: 'Spirit Helpers', type: 'spirit', direction: 'north', metadata: { direction: 'guidance' } });
  const sevenGens = createNode({ id: 'n-seven-gens', name: 'Seven Generations', type: 'future', direction: 'south', metadata: { horizon: '175 years' } });
  const digitalSovereignty = createNode({ id: 'n-digital-sov', name: 'Digital Sovereignty', type: 'future', direction: 'east', metadata: { goal: 'data governance' } });
  const oralTraditions = createNode({ id: 'n-oral', name: 'Oral Traditions', type: 'knowledge', direction: 'west', metadata: { format: 'story' } });
  const softwarePatterns = createNode({ id: 'n-software', name: 'Software Design Patterns', type: 'knowledge', direction: 'east', metadata: { paradigm: 'relational' } });
  const ceremonyProtocol = createNode({ id: 'n-protocol', name: 'Ceremony Protocol Knowledge', type: 'knowledge', direction: 'north', metadata: { source: 'elder teachings' } });
  const landBasedLearning = createNode({ id: 'n-land-learning', name: 'Land-Based Learning', type: 'knowledge', direction: 'south', metadata: { method: 'experiential' } });
  const futureCoders = createNode({ id: 'n-future-coders', name: 'Future Indigenous Coders', type: 'future', direction: 'south', metadata: { program: 'mentorship pipeline' } });

  // ── Edges: 14 relationships spanning the relational web ──
  createEdge({ id: 'e-mentorship', from_id: elderSarah.id, to_id: youthCircle.id, relationship_type: 'mentorship', strength: 0.95, ceremony_honored: true, obligations: ['teaching', 'guidance', 'patience'] });
  createEdge({ id: 'e-teachings', from_id: elderSarah.id, to_id: ancestorTeachings.id, relationship_type: 'carries_teachings', strength: 0.9, ceremony_honored: true, obligations: ['remembering', 'accuracy'] });
  createEdge({ id: 'e-stewardship', from_id: turtleIsland.id, to_id: sacredRiver.id, relationship_type: 'stewardship', strength: 0.8, ceremony_honored: false, obligations: ['land care', 'water protection'] });
  createEdge({ id: 'e-responsibility', from_id: youthCircle.id, to_id: sevenGens.id, relationship_type: 'responsibility', strength: 0.7, ceremony_honored: false, obligations: ['future planning', 'sustainability'] });
  createEdge({ id: 'e-inspiration', from_id: dreamVision.id, to_id: oralTraditions.id, relationship_type: 'inspiration', strength: 0.85, ceremony_honored: true, obligations: ['listening', 'honoring'] });
  createEdge({ id: 'e-dev-protocol', from_id: devTeam.id, to_id: ceremonyProtocol.id, relationship_type: 'learning', strength: 0.6, ceremony_honored: true, obligations: ['respect', 'reciprocity'] });
  createEdge({ id: 'e-council-gov', from_id: communityCouncil.id, to_id: digitalSovereignty.id, relationship_type: 'governance', strength: 0.75, ceremony_honored: true, obligations: ['OCAP compliance', 'community benefit'] });
  createEdge({ id: 'e-grandmother', from_id: grandmotherWisdom.id, to_id: elderSarah.id, relationship_type: 'lineage', strength: 0.95, ceremony_honored: true, obligations: ['continuity'] });
  createEdge({ id: 'e-land-learning', from_id: medicineLand.id, to_id: landBasedLearning.id, relationship_type: 'teaching', strength: 0.8, ceremony_honored: false, obligations: ['seasonal awareness'] });
  createEdge({ id: 'e-software-vision', from_id: softwarePatterns.id, to_id: digitalSovereignty.id, relationship_type: 'contribution', strength: 0.5, ceremony_honored: false, obligations: ['alignment check'] });
  createEdge({ id: 'e-spirit-guide', from_id: spiritHelpers.id, to_id: dreamVision.id, relationship_type: 'guidance', strength: 0.9, ceremony_honored: true, obligations: ['attentiveness'] });
  createEdge({ id: 'e-youth-future', from_id: youthCircle.id, to_id: futureCoders.id, relationship_type: 'mentorship', strength: 0.65, ceremony_honored: false, obligations: ['skill sharing', 'cultural grounding'] });
  createEdge({ id: 'e-council-elder', from_id: communityCouncil.id, to_id: elderSarah.id, relationship_type: 'consultation', strength: 0.85, ceremony_honored: true, obligations: ['elder protocol'] });
  createEdge({ id: 'e-dev-youth', from_id: devTeam.id, to_id: youthCircle.id, relationship_type: 'collaboration', strength: 0.55, ceremony_honored: false, obligations: ['mutual learning'] });

  // ── Ceremonies: 7 across all directions and types ──
  createCeremony({
    id: 'c-opening',
    type: 'smudging',
    direction: 'east',
    participants: ['Elder Sarah', 'Youth Circle', 'Development Team'],
    medicines_used: ['sage', 'tobacco'],
    intentions: ['Opening the research journey with gratitude', 'Inviting all relations to guide us'],
    research_context: 'Beginning relational inquiry into software accountability',
  });
  createCeremony({
    id: 'c-talking',
    type: 'talking_circle',
    direction: 'south',
    participants: ['Elder Sarah', 'Youth Circle', 'Community Council'],
    medicines_used: ['sweetgrass'],
    intentions: ['Understanding youth perspectives on digital sovereignty'],
    research_context: 'Deepening community engagement in research design',
  });
  createCeremony({
    id: 'c-spirit',
    type: 'spirit_feeding',
    direction: 'west',
    participants: ['Elder Sarah'],
    medicines_used: ['tobacco', 'cedar'],
    intentions: ['Honoring ancestors who guide this work'],
    research_context: 'Integration of ancestral wisdom with modern software practice',
  });
  createCeremony({
    id: 'c-opening2',
    type: 'opening',
    direction: 'east',
    participants: ['Development Team', 'Community Council'],
    medicines_used: ['sage'],
    intentions: ['Beginning the code review ceremony'],
    research_context: 'Ceremonial review of relational data architecture',
  });
  createCeremony({
    id: 'c-closing',
    type: 'closing',
    direction: 'north',
    participants: ['Elder Sarah', 'Youth Circle', 'Development Team', 'Community Council'],
    medicines_used: ['sage', 'sweetgrass', 'tobacco', 'cedar'],
    intentions: ['Closing the first research cycle with gratitude'],
    research_context: 'Completing initial assessment of relational accountability gaps',
  });
  createCeremony({
    id: 'c-smudge-south',
    type: 'smudging',
    direction: 'south',
    participants: ['Youth Circle', 'Future Indigenous Coders'],
    medicines_used: ['sage'],
    intentions: ['Purifying the learning space for youth mentorship'],
    research_context: 'Youth-led exploration of coding as ceremony',
  });
  createCeremony({
    id: 'c-talking-west',
    type: 'talking_circle',
    direction: 'west',
    participants: ['Elder Sarah', 'Community Council', 'Development Team'],
    medicines_used: ['sweetgrass', 'cedar'],
    intentions: ['Reflecting on the balance of giving and receiving in research'],
    research_context: 'Mid-cycle reciprocity assessment',
  });

  // ── Narrative Beats: 9 across all directions and all 4 acts ──
  createBeat({
    id: 'b-vision',
    direction: 'east',
    title: 'Vision Quest Beginning',
    description: 'Initial visioning for the research journey',
    prose: 'We begin in the East, where the sun rises and new visions are born. The dream came first — software that honors all its relations, code that remembers where it came from.',
    ceremonies: ['c-opening'],
    learnings: ['Relational accountability starts with listening', 'Software has relations too — to its users, its data, its community'],
    act: 1,
    relations_honored: [elderSarah.id, dreamVision.id],
  });
  createBeat({
    id: 'b-mapping',
    direction: 'east',
    title: 'Mapping the Relational Web',
    description: 'Identifying all entities and their connections',
    prose: 'Every node in our graph represents a living relation. We mapped not just data flows, but obligations, reciprocities, and ceremonies that bind them.',
    ceremonies: ['c-opening2'],
    learnings: ['Relations are not just connections — they carry obligations'],
    act: 1,
    relations_honored: [devTeam.id, softwarePatterns.id],
  });
  createBeat({
    id: 'b-youth',
    direction: 'south',
    title: 'Youth Voices Rising',
    description: 'Youth circle shares perspectives on digital sovereignty',
    prose: 'In the South, the youth spoke with fire and clarity. They reminded us that code written today shapes the digital landscape for seven generations.',
    ceremonies: ['c-talking', 'c-smudge-south'],
    learnings: ['Youth carry the future vision', 'Digital sovereignty is a collective responsibility'],
    act: 2,
    relations_honored: [youthCircle.id, sevenGens.id, futureCoders.id],
  });
  createBeat({
    id: 'b-land',
    direction: 'south',
    title: 'Land-Based Learning Session',
    description: 'Taking the research to the medicine garden',
    prose: 'The medicine garden taught us about growth patterns — how sage needs space, how sweetgrass grows in community. Our software should learn these patterns.',
    ceremonies: [],
    learnings: ['Land teaches design patterns', 'Growth requires both space and community'],
    act: 2,
    relations_honored: [medicineLand.id, landBasedLearning.id],
  });
  createBeat({
    id: 'b-ancestor',
    direction: 'west',
    title: 'Ancestor Integration',
    description: 'Weaving ancestral wisdom into software practice',
    prose: 'In the West, where the sun sets and reflection deepens, we asked: what would Grandmother say about how we store her stories in databases? The answer came through ceremony.',
    ceremonies: ['c-spirit', 'c-talking-west'],
    learnings: ['Data storage is an act of stewardship', 'Databases carry the same obligations as oral traditions'],
    act: 3,
    relations_honored: [grandmotherWisdom.id, oralTraditions.id, ancestorTeachings.id],
  });
  createBeat({
    id: 'b-reciprocity',
    direction: 'west',
    title: 'Reciprocity Assessment',
    description: 'Evaluating balance of giving and receiving in the project',
    prose: 'We paused to ask — has this research given back as much as it has taken? The community council helped us see where reciprocity was flowing and where it was blocked.',
    ceremonies: ['c-talking-west'],
    learnings: ['Research must give back more than it takes', 'Reciprocity is measurable through relational health'],
    act: 3,
    relations_honored: [communityCouncil.id, elderSarah.id],
  });
  createBeat({
    id: 'b-protocol',
    direction: 'north',
    title: 'Protocol Formalization',
    description: 'Encoding ceremony protocol into the software itself',
    prose: 'In the North, where wisdom crystallizes into knowledge, we formalized what we learned. The ceremony protocol became code — not to replace ceremony, but to remember it.',
    ceremonies: ['c-closing'],
    learnings: ['Code can carry ceremony without replacing it', 'Formalization must be guided by Elders'],
    act: 4,
    relations_honored: [ceremonyProtocol.id, elderSarah.id, spiritHelpers.id],
  });
  createBeat({
    id: 'b-closing',
    direction: 'north',
    title: 'First Cycle Closing',
    description: 'Completing the first full research cycle',
    prose: 'The circle closes in the North, but it is not an ending — it is a deepening. Each cycle adds another ring to the spiral, carrying us closer to relational accountability.',
    ceremonies: ['c-closing'],
    learnings: ['Closing is deepening, not ending', 'The spiral continues with richer understanding'],
    act: 4,
    relations_honored: [elderSarah.id, youthCircle.id, communityCouncil.id, devTeam.id],
  });
  createBeat({
    id: 'b-spirit-east',
    direction: 'east',
    title: 'Second Vision Emerges',
    description: 'New cycle begins with deeper vision from the spirit world',
    prose: 'As the sun rises on our second cycle, the dream vision is sharper. We see not just code, but a living relational web — software as ceremony.',
    ceremonies: [],
    learnings: ['Second cycles reveal what first cycles concealed', 'Vision deepens through return'],
    act: 1,
    relations_honored: [dreamVision.id, spiritHelpers.id],
  });

  // ── Cycles: 2 research cycles ──
  createCycle({
    research_question: 'How do we honor relational accountability in software development?',
    current_direction: 'north',
  });
  createCycle({
    research_question: 'Can ceremony protocol be encoded without reducing its relational power?',
    current_direction: 'east',
  });
}

// Auto-seed on import
seedDemoData();
