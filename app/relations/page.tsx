"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import {
  type RelationalNode,
  type RelationalEdge,
  type DirectionName,
} from "@/lib/types";
import { relativeTime, absoluteTime } from "@/lib/format-time";
import { toast } from "sonner";

type NodeRecord = RelationalNode & { description?: string };

const DIRECTION_ICONS: Record<DirectionName, string> = { east: "🌅", south: "🌞", west: "🌄", north: "❄️" };

function edgeKey(edge: Pick<RelationalEdge, "from_id" | "to_id">): string {
  return `${edge.from_id}:${edge.to_id}`;
}

function NodeChip({ node, id }: { node?: NodeRecord; id: string }) {
  if (!node) {
    return <span className="mw-badge" title={id}>missing node</span>;
  }
  const directionClass = node.direction ? ` mw-badge--${node.direction}` : "";
  return (
    <Link
      href={`/graph?node=${node.id}`}
      className={`mw-badge${directionClass} hover:brightness-125 transition-all`}
      title={node.direction ? `${node.name} · ${node.direction} — see on the wheel` : `${node.name} — see on the wheel`}
    >
      <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: `var(--mw-node-${node.type})` }} aria-hidden />
      {node.name}
      {node.direction && <span className="ml-1.5" aria-hidden>{DIRECTION_ICONS[node.direction]}</span>}
    </Link>
  );
}

function CeremonyMark({ honored }: { honored: boolean }) {
  return honored ? (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--mw-ceremony)" }} title="This relation has been honored in ceremony">
      <span aria-hidden>✦</span> honored
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">not yet honored</span>
  );
}

export default function RelationsPage() {
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [edges, setEdges] = useState<RelationalEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCeremony, setFilterCeremony] = useState<string>("all");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [showWeave, setShowWeave] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [deletingEdge, setDeletingEdge] = useState<RelationalEdge | null>(null);
  const [busy, setBusy] = useState(false);
  const [weaveStrength, setWeaveStrength] = useState(0.5);
  const [editStrength, setEditStrength] = useState(0.5);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nodesRes, edgesRes] = await Promise.all([fetch("/api/nodes"), fetch("/api/edges")]);
      const nodesResponse = await nodesRes.json();
      const edgesData = await edgesRes.json();
      const nodesData: NodeRecord[] = Array.isArray(nodesResponse) ? nodesResponse : (nodesResponse.nodes || []);
      setNodes(nodesData);
      setEdges(Array.isArray(edgesData) ? edgesData : []);
    } catch {
      toast.error("Relations did not load — check the connection and try again");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFocusNodeId(params.get("node"));
  }, []);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const relationTypes = useMemo(
    () => Array.from(new Set(edges.map((e) => e.relationship_type))).sort(),
    [edges],
  );

  const filteredEdges = edges.filter((e) => {
    if (filterType !== "all" && e.relationship_type !== filterType) return false;
    if (filterCeremony === "honored" && !e.ceremony_honored) return false;
    if (filterCeremony === "unhonored" && e.ceremony_honored) return false;
    if (focusNodeId && e.from_id !== focusNodeId && e.to_id !== focusNodeId) return false;
    return true;
  });

  const honored = edges.filter((e) => e.ceremony_honored).length;
  const avgStrength = edges.length > 0 ? edges.reduce((s, e) => s + e.strength, 0) / edges.length : 0;
  const focusNode = focusNodeId ? nodeMap.get(focusNodeId) : undefined;

  async function weaveRelation(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const obligationsRaw = (form.get("obligations") as string) || "";
    const body = {
      from_id: form.get("from_id") as string,
      to_id: form.get("to_id") as string,
      relationship_type: form.get("relationship_type") as string,
      strength: weaveStrength,
      obligations: obligationsRaw.split(",").map((s) => s.trim()).filter(Boolean),
    };
    setBusy(true);
    try {
      const res = await fetch("/api/edges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.issues?.join("; ") || data.error || "Relation was not woven");
      toast.success(data.replaced ? "Relation rewoven — the previous thread was replaced" : "Relation woven");
      setShowWeave(false);
      setWeaveStrength(0.5);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Relation was not woven");
    } finally {
      setBusy(false);
    }
  }

  async function saveRelation(e: SubmitEvent<HTMLFormElement>, edge: RelationalEdge) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const obligationsRaw = (form.get("obligations") as string) || "";
    const body = {
      relationship_type: form.get("relationship_type") as string,
      strength: editStrength,
      obligations: obligationsRaw.split(",").map((s) => s.trim()).filter(Boolean),
    };
    setBusy(true);
    try {
      const res = await fetch(`/api/edges?from=${encodeURIComponent(edge.from_id)}&to=${encodeURIComponent(edge.to_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.issues?.join("; ") || data.error || "Changes were not saved");
      toast.success("Relation changes saved");
      setEditingKey(null);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Changes were not saved");
    } finally {
      setBusy(false);
    }
  }

  async function releaseRelation(edge: RelationalEdge) {
    setBusy(true);
    try {
      const res = await fetch(`/api/edges?from=${encodeURIComponent(edge.from_id)}&to=${encodeURIComponent(edge.to_id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Relation was not released");
      toast.success("Relation released — both nodes remain in the wheel");
      setDeletingEdge(null);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Relation was not released");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relations</h1>
          <p className="text-sm text-muted-foreground">
            {edges.length} relation{edges.length === 1 ? "" : "s"} · {honored} honored in ceremony · average strength {Math.round(avgStrength * 100)}%
          </p>
        </div>
        <button
          onClick={() => setShowWeave(!showWeave)}
          className="mw-btn mw-btn--primary"
          disabled={nodes.length < 2 && !showWeave}
          title={nodes.length < 2 ? "The wheel needs at least two nodes before a relation can be woven" : undefined}
        >
          {showWeave ? "Close form" : "Weave relation"}
        </button>
      </div>

      {showWeave && (
        <form onSubmit={weaveRelation} className="mb-6 p-4 border rounded-lg bg-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">From</span>
              <select name="from_id" required className="mw-input" defaultValue={focusNodeId ?? ""}>
                <option value="" disabled>Choose a node</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Relation</span>
              <input name="relationship_type" required list="relation-types" placeholder="mentorship, stewardship…" className="mw-input" />
              <datalist id="relation-types">
                {relationTypes.map((t) => <option key={t} value={t} />)}
              </datalist>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">To</span>
              <select name="to_id" required className="mw-input" defaultValue="">
                <option value="" disabled>Choose a node</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Strength · {Math.round(weaveStrength * 100)}%</span>
              <input type="range" min="0" max="1" step="0.05" value={weaveStrength} onChange={(e) => setWeaveStrength(Number(e.target.value))} className="w-full" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Obligations (comma-separated, optional)</span>
              <input name="obligations" placeholder="teaching, land care…" className="mw-input" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="mw-btn mw-btn--primary">Weave relation</button>
            <button type="button" onClick={() => setShowWeave(false)} className="mw-btn mw-btn--ghost">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="mw-input" style={{ width: "auto" }} aria-label="Filter by relation type">
          <option value="all">All relation types</option>
          {relationTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterCeremony} onChange={(e) => setFilterCeremony(e.target.value)} className="mw-input" style={{ width: "auto" }} aria-label="Filter by ceremony status">
          <option value="all">All ceremony states</option>
          <option value="honored">Honored in ceremony</option>
          <option value="unhonored">Not yet honored</option>
        </select>
        {focusNode && (
          <span className="mw-badge">
            relations of {focusNode.name}
            <button onClick={() => setFocusNodeId(null)} className="ml-2 hover:text-foreground" aria-label={`Stop filtering by ${focusNode.name}`}>✕</button>
          </span>
        )}
        {(filterType !== "all" || filterCeremony !== "all") && (
          <button onClick={() => { setFilterType("all"); setFilterCeremony("all"); }} className="mw-btn mw-btn--ghost">Clear filters</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading relations…</div>
      ) : filteredEdges.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
          {edges.length === 0 ? (
            nodes.length < 2 ? (
              <>
                <p>Relations need two nodes to hold between.</p>
                <Link href="/nodes" className="mw-btn mw-btn--primary mt-4 inline-flex">Create nodes first</Link>
              </>
            ) : (
              <>
                <p>No relations yet.</p>
                <button onClick={() => setShowWeave(true)} className="mw-btn mw-btn--primary mt-4">Weave the first thread</button>
              </>
            )
          ) : (
            <p>No relations match these filters — clear them to see the full weave.</p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">Relation</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Ceremony</th>
                <th className="px-4 py-3 font-medium">Woven</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEdges.map((edge) => {
                const key = edgeKey(edge);
                const isEditing = editingKey === key;
                return (
                  <tr key={key} className="border-b border-border/50 hover:bg-secondary/30 align-top">
                    {isEditing ? (
                      <td colSpan={6} className="px-4 py-3">
                        <form onSubmit={(e) => saveRelation(e, edge)} className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap text-sm">
                            <NodeChip node={nodeMap.get(edge.from_id)} id={edge.from_id} />
                            <span className="text-muted-foreground" aria-hidden>→</span>
                            <NodeChip node={nodeMap.get(edge.to_id)} id={edge.to_id} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="text-sm space-y-1">
                              <span className="text-muted-foreground">Relation</span>
                              <input name="relationship_type" defaultValue={edge.relationship_type} required list="relation-types" className="mw-input" />
                            </label>
                            <label className="text-sm space-y-1">
                              <span className="text-muted-foreground">Strength · {Math.round(editStrength * 100)}%</span>
                              <input type="range" min="0" max="1" step="0.05" value={editStrength} onChange={(e) => setEditStrength(Number(e.target.value))} className="w-full" />
                            </label>
                            <label className="text-sm space-y-1">
                              <span className="text-muted-foreground">Obligations (comma-separated)</span>
                              <input name="obligations" defaultValue={(edge.obligations ?? []).join(", ")} className="mw-input" />
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={busy} className="mw-btn mw-btn--primary">Save changes</button>
                            <button type="button" onClick={() => setEditingKey(null)} className="mw-btn mw-btn--ghost">Cancel</button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3"><NodeChip node={nodeMap.get(edge.from_id)} id={edge.from_id} /></td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{edge.relationship_type}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="mw-progress-track w-16"><div className="mw-progress-fill" style={{ width: `${edge.strength * 100}%` }} /></div>
                            <span className="text-xs text-muted-foreground">{Math.round(edge.strength * 100)}%</span>
                          </div>
                          {(edge.obligations?.length ?? 0) > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">carries: {edge.obligations.join(", ")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3"><NodeChip node={nodeMap.get(edge.to_id)} id={edge.to_id} /></td>
                        <td className="px-4 py-3"><CeremonyMark honored={edge.ceremony_honored} /></td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" title={absoluteTime(edge.created_at)}>{relativeTime(edge.created_at)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => { setEditingKey(key); setEditStrength(edge.strength); }}
                            className="mw-btn mw-btn--secondary mr-2"
                          >
                            Edit
                          </button>
                          <button onClick={() => setDeletingEdge(edge)} className="mw-btn mw-btn--danger">Release</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deletingEdge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="release-relation-title">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 space-y-4">
            <h2 id="release-relation-title" className="text-lg font-semibold">Release this relation?</h2>
            <p className="text-sm">
              The thread “{deletingEdge.relationship_type}” from{" "}
              <strong>{nodeMap.get(deletingEdge.from_id)?.name ?? deletingEdge.from_id}</strong> to{" "}
              <strong>{nodeMap.get(deletingEdge.to_id)?.name ?? deletingEdge.to_id}</strong> will be severed.
              Both nodes remain in the wheel. This cannot be undone.
            </p>
            {deletingEdge.ceremony_honored && (
              <p className="text-sm" style={{ color: "var(--mw-ceremony)" }}>
                ✦ This relation was honored in ceremony — release it with intention.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingEdge(null)} className="mw-btn mw-btn--ghost">Keep the relation</button>
              <button onClick={() => releaseRelation(deletingEdge)} disabled={busy} className="mw-btn mw-btn--danger border border-current">Release relation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
