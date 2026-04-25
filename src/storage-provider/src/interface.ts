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
} from 'medicine-wheel-ontology-core';

// ── Domain Types ──

export interface RelationalNode extends OntologyRelationalNode {
  description?: string;
}

export interface RelationalEdge extends Omit<OntologyRelationalEdge, 'id'> {
  id?: string;
  last_ceremony?: string;
}

export type CeremonyLog = OntologyCeremonyLog;

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

export type ProviderType = 'jsonl' | 'neon' | 'redis' | 'auto';
