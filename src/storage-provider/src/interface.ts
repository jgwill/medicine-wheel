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
  
  // Edge Operations
  createEdge(edge: RelationalEdge): Promise<void>;
  getEdge(fromId: string, toId: string): Promise<RelationalEdge | null>;
  getAllEdges(limit?: number): Promise<RelationalEdge[]>;
  getRelatedNodes(nodeId: string, direction?: 'from' | 'to' | 'both'): Promise<string[]>;
  updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): Promise<void>;
  
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
}

export type ProviderType = 'jsonl' | 'neon' | 'redis' | 'auto';
