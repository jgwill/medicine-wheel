/**
 * HTTP-backed store adapter for Medicine Wheel MCP Server
 *
 * When MW_API_URL is set, delegates storage operations to the server's
 * REST API instead of local JSONL files. This enables the MCP tools
 * to read/write the same relational state the server holds.
 *
 * Opt-in: only used when MW_API_URL is explicitly set.
 * Default behavior (MW_DATA_DIR / local JSONL) is preserved.
 */

// ── Types (mirrored from jsonl-store.ts) ──

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

interface StoredInquiryWeave {
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
    state: 'never-synced' | 'in-sync' | 'stale' | 'episode-copy-diverged';
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
  [key: string]: unknown;
}

interface InquiryWeaveFilters {
  episode_path?: string;
  episode_number?: number;
  issue?: string;
  artefact?: string;
}

interface StoredPlanPerspective {
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
  episodes: { path: string; number?: number; [key: string]: unknown }[];
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
  [key: string]: unknown;
}

interface PlanPerspectiveFilters {
  episode_path?: string;
  session_id?: string;
  id?: string;
}

// ── Helpers ──

/** Carries the HTTP status so callers can tell "endpoint absent" from "server broke". */
export class HttpStoreError extends Error {
  readonly status?: number;
  readonly url: string;

  constructor(message: string, url: string, status?: number) {
    super(message);
    this.name = 'HttpStoreError';
    this.url = url;
    this.status = status;
  }
}

/** A write that did not land. Kept so a failure survives past the console. */
export interface WriteFailure {
  operation: string;
  url: string;
  message: string;
  at: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TRACKED_FAILURES = 50;

function requestTimeoutMs(): number {
  const parsed = Number(process.env.MW_HTTP_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function snippet(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 200 ? `${flat.slice(0, 200)}…` : flat;
}

function describeShape(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

/**
 * Every request carries a deadline. Without one, a server that accepts the
 * connection and then never answers parks the MCP server's single thread of
 * conversation forever — the tool call never returns and never errors.
 */
async function httpFetch(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? 'GET';
  const timeoutMs = requestTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new HttpStoreError(`HTTP ${method} ${url} timed out after ${timeoutMs}ms`, url);
    }
    throw new HttpStoreError(`HTTP ${method} ${url} failed: ${errorMessage(error)}`, url);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A reverse proxy or a misrouted path answers 200 with an HTML page. Left to
 * res.json(), that surfaces as "Unexpected token <" — which names neither the
 * endpoint that lied nor what it actually said.
 */
async function readJson(res: Response, url: string, method: string): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const contentType = res.headers.get('content-type') ?? 'no content-type';
    throw new HttpStoreError(
      `HTTP ${method} ${url} returned non-JSON (${contentType}): ${snippet(text)}`,
      url,
      res.status
    );
  }
}

/**
 * The server has drifted between `[...]` and `{ nodes: [...] }` for the same
 * collection. Accept either. A payload that is neither is a real failure and
 * must not reach the caller disguised as an empty collection.
 */
function readCollection<T>(payload: unknown, key: string, url: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload !== null && typeof payload === 'object') {
    const inner = (payload as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner as T[];
  }
  throw new HttpStoreError(
    `HTTP GET ${url} returned ${describeShape(payload)} — expected an array or { ${key}: [...] }`,
    url
  );
}

/** True only when the endpoint itself is absent — never for a server that broke. */
function isEndpointMissing(error: unknown): boolean {
  return error instanceof HttpStoreError && error.status === 404;
}

async function httpGet<T>(url: string): Promise<T> {
  const res = await httpFetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpStoreError(
      `HTTP GET ${url} failed: ${res.status} ${res.statusText} — ${snippet(text)}`,
      url,
      res.status
    );
  }
  return (await readJson(res, url, 'GET')) as T;
}

async function httpPost<T>(url: string, body: unknown): Promise<T> {
  const res = await httpFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpStoreError(
      `HTTP POST ${url} failed: ${res.status} ${res.statusText} — ${snippet(text)}`,
      url,
      res.status
    );
  }
  return (await readJson(res, url, 'POST')) as T;
}

// ── HttpStore ──

export class HttpStore {
  readonly name = 'http';
  private readonly baseUrl: string;
  private readonly failures: WriteFailure[] = [];
  private readonly inFlight = new Set<Promise<void>>();

  constructor(baseUrl: string) {
    // Strip trailing slash for consistent URL construction
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  // === Write accountability ===

  /**
   * Writes keep their statement-call shape — `store.createNode(node)` still
   * compiles and still returns immediately — but the promise now comes back,
   * so a caller that awaits learns the truth instead of being told "created"
   * over a request that 404'd. The internal catch is what keeps a rejection
   * nobody awaited from taking the server down as an unhandled rejection.
   */
  private track(operation: string, url: string, request: Promise<unknown>): Promise<void> {
    const settled = request.then(
      () => undefined,
      (error: unknown) => {
        const message = errorMessage(error);
        console.error(`[http-store] ${operation} failed: ${message}`);
        this.failures.push({ operation, url, message, at: new Date().toISOString() });
        if (this.failures.length > MAX_TRACKED_FAILURES) this.failures.shift();
        throw error;
      }
    );

    // Attaching a handler to `settled` is what marks it handled for the
    // call sites that ignore the returned promise.
    const quiet = settled.catch(() => undefined);
    this.inFlight.add(quiet);
    void quiet.then(() => { this.inFlight.delete(quiet); });
    return settled;
  }

  /** Writes that did not land, oldest first. Non-destructive. */
  getWriteFailures(): WriteFailure[] {
    return [...this.failures];
  }

  /** Drain the record — for a caller that has reported the failures onward. */
  takeWriteFailures(): WriteFailure[] {
    return this.failures.splice(0, this.failures.length);
  }

  /** Wait for every in-flight write to land or fail. Never rejects. */
  async settleWrites(): Promise<void> {
    while (this.inFlight.size > 0) {
      await Promise.all([...this.inFlight]);
    }
  }

  // === Nodes ===

  createNode(node: StoredNode): Promise<void> {
    const url = `${this.baseUrl}/api/nodes`;
    return this.track('createNode', url, httpPost(url, node));
  }

  async getNode(id: string): Promise<StoredNode | undefined> {
    const all = await this.getAllNodes();
    return all.find(n => n.id === id);
  }

  async getAllNodes(limit?: number): Promise<StoredNode[]> {
    const url = `${this.baseUrl}/api/nodes`;
    const nodes = readCollection<StoredNode>(await httpGet(url), 'nodes', url);
    return limit !== undefined ? nodes.slice(0, limit) : nodes;
  }

  async getNodesByType(type: string): Promise<StoredNode[]> {
    const url = `${this.baseUrl}/api/nodes?type=${encodeURIComponent(type)}`;
    return readCollection<StoredNode>(await httpGet(url), 'nodes', url);
  }

  async getNodesByDirection(direction: string): Promise<StoredNode[]> {
    const url = `${this.baseUrl}/api/nodes?direction=${encodeURIComponent(direction)}`;
    return readCollection<StoredNode>(await httpGet(url), 'nodes', url);
  }

  async searchNodes(
    query: string,
    opts: { type?: string; direction?: string; limit?: number } = {}
  ): Promise<StoredNode[]> {
    // Server has no search endpoint yet — fetch all and filter client-side
    const all = await this.getAllNodes();
    const q = query.toLowerCase();
    let results = all.filter(n =>
      (n.name && n.name.toLowerCase().includes(q)) ||
      (n.description && n.description.toLowerCase().includes(q))
    );
    if (opts.type) results = results.filter(n => n.type === opts.type);
    if (opts.direction) results = results.filter(n => n.direction === opts.direction);
    return opts.limit !== undefined ? results.slice(0, opts.limit) : results;
  }

  // === Edges ===

  createEdge(edge: StoredEdge): Promise<void> {
    const url = `${this.baseUrl}/api/edges`;
    return this.track('createEdge', url, httpPost(url, edge));
  }

  async getAllEdges(): Promise<StoredEdge[]> {
    const url = `${this.baseUrl}/api/edges`;
    return readCollection<StoredEdge>(await httpGet(url), 'edges', url);
  }

  async getEdgesForNode(nodeId: string): Promise<StoredEdge[]> {
    const edges = await this.getAllEdges();
    return edges.filter(e => e.from_id === nodeId || e.to_id === nodeId);
  }

  async getRelatedNodeIds(nodeId: string): Promise<string[]> {
    const edges = await this.getEdgesForNode(nodeId);
    const ids = new Set<string>();
    for (const e of edges) {
      if (e.from_id === nodeId) ids.add(e.to_id);
      if (e.to_id === nodeId) ids.add(e.from_id);
    }
    return Array.from(ids);
  }

  updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): Promise<void> {
    // No dedicated server endpoint — fetch, update, and re-post
    const url = `${this.baseUrl}/api/edges`;
    return this.track('updateEdgeCeremony', url, (async () => {
      const edges = await this.getAllEdges();
      for (const edge of edges) {
        if (
          (edge.from_id === fromId && edge.to_id === toId) ||
          (edge.from_id === toId && edge.to_id === fromId)
        ) {
          await httpPost(url, { ...edge, ceremony_honored: true, ceremony_id: ceremonyId });
        }
      }
    })());
  }

  async getRelationalWeb(
    nodeId: string,
    depth = 2
  ): Promise<{ nodes: StoredNode[]; edges: StoredEdge[] }> {
    const allNodes = await this.getAllNodes();
    const allEdges = await this.getAllEdges();

    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
    const visited = new Set<string>();
    const resultNodes: StoredNode[] = [];
    const resultEdges: StoredEdge[] = [];
    const queue: { id: string; d: number }[] = [{ id: nodeId, d: 0 }];

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      const node = nodeMap.get(id);
      if (node) resultNodes.push(node);

      for (const edge of allEdges) {
        if (edge.from_id !== id && edge.to_id !== id) continue;
        if (!resultEdges.includes(edge)) resultEdges.push(edge);
        const otherId = edge.from_id === id ? edge.to_id : edge.from_id;
        if (!visited.has(otherId)) queue.push({ id: otherId, d: d + 1 });
      }
    }

    return { nodes: resultNodes, edges: resultEdges };
  }

  // === Ceremonies ===

  logCeremony(ceremony: StoredCeremony): Promise<void> {
    const url = `${this.baseUrl}/api/ceremonies`;
    return this.track('logCeremony', url, httpPost(url, ceremony));
  }

  async getCeremony(id: string): Promise<StoredCeremony | undefined> {
    const all = await this.getAllCeremonies();
    return all.find(c => c.id === id);
  }

  async getAllCeremonies(limit?: number): Promise<StoredCeremony[]> {
    const url = `${this.baseUrl}/api/ceremonies`;
    const sorted = readCollection<StoredCeremony>(await httpGet(url), 'ceremonies', url).sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
    );
    return limit !== undefined ? sorted.slice(0, limit) : sorted;
  }

  async getCeremoniesByDirection(direction: string): Promise<StoredCeremony[]> {
    const url = `${this.baseUrl}/api/ceremonies?direction=${encodeURIComponent(direction)}`;
    return readCollection<StoredCeremony>(await httpGet(url), 'ceremonies', url);
  }

  async getCeremoniesByType(type: string): Promise<StoredCeremony[]> {
    const url = `${this.baseUrl}/api/ceremonies?type=${encodeURIComponent(type)}`;
    return readCollection<StoredCeremony>(await httpGet(url), 'ceremonies', url);
  }

  // === Beats ===

  createBeat(beat: StoredBeat): Promise<void> {
    const url = `${this.baseUrl}/api/narrative/beats`;
    return this.track('createBeat', url, httpPost(url, beat));
  }

  async getBeat(id: string): Promise<StoredBeat | undefined> {
    const all = await this.getAllBeats();
    return all.find(b => b.id === id);
  }

  async getAllBeats(limit?: number): Promise<StoredBeat[]> {
    const url = `${this.baseUrl}/api/narrative/beats`;
    const beats = readCollection<StoredBeat>(await httpGet(url), 'beats', url);
    return limit !== undefined ? beats.slice(0, limit) : beats;
  }

  async getBeatsByDirection(direction: string): Promise<StoredBeat[]> {
    const all = await this.getAllBeats();
    return all.filter(b => b.direction === direction);
  }

  // === Cycles ===

  createCycle(cycle: StoredCycle): Promise<void> {
    const url = `${this.baseUrl}/api/narrative/cycles`;
    return this.track('createCycle', url, httpPost(url, cycle));
  }

  private async listCycles(): Promise<StoredCycle[]> {
    const url = `${this.baseUrl}/api/narrative/cycles`;
    return readCollection<StoredCycle>(await httpGet(url), 'cycles', url);
  }

  async getCycle(id: string): Promise<StoredCycle | undefined> {
    const all = await this.listCycles();
    return all.find(c => c.id === id);
  }

  async getAllCycles(): Promise<{ active: StoredCycle[]; archived: StoredCycle[] }> {
    const all = await this.listCycles();
    return {
      active: all.filter(c => !c.archived),
      archived: all.filter(c => c.archived),
    };
  }

  archiveCycle(id: string): Promise<void> {
    // No dedicated archive endpoint — fetch, mark archived, and re-post
    const url = `${this.baseUrl}/api/narrative/cycles`;
    return this.track('archiveCycle', url, (async () => {
      const all = await this.listCycles();
      const cycle = all.find(c => c.id === id);
      // An archive that found nothing to archive is a failed archive. Reported
      // as success it tells the circle a cycle was closed that is still open.
      if (!cycle) throw new HttpStoreError(`archiveCycle: cycle ${id} not found`, url, 404);
      await httpPost(url, { ...cycle, archived: true });
    })());
  }

  // === Charts ===
  // A deployment may predate /api/charts. That absence (404) is a fact worth
  // degrading over; a 500, a timeout or an HTML page is not, and returning []
  // for those tells the caller "no charts exist" when the truth is unknown.

  saveChart(chart: StoredChart): Promise<void> {
    const url = `${this.baseUrl}/api/charts`;
    return this.track('saveChart', url, httpPost(url, chart));
  }

  async getChart(id: string): Promise<StoredChart | undefined> {
    const all = await this.getAllCharts();
    return all.find(c => c.id === id);
  }

  async getAllCharts(direction?: string): Promise<StoredChart[]> {
    const url = `${this.baseUrl}/api/charts`;
    let charts: StoredChart[];
    try {
      charts = readCollection<StoredChart>(await httpGet(url), 'charts', url);
    } catch (error) {
      if (!isEndpointMissing(error)) throw error;
      console.error(`[http-store] getAllCharts: ${url} not available`);
      return [];
    }
    const result = direction ? charts.filter(c => c.direction === direction) : [...charts];
    return result.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }

  // === MMOT ===

  saveMmot(mmot: StoredMmot): Promise<void> {
    const url = `${this.baseUrl}/api/mmots`;
    return this.track('saveMmot', url, httpPost(url, mmot));
  }

  async getMmotsByChart(chartId: string): Promise<StoredMmot[]> {
    const url = `${this.baseUrl}/api/mmots`;
    try {
      const all = readCollection<StoredMmot>(await httpGet(url), 'mmots', url);
      return all.filter(m => m.chart_id === chartId);
    } catch (error) {
      if (!isEndpointMissing(error)) throw error;
      console.error(`[http-store] getMmotsByChart: ${url} not available`);
      return [];
    }
  }

  // === Inquiry Weaves ===

  async registerInquiryWeave(record: StoredInquiryWeave): Promise<void> {
    await httpPost(`${this.baseUrl}/api/inquiry-weaves`, record);
  }

  async getInquiryWeave(id: string): Promise<StoredInquiryWeave | undefined> {
    const data = await httpGet<{ inquiry_weave: StoredInquiryWeave | null }>(
      `${this.baseUrl}/api/inquiry-weaves/${encodeURIComponent(id)}`
    );
    return data.inquiry_weave ?? undefined;
  }

  async listInquiryWeaves(filters: InquiryWeaveFilters = {}): Promise<StoredInquiryWeave[]> {
    const params = new URLSearchParams();
    if (filters.episode_path !== undefined) params.set('episode_path', filters.episode_path);
    if (filters.episode_number !== undefined) params.set('episode_number', String(filters.episode_number));
    if (filters.issue !== undefined) params.set('issue', filters.issue);
    if (filters.artefact !== undefined) params.set('artefact', filters.artefact);

    const query = params.size > 0 ? `?${params.toString()}` : '';
    const url = `${this.baseUrl}/api/inquiry-weaves${query}`;
    return readCollection<StoredInquiryWeave>(await httpGet(url), 'inquiry_weaves', url);
  }

  // === Plan Perspectives ===

  async registerPlanPerspective(record: StoredPlanPerspective): Promise<StoredPlanPerspective> {
    const data = await httpPost<{ record?: StoredPlanPerspective }>(
      `${this.baseUrl}/api/plan-perspectives`,
      record
    );
    return data.record ?? record;
  }

  async getPlanPerspective(id: string): Promise<StoredPlanPerspective | undefined> {
    const url = `${this.baseUrl}/api/plan-perspectives/${encodeURIComponent(id)}`;
    const res = await httpFetch(url);
    if (res.status === 404) return undefined;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new HttpStoreError(
        `HTTP GET ${url} failed: ${res.status} ${res.statusText} — ${snippet(text)}`,
        url,
        res.status
      );
    }
    const data = (await readJson(res, url, 'GET')) as { record?: StoredPlanPerspective | null };
    return data.record ?? undefined;
  }

  async listPlanPerspectives(filters: PlanPerspectiveFilters = {}): Promise<StoredPlanPerspective[]> {
    const params = new URLSearchParams();
    if (filters.episode_path !== undefined) params.set('episode_path', filters.episode_path);
    if (filters.session_id !== undefined) params.set('session_id', filters.session_id);
    if (filters.id !== undefined) params.set('id', filters.id);

    const query = params.size > 0 ? `?${params.toString()}` : '';
    const url = `${this.baseUrl}/api/plan-perspectives${query}`;
    return readCollection<StoredPlanPerspective>(await httpGet(url), 'plan_perspectives', url);
  }
}

// ── Factory ──

export function getHttpStore(baseUrl: string): HttpStore {
  return new HttpStore(baseUrl);
}
