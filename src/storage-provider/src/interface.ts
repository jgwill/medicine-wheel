/**
 * Storage Provider Interface
 * 
 * Abstract interface for Medicine Wheel data persistence.
 * Implementations: JsonlProvider (local/default), NeonProvider (Postgres), RedisProvider (future)
 */

import type {
  DirectionName,
  NodeType,
  CeremonyType,
  RelationalNode as OntologyRelationalNode,
  RelationalEdge as OntologyRelationalEdge,
  CeremonyLog as OntologyCeremonyLog,
} from '@medicine-wheel/ontology-core';

// ── Domain Types ──

export interface RelationalNode extends OntologyRelationalNode {
  description?: string;
}

export interface RelationalEdge extends Omit<OntologyRelationalEdge, 'id'> {
  id?: string;
  last_ceremony?: string;
}

export type CeremonyLog = OntologyCeremonyLog;

/** Partial update for a node. `direction: null` releases the node from its direction. */
export interface NodePatch {
  name?: string;
  type?: NodeType;
  description?: string;
  direction?: DirectionName | null;
  metadata?: Record<string, unknown>;
}

/** Partial update for an edge (identified by from_id + to_id). */
export interface EdgePatch {
  relationship_type?: string;
  strength?: number;
  ceremony_honored?: boolean;
  obligations?: string[];
}

// ── Typed Errors ──
// Providers throw these so API layers can answer with honest status codes.

export class NodeNotFoundError extends Error {
  readonly code = 'NODE_NOT_FOUND';
  constructor(readonly nodeId: string) {
    super(`Node not found: ${nodeId}`);
    this.name = 'NodeNotFoundError';
  }
}

export class EdgeNotFoundError extends Error {
  readonly code = 'EDGE_NOT_FOUND';
  constructor(readonly fromId: string, readonly toId: string) {
    super(`Relation not found between ${fromId} and ${toId}`);
    this.name = 'EdgeNotFoundError';
  }
}

/**
 * Deleting a node with living relations is refused: relational accountability
 * means severing each relation consciously before releasing the node.
 */
export class NodeHasRelationsError extends Error {
  readonly code = 'NODE_HAS_RELATIONS';
  constructor(readonly nodeId: string, readonly relationCount: number) {
    super(
      `This node holds ${relationCount} relation${relationCount === 1 ? '' : 's'} — release them first`,
    );
    this.name = 'NodeHasRelationsError';
  }
}

export type WeaveSyncState =
  | 'never-synced'
  | 'in-sync'
  | 'stale'
  | 'episode-copy-diverged';

export interface WeaveRecord extends Record<string, unknown> {
  id: string;
  weave: 1;
  artefact: {
    id: string;
    path?: string;
    [key: string]: unknown;
  };
  issue: string;
  issue_url?: string;
  episode: {
    path: string;
    number: number;
    [key: string]: unknown;
  };
  last_sync: {
    state: WeaveSyncState;
    at?: string;
    tree_sha256?: string;
    file_count?: number;
    bytes_total?: number;
    [key: string]: unknown;
  };
  source: {
    package: string;
    record_path?: string;
    registered_at: string;
    updated_at: string;
    [key: string]: unknown;
  };
}

export interface InquiryWeaveFilters {
  episode_path?: string;
  episode_number?: number;
  issue?: string;
  artefact?: string;
}

export interface PlanPerspectiveEpisode {
  path: string;
  number?: number;
  [key: string]: unknown;
}

export interface PlanPerspectiveRecord extends Record<string, unknown> {
  id: string;
  perspective: 1;
  plan: {
    session_id: string;
    plan_path?: string;
    plan_filename: string;
    plan_sha256: string;
    captured_at?: string;
    [key: string]: unknown;
  };
  narrative: {
    title: string;
    body_markdown: string;
    mia_context?: string;
    [key: string]: unknown;
  };
  lineage?: {
    user_inputs_path?: string;
    input_count?: number;
    first_input_at?: string;
    last_input_at?: string;
    excerpts?: string[];
    [key: string]: unknown;
  };
  episodes: PlanPerspectiveEpisode[];
  source: {
    package?: string;
    generator?: {
      system?: string;
      agent?: string;
      model?: string;
      producer_session_id?: string;
      [key: string]: unknown;
    };
    registered_at: string;
    updated_at: string;
    [key: string]: unknown;
  };
}

export interface PlanPerspectiveFilters {
  episode_path?: string;
  session_id?: string;
  id?: string;
}

// ── Ceremonial Diary Records ──
// The diary is a participant's voice across the Five-Phase ceremonial
// methodology. These Ojibwe phase names carry meaning that has no Four-
// Directions equivalent, so they live here as their own vocabulary while the
// diary domain package owns creation, pattern detection, and markdown export.

export type CeremonialPhase =
  | 'miigwechiwendam' // Sacred Space Creation
  | 'nindokendaan' // Two-Eyed Research Gathering
  | 'ningwaab' // Knowledge Integration
  | 'nindoodam' // Creative Expression
  | 'migwech'; // Ceremonial Closing

export type DiaryEntryType =
  | 'intention'
  | 'observation'
  | 'hypothesis'
  | 'data'
  | 'synthesis'
  | 'action'
  | 'reflection'
  | 'learning';

export interface DiaryEntryLocation {
  lat: number;
  lon: number;
  name?: string;
}

export interface DiaryEntryMetadata {
  location?: DiaryEntryLocation;
  activity?: 'walking' | 'sitting' | 'coding' | 'reflecting' | string;
  weather?: string;
  emotionalTone?: string;
  /** Related stories, sessions, or other entry keys. */
  relatedKeys?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export interface DiaryEntryRecord extends Record<string, unknown> {
  id: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Author identity — the participant whose voice this entry carries. */
  participant: string;
  /** Which agent facilitated this entry, when applicable. */
  agent?: string;
  phase: CeremonialPhase;
  entryType: DiaryEntryType;
  /** Main diary text; supports Markdown. */
  content: string;
  metadata: DiaryEntryMetadata;
  /**
   * Optional relation into the chronicle. Medicine-wheel node-id convention is
   * `chronicle:<episode-folder-name>` (a chronicle_episode node under parent
   * `chronicle:miadi-chronicle`). Entries without a chronicle reference remain
   * fully valid — the diary can speak whether or not it writes into an episode.
   */
  chronicle?: string;
}

export interface DiaryEntryFilters {
  participant?: string;
  phase?: CeremonialPhase;
  entryType?: DiaryEntryType;
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  limit?: number;
}

// ── Ceremony Event Records ──
// GitHub happenings witnessed ceremonially: issues, pull requests, merges,
// commits. The direction reuses the ontology-core Four Directions, bridging the
// ceremonial phase into the wheel while preserving the original phase name.

export type CeremonyEventKind = 'issue' | 'pr' | 'merge' | 'commit';

export interface CeremonyEventParticipant {
  name: string;
  role: string;
  perspective: 'indigenous' | 'western' | 'both';
}

export interface CeremonyEventRecord extends Record<string, unknown> {
  id: string;
  /** Origin of the event — currently 'github'. */
  source: string;
  kind: CeremonyEventKind;
  phase: CeremonialPhase;
  /** Four-Directions bridge derived from the ceremonial phase. */
  direction?: DirectionName;
  participants: CeremonyEventParticipant[];
  relationshipImpacts: string[];
  /** Spiral key preserved from Miadi semantics (non-Redis, deterministic). */
  spiralKey: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  repository?: string;
  /** Issue/PR number or short commit sha. */
  reference?: string | number;
  metadata?: Record<string, unknown>;
}

export interface CeremonyEventFilters {
  source?: string;
  kind?: CeremonyEventKind;
  phase?: CeremonialPhase;
  direction?: DirectionName;
  repository?: string;
}

// ── Provider Interface ──

export interface StorageProvider {
  readonly name: string;
  
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Node Operations
  createNode(node: RelationalNode): Promise<void>;
  getNode(id: string): Promise<RelationalNode | null>;
  getNodesByType(type: NodeType): Promise<RelationalNode[]>;
  getNodesByDirection(direction: DirectionName): Promise<RelationalNode[]>;
  getAllNodes(limit?: number): Promise<RelationalNode[]>;
  /** Throws NodeNotFoundError when the node does not exist. */
  updateNode(id: string, patch: NodePatch): Promise<RelationalNode>;
  /** Throws NodeNotFoundError or NodeHasRelationsError (refusal, never cascade). */
  deleteNode(id: string): Promise<void>;

  // Edge Operations
  createEdge(edge: RelationalEdge): Promise<void>;
  getEdge(fromId: string, toId: string): Promise<RelationalEdge | null>;
  getAllEdges(limit?: number): Promise<RelationalEdge[]>;
  getRelatedNodes(nodeId: string, direction?: 'from' | 'to' | 'both'): Promise<string[]>;
  updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): Promise<void>;
  /** Throws EdgeNotFoundError when no relation exists between the pair. */
  updateEdge(fromId: string, toId: string, patch: EdgePatch): Promise<RelationalEdge>;
  /** Throws EdgeNotFoundError when no relation exists between the pair. */
  deleteEdge(fromId: string, toId: string): Promise<void>;
  
  // Ceremony Operations
  logCeremony(ceremony: CeremonyLog): Promise<void>;
  getCeremony(id: string): Promise<CeremonyLog | null>;
  getCeremoniesTimeline(limit?: number): Promise<CeremonyLog[]>;
  getCeremoniesByDirection(direction: DirectionName): Promise<CeremonyLog[]>;
  getCeremoniesByType(type: CeremonyType): Promise<CeremonyLog[]>;
  getAllCeremonies(limit?: number): Promise<CeremonyLog[]>;

  // Inquiry Weave Operations
  registerInquiryWeave(record: WeaveRecord): Promise<void>;
  getInquiryWeave(id: string): Promise<WeaveRecord | null>;
  listInquiryWeaves(filters?: InquiryWeaveFilters): Promise<WeaveRecord[]>;

  // Plan Perspective Operations
  registerPlanPerspective(record: PlanPerspectiveRecord): Promise<PlanPerspectiveRecord>;
  getPlanPerspective(id: string): Promise<PlanPerspectiveRecord | null>;
  listPlanPerspectives(filters?: PlanPerspectiveFilters): Promise<PlanPerspectiveRecord[]>;

  // Ceremonial Diary Operations
  registerDiaryEntry(record: DiaryEntryRecord): Promise<DiaryEntryRecord>;
  getDiaryEntry(id: string): Promise<DiaryEntryRecord | null>;
  listDiaryEntries(filters?: DiaryEntryFilters): Promise<DiaryEntryRecord[]>;
  deleteDiaryEntry(id: string): Promise<void>;

  // Ceremony Event Operations (GitHub-derived ceremonies)
  registerCeremonyEvent(record: CeremonyEventRecord): Promise<CeremonyEventRecord>;
  getCeremonyEvent(id: string): Promise<CeremonyEventRecord | null>;
  listCeremonyEvents(filters?: CeremonyEventFilters): Promise<CeremonyEventRecord[]>;
}

export type ProviderType = 'jsonl' | 'neon' | 'redis' | 'auto';
