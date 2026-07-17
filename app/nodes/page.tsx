"use client";

import { useEffect, useState, useCallback } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import {
  type RelationalNode,
  type RelationalEdge,
  type NodeType,
  type DirectionName,
  NODE_TYPE_COLORS,
} from "@/lib/types";
import { relativeTime, absoluteTime } from "@/lib/format-time";
import { toast } from "sonner";

// Storage returns description at the top level; legacy nodes carried it in metadata.
type NodeRecord = RelationalNode & { description?: string };

const NODE_TYPES: NodeType[] = ["human", "land", "spirit", "ancestor", "future", "knowledge"];
const DIRECTIONS: DirectionName[] = ["east", "south", "west", "north"];
const NODE_TYPE_ICONS: Record<NodeType, string> = { human: "👤", land: "🌍", spirit: "✨", ancestor: "🪶", future: "🌱", knowledge: "📚" };
const DIRECTION_ICONS: Record<DirectionName, string> = { east: "🌅", south: "🌞", west: "🌄", north: "❄️" };

function describeNode(node: NodeRecord): string {
  return node.description || (typeof node.metadata?.description === "string" ? node.metadata.description : "");
}

function DirectionChip({ direction }: { direction?: DirectionName }) {
  if (!direction) return <span className="mw-badge">no direction</span>;
  return (
    <span className={`mw-badge mw-badge--${direction}`}>
      {DIRECTION_ICONS[direction]} {direction}
    </span>
  );
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [edges, setEdges] = useState<RelationalEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [deletingNode, setDeletingNode] = useState<NodeRecord | null>(null);
  const [busy, setBusy] = useState(false);

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
      const nodesResponse = await nodesRes.json();
      const edgesData: RelationalEdge[] = edgesRes.ok ? await edgesRes.json() : [];

      // API returns { nodes: [...], provider: '...', count: N }
      const nodesData: NodeRecord[] = Array.isArray(nodesResponse) ? nodesResponse : (nodesResponse.nodes || []);
      setNodes(nodesData);
      setEdges(Array.isArray(edgesData) ? edgesData : []);
    } catch {
      toast.error("Nodes did not load — check the connection and try again");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterDirection]);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFocusedNodeId(params.get("node"));
  }, []);

  useEffect(() => {
    if (loading || !focusedNodeId || !nodes.some((node) => node.id === focusedNodeId)) return;

    setExpandedNode(focusedNodeId);
    window.requestAnimationFrame(() => {
      document.getElementById(`node-${focusedNodeId}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
  }, [focusedNodeId, loading, nodes]);

  const filteredNodes = nodes.filter((node) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return node.name.toLowerCase().includes(q) || node.type.toLowerCase().includes(q) || (node.direction && node.direction.toLowerCase().includes(q));
  });

  function relationsOf(nodeId: string): RelationalEdge[] {
    return edges.filter((e) => e.from_id === nodeId || e.to_id === nodeId);
  }

  async function addNode(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name") as string,
      type: form.get("type") as string,
      direction: (form.get("direction") as string) || undefined,
      description: (form.get("description") as string) || undefined,
    };
    setBusy(true);
    try {
      const res = await fetch("/api/nodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Node was not created");
      toast.success(`Node "${data.node.name}" joined the wheel`);
      setShowAddNode(false);
      loadNodes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Node was not created");
    } finally {
      setBusy(false);
    }
  }

  async function saveNode(e: SubmitEvent<HTMLFormElement>, node: NodeRecord) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const direction = form.get("direction") as string;
    const body = {
      name: form.get("name") as string,
      type: form.get("type") as string,
      description: (form.get("description") as string) ?? "",
      direction: direction === "" ? null : direction,
    };
    setBusy(true);
    try {
      const res = await fetch(`/api/nodes/${node.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.issues?.join("; ") || data.error || "Changes were not saved");
      toast.success(`Changes to "${data.node.name}" saved`);
      setEditingNode(null);
      loadNodes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Changes were not saved");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNode(node: NodeRecord) {
    setBusy(true);
    try {
      const res = await fetch(`/api/nodes/${node.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Node was not deleted");
      toast.success(`Node "${node.name}" released from the wheel`);
      setDeletingNode(null);
      setExpandedNode(null);
      loadNodes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Node was not deleted");
    } finally {
      setBusy(false);
    }
  }

  const typeCounts = NODE_TYPES.reduce((acc, t) => { acc[t] = nodes.filter((n) => n.type === t).length; return acc; }, {} as Record<NodeType, number>);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Nodes</h1>
          <p className="text-sm text-muted-foreground">{nodes.length} nodes in the relational web</p>
        </div>
        <button onClick={() => setShowAddNode(!showAddNode)} className="mw-btn mw-btn--primary">
          {showAddNode ? "Close form" : "Create node"}
        </button>
      </div>

      {showAddNode && (
        <form onSubmit={addNode} className="mb-6 p-4 border rounded-lg bg-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Name</span>
              <input name="name" placeholder="Who or what joins the wheel?" required className="mw-input" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Type</span>
              <select name="type" required className="mw-input">
                {NODE_TYPES.map((t) => <option key={t} value={t}>{NODE_TYPE_ICONS[t]} {t}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Direction</span>
              <select name="direction" className="mw-input">
                <option value="">No direction</option>
                {DIRECTIONS.map((d) => <option key={d} value={d}>{DIRECTION_ICONS[d]} {d}</option>)}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Description</span>
              <input name="description" placeholder="What this node carries (optional)" className="mw-input" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="mw-btn mw-btn--primary">Create node</button>
            <button type="button" onClick={() => setShowAddNode(false)} className="mw-btn mw-btn--ghost">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {NODE_TYPES.map((t) => (
          <button key={t} onClick={() => setFilterType(filterType === t ? "all" : t)}
            aria-pressed={filterType === t}
            className={`p-3 rounded-lg border text-center transition-all ${filterType === t ? "ring-2 ring-primary bg-secondary" : "hover:bg-secondary/50"}`}>
            <div className="text-2xl mb-1">{NODE_TYPE_ICONS[t]}</div>
            <div className="text-sm font-medium capitalize">{t}</div>
            <div className="text-lg font-bold" style={{ color: NODE_TYPE_COLORS[t] }}>{typeCounts[t]}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="text" placeholder="Search nodes…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="mw-input flex-1 min-w-[200px]" style={{ width: "auto" }} />
        <select value={filterDirection} onChange={(e) => setFilterDirection(e.target.value)} className="mw-input" style={{ width: "auto" }}>
          <option value="all">All directions</option>
          {DIRECTIONS.map((d) => <option key={d} value={d}>{DIRECTION_ICONS[d]} {d}</option>)}
        </select>
        {(filterType !== "all" || filterDirection !== "all" || searchQuery) && (
          <button onClick={() => { setFilterType("all"); setFilterDirection("all"); setSearchQuery(""); }} className="mw-btn mw-btn--ghost">Clear filters</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading nodes…</div>
      ) : filteredNodes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {nodes.length === 0 ? (
            <>
              <p>The wheel holds no nodes yet.</p>
              <button onClick={() => setShowAddNode(true)} className="mw-btn mw-btn--primary mt-4">Create the first node</button>
            </>
          ) : (
            <>
              <p>No nodes match these filters.</p>
              <p className="text-sm mt-2">Loosen the search or clear the filters to see the full circle.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNodes.map((node) => {
            const nodeRelations = relationsOf(node.id);
            const isExpanded = expandedNode === node.id;
            const isEditing = editingNode === node.id;
            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                className={`border rounded-lg bg-card overflow-hidden transition-all ${isExpanded ? "ring-2 ring-primary" : ""}`}
              >
                <button
                  onClick={() => { setExpandedNode(isExpanded ? null : node.id); if (!isExpanded) setEditingNode(null); }}
                  aria-expanded={isExpanded}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-secondary/30"
                >
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: NODE_TYPE_COLORS[node.type] + "30" }}>
                    {NODE_TYPE_ICONS[node.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{node.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="capitalize">{node.type}</span>
                      <DirectionChip direction={node.direction} />
                      {nodeRelations.length > 0 && <span>{nodeRelations.length} relation{nodeRelations.length === 1 ? "" : "s"}</span>}
                    </div>
                  </div>
                  <span className="text-muted-foreground" aria-hidden>{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-3">
                    {isEditing ? (
                      <form onSubmit={(e) => saveNode(e, node)} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Name</span>
                            <input name="name" defaultValue={node.name} required className="mw-input" />
                          </label>
                          <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Type</span>
                            <select name="type" defaultValue={node.type} className="mw-input">
                              {NODE_TYPES.map((t) => <option key={t} value={t}>{NODE_TYPE_ICONS[t]} {t}</option>)}
                            </select>
                          </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Direction</span>
                            <select name="direction" defaultValue={node.direction ?? ""} className="mw-input">
                              <option value="">No direction</option>
                              {DIRECTIONS.map((d) => <option key={d} value={d}>{DIRECTION_ICONS[d]} {d}</option>)}
                            </select>
                          </label>
                          <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Description</span>
                            <input name="description" defaultValue={describeNode(node)} placeholder="What this node carries" className="mw-input" />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={busy} className="mw-btn mw-btn--primary">Save changes</button>
                          <button type="button" onClick={() => setEditingNode(null)} className="mw-btn mw-btn--ghost">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {describeNode(node) && <p className="text-sm">{describeNode(node)}</p>}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{node.type}</span></div>
                          <div><span className="text-muted-foreground">Direction:</span> <DirectionChip direction={node.direction} /></div>
                          <div><span className="text-muted-foreground">Created:</span> <span title={absoluteTime(node.created_at)}>{relativeTime(node.created_at)}</span></div>
                          <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{node.id.slice(0, 8)}…</code></div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Relations ({nodeRelations.length})</h4>
                          {nodeRelations.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No relations yet — <Link href="/relations" className="underline hover:text-foreground">weave one on the relations page</Link>.
                            </p>
                          ) : (
                            nodeRelations.map((e) => {
                              const otherId = e.from_id === node.id ? e.to_id : e.from_id;
                              const other = nodes.find((n) => n.id === otherId);
                              return (
                                <div key={`${e.from_id}:${e.to_id}`} className="py-1 text-sm border-b border-border/50 flex items-center gap-2">
                                  <span className="text-muted-foreground">{e.relationship_type}</span>
                                  <span aria-hidden>{e.from_id === node.id ? "→" : "←"}</span>
                                  {other?.name || "?"}
                                  <span className="text-xs text-muted-foreground">({Math.round(e.strength * 100)}%)</span>
                                  {e.ceremony_honored && <span style={{ color: "var(--mw-east)" }} title="Ceremony honored">✦</span>}
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setEditingNode(node.id)} className="mw-btn mw-btn--secondary">Edit node</button>
                          <Link href={`/graph?node=${node.id}`} className="mw-btn mw-btn--ghost">See on the wheel</Link>
                          <button onClick={() => setDeletingNode(node)} className="mw-btn mw-btn--danger">Delete node</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deletingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-node-title">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 space-y-4">
            <h2 id="delete-node-title" className="text-lg font-semibold">Delete “{deletingNode.name}”?</h2>
            {relationsOf(deletingNode.id).length > 0 ? (
              <>
                <p className="text-sm">
                  This node holds {relationsOf(deletingNode.id).length} relation{relationsOf(deletingNode.id).length === 1 ? "" : "s"} — release them first.
                  Relations are severed consciously, never cascaded.
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setDeletingNode(null)} className="mw-btn mw-btn--ghost">Keep the node</button>
                  <Link href={`/relations?node=${deletingNode.id}`} className="mw-btn mw-btn--primary">Review its relations</Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  This node holds no relations. Deleting releases it from the wheel — this cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setDeletingNode(null)} className="mw-btn mw-btn--ghost">Keep the node</button>
                  <button onClick={() => deleteNode(deletingNode)} disabled={busy} className="mw-btn mw-btn--danger border border-current">Delete node</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
