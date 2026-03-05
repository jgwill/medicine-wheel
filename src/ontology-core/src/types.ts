/**
 * @medicine-wheel/ontology-core — Type Definitions
 *
 * Unified TypeScript types for the Medicine Wheel data model.
 * Single source of truth consumed by both mcp-medicine-wheel (server)
 * and mcp-medicine-wheel-ui (client).
 *
 * Grounded in Indigenous relational ontology: relationships are
 * first-class entities, not just labeled edges.
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

// ── Relational Edge (simple edge) ───────────────────────────────────────────

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

// ── First-Class Relation ────────────────────────────────────────────────────
// In Indigenous relational ontology, relations are not just labeled edges
// between entities — they are beings in their own right, carrying their own
// obligations, protocols, ceremony context, and accountability tracking.

export type ObligationCategory = 'human' | 'land' | 'spirit' | 'future';

export interface RelationalObligation {
  category: ObligationCategory;
  obligations: string[];
}

export interface OcapFlags {
  /** Who owns this data/relation */
  ownership: string;
  /** Who controls access and use */
  control: string;
  /** Who may access this data */
  access: 'community' | 'researchers' | 'public' | 'restricted';
  /** Where is this data physically held */
  possession: 'on-premise' | 'community-server' | 'cloud-sovereign' | 'cloud-shared';
  /** Whether OCAP® compliance has been verified */
  compliant: boolean;
  /** Who is the data steward */
  steward?: string;
  /** Whether consent was given for this specific use */
  consent_given?: boolean;
  /** Scope of the consent */
  consent_scope?: string;
}

export interface AccountabilityTracking {
  /** Wilson's three R's scores (0–1) */
  respect: number;
  reciprocity: number;
  responsibility: number;
  /** Computed Wilson alignment (0–1) */
  wilson_alignment: number;
  /** Relations that have been honored through ceremony */
  relations_honored: string[];
  /** Last ceremony that touched this relation */
  last_ceremony_id?: string;
  /** Notes on accountability status */
  notes?: string;
}

/**
 * First-class Relation entity.
 * Extends RelationalEdge with ceremony context, OCAP® metadata,
 * and accountability tracking — making relationships ontological
 * units with their own lifecycles.
 */
export interface Relation {
  id: string;
  /** Source entity */
  from_id: string;
  /** Target entity */
  to_id: string;
  /** Type of relationship (e.g., kinship, treaty, ceremony, mentorship) */
  relationship_type: string;
  /** Relational strength (0–1) */
  strength: number;
  /** Direction alignment */
  direction?: DirectionName;
  /** Ceremony context */
  ceremony_context?: {
    ceremony_id?: string;
    ceremony_type?: CeremonyType;
    ceremony_honored: boolean;
  };
  /** Relational obligations */
  obligations: RelationalObligation[];
  /** OCAP® governance */
  ocap: OcapFlags;
  /** Wilson relational accountability tracking */
  accountability: AccountabilityTracking;
  /** Metadata */
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Ceremony Types ──────────────────────────────────────────────────────────

export type CeremonyType =
  | 'smudging'
  | 'talking_circle'
  | 'spirit_feeding'
  | 'opening'
  | 'closing';

export interface CeremonyGuidance {
  opening_practice: string;
  intention: string;
  protocol: string;
  medicines_used: string[];
  timeline?: string;
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
  /** Relations honored during this ceremony */
  relations_honored?: string[];
  /** OCAP® governance for ceremony data */
  ocap?: OcapFlags;
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

// ── Structural Tension Types ────────────────────────────────────────────────

export type TensionPhase =
  | 'germination'
  | 'assimilation'
  | 'completion';

export interface StructuralTensionChart {
  id: string;
  desired_outcome: string;
  current_reality: string;
  action_steps: ActionStep[];
  phase: TensionPhase;
  direction?: DirectionName;
  created_at: string;
  updated_at: string;
}

export interface ActionStep {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  direction?: DirectionName;
  due_date?: string;
}

// ── Direction Response (from MCP tools) ─────────────────────────────────────

export interface DirectionResponse {
  direction: string;
  stage: string;
  ceremony_guidance: CeremonyGuidance;
  relational_obligations: RelationalObligation[];
  suggested_practices: unknown[];
  accountability_checkpoint?: unknown;
  relational_accountability_summary?: unknown;
}

// ── RSIS Thematic Suns ──────────────────────────────────────────────────────

export type SunName =
  | 'NovelEmergence'
  | 'CreativeActualization'
  | 'WovenMeaning'
  | 'FirstCause'
  | 'EmbodiedPractice'
  | 'SustainedPresence';

// ── RSIS Ceremony Phases (Ceremonial Inquiry Ecosystem cadence) ─────────────

export type CeremonyPhase = 'opening' | 'council' | 'integration' | 'closure';

// ── RSIS Governance ─────────────────────────────────────────────────────────

export type GovernanceAccess = 'open' | 'ceremony_required' | 'restricted' | 'sacred';

export type PersonRole = 'steward' | 'contributor' | 'elder' | 'firekeeper';

export type RSISRelationType =
  | 'STEWARDS'
  | 'BORN_FROM'
  | 'SERVES'
  | 'GIVES_BACK_TO'
  | 'ALIGNED_WITH'
  | 'KINSHIP_OF';

export interface GovernanceProtectedPath {
  path: string;
  authority: string[];
  access: GovernanceAccess;
  description?: string;
}

export interface GovernanceConfig {
  protected_paths?: GovernanceProtectedPath[];
  ceremony_required_changes?: string[];
  index_exclusions?: string[];
}

export interface RSISConfig {
  enabled: boolean;
  charts?: string[];
  kinship_paths?: string[];
  ceremony?: {
    current_cycle?: string;
    host_sun?: SunName;
    phase?: CeremonyPhase;
  };
  directions?: {
    auto_classify_commits?: boolean;
    heuristics?: 'default' | string;
  };
  governance?: GovernanceConfig;
}

// ── RSIS Kinship Hub ────────────────────────────────────────────────────────

export interface KinshipHubInfo {
  path: string;
  identity: string;
  lineage: string;
  humanAccountabilities: string[];
  moreThanHumanAccountabilities: string[];
  boundaries: string[];
}

export interface KinshipRelation {
  from: string;
  to: string;
  type: string;
}

// ── RSIS Reciprocity ────────────────────────────────────────────────────────

export interface ReciprocityFlow {
  from: string;
  to: string;
  type: string;
  count: number;
}

export interface ReciprocityBalance {
  entity: string;
  giving: number;
  receiving: number;
}

// ── RSIS Ceremony Lineage ───────────────────────────────────────────────────

export interface CeremonyLineageEntry {
  ceremonyId: string;
  ceremonyName: string;
  sun: string;
  cycle: string;
  phase: CeremonyPhase;
  stewards: string[];
}

// ── RSIS Direction Classification ───────────────────────────────────────────

export interface DirectionDetail {
  name: string;
  direction: DirectionName;
  reason: string;
}

export interface DirectionDistribution {
  east: number;
  south: number;
  west: number;
  north: number;
}

export interface DirectionInfo {
  name: DirectionName;
  emoji: string;
  focus: string;
  guidance: string;
}

// ── RSIS Medicine Wheel View (for UI) ───────────────────────────────────────

export interface MedicineWheelView {
  suns: Array<{ name: SunName; inquiryCount: number }>;
  directions: Record<DirectionName, { count: number; recent: string[] }>;
  reciprocity: {
    flows: ReciprocityFlow[];
    balance: ReciprocityBalance[];
  };
  kinship: {
    hubs: KinshipHubInfo[];
    relations: KinshipRelation[];
  };
}

// ── MCP Tool/Resource/Prompt types ──────────────────────────────────────────

export interface MWTool {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (args: unknown) => Promise<unknown>;
}

export interface MWResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: unknown;
}

export interface MWPrompt {
  name: string;
  description: string;
  arguments?: unknown[];
  handler: (args: unknown) => Promise<unknown>;
}
