/**
 * Neon (Postgres) Storage Provider
 */

import type { DirectionName, NodeType, CeremonyType } from '@medicine-wheel/ontology-core';
import type {
  StorageProvider,
  RelationalNode,
  RelationalEdge,
  CeremonyLog,
  WeaveRecord,
  InquiryWeaveFilters,
} from './interface.js';

type QueryRow = Record<string, unknown>;
type NeonQueryFunction = (strings: TemplateStringsArray, ...params: unknown[]) => Promise<QueryRow[]>;

export class NeonProvider implements StorageProvider {
  readonly name = 'neon';
  private sql: NeonQueryFunction | null = null;

  async connect(): Promise<void> {
    const url = getConnectionString();
    if (!url) throw new Error('DATABASE_URL, POSTGRES_URL, or NEON_DATABASE_URL must be set');
    const { neon } = await import('@neondatabase/serverless');
    this.sql = neon(url);
    await this.ensureInquiryWeavesTable();
  }

  async disconnect(): Promise<void> {
    this.sql = null;
  }

  private get db(): NeonQueryFunction {
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
        type = EXCLUDED.type,
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
    return rows.map((row: Record<string, unknown>) => this.parseNode(row));
  }

  async getNodesByDirection(direction: DirectionName): Promise<RelationalNode[]> {
    const rows = await this.db`SELECT * FROM nodes WHERE direction = ${direction} ORDER BY created_at DESC`;
    return rows.map((row: Record<string, unknown>) => this.parseNode(row));
  }

  async getAllNodes(limit = 100): Promise<RelationalNode[]> {
    const rows = await this.db`SELECT * FROM nodes ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map((row: Record<string, unknown>) => this.parseNode(row));
  }

  private parseNode(row: Record<string, unknown>): RelationalNode {
    return {
      id: row.id as string,
      type: row.type as NodeType,
      name: row.name as string,
      description: (row.description as string) || '',
      direction: (row.direction as DirectionName) || undefined,
      metadata: parseJsonValue<Record<string, unknown>>(row.metadata, {}),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
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
        last_ceremony = EXCLUDED.last_ceremony,
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

  async getAllEdges(limit = 100): Promise<RelationalEdge[]> {
    const rows = await this.db`SELECT * FROM edges ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map((row: Record<string, unknown>) => this.parseEdge(row));
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
      strength: Number(row.strength),
      ceremony_honored: row.ceremony_honored as boolean,
      last_ceremony: (row.last_ceremony as string) || undefined,
      obligations: parseJsonValue<string[]>(row.obligations, []),
      created_at: toIsoString(row.created_at),
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
        type = EXCLUDED.type,
        direction = EXCLUDED.direction,
        participants = EXCLUDED.participants,
        medicines_used = EXCLUDED.medicines_used,
        intentions = EXCLUDED.intentions,
        timestamp = EXCLUDED.timestamp,
        research_context = EXCLUDED.research_context
    `;
  }

  async getCeremony(id: string): Promise<CeremonyLog | null> {
    const rows = await this.db`SELECT * FROM ceremonies WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return this.parseCeremony(rows[0]);
  }

  async getCeremoniesTimeline(limit = 20): Promise<CeremonyLog[]> {
    const rows = await this.db`SELECT * FROM ceremonies ORDER BY timestamp DESC LIMIT ${limit}`;
    return rows.map((row: Record<string, unknown>) => this.parseCeremony(row));
  }

  async getCeremoniesByDirection(direction: DirectionName): Promise<CeremonyLog[]> {
    const rows = await this.db`SELECT * FROM ceremonies WHERE direction = ${direction} ORDER BY timestamp DESC`;
    return rows.map((row: Record<string, unknown>) => this.parseCeremony(row));
  }

  async getCeremoniesByType(type: CeremonyType): Promise<CeremonyLog[]> {
    const rows = await this.db`SELECT * FROM ceremonies WHERE type = ${type} ORDER BY timestamp DESC`;
    return rows.map((row: Record<string, unknown>) => this.parseCeremony(row));
  }

  async getAllCeremonies(limit = 100): Promise<CeremonyLog[]> {
    return this.getCeremoniesTimeline(limit);
  }

  private parseCeremony(row: Record<string, unknown>): CeremonyLog {
    return {
      id: row.id as string,
      type: row.type as CeremonyType,
      direction: row.direction as DirectionName,
      participants: parseJsonValue<string[]>(row.participants, []),
      medicines_used: parseJsonValue<string[]>(row.medicines_used, []),
      intentions: parseJsonValue<string[]>(row.intentions, []),
      timestamp: toIsoString(row.timestamp),
      research_context: (row.research_context as string) || undefined,
    };
  }

  // ── Inquiry Weave Operations ──

  async registerInquiryWeave(record: WeaveRecord): Promise<void> {
    await this.db`
      INSERT INTO inquiry_weaves (id, payload, episode_path, episode_number, issue, artefact_id, updated_at)
      VALUES (
        ${record.id},
        ${JSON.stringify(record)},
        ${record.episode.path},
        ${record.episode.number},
        ${record.issue},
        ${record.artefact.id},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        episode_path = EXCLUDED.episode_path,
        episode_number = EXCLUDED.episode_number,
        issue = EXCLUDED.issue,
        artefact_id = EXCLUDED.artefact_id,
        updated_at = NOW()
    `;
  }

  async getInquiryWeave(id: string): Promise<WeaveRecord | null> {
    const rows = await this.db`SELECT payload FROM inquiry_weaves WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return parseJsonValue<WeaveRecord>(rows[0].payload, null as unknown as WeaveRecord);
  }

  async listInquiryWeaves(filters: InquiryWeaveFilters = {}): Promise<WeaveRecord[]> {
    const records = await this.getAllInquiryWeaves();
    return records.filter((record) => matchesInquiryWeaveFilters(record, filters));
  }

  private async getAllInquiryWeaves(): Promise<WeaveRecord[]> {
    const rows = await this.db`SELECT payload FROM inquiry_weaves ORDER BY updated_at DESC`;
    return rows.map((row) => parseJsonValue<WeaveRecord>(row.payload, null as unknown as WeaveRecord));
  }

  private async ensureInquiryWeavesTable(): Promise<void> {
    await this.db`
      CREATE TABLE IF NOT EXISTS inquiry_weaves (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        episode_path TEXT NOT NULL,
        episode_number INTEGER NOT NULL,
        issue TEXT NOT NULL,
        artefact_id TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await this.db`CREATE INDEX IF NOT EXISTS idx_inquiry_weaves_episode_path ON inquiry_weaves(episode_path)`;
    await this.db`CREATE INDEX IF NOT EXISTS idx_inquiry_weaves_episode_number ON inquiry_weaves(episode_number)`;
    await this.db`CREATE INDEX IF NOT EXISTS idx_inquiry_weaves_issue ON inquiry_weaves(issue)`;
    await this.db`CREATE INDEX IF NOT EXISTS idx_inquiry_weaves_artefact_id ON inquiry_weaves(artefact_id)`;
  }
}

function getConnectionString(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.NEON_DATABASE_URL;
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function matchesInquiryWeaveFilters(record: WeaveRecord, filters: InquiryWeaveFilters): boolean {
  if (filters.episode_path !== undefined && record.episode?.path !== filters.episode_path) {
    return false;
  }
  if (filters.episode_number !== undefined && record.episode?.number !== filters.episode_number) {
    return false;
  }
  if (filters.issue !== undefined && record.issue !== filters.issue) {
    return false;
  }
  if (filters.artefact !== undefined && record.artefact?.id !== filters.artefact) {
    return false;
  }
  return true;
}
