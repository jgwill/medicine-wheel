/**
 * @medicine-wheel/ontology-core — Constants
 *
 * Canonical constants for the Medicine Wheel ontology.
 * Single source of truth — no more duplication between server and UI.
 */

import type {
  Direction, DirectionName, NodeType, CeremonyType,
  SunName, CeremonyPhase, PersonRole, RSISRelationType, GovernanceAccess, DirectionInfo,
} from './types.js';

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

// ── Direction Lookup Helpers ────────────────────────────────────────────────

export const DIRECTION_MAP: Record<DirectionName, Direction> = Object.fromEntries(
  DIRECTIONS.map(d => [d.name, d])
) as Record<DirectionName, Direction>;

export const DIRECTION_NAMES: readonly DirectionName[] = ['east', 'south', 'west', 'north'] as const;

export const NODE_TYPES: readonly NodeType[] = [
  'human', 'land', 'spirit', 'ancestor', 'future', 'knowledge'
] as const;

export const CEREMONY_TYPES: readonly CeremonyType[] = [
  'smudging', 'talking_circle', 'spirit_feeding', 'opening', 'closing'
] as const;

// ── Ojibwe Name Lookup ──────────────────────────────────────────────────────

export const OJIBWE_NAMES: Record<DirectionName, string> = {
  east: 'Waabinong',
  south: 'Zhaawanong',
  west: 'Epangishmok',
  north: 'Kiiwedinong',
};

// ── Season Lookup ───────────────────────────────────────────────────────────

export const DIRECTION_SEASONS: Record<DirectionName, string> = {
  east: 'Spring',
  south: 'Summer',
  west: 'Fall',
  north: 'Winter',
};

// ── Act Mapping (narrative structure) ───────────────────────────────────────

export const DIRECTION_ACTS: Record<DirectionName, number> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4,
};

export const ACT_DIRECTIONS: Record<number, DirectionName> = {
  1: 'east',
  2: 'south',
  3: 'west',
  4: 'north',
};

// ── RSIS Thematic Suns ──────────────────────────────────────────────────────

export const SUN_NAMES: SunName[] = [
  'NovelEmergence', 'CreativeActualization', 'WovenMeaning',
  'FirstCause', 'EmbodiedPractice', 'SustainedPresence',
];

export const SUN_DESCRIPTIONS: Record<SunName, string> = {
  NovelEmergence: 'Emergence of new knowledge and understanding',
  CreativeActualization: 'Creative manifestation and bringing ideas into form',
  WovenMeaning: 'Integration and meaning-making across knowledge domains',
  FirstCause: 'Root causes, origins, and foundational principles',
  EmbodiedPractice: 'Lived experience, embodiment, and practical application',
  SustainedPresence: 'Ongoing commitment, maintenance, and enduring engagement',
};

// ── RSIS Ceremony Phases ────────────────────────────────────────────────────

export const CEREMONY_PHASES: CeremonyPhase[] = ['opening', 'council', 'integration', 'closure'];

export const CEREMONY_PHASE_DESCRIPTIONS: Record<CeremonyPhase, string> = {
  opening: 'What wants to emerge? Focus on intention and vision.',
  council: 'Cross-Sun perspectives on code relationships.',
  integration: 'Weaving insights into synthesis artifacts.',
  closure: 'Reciprocity summaries and seeding observations.',
};

// ── RSIS Person Roles ───────────────────────────────────────────────────────

export const PERSON_ROLES: PersonRole[] = ['steward', 'contributor', 'elder', 'firekeeper'];

// ── RSIS Relation Types ─────────────────────────────────────────────────────

export const RSIS_RELATION_TYPES: RSISRelationType[] = [
  'STEWARDS', 'BORN_FROM', 'SERVES', 'GIVES_BACK_TO', 'ALIGNED_WITH', 'KINSHIP_OF',
];

// ── RSIS Governance Access Levels ───────────────────────────────────────────

export const GOVERNANCE_ACCESS_LEVELS: GovernanceAccess[] = ['open', 'ceremony_required', 'restricted', 'sacred'];

// ── RSIS Direction Info (simplified, with emoji) ────────────────────────────

export const DIRECTION_INFO: Record<DirectionName, DirectionInfo> = {
  east:  { name: 'east',  emoji: '🌸', focus: 'Vision, intention, emergence', guidance: 'What wants to emerge? What seeds are being planted?' },
  south: { name: 'south', emoji: '🧠', focus: 'Architecture, structure, planning', guidance: 'What structures support the vision? What patterns serve advancement?' },
  west:  { name: 'west',  emoji: '⚡', focus: 'Implementation, creation, manifestation', guidance: 'What is being built? How does creation serve the inquiries?' },
  north: { name: 'north', emoji: '🕸️', focus: 'Reflection, integration, wisdom', guidance: 'What has been learned? What reciprocity needs tending?' },
};
