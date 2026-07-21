import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { DirectionName, NodeType, CeremonyType } from '@medicine-wheel/ontology-core';
import type {
  StorageProvider,
  RelationalNode,
  RelationalEdge,
  CeremonyLog,
  WeaveRecord,
  InquiryWeaveFilters,
  PlanPerspectiveRecord,
  PlanPerspectiveFilters,
  DiaryEntryRecord,
  DiaryEntryFilters,
  CeremonyEventRecord,
  CeremonyEventFilters,
  NodePatch,
  EdgePatch,
} from './interface.js';
import {
  NodeNotFoundError,
  EdgeNotFoundError,
  NodeHasRelationsError,
} from './interface.js';
import {
  mergePlanPerspectiveRecords,
  matchesPlanPerspectiveFilters,
} from './plan-perspectives.js';
import { filterAndOrderDiaryEntries } from './diary-records.js';
import { matchesCeremonyEventFilters } from './ceremony-events.js';

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
  private readonly inquiryWeavesFile: string;
  private readonly planPerspectivesFile: string;
  private readonly diaryEntriesFile: string;
  private readonly ceremonyEventsFile: string;

  constructor(dataDir?: string) {
    this.dataDir = path.resolve(dataDir ?? resolveProjectDataDir());
    this.nodesFile = path.join(this.dataDir, 'nodes.jsonl');
    this.edgesFile = path.join(this.dataDir, 'edges.jsonl');
    this.ceremoniesFile = path.join(this.dataDir, 'ceremonies.jsonl');
    this.inquiryWeavesFile = path.join(this.dataDir, 'inquiry-weaves.jsonl');
    this.planPerspectivesFile = path.join(this.dataDir, 'plan-perspectives.jsonl');
    this.diaryEntriesFile = path.join(this.dataDir, 'diary-entries.jsonl');
    this.ceremonyEventsFile = path.join(this.dataDir, 'ceremony-events.jsonl');
  }

  async connect(): Promise<void> {
    ensureDirectory(this.dataDir);
  }

  async disconnect(): Promise<void> {
    // File-backed provider has no long-lived connection to tear down.
  }

  async createNode(node: RelationalNode): Promise<void> {
    await this.upsertById(this.nodesFile, node);
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

  async updateNode(id: string, patch: NodePatch): Promise<RelationalNode> {
    return withWriteLock(this.nodesFile, () => {
      const nodes = this.readNodes();
      const index = nodes.findIndex((candidate) => candidate.id === id);
      if (index === -1) throw new NodeNotFoundError(id);

      const current = nodes[index];
      const next: StoredNode = {
        ...current,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
        updated_at: new Date().toISOString(),
      };
      if (patch.direction !== undefined) {
        next.direction = patch.direction === null ? undefined : patch.direction;
      }

      nodes[index] = next;
      writeJsonl(this.nodesFile, nodes);
      return this.parseNode(next);
    });
  }

  async deleteNode(id: string): Promise<void> {
    await withWriteLock(this.nodesFile, () => {
      const nodes = this.readNodes();
      if (!nodes.some((candidate) => candidate.id === id)) {
        throw new NodeNotFoundError(id);
      }

      const relationCount = this.readEdges().filter(
        (edge) => edge.from_id === id || edge.to_id === id,
      ).length;
      if (relationCount > 0) {
        throw new NodeHasRelationsError(id, relationCount);
      }

      writeJsonl(
        this.nodesFile,
        nodes.filter((candidate) => candidate.id !== id),
      );
    });
  }

  async createEdge(edge: RelationalEdge): Promise<void> {
    await this.upsertEdge({
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

  async getAllEdges(limit = 100): Promise<RelationalEdge[]> {
    return this.readEdges()
      .sort(sortByNewest('created_at'))
      .slice(0, limit)
      .map((edge) => this.parseEdge(edge));
  }

  async updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): Promise<void> {
    await withWriteLock(this.edgesFile, () => {
      const nextEdges = this.readEdges().map((edge) => {
        if (edge.from_id !== fromId || edge.to_id !== toId) return edge;

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

  async updateEdge(fromId: string, toId: string, patch: EdgePatch): Promise<RelationalEdge> {
    return withWriteLock(this.edgesFile, () => {
      const edges = this.readEdges();
      const index = edges.findIndex(
        (candidate) => candidate.from_id === fromId && candidate.to_id === toId,
      );
      if (index === -1) throw new EdgeNotFoundError(fromId, toId);

      const next: StoredEdge = {
        ...edges[index],
        ...(patch.relationship_type !== undefined
          ? { relationship_type: patch.relationship_type }
          : {}),
        ...(patch.strength !== undefined ? { strength: patch.strength } : {}),
        ...(patch.ceremony_honored !== undefined
          ? { ceremony_honored: patch.ceremony_honored }
          : {}),
        ...(patch.obligations !== undefined ? { obligations: patch.obligations } : {}),
      };

      edges[index] = next;
      writeJsonl(this.edgesFile, edges);
      return this.parseEdge(next);
    });
  }

  async deleteEdge(fromId: string, toId: string): Promise<void> {
    await withWriteLock(this.edgesFile, () => {
      const edges = this.readEdges();
      const remaining = edges.filter(
        (candidate) => !(candidate.from_id === fromId && candidate.to_id === toId),
      );
      if (remaining.length === edges.length) {
        throw new EdgeNotFoundError(fromId, toId);
      }
      writeJsonl(this.edgesFile, remaining);
    });
  }

  async logCeremony(ceremony: CeremonyLog): Promise<void> {
    await this.upsertById(this.ceremoniesFile, ceremony);
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

  async registerInquiryWeave(record: WeaveRecord): Promise<void> {
    await this.upsertById(this.inquiryWeavesFile, record);
  }

  async getInquiryWeave(id: string): Promise<WeaveRecord | null> {
    return this.readInquiryWeaves().find((record) => record.id === id) ?? null;
  }

  async listInquiryWeaves(filters: InquiryWeaveFilters = {}): Promise<WeaveRecord[]> {
    return this.readInquiryWeaves().filter((record) => matchesInquiryWeaveFilters(record, filters));
  }

  async registerPlanPerspective(record: PlanPerspectiveRecord): Promise<PlanPerspectiveRecord> {
    let merged = record;
    await withWriteLock(this.planPerspectivesFile, () => {
      const records = readJsonl<PlanPerspectiveRecord>(this.planPerspectivesFile);
      const existing = records.find((candidate) => candidate.id === record.id);
      merged = existing ? mergePlanPerspectiveRecords(existing, record) : record;
      const nextRecords = records.filter((candidate) => candidate.id !== record.id);
      nextRecords.push(merged);
      writeJsonl(this.planPerspectivesFile, nextRecords);
    });
    return merged;
  }

  async getPlanPerspective(id: string): Promise<PlanPerspectiveRecord | null> {
    return this.readPlanPerspectives().find((record) => record.id === id) ?? null;
  }

  async listPlanPerspectives(
    filters: PlanPerspectiveFilters = {},
  ): Promise<PlanPerspectiveRecord[]> {
    return this.readPlanPerspectives().filter((record) =>
      matchesPlanPerspectiveFilters(record, filters),
    );
  }

  async registerDiaryEntry(record: DiaryEntryRecord): Promise<DiaryEntryRecord> {
    await this.upsertById(this.diaryEntriesFile, record);
    return record;
  }

  async getDiaryEntry(id: string): Promise<DiaryEntryRecord | null> {
    return this.readDiaryEntries().find((record) => record.id === id) ?? null;
  }

  async listDiaryEntries(filters: DiaryEntryFilters = {}): Promise<DiaryEntryRecord[]> {
    return filterAndOrderDiaryEntries(this.readDiaryEntries(), filters);
  }

  async deleteDiaryEntry(id: string): Promise<void> {
    await withWriteLock(this.diaryEntriesFile, () => {
      const remaining = this.readDiaryEntries().filter((record) => record.id !== id);
      writeJsonl(this.diaryEntriesFile, remaining);
    });
  }

  async registerCeremonyEvent(record: CeremonyEventRecord): Promise<CeremonyEventRecord> {
    await this.upsertById(this.ceremonyEventsFile, record);
    return record;
  }

  async getCeremonyEvent(id: string): Promise<CeremonyEventRecord | null> {
    return this.readCeremonyEvents().find((record) => record.id === id) ?? null;
  }

  async listCeremonyEvents(filters: CeremonyEventFilters = {}): Promise<CeremonyEventRecord[]> {
    return this.readCeremonyEvents()
      .filter((record) => matchesCeremonyEventFilters(record, filters))
      .sort(sortByNewest('timestamp'));
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

  private readInquiryWeaves(): WeaveRecord[] {
    return readJsonl<WeaveRecord>(this.inquiryWeavesFile);
  }

  private readPlanPerspectives(): PlanPerspectiveRecord[] {
    return readJsonl<PlanPerspectiveRecord>(this.planPerspectivesFile);
  }

  private readDiaryEntries(): DiaryEntryRecord[] {
    return readJsonl<DiaryEntryRecord>(this.diaryEntriesFile);
  }

  private readCeremonyEvents(): CeremonyEventRecord[] {
    return readJsonl<CeremonyEventRecord>(this.ceremonyEventsFile);
  }

  private async upsertById<T extends { id: string }>(filePath: string, item: T): Promise<void> {
    await withWriteLock(filePath, () => {
      const nextRecords = readJsonl<T>(filePath).filter((candidate) => candidate.id !== item.id);
      nextRecords.push(item);
      writeJsonl(filePath, nextRecords);
    });
  }

  private async upsertEdge(edge: StoredEdge): Promise<void> {
    await withWriteLock(this.edgesFile, () => {
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
      id: edge.id ?? `${edge.from_id}:${edge.to_id}`,
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

async function withWriteLock<T>(filePath: string, fn: () => T | Promise<T>): Promise<T> {
  const lockPath = `${filePath}.lock`;
  const ownerToken = await acquireWriteLock(lockPath);

  try {
    return await fn();
  } finally {
    releaseWriteLock(lockPath, ownerToken);
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
  // JSON-array encoding avoids false collisions when IDs contain the delimiter.
  return JSON.stringify([edge.from_id, edge.to_id]);
}

function sortByNewest<T extends Record<K, string>, K extends keyof T>(field: K) {
  return (left: T, right: T): number => Date.parse(right[field]) - Date.parse(left[field]);
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

function isProcessAlive(pid: number): boolean {
  try {
    // Signal 0 checks process existence without sending a real signal.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isLockStale(lockPath: string): boolean {
  try {
    const content = fs.readFileSync(lockPath, 'utf-8').trim();
    const parsed = JSON.parse(content) as { pid?: unknown; created_at?: unknown };

    const pid = typeof parsed.pid === 'number' ? parsed.pid : null;
    const createdAt =
      typeof parsed.created_at === 'string' ? Date.parse(parsed.created_at) : NaN;

    // A lock held by a live process is never stale.
    if (pid !== null && isProcessAlive(pid)) {
      return false;
    }

    // PID is dead or unreadable — treat as stale after a 30-second grace period.
    const lockAgeMs = isNaN(createdAt) ? Infinity : Date.now() - createdAt;
    return lockAgeMs > 30_000;
  } catch {
    return false;
  }
}

async function acquireWriteLock(lockPath: string): Promise<string> {
  const ownerToken = `${process.pid}:${Date.now()}:${randomUUID()}`;
  const payload = JSON.stringify({
    token: ownerToken,
    pid: process.pid,
    created_at: new Date().toISOString(),
  });

  for (let attempt = 0; attempt < 20; attempt++) {
    let fd: number | undefined;

    try {
      fd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(fd, payload, 'utf-8');
      return ownerToken;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') {
        throw error;
      }

      // Only remove the lock file when we are certain its owner is gone.
      if (isLockStale(lockPath)) {
        try {
          fs.unlinkSync(lockPath);
          console.warn(`[storage-provider/jsonl] Removed stale lock: ${lockPath}`);
        } catch {
          // Another process may have removed it first — that is fine.
        }
      } else {
        await sleep(Math.min(25 * (attempt + 1), 250));
      }
    } finally {
      if (fd !== undefined) {
        fs.closeSync(fd);
      }
    }
  }

  throw new Error(`[storage-provider/jsonl] Failed to acquire write lock: ${lockPath}`);
}

function releaseWriteLock(lockPath: string, ownerToken: string): void {
  try {
    const currentOwner = readLockOwner(lockPath);
    if (currentOwner !== ownerToken) {
      return;
    }

    fs.unlinkSync(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      throw error;
    }
  }
}

function readLockOwner(lockPath: string): string | null {
  const content = fs.readFileSync(lockPath, 'utf-8').trim();
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as { token?: unknown };
    return typeof parsed.token === 'string' ? parsed.token : null;
  } catch {
    return null;
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
