"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { type RelationalNode, type RelationalEdge, DIRECTION_COLORS } from "@/lib/types";
import {
  buildGraphData,
  type MWGraphData,
  type MWGraphNode,
} from "@medicine-wheel/graph-viz";
import { toast } from "sonner";

// React Flow touches `window`/`document`, so the interactive renderer is
// loaded client-side only via the `./interactive` subpath export.
const MedicineWheelFlowGraph = dynamic(
  () =>
    import("@medicine-wheel/graph-viz/interactive").then(
      (m) => m.MedicineWheelFlowGraph,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] text-gray-500">
        Loading interactive graph…
      </div>
    ),
  },
);

export default function GraphPage() {
  const [graph, setGraph] = useState<MWGraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<MWGraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [nodesRes, edgesRes] = await Promise.all([fetch("/api/nodes"), fetch("/api/edges")]);
      const nodesResponse = await nodesRes.json();
      const edgesData: RelationalEdge[] = await edgesRes.json();

      // API returns { nodes: [...], provider: '...', count: N }
      const nodesData: RelationalNode[] = Array.isArray(nodesResponse)
        ? nodesResponse
        : nodesResponse.nodes || [];

      setGraph(buildGraphData(nodesData, edgesData));
    } catch {
      toast.error("Failed to load graph data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ceremoniedCount = useMemo(
    () => graph.links.filter((l) => l.ceremonyHonored).length,
    [graph.links],
  );
  const directionCount = useMemo(
    () => new Set(graph.nodes.map((n) => n.direction).filter(Boolean)).size,
    [graph.nodes],
  );

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">🔮</span> Medicine Wheel Graph
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Interactive relational web — drag, pan, zoom across the four directions
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`px-3 py-1.5 rounded text-sm ${showLabels ? "bg-white/10" : "bg-white/5"}`}
            >
              Labels {showLabels ? "ON" : "OFF"}
            </button>
            <button onClick={loadData} className="px-3 py-1.5 rounded text-sm bg-white/5 hover:bg-white/10">
              ↻ Refresh
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 rounded-xl border border-white/10 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-[600px] text-gray-500">Loading graph data...</div>
            ) : graph.nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[600px] text-gray-500">
                <span className="text-4xl mb-3">🌀</span>
                <p>No relational nodes yet.</p>
                <p className="text-sm mt-1">Create nodes via the Nodes page.</p>
              </div>
            ) : (
              <MedicineWheelFlowGraph
                data={graph}
                height={600}
                darkMode
                showNodeLabels={showLabels}
                onNodeClick={(node) => setSelectedNode(node)}
              />
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
                <div><p className="text-2xl font-bold">{graph.nodes.length}</p><p className="text-xs text-gray-500">Nodes</p></div>
                <div><p className="text-2xl font-bold">{graph.links.length}</p><p className="text-xs text-gray-500">Relations</p></div>
                <div><p className="text-2xl font-bold">{ceremoniedCount}</p><p className="text-xs text-gray-500">Ceremonied</p></div>
                <div><p className="text-2xl font-bold">{directionCount}</p><p className="text-xs text-gray-500">Directions</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
