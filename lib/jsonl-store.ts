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
 * Cross-process sync: Checks file mtime before reads — if the file changed
 * on disk (written by the other process), reloads from disk automatically.
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

// ── JSONL File Helpers ──

/**
 * Read all records from a JSONL file. Returns empty array if file doesn't exist.
 */
function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const records: T[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        records.push(JSON.parse(trimmed) as T);
      } catch {
        // Skip malformed lines
      }
    }
    return records;
  } catch {
    return [];
  }
}

/**
 * Write all records to a JSONL file atomically (temp + rename).
 */
function writeJsonl<T>(filePath: string, records: T[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = filePath + `.tmp.${process.pid}`;
  const content = records.map(r => JSON.stringify(r)).join('\n') + (records.length > 0 ? '\n' : '');
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Get the mtime of a file (0 if doesn't exist).
 */
function getMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

// ── Collection: a single JSONL-backed entity collection with mtime sync ──

class JsonlCollection<T extends { id?: string }> {
  private items: Map<string, T> = new Map();
  private filePath: string;
  private lastMtime: number = 0;
  private loaded: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** Ensure data is loaded and synced from disk */
  private sync(): void {
    const currentMtime = getMtime(this.filePath);
    if (!this.loaded || currentMtime !== this.lastMtime) {
      const records = readJsonl<T>(this.filePath);
      this.items = new Map();
      for (const record of records) {
        const id = (record as any).id;
        if (id) {
          this.items.set(id, record);
        }
      }
      this.lastMtime = currentMtime;
      this.loaded = true;
    }
  }

  /** Flush in-memory state to disk */
  private flush(): void {
    const records = Array.from(this.items.values());
    writeJsonl(this.filePath, records);
    this.lastMtime = getMtime(this.filePath);
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

// ── Edge Collection (keyed by from_id:to_id, not by .id) ──

class EdgeCollection {
  private items: StoredEdge[] = [];
  private filePath: string;
  private lastMtime: number = 0;
  private loaded: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private sync(): void {
    const currentMtime = getMtime(this.filePath);
    if (!this.loaded || currentMtime !== this.lastMtime) {
      this.items = readJsonl<StoredEdge>(this.filePath);
      this.lastMtime = currentMtime;
      this.loaded = true;
    }
  }

  private flush(): void {
    writeJsonl(this.filePath, this.items);
    this.lastMtime = getMtime(this.filePath);
  }

  add(edge: StoredEdge): void {
    this.sync();
    this.items.push(edge);
    this.flush();
  }

  getAll(): StoredEdge[] {
    this.sync();
    return [...this.items];
  }

  getForNode(nodeId: string): StoredEdge[] {
    this.sync();
    return this.items.filter(e => e.from_id === nodeId || e.to_id === nodeId);
  }

  getRelatedNodeIds(nodeId: string): string[] {
    this.sync();
    const ids = new Set<string>();
    for (const e of this.items) {
      if (e.from_id === nodeId) ids.add(e.to_id);
      if (e.to_id === nodeId) ids.add(e.from_id);
    }
    return Array.from(ids);
  }

  updateCeremony(fromId: string, toId: string, ceremonyId: string): void {
    this.sync();
    for (const edge of this.items) {
      if ((edge.from_id === fromId && edge.to_id === toId) ||
          (edge.from_id === toId && edge.to_id === fromId)) {
        edge.ceremony_honored = true;
        edge.ceremony_id = ceremonyId;
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

    // Ensure directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.nodes = new JsonlCollection<StoredNode>(path.join(this.dataDir, 'nodes.jsonl'));
    this.edges = new EdgeCollection(path.join(this.dataDir, 'edges.jsonl'));
    this.ceremonies = new JsonlCollection<StoredCeremony>(path.join(this.dataDir, 'ceremonies.jsonl'));
    this.beats = new JsonlCollection<StoredBeat>(path.join(this.dataDir, 'beats.jsonl'));
    this.cycles = new JsonlCollection<StoredCycle>(path.join(this.dataDir, 'cycles.jsonl'));
    this.charts = new JsonlCollection<StoredChart>(path.join(this.dataDir, 'charts.jsonl'));
    this.mmots = new JsonlCollection<StoredMmot>(path.join(this.dataDir, 'mmots.jsonl'));
  }

  // === Nodes ===

  createNode(node: StoredNode): void {
    this.nodes.set(node.id, node);
  }

  getNode(id: string): StoredNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(limit = 50): StoredNode[] {
    return this.nodes.getAll().slice(0, limit);
  }

  getNodesByType(type: string): StoredNode[] {
    return this.nodes.filter(n => n.type === type);
  }

  getNodesByDirection(direction: string): StoredNode[] {
    return this.nodes.filter(n => n.direction === direction);
  }

  searchNodes(query: string, opts: { type?: string; direction?: string; limit?: number } = {}): StoredNode[] {
    let results = this.nodes.search(query, ['name', 'description'] as any);
    if (opts.type) results = results.filter(n => n.type === opts.type);
    if (opts.direction) results = results.filter(n => n.direction === opts.direction);
    return results.slice(0, opts.limit || 20);
  }

  // === Edges ===

  createEdge(edge: StoredEdge): void {
    this.edges.add(edge);
  }

  getEdgesForNode(nodeId: string): StoredEdge[] {
    return this.edges.getForNode(nodeId);
  }

  getRelatedNodeIds(nodeId: string): string[] {
    return this.edges.getRelatedNodeIds(nodeId);
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

  updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): void {
    this.edges.updateCeremony(fromId, toId, ceremonyId);
  }

  // === Ceremonies ===

  logCeremony(ceremony: StoredCeremony): void {
    this.ceremonies.set(ceremony.id, ceremony);
  }

  getCeremony(id: string): StoredCeremony | undefined {
    return this.ceremonies.get(id);
  }

  getAllCeremonies(limit = 50): StoredCeremony[] {
    return this.ceremonies.getAll()
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, limit);
  }

  getCeremoniesByDirection(direction: string): StoredCeremony[] {
    return this.ceremonies.filter(c => c.direction === direction);
  }

  getCeremoniesByType(type: string): StoredCeremony[] {
    return this.ceremonies.filter(c => c.type === type);
  }

  // === Beats ===

  createBeat(beat: StoredBeat): void {
    this.beats.set(beat.id, beat);
  }

  getBeat(id: string): StoredBeat | undefined {
    return this.beats.get(id);
  }

  getAllBeats(limit = 50): StoredBeat[] {
    return this.beats.getAll().slice(0, limit);
  }

  getBeatsByDirection(direction: string): StoredBeat[] {
    return this.beats.filter(b => b.direction === direction);
  }

  // === Cycles ===

  createCycle(cycle: StoredCycle): void {
    this.cycles.set(cycle.id, cycle);
  }

  getCycle(id: string): StoredCycle | undefined {
    return this.cycles.get(id);
  }

  getAllCycles(): { active: StoredCycle[]; archived: StoredCycle[] } {
    const all = this.cycles.getAll();
    return {
      active: all.filter(c => !c.archived),
      archived: all.filter(c => c.archived),
    };
  }

  archiveCycle(id: string): void {
    const cycle = this.cycles.get(id);
    if (cycle) {
      cycle.archived = true;
      this.cycles.set(id, cycle);
    }
  }

  // === Charts (Structural Tension) ===

  saveChart(chart: StoredChart): void {
    this.charts.set(chart.id, chart);
  }

  getChart(id: string): StoredChart | undefined {
    return this.charts.get(id);
  }

  getAllCharts(direction?: string): StoredChart[] {
    let charts = this.charts.getAll();
    if (direction) charts = charts.filter(c => c.direction === direction);
    return charts.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }

  // === MMOT (Moment of Truth) ===

  saveMmot(mmot: StoredMmot): void {
    this.mmots.set(mmot.id, mmot);
  }

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
  const dir = currentDir || process.cwd();

  // If we're in the mcp/ subdirectory, go up one level
  if (dir.endsWith('/mcp') || dir.endsWith('\\mcp')) {
    return path.join(path.dirname(dir), '.mw', 'store');
  }

  // Check if MW_DATA_DIR is set
  if (process.env.MW_DATA_DIR) {
    return process.env.MW_DATA_DIR;
  }

  return path.join(dir, '.mw', 'store');
}
