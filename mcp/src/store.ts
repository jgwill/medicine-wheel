/**
 * In-Memory Store — Replaces Redis for zero-dependency operation.
 * All data lives in memory and resets on server restart.
 */

interface StoredNode {
  id: string;
  type: string;
  name: string;
  description: string;
  direction?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface StoredEdge {
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
  ceremonies_conducted: number;
  relations_mapped: number;
  wilson_alignment: number;
  ocap_compliant: boolean;
  archived: boolean;
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

class InMemoryStore {
  private nodes: Map<string, StoredNode> = new Map();
  private edges: StoredEdge[] = [];
  private ceremonies: Map<string, StoredCeremony> = new Map();
  private beats: Map<string, StoredBeat> = new Map();
  private cycles: Map<string, StoredCycle> = new Map();
  private charts: Map<string, StoredChart> = new Map();
  private mmots: Map<string, StoredMmot> = new Map();
  private mmotsByChart: Map<string, string[]> = new Map();

  // === Nodes ===
  createNode(node: StoredNode): void {
    this.nodes.set(node.id, node);
  }

  getNode(id: string): StoredNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(limit = 50): StoredNode[] {
    return Array.from(this.nodes.values()).slice(0, limit);
  }

  getNodesByType(type: string): StoredNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  getNodesByDirection(direction: string): StoredNode[] {
    return Array.from(this.nodes.values()).filter(n => n.direction === direction);
  }

  searchNodes(query: string, opts: { type?: string; direction?: string; limit?: number } = {}): StoredNode[] {
    const q = query.toLowerCase();
    let results = Array.from(this.nodes.values()).filter(
      n => n.name.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)
    );
    if (opts.type) results = results.filter(n => n.type === opts.type);
    if (opts.direction) results = results.filter(n => n.direction === opts.direction);
    return results.slice(0, opts.limit || 20);
  }

  // === Edges ===
  createEdge(edge: StoredEdge): void {
    this.edges.push(edge);
  }

  getEdgesForNode(nodeId: string): StoredEdge[] {
    return this.edges.filter(e => e.from_id === nodeId || e.to_id === nodeId);
  }

  getRelatedNodeIds(nodeId: string): string[] {
    const ids = new Set<string>();
    for (const e of this.edges) {
      if (e.from_id === nodeId) ids.add(e.to_id);
      if (e.to_id === nodeId) ids.add(e.from_id);
    }
    return Array.from(ids);
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

      for (const edge of this.edges) {
        if (edge.from_id === id || edge.to_id === id) {
          if (!resultEdges.includes(edge)) resultEdges.push(edge);
          const otherId = edge.from_id === id ? edge.to_id : edge.from_id;
          if (!visited.has(otherId)) queue.push({ id: otherId, d: d + 1 });
        }
      }
    }

    return { nodes: resultNodes, edges: resultEdges };
  }

  updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): void {
    for (const edge of this.edges) {
      if ((edge.from_id === fromId && edge.to_id === toId) || (edge.from_id === toId && edge.to_id === fromId)) {
        edge.ceremony_honored = true;
        edge.ceremony_id = ceremonyId;
      }
    }
  }

  // === Ceremonies ===
  logCeremony(ceremony: StoredCeremony): void {
    this.ceremonies.set(ceremony.id, ceremony);
  }

  getCeremony(id: string): StoredCeremony | undefined {
    return this.ceremonies.get(id);
  }

  getAllCeremonies(limit = 50): StoredCeremony[] {
    return Array.from(this.ceremonies.values()).slice(0, limit);
  }

  getCeremoniesByDirection(direction: string): StoredCeremony[] {
    return Array.from(this.ceremonies.values()).filter(c => c.direction === direction);
  }

  getCeremoniesByType(type: string): StoredCeremony[] {
    return Array.from(this.ceremonies.values()).filter(c => c.type === type);
  }

  // === Beats ===
  createBeat(beat: StoredBeat): void {
    this.beats.set(beat.id, beat);
  }

  getBeat(id: string): StoredBeat | undefined {
    return this.beats.get(id);
  }

  getAllBeats(limit = 50): StoredBeat[] {
    return Array.from(this.beats.values()).slice(0, limit);
  }

  getBeatsByDirection(direction: string): StoredBeat[] {
    return Array.from(this.beats.values()).filter(b => b.direction === direction);
  }

  // === Cycles ===
  createCycle(cycle: StoredCycle): void {
    this.cycles.set(cycle.id, cycle);
  }

  getCycle(id: string): StoredCycle | undefined {
    return this.cycles.get(id);
  }

  getAllCycles(): { active: StoredCycle[]; archived: StoredCycle[] } {
    const all = Array.from(this.cycles.values());
    return {
      active: all.filter(c => !c.archived),
      archived: all.filter(c => c.archived),
    };
  }

  archiveCycle(id: string): void {
    const cycle = this.cycles.get(id);
    if (cycle) cycle.archived = true;
  }

  // === Charts (Structural Tension) ===
  saveChart(chart: StoredChart): void {
    this.charts.set(chart.id, chart);
  }

  getChart(id: string): StoredChart | undefined {
    return this.charts.get(id);
  }

  getAllCharts(direction?: string): StoredChart[] {
    let charts = Array.from(this.charts.values());
    if (direction) charts = charts.filter(c => c.direction === direction);
    return charts.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }

  // === MMOT (Moment of Truth) ===
  saveMmot(mmot: StoredMmot): void {
    this.mmots.set(mmot.id, mmot);
    const existing = this.mmotsByChart.get(mmot.chart_id) || [];
    existing.push(mmot.id);
    this.mmotsByChart.set(mmot.chart_id, existing);
  }

  getMmotsByChart(chartId: string): StoredMmot[] {
    const ids = this.mmotsByChart.get(chartId) || [];
    return ids.map(id => this.mmots.get(id)!).filter(Boolean);
  }
}

export const store = new InMemoryStore();
