import * as fs from 'fs';
import * as path from 'path';
import type { DirectionName, NodeType, CeremonyType } from 'medicine-wheel-ontology-core';
import type { StorageProvider, RelationalNode, RelationalEdge, CeremonyLog } from './interface.js';

interface StoredNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  direction?: DirectionName;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface StoredEdge {
  id?: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;
  ceremony_honored: boolean;
  ceremony_id?: string;
  last_ceremony?: string;
  obligations?: string[];
  created_at: string;
}

interface StoredCeremony {
  id: string;
  type: CeremonyType;
  direction: DirectionName;
  participants?: string[];
  medicines_used?: string[];
  intentions?: string[];
  timestamp: string;
  research_context?: string;
}

export class JsonlProvider implements StorageProvider {
  readonly name = 'jsonl';
  readonly dataDir: string;

  private readonly nodesFile: string;
  private readonly edgesFile: string;
  private readonly ceremoniesFile: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? resolveProjectDataDir();
    this.nodesFile = path.join(this.dataDir, 'nodes.jsonl');
    this.edgesFile = path.join(this.dataDir, 'edges.jsonl');
    this.ceremoniesFile = path.join(this.dataDir, 'ceremonies.jsonl');
  }

  async connect(): Promise<void> {
    ensureDirectory(this.dataDir);
  }

  async disconnect(): Promise<void> {
    // File-backed provider has no long-lived connection to tear down.
  }

  async createNode(node: RelationalNode): Promise<void> {
    this.upsertById(this.nodesFile, node);
  }

  async getNode(id: string): Promise<RelationalNode | null> {
    const node = this.readNodes().find((candidate) => candidate.id === id);
    return node ? this.parseNode(node) : null;
  }

  async getNodesByType(type: NodeType): Promise<RelationalNode[]> {
    return this.readNodes()
      .filter((node) => node.type === type)
      .sort(sortByNewest('created_at'))
      .map((node) => this.parseNode(node));
  }

  async getNodesByDirection(direction: DirectionName): Promise<RelationalNode[]> {
    return this.readNodes()
      .filter((node) => node.direction === direction)
      .sort(sortByNewest('created_at'))
      .map((node) => this.parseNode(node));
  }

  async getAllNodes(limit = 100): Promise<RelationalNode[]> {
    return this.readNodes()
      .sort(sortByNewest('created_at'))
      .slice(0, limit)
      .map((node) => this.parseNode(node));
  }

  async createEdge(edge: RelationalEdge): Promise<void> {
    this.upsertEdge({
      ...edge,
      ceremony_id: edge.last_ceremony,
    });
  }

  async getEdge(fromId: string, toId: string): Promise<RelationalEdge | null> {
    const edge = this.readEdges().find(
      (candidate) => candidate.from_id === fromId && candidate.to_id === toId,
    );
    return edge ? this.parseEdge(edge) : null;
  }

  async getRelatedNodes(
    nodeId: string,
    direction: 'from' | 'to' | 'both' = 'both',
  ): Promise<string[]> {
    const related = new Set<string>();

    for (const edge of this.readEdges()) {
      if ((direction === 'from' || direction === 'both') && edge.from_id === nodeId) {
        related.add(edge.to_id);
      }
      if ((direction === 'to' || direction === 'both') && edge.to_id === nodeId) {
        related.add(edge.from_id);
      }
    }

    return Array.from(related);
  }

  async updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): Promise<void> {
    withWriteLock(this.edgesFile, () => {
      const nextEdges = this.readEdges().map((edge) => {
        if (!matchesEdge(edge, fromId, toId)) return edge;

        return {
          ...edge,
          ceremony_honored: true,
          ceremony_id: ceremonyId,
          last_ceremony: ceremonyId,
        };
      });

      writeJsonl(this.edgesFile, nextEdges);
    });
  }

  async logCeremony(ceremony: CeremonyLog): Promise<void> {
    this.upsertById(this.ceremoniesFile, ceremony);
  }

  async getCeremony(id: string): Promise<CeremonyLog | null> {
    const ceremony = this.readCeremonies().find((candidate) => candidate.id === id);
    return ceremony ? this.parseCeremony(ceremony) : null;
  }

  async getCeremoniesTimeline(limit = 20): Promise<CeremonyLog[]> {
    return this.readCeremonies()
      .sort(sortByNewest('timestamp'))
      .slice(0, limit)
      .map((ceremony) => this.parseCeremony(ceremony));
  }

  async getCeremoniesByDirection(direction: DirectionName): Promise<CeremonyLog[]> {
    return this.readCeremonies()
      .filter((ceremony) => ceremony.direction === direction)
      .sort(sortByNewest('timestamp'))
      .map((ceremony) => this.parseCeremony(ceremony));
  }

  async getCeremoniesByType(type: CeremonyType): Promise<CeremonyLog[]> {
    return this.readCeremonies()
      .filter((ceremony) => ceremony.type === type)
      .sort(sortByNewest('timestamp'))
      .map((ceremony) => this.parseCeremony(ceremony));
  }

  async getAllCeremonies(limit = 100): Promise<CeremonyLog[]> {
    return this.readCeremonies()
      .sort(sortByNewest('timestamp'))
      .slice(0, limit)
      .map((ceremony) => this.parseCeremony(ceremony));
  }

  private readNodes(): StoredNode[] {
    return readJsonl<StoredNode>(this.nodesFile);
  }

  private readEdges(): StoredEdge[] {
    return readJsonl<StoredEdge>(this.edgesFile);
  }

  private readCeremonies(): StoredCeremony[] {
    return readJsonl<StoredCeremony>(this.ceremoniesFile);
  }

  private upsertById<T extends { id: string }>(filePath: string, item: T): void {
    withWriteLock(filePath, () => {
      const nextRecords = readJsonl<T>(filePath).filter((candidate) => candidate.id !== item.id);
      nextRecords.push(item);
      writeJsonl(filePath, nextRecords);
    });
  }

  private upsertEdge(edge: StoredEdge): void {
    withWriteLock(this.edgesFile, () => {
      const nextEdges = this.readEdges().filter(
        (candidate) => edgeKey(candidate) !== edgeKey(edge),
      );
      nextEdges.push(edge);
      writeJsonl(this.edgesFile, nextEdges);
    });
  }

  private parseNode(node: StoredNode): RelationalNode {
    return {
      id: node.id,
      type: node.type,
      name: node.name,
      description: node.description ?? '',
      direction: node.direction,
      metadata: node.metadata ?? {},
      created_at: node.created_at,
      updated_at: node.updated_at,
    };
  }

  private parseEdge(edge: StoredEdge): RelationalEdge {
    return {
      from_id: edge.from_id,
      to_id: edge.to_id,
      relationship_type: edge.relationship_type,
      strength: Number(edge.strength),
      ceremony_honored: Boolean(edge.ceremony_honored),
      last_ceremony: edge.last_ceremony ?? edge.ceremony_id,
      obligations: Array.isArray(edge.obligations) ? edge.obligations : [],
      created_at: edge.created_at,
    };
  }

  private parseCeremony(ceremony: StoredCeremony): CeremonyLog {
    return {
      id: ceremony.id,
      type: ceremony.type,
      direction: ceremony.direction,
      participants: Array.isArray(ceremony.participants) ? ceremony.participants : [],
      medicines_used: Array.isArray(ceremony.medicines_used) ? ceremony.medicines_used : [],
      intentions: Array.isArray(ceremony.intentions) ? ceremony.intentions : [],
      timestamp: ceremony.timestamp,
      research_context: ceremony.research_context,
    };
  }
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];

  const records: T[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      records.push(JSON.parse(trimmed) as T);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[storage-provider/jsonl] Skipping malformed line in ${filePath}: ${message}`);
    }
  }

  return records;
}

function writeJsonl<T>(filePath: string, records: T[]): void {
  ensureDirectory(path.dirname(filePath));
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  const content = records.map((record) => JSON.stringify(record)).join('\n');
  fs.writeFileSync(tmpPath, content.length > 0 ? `${content}\n` : '', 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

function withWriteLock<T>(filePath: string, fn: () => T): T {
  const lockPath = `${filePath}.lock`;
  let locked = false;

  try {
    const stat = fs.statSync(lockPath);
    if (Date.now() - stat.mtimeMs > 30_000) {
      fs.unlinkSync(lockPath);
    }
  } catch {
    // No existing lock.
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      locked = true;
      break;
    } catch {
      const delayMs = Math.min(25 * (attempt + 1), 250);
      const deadline = Date.now() + delayMs;
      while (Date.now() < deadline) {
        // Spin-wait inside the short retry window.
      }
    }
  }

  if (!locked) {
    throw new Error(`[storage-provider/jsonl] Failed to acquire write lock: ${lockPath}`);
  }

  try {
    return fn();
  } finally {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // Best-effort unlock.
    }
  }
}

function resolveProjectDataDir(currentDir?: string): string {
  if (process.env.MW_DATA_DIR) return process.env.MW_DATA_DIR;

  const cwd = currentDir ?? process.cwd();
  if (cwd.endsWith('/mcp') || cwd.endsWith('\\mcp')) {
    return path.join(path.dirname(cwd), '.mw', 'store');
  }

  let dir = cwd;
  for (let depth = 0; depth < 5; depth++) {
    const packageJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { name?: string };
        if (pkg.name === 'medicine-wheel') {
          return path.join(dir, '.mw', 'store');
        }
      } catch {
        // Keep walking upward.
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return path.join(cwd, '.mw', 'store');
}

function edgeKey(edge: Pick<StoredEdge, 'from_id' | 'to_id'>): string {
  return `${edge.from_id}:${edge.to_id}`;
}

function matchesEdge(edge: StoredEdge, fromId: string, toId: string): boolean {
  return (
    (edge.from_id === fromId && edge.to_id === toId) ||
    (edge.from_id === toId && edge.to_id === fromId)
  );
}

function sortByNewest<T extends Record<K, string>, K extends keyof T>(field: K) {
  return (left: T, right: T): number => Date.parse(right[field]) - Date.parse(left[field]);
}
