/**
 * Neon (Postgres) Storage Provider
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { DirectionName, NodeType, CeremonyType } from 'medicine-wheel-ontology-core';
import type { StorageProvider, RelationalNode, RelationalEdge, CeremonyLog } from './interface.js';

export class NeonProvider implements StorageProvider {
  readonly name = 'neon';
  private sql: NeonQueryFunction<false, false> | null = null;

  async connect(): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    this.sql = neon(url);
  }

  async disconnect(): Promise<void> {
    this.sql = null;
  }

  private get db(): NeonQueryFunction<false, false> {
    if (!this.sql) throw new Error('NeonProvider not connected');
    return this.sql;
  }

  // ── Node Operations ──

  async createNode(node: RelationalNode): Promise<void> {
    await this.db`
      INSERT INTO nodes (id, type, name, description, direction, metadata, created_at, updated_at)
      VALUES (${node.id}, ${node.type}, ${node.name}, ${node.description}, 
              ${node.direction || null}, ${JSON.stringify(node.metadata)}, 
              ${node.created_at}, ${node.updated_at})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        direction = EXCLUDED.direction,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `;
  }

  async getNode(id: string): Promise<RelationalNode | null> {
    const rows = await this.db`SELECT * FROM nodes WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return this.parseNode(rows[0]);
  }

  async getNodesByType(type: NodeType): Promise<RelationalNode[]> {
    const rows = await this.db`SELECT * FROM nodes WHERE type = ${type} ORDER BY created_at DESC`;
    return rows.map(r => this.parseNode(r));
  }

  async getNodesByDirection(direction: DirectionName): Promise<RelationalNode[]> {
    const rows = await this.db`SELECT * FROM nodes WHERE direction = ${direction} ORDER BY created_at DESC`;
    return rows.map(r => this.parseNode(r));
  }

  async getAllNodes(limit = 100): Promise<RelationalNode[]> {
    const rows = await this.db`SELECT * FROM nodes ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map(r => this.parseNode(r));
  }

  private parseNode(row: Record<string, unknown>): RelationalNode {
    return {
      id: row.id as string,
      type: row.type as NodeType,
      name: row.name as string,
      description: (row.description as string) || '',
      direction: (row.direction as DirectionName) || undefined,
      metadata: (row.metadata as Record<string, unknown>) || {},
      created_at: (row.created_at as Date).toISOString(),
      updated_at: (row.updated_at as Date).toISOString(),
    };
  }

  // ── Edge Operations ──

  async createEdge(edge: RelationalEdge): Promise<void> {
    await this.db`
      INSERT INTO edges (from_id, to_id, relationship_type, strength, ceremony_honored, last_ceremony, obligations, created_at)
      VALUES (${edge.from_id}, ${edge.to_id}, ${edge.relationship_type}, ${edge.strength},
              ${edge.ceremony_honored}, ${edge.last_ceremony || null}, ${JSON.stringify(edge.obligations)}, ${edge.created_at})
      ON CONFLICT (from_id, to_id) DO UPDATE SET
        relationship_type = EXCLUDED.relationship_type,
        strength = EXCLUDED.strength,
        ceremony_honored = EXCLUDED.ceremony_honored,
        obligations = EXCLUDED.obligations
    `;
  }

  async getEdge(fromId: string, toId: string): Promise<RelationalEdge | null> {
    const rows = await this.db`SELECT * FROM edges WHERE from_id = ${fromId} AND to_id = ${toId}`;
    if (rows.length === 0) return null;
    return this.parseEdge(rows[0]);
  }

  async getRelatedNodes(nodeId: string, direction: 'from' | 'to' | 'both' = 'both'): Promise<string[]> {
    let rows: Record<string, unknown>[];
    if (direction === 'from') {
      rows = await this.db`SELECT to_id as id FROM edges WHERE from_id = ${nodeId}`;
    } else if (direction === 'to') {
      rows = await this.db`SELECT from_id as id FROM edges WHERE to_id = ${nodeId}`;
    } else {
      rows = await this.db`
        SELECT to_id as id FROM edges WHERE from_id = ${nodeId}
        UNION
        SELECT from_id as id FROM edges WHERE to_id = ${nodeId}
      `;
    }
    return rows.map(r => r.id as string);
  }

  async updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): Promise<void> {
    await this.db`
      UPDATE edges SET ceremony_honored = true, last_ceremony = ${ceremonyId}
      WHERE from_id = ${fromId} AND to_id = ${toId}
    `;
  }

  private parseEdge(row: Record<string, unknown>): RelationalEdge {
    return {
      from_id: row.from_id as string,
      to_id: row.to_id as string,
      relationship_type: row.relationship_type as string,
      strength: row.strength as number,
      ceremony_honored: row.ceremony_honored as boolean,
      last_ceremony: (row.last_ceremony as string) || undefined,
      obligations: (row.obligations as string[]) || [],
      created_at: (row.created_at as Date).toISOString(),
    };
  }

  // ── Ceremony Operations ──

  async logCeremony(ceremony: CeremonyLog): Promise<void> {
    await this.db`
      INSERT INTO ceremonies (id, type, direction, participants, medicines_used, intentions, timestamp, research_context)
      VALUES (${ceremony.id}, ${ceremony.type}, ${ceremony.direction},
              ${JSON.stringify(ceremony.participants)}, ${JSON.stringify(ceremony.medicines_used)},
              ${JSON.stringify(ceremony.intentions)}, ${ceremony.timestamp}, ${ceremony.research_context || null})
      ON CONFLICT (id) DO UPDATE SET
        participants = EXCLUDED.participants,
        medicines_used = EXCLUDED.medicines_used,
        intentions = EXCLUDED.intentions
    `;
  }

  async getCeremony(id: string): Promise<CeremonyLog | null> {
    const rows = await this.db`SELECT * FROM ceremonies WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return this.parseCeremony(rows[0]);
  }

  async getCeremoniesTimeline(limit = 20): Promise<CeremonyLog[]> {
    const rows = await this.db`SELECT * FROM ceremonies ORDER BY timestamp DESC LIMIT ${limit}`;
    return rows.map(r => this.parseCeremony(r));
  }

  async getCeremoniesByDirection(direction: DirectionName): Promise<CeremonyLog[]> {
    const rows = await this.db`SELECT * FROM ceremonies WHERE direction = ${direction} ORDER BY timestamp DESC`;
    return rows.map(r => this.parseCeremony(r));
  }

  async getCeremoniesByType(type: CeremonyType): Promise<CeremonyLog[]> {
    const rows = await this.db`SELECT * FROM ceremonies WHERE type = ${type} ORDER BY timestamp DESC`;
    return rows.map(r => this.parseCeremony(r));
  }

  async getAllCeremonies(limit = 100): Promise<CeremonyLog[]> {
    return this.getCeremoniesTimeline(limit);
  }

  private parseCeremony(row: Record<string, unknown>): CeremonyLog {
    return {
      id: row.id as string,
      type: row.type as CeremonyType,
      direction: row.direction as DirectionName,
      participants: (row.participants as string[]) || [],
      medicines_used: (row.medicines_used as string[]) || [],
      intentions: (row.intentions as string[]) || [],
      timestamp: (row.timestamp as Date).toISOString(),
      research_context: (row.research_context as string) || undefined,
    };
  }
}
