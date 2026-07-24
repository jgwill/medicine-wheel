/**
 * JSONL File-Based Persistence for Medicine Wheel
 *
 * Shared data layer that both the Web UI (Next.js) and MCP server
 * can read/write, enabling ceremonies, cycles, nodes, edges, beats,
 * and charts created in any interface to be visible across all interfaces.
 *
 * Storage format: One JSONL file per entity type in the .mw/store/ directory.
 * Each line is a JSON-serialized record. Atomic writes via temp+rename.
 *
 * Cross-process sync: file-lock + read-modify-write inside flush so concurrent
 * writers merge rather than clobber each other.
 *
 * Location is configurable via MW_DATA_DIR env var (defaults to .mw/store/).
 *
 * @see rispecs/data-store.spec.md
 * @see https://github.com/jgwill/medicine-wheel/issues/26
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ──

interface StoredNode {
  id: string;
  type: string;
  name: string;
  description?: string;
  direction?: string;
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
  obligations: string[];
  created_at: string;
}

interface StoredCeremony {
  id: string;
  type: string;
  direction: string;
  participants: string[];
  medicines_used: string[];
  intentions: string[];
  timestamp: string;
  research_context?: string;
}

interface StoredBeat {
  id: string;
  direction: string;
  title: string;
  description: string;
  prose?: string;
  ceremonies: string[];
  learnings: string[];
  timestamp: string;
  act: number;
  relations_honored: string[];
  cycle_id?: string;
  parent_beat_id?: string;
  sub_beats?: string[];
  origin?: { producer: string; source_ref?: string; method?: string };
}

interface StoredCycle {
  id: string;
  research_question: string;
  current_direction: string;
  start_date: string;
  beats?: string[];
  ceremonies_conducted: number;
  relations_mapped: number;
  wilson_alignment: number;
  ocap_compliant: boolean;
  archived?: boolean;
}

interface StoredChart {
  id: string;
  desired_outcome: string;
  current_reality: string;
  direction: string;
  action_steps: any[];
  due_date?: string;
  created_at: string;
  updated_at: string;
  phase: string;
  ceremonies_linked: string[];
  wilson_alignment?: number;
  cycle_id?: string;
}

interface StoredMmot {
  id: string;
  chart_id: string;
  timestamp: string;
  step1_expected: string;
  step1_actual: string;
  step2_analysis: string;
  step3_adjustments: string[];
  step4_feedback: string;
}

// ── File Lock ──
// Cross-process write coordination via an exclusive lock file.
// Uses O_EXCL (create-only) which is atomic on POSIX filesystems.
// Inside the lock, flush performs read-modify-write so concurrent
// writers merge rather than clobber each other.

function isProcessAlive(pid: number): boolean {
  try {
    // Signal 0 checks process existence without sending a real signal.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Read the owner token stamped in a lock file, or null when unreadable. */
function readLockOwner(lockPath: string): string | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, 'utf-8').trim()) as { token?: unknown };
    return typeof parsed.token === 'string' ? parsed.token : null;
  } catch {
    return null;
  }
}

/**
 * A lock is stale only when its owner is provably gone.
 *
 * Age alone is not evidence: a slow but living writer holding the lock past
 * the grace period would have it reaped from under it, and two processes
 * would then rewrite the same file from divergent snapshots — the second
 * rename silently discards the first one's records.
 */
function isLockStale(lockPath: string): boolean {
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(lockPath).mtimeMs;
  } catch {
    return false; // Lock already gone — nothing to reap.
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, 'utf-8').trim()) as { pid?: unknown };
    if (typeof parsed.pid === 'number' && isProcessAlive(parsed.pid)) return false;
  } catch {
    // Locks written by older builds (and by the mcp/ copy of this store) carry
    // no payload, so they name no owner — fall through to the age check.
  }

  return Date.now() - mtimeMs > 30_000;
}

function withWriteLock<T>(filePath: string, fn: () => T): T {
  const lockPath = filePath + '.lock';
  const ownerToken = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const payload = JSON.stringify({
    token: ownerToken,
    pid: process.pid,
    created_at: new Date().toISOString(),
  });
  let locked = false;

  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const fd = fs.openSync(lockPath, 'wx'); // O_EXCL — fails if exists
      try {
        fs.writeFileSync(fd, payload, 'utf-8');
      } finally {
        fs.closeSync(fd);
      }
      locked = true;
      break;
    } catch {
      // Lock held elsewhere. Reap it only once its owner is provably gone,
      // otherwise spin-wait with linear back-off.
      if (isLockStale(lockPath)) {
        console.error(`[jsonl-store] Removing stale lock: ${lockPath}`);
        try { fs.unlinkSync(lockPath); } catch { /* another writer got there first */ }
        continue;
      }
      const delayMs = Math.min(25 * (attempt + 1), 250);
      const deadline = Date.now() + delayMs;
      while (Date.now() < deadline) { /* spin */ }
    }
  }

  if (!locked) {
    throw new Error(`[jsonl-store] Failed to acquire write lock after 20 attempts: ${lockPath}`);
  }

  try {
    return fn();
  } finally {
    // Release only the lock we still hold: if a reaper judged us dead and
    // handed the lock on, unlinking would release someone else's write.
    try {
      if (readLockOwner(lockPath) === ownerToken) fs.unlinkSync(lockPath);
    } catch { /* best effort */ }
  }
}

// ── JSONL File Helpers ──

/**
 * Read all records from a JSONL file, keeping the raw text of any line that
 * would not parse so a caller about to rewrite the file can set it aside.
 * Returns no records if the file does not exist (normal for first run).
 * Throws on permission errors or other real FS failures so the caller
 * knows not to proceed with a potentially-stale empty state.
 */
function readJsonlWithMalformed<T>(filePath: string): { records: T[]; malformed: string[] } {
  if (!fs.existsSync(filePath)) return { records: [], malformed: [] };

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read JSONL store at ${filePath}: ${message}`);
  }

  const records: T[] = [];
  const malformed: string[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as T);
    } catch (error) {
      // Skip individual malformed lines — log so they don't disappear silently
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[jsonl-store] Skipping malformed line in ${filePath}: ${message}`);
      malformed.push(trimmed);
    }
  }
  return { records, malformed };
}

function readJsonl<T>(filePath: string): T[] {
  return readJsonlWithMalformed<T>(filePath).records;
}

/**
 * Set unparseable lines aside before a rewrite erases them.
 *
 * flush() rebuilds the whole file from the records it could parse, so a line
 * readJsonl skipped — a half-written record from a killed writer, a truncated
 * tail — is gone for good the moment anything else is saved. Appending the raw
 * text to a sidecar keeps it recoverable by hand. Nothing reads the sidecar
 * back; it exists so the loss is not silent.
 */
function quarantineMalformedLines(filePath: string, malformed: string[]): void {
  if (malformed.length === 0) return;

  const quarantinePath = `${filePath}.quarantine`;
  try {
    fs.appendFileSync(quarantinePath, malformed.join('\n') + '\n', 'utf-8');
    console.error(`[jsonl-store] Quarantined ${malformed.length} unparseable line(s) from ${filePath} to ${quarantinePath}`);
  } catch (error) {
    // Best effort — a failed sidecar must not block the write itself.
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[jsonl-store] Failed to quarantine malformed lines from ${filePath}: ${message}`);
  }
}

/**
 * Write all records to a JSONL file atomically (temp + rename).
 * Must be called inside withWriteLock() for cross-process safety.
 */
function writeJsonl<T>(filePath: string, records: T[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  const content = records.map(r => JSON.stringify(r)).join('\n') + (records.length > 0 ? '\n' : '');
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/** Get file mtime in ms (0 if file does not exist). */
function getMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

// ── JsonlCollection<T> ──
// Single JSONL-backed entity collection keyed by `id`.
// flush() performs read-modify-write inside a file lock so concurrent
// writes from the Web UI and MCP server merge rather than clobber.

class JsonlCollection<T extends { id?: string }> {
  private items: Map<string, T> = new Map();
  private filePath: string;
  private lastMtime: number = 0;
  private loaded: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** Reload from disk if file changed since last sync. */
  private sync(): void {
    const currentMtime = getMtime(this.filePath);
    if (!this.loaded || currentMtime !== this.lastMtime) {
      const records = readJsonl<T>(this.filePath);
      this.items = new Map();
      for (const record of records) {
        const id = (record as any).id as string | undefined;
        if (id) this.items.set(id, record);
      }
      this.lastMtime = currentMtime;
      this.loaded = true;
    }
  }

  /**
   * Flush in-memory state to disk using read-modify-write inside a file lock.
   * Reads the current on-disk state first so concurrent writes from another
   * process are merged (our in-memory items take precedence for keys we own).
   */
  private flush(): void {
    withWriteLock(this.filePath, () => {
      // Read disk state inside the lock so we don't clobber concurrent writes
      const { records: diskRecords, malformed } = readJsonlWithMalformed<T>(this.filePath);
      quarantineMalformedLines(this.filePath, malformed);
      const merged = new Map<string, T>();
      for (const r of diskRecords) {
        const id = (r as any).id as string | undefined;
        if (id) merged.set(id, r);
      }
      // Our in-memory items take precedence (we just set them)
      for (const [id, item] of this.items) {
        merged.set(id, item);
      }
      writeJsonl(this.filePath, Array.from(merged.values()));
      // Sync our cache to match merged disk state
      this.items = merged;
      this.lastMtime = getMtime(this.filePath);
    });
  }

  get(id: string): T | undefined {
    this.sync();
    return this.items.get(id);
  }

  getAll(): T[] {
    this.sync();
    return Array.from(this.items.values());
  }

  set(id: string, item: T): void {
    this.sync();
    this.items.set(id, item);
    this.flush();
  }

  has(id: string): boolean {
    this.sync();
    return this.items.has(id);
  }

  size(): number {
    this.sync();
    return this.items.size;
  }

  filter(predicate: (item: T) => boolean): T[] {
    this.sync();
    return Array.from(this.items.values()).filter(predicate);
  }

  search(query: string, fields: (keyof T)[]): T[] {
    this.sync();
    const q = query.toLowerCase();
    return Array.from(this.items.values()).filter(item =>
      fields.some(f => {
        const val = item[f];
        return typeof val === 'string' && val.toLowerCase().includes(q);
      })
    );
  }
}

// ── EdgeCollection ──
// Edges are keyed by `${from_id}:${to_id}` (upsert semantics).
// add() replaces an existing edge with the same endpoints rather than
// appending a duplicate. flush() uses the same lock + read-modify-write
// strategy as JsonlCollection.

class EdgeCollection {
  private items: Map<string, StoredEdge> = new Map();
  private filePath: string;
  private lastMtime: number = 0;
  private loaded: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private edgeKey(edge: StoredEdge): string {
    // JSON-array encoding of the endpoints, matching @medicine-wheel/storage-provider.
    // A plain `from:to` join collides whenever an id carries the delimiter — the
    // store already holds ids like `memory:1775381859564:e2e` — and the collision
    // silently overwrites one relation with an unrelated one.
    return JSON.stringify([edge.from_id, edge.to_id]);
  }

  private sync(): void {
    const currentMtime = getMtime(this.filePath);
    if (!this.loaded || currentMtime !== this.lastMtime) {
      const records = readJsonl<StoredEdge>(this.filePath);
      this.items = new Map();
      for (const r of records) {
        this.items.set(this.edgeKey(r), r);
      }
      this.lastMtime = currentMtime;
      this.loaded = true;
    }
  }

  private flush(): void {
    withWriteLock(this.filePath, () => {
      // Read-modify-write inside lock to merge concurrent changes
      const { records: diskRecords, malformed } = readJsonlWithMalformed<StoredEdge>(this.filePath);
      quarantineMalformedLines(this.filePath, malformed);
      const merged = new Map<string, StoredEdge>();
      for (const r of diskRecords) {
        merged.set(this.edgeKey(r), r);
      }
      for (const [key, edge] of this.items) {
        merged.set(key, edge);
      }
      writeJsonl(this.filePath, Array.from(merged.values()));
      this.items = merged;
      this.lastMtime = getMtime(this.filePath);
    });
  }

  /** Upsert: replaces any existing edge with the same endpoints. */
  add(edge: StoredEdge): void {
    this.sync();
    this.items.set(this.edgeKey(edge), edge);
    this.flush();
  }

  getAll(): StoredEdge[] {
    this.sync();
    return Array.from(this.items.values());
  }

  getForNode(nodeId: string): StoredEdge[] {
    this.sync();
    return Array.from(this.items.values()).filter(
      e => e.from_id === nodeId || e.to_id === nodeId
    );
  }

  getRelatedNodeIds(nodeId: string): string[] {
    this.sync();
    const ids = new Set<string>();
    for (const e of this.items.values()) {
      if (e.from_id === nodeId) ids.add(e.to_id);
      if (e.to_id === nodeId) ids.add(e.from_id);
    }
    return Array.from(ids);
  }

  updateCeremony(fromId: string, toId: string, ceremonyId: string): void {
    this.sync();
    for (const [key, edge] of this.items) {
      if ((edge.from_id === fromId && edge.to_id === toId) ||
          (edge.from_id === toId && edge.to_id === fromId)) {
        this.items.set(key, { ...edge, ceremony_honored: true, ceremony_id: ceremonyId });
      }
    }
    this.flush();
  }
}

// ── JsonlStore: the full shared store ──

export class JsonlStore {
  readonly dataDir: string;

  readonly nodes: JsonlCollection<StoredNode>;
  readonly edges: EdgeCollection;
  readonly ceremonies: JsonlCollection<StoredCeremony>;
  readonly beats: JsonlCollection<StoredBeat>;
  readonly cycles: JsonlCollection<StoredCycle>;
  readonly charts: JsonlCollection<StoredChart>;
  readonly mmots: JsonlCollection<StoredMmot>;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || process.env.MW_DATA_DIR || path.join(process.cwd(), '.mw', 'store');

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.nodes      = new JsonlCollection<StoredNode>   (path.join(this.dataDir, 'nodes.jsonl'));
    this.edges      = new EdgeCollection                 (path.join(this.dataDir, 'edges.jsonl'));
    this.ceremonies = new JsonlCollection<StoredCeremony>(path.join(this.dataDir, 'ceremonies.jsonl'));
    this.beats      = new JsonlCollection<StoredBeat>    (path.join(this.dataDir, 'beats.jsonl'));
    this.cycles     = new JsonlCollection<StoredCycle>   (path.join(this.dataDir, 'cycles.jsonl'));
    this.charts     = new JsonlCollection<StoredChart>   (path.join(this.dataDir, 'charts.jsonl'));
    this.mmots      = new JsonlCollection<StoredMmot>    (path.join(this.dataDir, 'mmots.jsonl'));
  }

  // === Nodes ===

  createNode(node: StoredNode): void { this.nodes.set(node.id, node); }
  getNode(id: string): StoredNode | undefined { return this.nodes.get(id); }

  getAllNodes(limit?: number): StoredNode[] {
    const all = this.nodes.getAll();
    return limit !== undefined ? all.slice(0, limit) : all;
  }

  getNodesByType(type: string): StoredNode[] {
    return this.nodes.filter(n => n.type === type);
  }

  getNodesByDirection(direction: string): StoredNode[] {
    return this.nodes.filter(n => n.direction === direction);
  }

  searchNodes(query: string, opts: { type?: string; direction?: string; limit?: number } = {}): StoredNode[] {
    let results = this.nodes.search(query, ['name', 'description'] as any);
    if (opts.type)      results = results.filter(n => n.type === opts.type);
    if (opts.direction) results = results.filter(n => n.direction === opts.direction);
    return opts.limit !== undefined ? results.slice(0, opts.limit) : results;
  }

  // === Edges ===

  createEdge(edge: StoredEdge): void { this.edges.add(edge); }
  getEdgesForNode(nodeId: string): StoredEdge[] { return this.edges.getForNode(nodeId); }
  getRelatedNodeIds(nodeId: string): string[] { return this.edges.getRelatedNodeIds(nodeId); }
  updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): void {
    this.edges.updateCeremony(fromId, toId, ceremonyId);
  }

  getRelationalWeb(nodeId: string, depth = 2): { nodes: StoredNode[]; edges: StoredEdge[] } {
    const visited = new Set<string>();
    const resultNodes: StoredNode[] = [];
    const resultEdges: StoredEdge[] = [];
    const queue: { id: string; d: number }[] = [{ id: nodeId, d: 0 }];

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (visited.has(id) || d > depth) continue;
      visited.add(id);
      const node = this.nodes.get(id);
      if (node) resultNodes.push(node);

      for (const edge of this.edges.getForNode(id)) {
        if (!resultEdges.includes(edge)) resultEdges.push(edge);
        const otherId = edge.from_id === id ? edge.to_id : edge.from_id;
        if (!visited.has(otherId)) queue.push({ id: otherId, d: d + 1 });
      }
    }
    return { nodes: resultNodes, edges: resultEdges };
  }

  // === Ceremonies ===

  logCeremony(ceremony: StoredCeremony): void { this.ceremonies.set(ceremony.id, ceremony); }
  getCeremony(id: string): StoredCeremony | undefined { return this.ceremonies.get(id); }

  getAllCeremonies(limit?: number): StoredCeremony[] {
    const sorted = this.ceremonies.getAll()
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    return limit !== undefined ? sorted.slice(0, limit) : sorted;
  }

  getCeremoniesByDirection(direction: string): StoredCeremony[] {
    return this.ceremonies.filter(c => c.direction === direction);
  }

  getCeremoniesByType(type: string): StoredCeremony[] {
    return this.ceremonies.filter(c => c.type === type);
  }

  // === Beats ===

  createBeat(beat: StoredBeat): void { this.beats.set(beat.id, beat); }
  getBeat(id: string): StoredBeat | undefined { return this.beats.get(id); }

  getAllBeats(limit?: number): StoredBeat[] {
    const all = this.beats.getAll();
    return limit !== undefined ? all.slice(0, limit) : all;
  }

  getBeatsByDirection(direction: string): StoredBeat[] {
    return this.beats.filter(b => b.direction === direction);
  }

  // === Cycles ===

  createCycle(cycle: StoredCycle): void { this.cycles.set(cycle.id, cycle); }
  getCycle(id: string): StoredCycle | undefined { return this.cycles.get(id); }

  getAllCycles(): { active: StoredCycle[]; archived: StoredCycle[] } {
    const all = this.cycles.getAll();
    return {
      active:   all.filter(c => !c.archived),
      archived: all.filter(c =>  c.archived),
    };
  }

  archiveCycle(id: string): void {
    const cycle = this.cycles.get(id);
    if (cycle) this.cycles.set(id, { ...cycle, archived: true });
  }

  // === Charts (Structural Tension) ===

  saveChart(chart: StoredChart): void { this.charts.set(chart.id, chart); }
  getChart(id: string): StoredChart | undefined { return this.charts.get(id); }

  getAllCharts(direction?: string): StoredChart[] {
    let charts = this.charts.getAll();
    if (direction) charts = charts.filter(c => c.direction === direction);
    return charts.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }

  // === MMOT (Moment of Truth) ===

  saveMmot(mmot: StoredMmot): void { this.mmots.set(mmot.id, mmot); }
  getMmotsByChart(chartId: string): StoredMmot[] {
    return this.mmots.filter(m => m.chart_id === chartId);
  }
}

// ── Singleton instance ──

let _instance: JsonlStore | null = null;

/**
 * Get the shared JsonlStore singleton.
 * Both Web UI and MCP server call this to get the same store instance.
 * Data file location is resolved from MW_DATA_DIR or defaults to .mw/store/.
 */
export function getJsonlStore(dataDir?: string): JsonlStore {
  if (!_instance) {
    _instance = new JsonlStore(dataDir);
  }
  return _instance;
}

/**
 * Resolve the project root data directory.
 * When called from mcp/ subdirectory, resolves up to the project root.
 */
export function resolveProjectDataDir(currentDir?: string): string {
  if (process.env.MW_DATA_DIR) return process.env.MW_DATA_DIR;
  const dir = currentDir || process.cwd();
  if (dir.endsWith('/mcp') || dir.endsWith('\\mcp')) {
    return path.join(path.dirname(dir), '.mw', 'store');
  }
  return path.join(dir, '.mw', 'store');
}
