/**
 * Storage Provider Interface
 * 
 * Abstract interface for Medicine Wheel data persistence.
 * Implementations: NeonProvider (Postgres), RedisProvider (Upstash)
 */

import type { DirectionName, NodeType, CeremonyType } from 'medicine-wheel-ontology-core';

// ── Domain Types ──

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
  getRelatedNodes(nodeId: string, direction?: 'from' | 'to' | 'both'): Promise<string[]>;
  updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): Promise<void>;
  
  // Ceremony Operations
  logCeremony(ceremony: CeremonyLog): Promise<void>;
  getCeremony(id: string): Promise<CeremonyLog | null>;
  getCeremoniesTimeline(limit?: number): Promise<CeremonyLog[]>;
  getCeremoniesByDirection(direction: DirectionName): Promise<CeremonyLog[]>;
  getCeremoniesByType(type: CeremonyType): Promise<CeremonyLog[]>;
  getAllCeremonies(limit?: number): Promise<CeremonyLog[]>;
}

export type ProviderType = 'neon' | 'redis' | 'auto';
