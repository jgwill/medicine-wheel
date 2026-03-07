"use client";

import { useEffect, useState, useCallback } from "react";
import type { FormEvent } from "react";
import {
  type RelationalNode,
  type RelationalEdge,
  type NodeType,
  type DirectionName,
  NODE_TYPE_COLORS,
  DIRECTION_COLORS,
} from "@/lib/types";
import { toast } from "sonner";

const NODE_TYPES: NodeType[] = ["human", "land", "spirit", "ancestor", "future", "knowledge"];
const DIRECTIONS: DirectionName[] = ["east", "south", "west", "north"];
const NODE_TYPE_ICONS: Record<NodeType, string> = { human: "👤", land: "🌍", spirit: "✨", ancestor: "🪶", future: "🌱", knowledge: "📚" };
const DIRECTION_ICONS: Record<DirectionName, string> = { east: "🌅", south: "🌞", west: "🌄", north: "❄️" };

export default function NodesPage() {
  const [nodes, setNodes] = useState<RelationalNode[]>([]);
  const [edges, setEdges] = useState<RelationalEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);

  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterDirection !== "all") params.set("direction", filterDirection);

      const [nodesRes, edgesRes] = await Promise.all([
        fetch(`/api/nodes?${params.toString()}`),
        fetch("/api/edges"),
      ]);
      const nodesData: RelationalNode[] = await nodesRes.json();
      const edgesData: RelationalEdge[] = edgesRes.ok ? await edgesRes.json() : [];
      setNodes(nodesData);
      setEdges(Array.isArray(edgesData) ? edgesData : []);
    } catch {
      toast.error("Failed to load nodes");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterDirection]);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  const filteredNodes = nodes.filter((node) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return node.name.toLowerCase().includes(q) || node.type.toLowerCase().includes(q) || (node.direction && node.direction.toLowerCase().includes(q));
  });

  async function addNode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const description = form.get("description") as string;
    const body = {
      name: form.get("name") as string,
      type: form.get("type") as string,
      direction: (form.get("direction") as string) || undefined,
      metadata: description ? { description } : {},
    };
    try {
      const res = await fetch("/api/nodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      toast.success("Node created");
      setShowAddNode(false);
      loadNodes();
    } catch { toast.error("Failed to create node"); }
  }

  const typeCounts = NODE_TYPES.reduce((acc, t) => { acc[t] = nodes.filter((n) => n.type === t).length; return acc; }, {} as Record<NodeType, number>);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🔗 Relational Nodes</h1>
          <p className="text-sm text-muted-foreground">{nodes.length} nodes in the relational web</p>
        </div>
        <button onClick={() => setShowAddNode(!showAddNode)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">+ Add Node</button>
      </div>

      {showAddNode && (
        <form onSubmit={addNode} className="mb-6 p-4 border rounded-lg bg-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="name" placeholder="Node name" required className="px-3 py-2 rounded-md border bg-background text-sm" />
            <select name="type" required className="px-3 py-2 rounded-md border bg-background text-sm">
              {NODE_TYPES.map((t) => <option key={t} value={t}>{NODE_TYPE_ICONS[t]} {t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select name="direction" className="px-3 py-2 rounded-md border bg-background text-sm">
              <option value="">No direction</option>
              {DIRECTIONS.map((d) => <option key={d} value={d}>{DIRECTION_ICONS[d]} {d}</option>)}
            </select>
            <input name="description" placeholder="Description (optional)" className="px-3 py-2 rounded-md border bg-background text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Create Node</button>
            <button type="button" onClick={() => setShowAddNode(false)} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {NODE_TYPES.map((t) => (
          <button key={t} onClick={() => setFilterType(filterType === t ? "all" : t)}
            className={`p-3 rounded-lg border text-center transition-all ${filterType === t ? "ring-2 ring-primary bg-secondary" : "hover:bg-secondary/50"}`}>
            <div className="text-2xl mb-1">{NODE_TYPE_ICONS[t]}</div>
            <div className="text-sm font-medium capitalize">{t}</div>
            <div className="text-lg font-bold" style={{ color: NODE_TYPE_COLORS[t] }}>{typeCounts[t]}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="text" placeholder="Search nodes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-3 py-2 rounded-md border bg-background text-sm flex-1 min-w-[200px]" />
        <select value={filterDirection} onChange={(e) => setFilterDirection(e.target.value)} className="px-3 py-2 rounded-md border bg-background text-sm">
          <option value="all">All Directions</option>
          {DIRECTIONS.map((d) => <option key={d} value={d}>{DIRECTION_ICONS[d]} {d}</option>)}
        </select>
        {(filterType !== "all" || filterDirection !== "all" || searchQuery) && (
          <button onClick={() => { setFilterType("all"); setFilterDirection("all"); setSearchQuery(""); }} className="px-3 py-2 rounded-md border text-sm text-muted-foreground hover:text-foreground">Clear filters</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading nodes...</div>
      ) : filteredNodes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No nodes found</p>
          {(filterType !== "all" || filterDirection !== "all" || searchQuery) && <p className="text-sm mt-2">Try adjusting your filters</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNodes.map((node) => (
            <div key={node.id} className={`border rounded-lg bg-card overflow-hidden transition-all ${expandedNode === node.id ? "ring-2 ring-primary" : ""}`}>
              <button
                onClick={() => setExpandedNode(expandedNode === node.id ? null : node.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-secondary/30"
              >
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: NODE_TYPE_COLORS[node.type] + "30" }}>
                  {NODE_TYPE_ICONS[node.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{node.name}</div>
                  <div className="text-sm text-muted-foreground flex gap-2">
                    <span className="capitalize">{node.type}</span>
                    {node.direction && (
                      <>
                        <span>·</span>
                        <span className="capitalize" style={{ color: DIRECTION_COLORS[node.direction] }}>{DIRECTION_ICONS[node.direction]} {node.direction}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-muted-foreground">{expandedNode === node.id ? "▲" : "▼"}</span>
              </button>

              {expandedNode === node.id && (
                <div className="border-t p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{node.type}</span></div>
                    {node.direction && <div><span className="text-muted-foreground">Direction:</span> <span className="capitalize">{node.direction}</span></div>}
                    <div><span className="text-muted-foreground">Created:</span> {new Date(node.created_at).toLocaleDateString()}</div>
                    <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{node.id.slice(0, 8)}…</code></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Connected Edges ({edges.filter((e) => e.from_id === node.id || e.to_id === node.id).length})</h4>
                    {edges.filter((e) => e.from_id === node.id || e.to_id === node.id).map((e) => {
                      const otherId = e.from_id === node.id ? e.to_id : e.from_id;
                      const other = nodes.find((n) => n.id === otherId);
                      return (
                        <div key={e.id} className="py-1 text-sm border-b border-border/50 flex items-center gap-2">
                          <span className="text-muted-foreground">{e.relationship_type}</span>
                          → {other?.name || "?"}
                          <span className="text-xs text-muted-foreground">({Math.round(e.strength * 100)}%)</span>
                          {e.ceremony_honored && <span className="text-green-500">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
