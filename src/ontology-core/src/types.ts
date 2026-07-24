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

import type { KinshipEdgeName } from './kinship';

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
  /** Current state of consent: active, withdrawn, expired, or pending */
  consent_state?: 'active' | 'withdrawn' | 'expired' | 'pending';
  /** ISO 8601 timestamp of when consent was last affirmed */
  consent_last_affirmed?: string;
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
 * Context that authorizes and bounds a relation — the metadata that makes a
 * relation valid in some circles and not others. Optional and additive:
 * existing relations carry none. Consumed by the protocol-guard stack in
 * `@medicine-wheel/relational-query` to permit or escalate traversal.
 */
export interface RelationContext {
  /** Who authorized this relation (person, council, ceremony, or source dataset). */
  authorized_by?: string;
  /** The ceremony state or scope in which this relation is currently valid. */
  active_context?: string;
  /** Condition describing when the relation is traversable (free-form expression). */
  valid_when?: string;
  /** Condition describing when the relation must NOT be traversed. */
  forbidden_when?: string;
  /** Identities permitted to traverse this relation. */
  authorized_kin?: string[];
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
  /**
   * Governed kinship-edge name from the kinship vocabulary (e.g.
   * 'holds-responsibility-for'). Optional and additive — `relationship_type`
   * is retained for back-compat; `kinship_type` references the registry in
   * `kinship.ts` and carries symmetry + inverse for directional reasoning.
   */
  kinship_type?: KinshipEdgeName;
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
  /** Context that authorizes and bounds this relation (feeds protocol guards). */
  context?: RelationContext;
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
  /** The research cycle this beat belongs to. Absent on beats recorded before cycles were bound. */
  cycle_id?: string;
  /** Set when this beat was telescoped out of a coarser one. */
  parent_beat_id?: string;
  /** IDs of beats this one was telescoped into. */
  sub_beats?: string[];
  /** How this beat entered the wheel — authored by hand, derived by a processor, or witnessed from an event stream. */
  origin?: BeatOrigin;
}

/** Provenance of a beat: who or what put it on the wheel. */
export interface BeatOrigin {
  /** Producer identity — e.g. 'hand', 'narrative-cluster', 'github-ceremony', 'session-reader'. */
  producer: string;
  /** Identifier of the thing the beat was derived from (cluster id, event id, commit sha…). */
  source_ref?: string;
  /** Free-text note on how the derivation was made. */
  method?: string;
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

// ── Epistemic Source Dimensions ──────────────────────────────────────────────

/**
 * The relational origin dimension of knowledge.
 * Canonical definition — re-exported by importance-unit.
 * - `land` — place-grounded, embodied knowing
 * - `dream` — liminal, spirit-state knowing
 * - `code` — technical, implementation knowing
 * - `vision` — intentional, architectural knowing
 */
export type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';

// ── Axiological Pillars ─────────────────────────────────────────────────────

/**
 * Wilson's four pillars of a research paradigm.
 * Every piece of knowledge addresses at least one pillar.
 */
export type AxiologicalPillar = 'ontology' | 'epistemology' | 'methodology' | 'axiology';

// ── Specialized Relation Subtypes ───────────────────────────────────────────

/**
 * A relation grounded in place — rivers, forests, land forms.
 * Land teaches through embodied presence and seasonal rhythms.
 */
export interface LandRelation extends Relation {
  relationship_type: 'land-kinship' | 'land-teaching' | 'land-stewardship';
  /** The specific place or land feature this relation connects to */
  place?: string;
  /** Seasonal context of the relation */
  season?: string;
}

/**
 * A relation with ancestors — those who came before.
 * Ancestor relations carry intergenerational obligations.
 */
export interface AncestorRelation extends Relation {
  relationship_type: 'ancestor-teaching' | 'ancestor-obligation' | 'ancestor-lineage';
  /** Name or identifier of the ancestor(s) */
  ancestor?: string;
  /** The lineage or tradition this relation belongs to */
  lineage?: string;
}

/**
 * A relation with future generations — those yet to come.
 * Future relations carry forward-looking responsibility.
 */
export interface FutureRelation extends Relation {
  relationship_type: 'future-obligation' | 'future-gift' | 'future-teaching';
  /** Number of generations this relation looks forward */
  generationsForward?: number;
}

/**
 * A relation with cosmic or spirit entities.
 * Cosmic relations honor the more-than-human world.
 */
export interface CosmicRelation extends Relation {
  relationship_type: 'cosmic-kinship' | 'spirit-teaching' | 'cosmic-reciprocity';
  /** The cosmic or spirit entity this relation connects to */
  entity?: string;
}

// ── Production Relation Subtype (film & media as knowledge practice) ──────────
// Additive support for agent-supported film production. Film entities are NOT
// new NodeTypes — they ride on existing `knowledge` nodes carrying a
// `metadata.kind: ProductionEntityKind` discriminator, connected by
// ProductionRelation edges. This mirrors LandRelation/AncestorRelation and
// leaves the NodeType / CeremonyType unions (and their Zod schemas) untouched.

/** Discriminator for film/production entities riding on `knowledge` nodes. */
export type ProductionEntityKind =
  | 'shot'
  | 'rush'
  | 'sequence'
  | 'scene'
  | 'recording'
  | 'collaborator'
  | 'edit-brief';

/**
 * A relation grounded in film/media production. Knowledge emerges through
 * witnessed relationship (Wilson; Renaud) rather than extractive capture —
 * `witnessed-by` records the participant that witnessed a rush, not merely a
 * source that owns it.
 */
export interface ProductionRelation extends Relation {
  relationship_type:
    | 'shot-of'
    | 'rush-of'
    | 'sequence-of'
    | 'witnessed-by'
    | 'directed-by'
    | 'sounds-in';
  /** The production session / episode this relation belongs to. */
  production_id?: string;
  /** Timecode or transcript offset anchoring this relation. */
  timecode?: string;
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
