/**
 * Medicine Wheel — Type Definitions
 * Inlined from ontology-core for reliable module resolution.
 */

// ── Direction Types ─────────────────────────────────────────────────────────

export type DirectionName = 'east' | 'south' | 'west' | 'north';

export interface Direction {
  name: DirectionName;
  ojibwe: string;
  season: string;
  color: string;
  lifeStage: string;
  ages: string;
  medicine: string[];
  teachings: string[];
  practices: string[];
}

// ── Node Types ──────────────────────────────────────────────────────────────

export type NodeType =
  | 'human'
  | 'land'
  | 'spirit'
  | 'ancestor'
  | 'future'
  | 'knowledge';

export interface RelationalNode {
  id: string;
  name: string;
  type: NodeType;
  direction?: DirectionName;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Relational Edge ─────────────────────────────────────────────────────────

export interface RelationalEdge {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;
  ceremony_honored: boolean;
  obligations: string[];
  created_at: string;
}

// ── Ceremony Types ──────────────────────────────────────────────────────────

export type CeremonyType =
  | 'smudging'
  | 'talking_circle'
  | 'spirit_feeding'
  | 'opening'
  | 'closing';

export interface CeremonyLog {
  id: string;
  type: CeremonyType;
  direction: DirectionName;
  participants: string[];
  medicines_used: string[];
  intentions: string[];
  timestamp: string;
  research_context?: string;
  relations_honored?: string[];
}

// ── Narrative Types ─────────────────────────────────────────────────────────

export interface NarrativeBeat {
  id: string;
  direction: DirectionName;
  title: string;
  description: string;
  prose?: string;
  ceremonies: string[];
  learnings: string[];
  timestamp: string;
  act: number;
  relations_honored: string[];
}

// ── Cycle Types ─────────────────────────────────────────────────────────────

export interface MedicineWheelCycle {
  id: string;
  research_question: string;
  start_date: string;
  current_direction: DirectionName;
  beats: string[];
  ceremonies_conducted: number;
  relations_mapped: number;
  wilson_alignment: number;
  ocap_compliant: boolean;
}

// ── Direction Definitions ───────────────────────────────────────────────────

export const DIRECTIONS: Direction[] = [
  {
    name: 'east',
    ojibwe: 'Waabinong',
    season: 'Spring',
    color: '#FFD700',
    lifeStage: 'Good Life',
    ages: 'Birth - 7 years',
    medicine: ['Tobacco (Asemaa)'],
    teachings: ['New beginnings', 'Vision', 'Illumination', 'Spiritual connection'],
    practices: ['Morning prayers', 'Setting intentions', 'Vision quests', 'Opening ceremonies'],
  },
  {
    name: 'south',
    ojibwe: 'Zhaawanong',
    season: 'Summer',
    color: '#DC143C',
    lifeStage: 'Fast Life',
    ages: '7 - 14 years',
    medicine: ['Cedar (Giizhik)'],
    teachings: ['Growth', 'Youth energy', 'Trust', 'Physical strength'],
    practices: ['Land-based learning', 'Youth mentorship', 'Physical engagement', 'Cedar ceremonies'],
  },
  {
    name: 'west',
    ojibwe: 'Epangishmok',
    season: 'Fall',
    color: '#1a1a2e',
    lifeStage: 'Truth & Planning',
    ages: '35 - 49 years',
    medicine: ['Sage (Mashkodewashk)', "Strawberry (Ode'imin)"],
    teachings: ['Reflection', 'Truth', 'Introspection', 'Emotional processing'],
    practices: ['Talking circles', 'Emotional processing', 'Forgiveness ceremonies', 'Sunset prayers'],
  },
  {
    name: 'north',
    ojibwe: 'Kiiwedinong',
    season: 'Winter',
    color: '#E8E8E8',
    lifeStage: 'Elder',
    ages: '49+ years',
    medicine: ['Cedar', 'Stories'],
    teachings: ['Wisdom', 'Completion', 'Ancestral knowledge', 'Generosity'],
    practices: ['Story archiving', 'Spirit feeding', 'Elder council', 'Knowledge sharing'],
  },
];

// ── Color Maps ──────────────────────────────────────────────────────────────

export const DIRECTION_COLORS: Record<DirectionName, string> = {
  east: '#FFD700',
  south: '#DC143C',
  west: '#1a1a2e',
  north: '#E8E8E8',
};

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  human: '#e8913a',
  land: '#4a9e5c',
  spirit: '#9a5cc6',
  ancestor: '#c9a23a',
  future: '#5a9ec6',
  knowledge: '#d4b844',
};

// ── Ceremony Icons ──────────────────────────────────────────────────────────

export const CEREMONY_ICONS: Record<CeremonyType, string> = {
  smudging: '🌿',
  talking_circle: '🔴',
  spirit_feeding: '🕯️',
  opening: '🌅',
  closing: '🌙',
};
