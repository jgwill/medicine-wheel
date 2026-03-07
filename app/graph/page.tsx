"use client";

import { useEffect, useState, useCallback } from "react";
import { type RelationalNode, type RelationalEdge, DIRECTION_COLORS } from "@/lib/types";
import { toast } from "sonner";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  direction?: string;
  x: number;
  y: number;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
  ceremonyHonored: boolean;
  strength: number;
}

export default function GraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [nodesRes, edgesRes] = await Promise.all([fetch("/api/nodes"), fetch("/api/edges")]);
      const nodesData: RelationalNode[] = await nodesRes.json();
      const edgesData: RelationalEdge[] = await edgesRes.json();

      // Position nodes by direction on a circular layout
      const CX = 350, CY = 300, R = 220;
      const dirAngles: Record<string, number> = { east: 0, south: 90, west: 180, north: 270 };

      const graphNodes = nodesData.map((n, i) => {
        const baseAngle = n.direction ? dirAngles[n.direction] ?? 0 : (360 * i) / nodesData.length;
        const jitter = (Math.random() - 0.5) * 60;
        const angle = ((baseAngle + jitter) * Math.PI) / 180;
        const r = R * (0.5 + Math.random() * 0.4);
        return {
          id: n.id,
          label: n.name,
          type: n.type,
          direction: n.direction,
          x: CX + r * Math.cos(angle),
          y: CY + r * Math.sin(angle),
        };
      });

      const graphLinks = edgesData.map((e) => ({
        source: e.from_id,
        target: e.to_id,
        label: e.relationship_type,
        ceremonyHonored: e.ceremony_honored,
        strength: e.strength,
      }));

      setNodes(graphNodes);
      setLinks(graphLinks);
    } catch {
      toast.error("Failed to load graph data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">🔮</span> Medicine Wheel Graph
            </h1>
            <p className="text-gray-400 text-sm mt-1">Relational visualization across four directions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`px-3 py-1.5 rounded text-sm ${showLabels ? "bg-white/10" : "bg-white/5"}`}
            >
              Labels {showLabels ? "ON" : "OFF"}
            </button>
            <button onClick={loadData} className="px-3 py-1.5 rounded text-sm bg-white/5 hover:bg-white/10">↻ Refresh</button>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 rounded-xl border border-white/10 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-[600px] text-gray-500">Loading graph data...</div>
            ) : nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[600px] text-gray-500">
                <span className="text-4xl mb-3">🌀</span>
                <p>No relational nodes yet.</p>
                <p className="text-sm mt-1">Create nodes via the Nodes page.</p>
              </div>
            ) : (
              <svg viewBox="0 0 700 600" className="w-full h-[600px]">
                {/* Quadrant backgrounds */}
                {[
                  { dir: "east", cx: 525, cy: 300 },
                  { dir: "south", cx: 350, cy: 475 },
                  { dir: "west", cx: 175, cy: 300 },
                  { dir: "north", cx: 350, cy: 125 },
                ].map(({ dir, cx, cy }) => (
                  <g key={dir}>
                    <circle cx={cx} cy={cy} r={40} fill={(DIRECTION_COLORS as any)[dir]} opacity={0.1} />
                    <text x={cx} y={cy + 4} textAnchor="middle" fill={(DIRECTION_COLORS as any)[dir]} className="text-xs font-bold capitalize" opacity={0.6}>
                      {dir}
                    </text>
                  </g>
                ))}

                {/* Links */}
                {links.map((link, i) => {
                  const source = nodeMap.get(link.source);
                  const target = nodeMap.get(link.target);
                  if (!source || !target) return null;
                  return (
                    <line
                      key={i}
                      x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                      stroke={link.ceremonyHonored ? "#FFD700" : "#555"}
                      strokeWidth={1 + link.strength * 2}
                      strokeDasharray={link.ceremonyHonored ? "none" : "6,4"}
                      opacity={0.5}
                    />
                  );
                })}

                {/* Nodes */}
                {nodes.map((node) => (
                  <g key={node.id} className="cursor-pointer" onClick={() => setSelectedNode(node)}>
                    <circle
                      cx={node.x} cy={node.y} r={selectedNode?.id === node.id ? 18 : 14}
                      fill={node.direction ? (DIRECTION_COLORS as any)[node.direction] || "#888" : "#888"}
                      stroke={selectedNode?.id === node.id ? "#FFD700" : "#333"}
                      strokeWidth={selectedNode?.id === node.id ? 3 : 1}
                      opacity={0.9}
                    />
                    {showLabels && (
                      <text x={node.x} y={node.y + 26} textAnchor="middle" fill="#ccc" className="text-[10px]">
                        {node.label.length > 15 ? node.label.slice(0, 14) + "…" : node.label}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            )}
          </div>

          <div className="w-72 space-y-4">
            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Directions</h3>
              {(["east", "south", "west", "north"] as const).map((dir) => (
                <div key={dir} className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: DIRECTION_COLORS[dir] }} />
                  <span className="text-sm capitalize">{dir}</span>
                </div>
              ))}
            </div>

            {selectedNode && (
              <div className="rounded-xl border border-white/10 p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Selected Node</h3>
                <div className="space-y-2">
                  <div><span className="text-xs text-gray-500">Name</span><p className="font-medium">{selectedNode.label}</p></div>
                  <div><span className="text-xs text-gray-500">Type</span><p className="capitalize">{selectedNode.type}</p></div>
                  {selectedNode.direction && <div><span className="text-xs text-gray-500">Direction</span><p className="capitalize">{selectedNode.direction}</p></div>}
                  <div><span className="text-xs text-gray-500">ID</span><p className="text-xs text-gray-400 font-mono break-all">{selectedNode.id}</p></div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Graph Stats</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div><p className="text-2xl font-bold">{nodes.length}</p><p className="text-xs text-gray-500">Nodes</p></div>
                <div><p className="text-2xl font-bold">{links.length}</p><p className="text-xs text-gray-500">Relations</p></div>
                <div><p className="text-2xl font-bold">{links.filter((l) => l.ceremonyHonored).length}</p><p className="text-xs text-gray-500">Ceremonied</p></div>
                <div><p className="text-2xl font-bold">{new Set(nodes.map((n) => n.direction).filter(Boolean)).size}</p><p className="text-xs text-gray-500">Directions</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
