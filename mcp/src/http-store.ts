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

// ── Helpers ──

async function httpGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP GET ${url} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function httpPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP POST ${url} failed: ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json() as Promise<T>;
}

async function httpPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP PUT ${url} failed: ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── HttpStore ──

export class HttpStore {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    // Strip trailing slash for consistent URL construction
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  // === Nodes ===

  createNode(node: StoredNode): void {
    // Fire-and-forget; callers don't await in JsonlStore either
    httpPost(`${this.baseUrl}/api/nodes`, node).catch(err =>
      console.error(`[http-store] createNode failed: ${err}`)
    );
  }

  async getNode(id: string): Promise<StoredNode | undefined> {
    const all = await this.getAllNodes();
    return all.find(n => n.id === id);
  }

  async getAllNodes(limit?: number): Promise<StoredNode[]> {
    const data = await httpGet<{ nodes: StoredNode[] }>(`${this.baseUrl}/api/nodes`);
    const nodes = data.nodes ?? [];
    return limit !== undefined ? nodes.slice(0, limit) : nodes;
  }

  async getNodesByType(type: string): Promise<StoredNode[]> {
    const data = await httpGet<{ nodes: StoredNode[] }>(
      `${this.baseUrl}/api/nodes?type=${encodeURIComponent(type)}`
    );
    return data.nodes ?? [];
  }

  async getNodesByDirection(direction: string): Promise<StoredNode[]> {
    const data = await httpGet<{ nodes: StoredNode[] }>(
      `${this.baseUrl}/api/nodes?direction=${encodeURIComponent(direction)}`
    );
    return data.nodes ?? [];
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

  createEdge(edge: StoredEdge): void {
    httpPost(`${this.baseUrl}/api/edges`, edge).catch(err =>
      console.error(`[http-store] createEdge failed: ${err}`)
    );
  }

  async getEdgesForNode(nodeId: string): Promise<StoredEdge[]> {
    const edges = await httpGet<StoredEdge[]>(`${this.baseUrl}/api/edges`);
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

  updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): void {
    // No dedicated server endpoint — fetch, update, and re-post
    (async () => {
      try {
        const edges = await httpGet<StoredEdge[]>(`${this.baseUrl}/api/edges`);
        for (const edge of edges) {
          if (
            (edge.from_id === fromId && edge.to_id === toId) ||
            (edge.from_id === toId && edge.to_id === fromId)
          ) {
            await httpPost(`${this.baseUrl}/api/edges`, {
              ...edge,
              ceremony_honored: true,
              ceremony_id: ceremonyId,
            });
          }
        }
      } catch (err) {
        console.error(`[http-store] updateEdgeCeremony failed: ${err}`);
      }
    })();
  }

  async getRelationalWeb(
    nodeId: string,
    depth = 2
  ): Promise<{ nodes: StoredNode[]; edges: StoredEdge[] }> {
    const allNodes = await this.getAllNodes();
    const allEdges = await httpGet<StoredEdge[]>(`${this.baseUrl}/api/edges`);

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

  logCeremony(ceremony: StoredCeremony): void {
    httpPost(`${this.baseUrl}/api/ceremonies`, ceremony).catch(err =>
      console.error(`[http-store] logCeremony failed: ${err}`)
    );
  }

  async getCeremony(id: string): Promise<StoredCeremony | undefined> {
    const all = await this.getAllCeremonies();
    return all.find(c => c.id === id);
  }

  async getAllCeremonies(limit?: number): Promise<StoredCeremony[]> {
    const data = await httpGet<{ ceremonies: StoredCeremony[] }>(
      `${this.baseUrl}/api/ceremonies`
    );
    const sorted = (data.ceremonies ?? []).sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
    );
    return limit !== undefined ? sorted.slice(0, limit) : sorted;
  }

  async getCeremoniesByDirection(direction: string): Promise<StoredCeremony[]> {
    const data = await httpGet<{ ceremonies: StoredCeremony[] }>(
      `${this.baseUrl}/api/ceremonies?direction=${encodeURIComponent(direction)}`
    );
    return data.ceremonies ?? [];
  }

  async getCeremoniesByType(type: string): Promise<StoredCeremony[]> {
    const data = await httpGet<{ ceremonies: StoredCeremony[] }>(
      `${this.baseUrl}/api/ceremonies?type=${encodeURIComponent(type)}`
    );
    return data.ceremonies ?? [];
  }

  // === Beats ===

  createBeat(beat: StoredBeat): void {
    httpPost(`${this.baseUrl}/api/narrative/beats`, beat).catch(err =>
      console.error(`[http-store] createBeat failed: ${err}`)
    );
  }

  async getBeat(id: string): Promise<StoredBeat | undefined> {
    const all = await this.getAllBeats();
    return all.find(b => b.id === id);
  }

  async getAllBeats(limit?: number): Promise<StoredBeat[]> {
    const beats = await httpGet<StoredBeat[]>(`${this.baseUrl}/api/narrative/beats`);
    return limit !== undefined ? beats.slice(0, limit) : beats;
  }

  async getBeatsByDirection(direction: string): Promise<StoredBeat[]> {
    const all = await this.getAllBeats();
    return all.filter(b => b.direction === direction);
  }

  // === Cycles ===

  createCycle(cycle: StoredCycle): void {
    httpPost(`${this.baseUrl}/api/narrative/cycles`, cycle).catch(err =>
      console.error(`[http-store] createCycle failed: ${err}`)
    );
  }

  async getCycle(id: string): Promise<StoredCycle | undefined> {
    const all = await httpGet<StoredCycle[]>(`${this.baseUrl}/api/narrative/cycles`);
    return all.find(c => c.id === id);
  }

  async getAllCycles(): Promise<{ active: StoredCycle[]; archived: StoredCycle[] }> {
    const all = await httpGet<StoredCycle[]>(`${this.baseUrl}/api/narrative/cycles`);
    return {
      active: all.filter(c => !c.archived),
      archived: all.filter(c => c.archived),
    };
  }

  archiveCycle(id: string): void {
    // No dedicated archive endpoint — fetch, mark archived, and re-post
    (async () => {
      try {
        const all = await httpGet<StoredCycle[]>(`${this.baseUrl}/api/narrative/cycles`);
        const cycle = all.find(c => c.id === id);
        if (cycle) {
          await httpPost(`${this.baseUrl}/api/narrative/cycles`, {
            ...cycle,
            archived: true,
          });
        }
      } catch (err) {
        console.error(`[http-store] archiveCycle failed: ${err}`);
      }
    })();
  }

  // === Charts ===
  // No server endpoint exists yet — these use a fallback pattern
  // that logs a warning and returns empty results.

  saveChart(chart: StoredChart): void {
    httpPost(`${this.baseUrl}/api/charts`, chart).catch(err =>
      console.error(`[http-store] saveChart: /api/charts not available — ${err}`)
    );
  }

  async getChart(id: string): Promise<StoredChart | undefined> {
    try {
      const all = await this.getAllCharts();
      return all.find(c => c.id === id);
    } catch {
      console.error(`[http-store] getChart: /api/charts not available`);
      return undefined;
    }
  }

  async getAllCharts(direction?: string): Promise<StoredChart[]> {
    try {
      const charts = await httpGet<StoredChart[]>(`${this.baseUrl}/api/charts`);
      let result = Array.isArray(charts) ? charts : [];
      if (direction) result = result.filter(c => c.direction === direction);
      return result.sort(
        (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)
      );
    } catch {
      console.error(`[http-store] getAllCharts: /api/charts not available`);
      return [];
    }
  }

  // === MMOT ===

  saveMmot(mmot: StoredMmot): void {
    httpPost(`${this.baseUrl}/api/mmots`, mmot).catch(err =>
      console.error(`[http-store] saveMmot: /api/mmots not available — ${err}`)
    );
  }

  async getMmotsByChart(chartId: string): Promise<StoredMmot[]> {
    try {
      const all = await httpGet<StoredMmot[]>(`${this.baseUrl}/api/mmots`);
      return (Array.isArray(all) ? all : []).filter(m => m.chart_id === chartId);
    } catch {
      console.error(`[http-store] getMmotsByChart: /api/mmots not available`);
      return [];
    }
  }
}

// ── Factory ──

export function getHttpStore(baseUrl: string): HttpStore {
  return new HttpStore(baseUrl);
}
