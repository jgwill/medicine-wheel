"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { MouseEvent, FormEvent } from "react";
import { type RelationalNode, type RelationalEdge, NODE_TYPE_COLORS, type NodeType } from "@/lib/types";
import { toast } from "sonner";

interface GraphNode extends RelationalNode {
  x: number;
  y: number;
}

export default function RelationsPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<RelationalEdge[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [showAddNode, setShowAddNode] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [nodesRes, edgesRes] = await Promise.all([fetch("/api/nodes"), fetch("/api/edges")]);
      const nodesData: RelationalNode[] = await nodesRes.json();
      const edgesData: RelationalEdge[] = await edgesRes.json();

      const cx = 400, cy = 300, radius = 220;
      const graphNodes = nodesData.map((n, i) => {
        const angle = (2 * Math.PI * i) / Math.max(nodesData.length, 1);
        return { ...n, x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 40, y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 40 };
      });
      setNodes(graphNodes);
      setEdges(Array.isArray(edgesData) ? edgesData : []);
    } catch { console.error("Failed to load"); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMouseDown = (id: string) => setDragging(id);
  const handleMouseUp = () => setDragging(null);
  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 600;
    setNodes((prev) => prev.map((n) => (n.id === dragging ? { ...n, x, y } : n)));
  };

  const filteredNodes = filterType === "all" ? nodes : nodes.filter((n) => n.type === filterType);
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter((e) => filteredNodeIds.has(e.from_id) && filteredNodeIds.has(e.to_id));
  const selectedNode = nodes.find((n) => n.id === selected);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const types: NodeType[] = ["human", "land", "spirit", "ancestor", "future", "knowledge"];

  // Simple accountability stats
  const totalEdges = edges.length;
  const ceremonied = edges.filter((e) => e.ceremony_honored).length;
  const unceremonied = totalEdges - ceremonied;
  const avgStrength = totalEdges > 0 ? edges.reduce((s, e) => s + e.strength, 0) / totalEdges : 0;

  async function addNode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = { name: form.get("name") as string, type: form.get("type") as string, direction: (form.get("direction") as string) || undefined };
    const res = await fetch("/api/nodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { toast.success("Node created"); setShowAddNode(false); loadData(); } else { toast.error("Failed"); }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Relational Web</h1>
          <p className="text-sm text-muted-foreground">{nodes.length} nodes · {edges.length} edges</p>
        </div>
        <div className="flex gap-2">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 rounded-md border bg-background text-sm">
            <option value="all">All Types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => setShowAddNode(!showAddNode)} className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">+ Add Node</button>
        </div>
      </div>

      {showAddNode && (
        <form onSubmit={addNode} className="mb-6 p-4 border rounded-lg bg-card grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input name="name" placeholder="Node name" required className="px-3 py-2 rounded-md border bg-background text-sm" />
          <select name="type" required className="px-3 py-2 rounded-md border bg-background text-sm">{types.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select name="direction" className="px-3 py-2 rounded-md border bg-background text-sm">
            <option value="">No direction</option><option value="east">East</option><option value="south">South</option><option value="west">West</option><option value="north">North</option>
          </select>
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Create</button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-lg bg-card overflow-hidden">
          <svg ref={svgRef} viewBox="0 0 800 600" className="w-full h-[600px] cursor-crosshair"
            onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {filteredEdges.map((edge) => {
              const from = nodeMap.get(edge.from_id);
              const to = nodeMap.get(edge.to_id);
              if (!from || !to) return null;
              return (
                <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edge.ceremony_honored ? "var(--color-primary)" : "var(--color-muted-foreground)"}
                  strokeWidth={1 + edge.strength * 3} strokeDasharray={edge.ceremony_honored ? "none" : "6,4"} opacity={0.6} />
              );
            })}
            {filteredNodes.map((node) => (
              <g key={node.id} className="cursor-grab" onMouseDown={() => handleMouseDown(node.id)} onClick={() => setSelected(node.id)}>
                <circle cx={node.x} cy={node.y} r={selected === node.id ? 20 : 16}
                  fill={NODE_TYPE_COLORS[node.type]} stroke={selected === node.id ? "var(--color-ring)" : "var(--color-border)"}
                  strokeWidth={selected === node.id ? 3 : 1} opacity={0.9} />
                <text x={node.x} y={node.y + 28} textAnchor="middle" className="fill-foreground text-[10px] pointer-events-none">
                  {node.name.length > 15 ? node.name.slice(0, 14) + "…" : node.name}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="border rounded-lg bg-card p-4">
          {selectedNode ? (
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS[selectedNode.type] }} />
                {selectedNode.name}
              </h3>
              <div className="mt-3 space-y-2 text-sm">
                <div><span className="text-muted-foreground">Type:</span> {selectedNode.type}</div>
                {selectedNode.direction && <div><span className="text-muted-foreground">Direction:</span> {selectedNode.direction}</div>}
                <div><span className="text-muted-foreground">Created:</span> {new Date(selectedNode.created_at).toLocaleDateString()}</div>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Connected Edges</h4>
                {edges.filter((e) => e.from_id === selectedNode.id || e.to_id === selectedNode.id).map((e) => {
                  const other = e.from_id === selectedNode.id ? nodeMap.get(e.to_id) : nodeMap.get(e.from_id);
                  return (
                    <div key={e.id} className="py-1 text-sm border-b border-border/50">
                      <span className="text-muted-foreground">{e.relationship_type}</span> → {other?.name || "?"}
                      <span className="ml-2 text-xs text-muted-foreground">({Math.round(e.strength * 100)}%)</span>
                      {e.ceremony_honored && <span className="ml-1 text-green-500">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Click a node to view details</p>
              <div className="mt-4 text-left">
                <h4 className="text-sm font-medium mb-2">Legend</h4>
                {types.map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm py-0.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS[t] }} /> <span className="capitalize">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Relational Health */}
      {nodes.length > 0 && (
        <div className="mt-6 border rounded-lg bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">Relational Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto">
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-muted)" strokeWidth="4" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-primary)" strokeWidth="4"
                  strokeDasharray={`${avgStrength * 125.6} 125.6`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                <text x="24" y="28" textAnchor="middle" className="text-[10px] fill-foreground font-bold">{Math.round(avgStrength * 100)}%</text>
              </svg>
              <p className="text-xs text-muted-foreground mt-1">Average strength</p>
            </div>
            <div><p className="text-2xl font-bold">{ceremonied}</p><p className="text-xs text-muted-foreground">Ceremonied</p></div>
            <div><p className="text-2xl font-bold">{unceremonied}</p><p className="text-xs text-muted-foreground">Unceremonied</p></div>
            <div><p className="text-2xl font-bold text-green-500">{ceremonied}</p><p className="text-xs text-muted-foreground">Ceremonies honored</p></div>
            <div><p className="text-2xl font-bold">{unceremonied}</p><p className="text-xs text-muted-foreground">Obligations</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
