"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CircleDot,
  Flame,
  GitFork,
  RefreshCw,
  Route,
  Save,
  ShieldCheck,
} from "lucide-react";
import { type RelationalNode, type RelationalEdge, DIRECTION_COLORS } from "@/lib/types";
import {
  applyWheelLayout,
  buildGraphData,
  type MWGraphData,
  type MWGraphNode,
  type MWGraphNodePositions,
} from "@medicine-wheel/graph-viz";
import {
  CURRENT_GRAPH_LAYOUT_ID,
  getActiveGraphLayout,
  loadStoredGraphLayoutStore,
  persistGraphLayoutStore,
  saveNamedGraphLayout,
  selectGraphLayout,
  upsertCurrentGraphLayout,
  type GraphLayoutStore,
} from "@/lib/graph-layout-storage";
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

const GRAPH_COMPONENT_LINKS = [
  { href: "/nodes", label: "Nodes", icon: CircleDot },
  { href: "/relations", label: "Relations", icon: GitFork },
  { href: "/ceremonies", label: "Ceremonies", icon: Flame },
  { href: "/narrative", label: "Narrative", icon: BookOpen },
  { href: "/narrative/beats", label: "Beats", icon: Route },
  { href: "/accountability", label: "Accountability", icon: ShieldCheck },
];

function graphNodePositions(data: MWGraphData): MWGraphNodePositions {
  const laidOut = applyWheelLayout({
    nodes: data.nodes.map((node) => ({ ...node })),
    links: data.links,
  });
  const positions: MWGraphNodePositions = {};

  for (const node of laidOut.nodes) {
    if (typeof node.x === "number" && typeof node.y === "number") {
      positions[node.id] = { x: node.x, y: node.y };
    }
  }

  return positions;
}

export default function GraphPage() {
  const router = useRouter();
  const [graph, setGraph] = useState<MWGraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<MWGraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [layoutName, setLayoutName] = useState("");
  const [layoutsHydrated, setLayoutsHydrated] = useState(false);
  const [layoutStore, setLayoutStore] = useState<GraphLayoutStore>(() =>
    loadStoredGraphLayoutStore(null),
  );
  const layoutStoreRef = useRef(layoutStore);

  const saveLayoutStore = useCallback(
    (
      nextStore: GraphLayoutStore,
      options: { notifyOnFailure?: boolean } = {},
    ) => {
      layoutStoreRef.current = nextStore;
      setLayoutStore(nextStore);

      const persisted = persistGraphLayoutStore(nextStore);
      if (!persisted && options.notifyOnFailure) {
        toast.error("Could not save graph disposition");
      }

      return persisted;
    },
    [],
  );

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

  useEffect(() => {
    const storedLayouts = loadStoredGraphLayoutStore();
    layoutStoreRef.current = storedLayouts;
    setLayoutStore(storedLayouts);
    setLayoutsHydrated(true);
  }, []);

  useEffect(() => {
    layoutStoreRef.current = layoutStore;
  }, [layoutStore]);

  useEffect(() => {
    if (!layoutsHydrated || graph.nodes.length === 0) return;

    const activeLayout = getActiveGraphLayout(layoutStoreRef.current);
    if (Object.keys(activeLayout.positions).length > 0) return;

    saveLayoutStore(
      upsertCurrentGraphLayout(layoutStoreRef.current, graphNodePositions(graph)),
    );
  }, [graph, layoutsHydrated, saveLayoutStore]);

  const ceremoniedCount = useMemo(
    () => graph.links.filter((l) => l.ceremonyHonored).length,
    [graph.links],
  );
  const directionCount = useMemo(
    () => new Set(graph.nodes.map((n) => n.direction).filter(Boolean)).size,
    [graph.nodes],
  );
  const activeLayout = useMemo(() => getActiveGraphLayout(layoutStore), [layoutStore]);
  const savedLayouts = useMemo(
    () => layoutStore.layouts.filter((layout) => layout.id !== CURRENT_GRAPH_LAYOUT_ID),
    [layoutStore.layouts],
  );
  const rememberedPositionCount = useMemo(
    () => Object.keys(activeLayout.positions).length,
    [activeLayout.positions],
  );

  const handleNodePositionsChange = useCallback(
    (positions: MWGraphNodePositions) => {
      saveLayoutStore(upsertCurrentGraphLayout(layoutStoreRef.current, positions));
    },
    [saveLayoutStore],
  );

  const saveNamedLayout = useCallback(() => {
    const name = layoutName.trim();
    if (!name) {
      toast.error("Name the disposition first");
      return;
    }

    const positions = getActiveGraphLayout(layoutStoreRef.current).positions;
    if (Object.keys(positions).length === 0) {
      toast.error("Move a node before saving");
      return;
    }

    const nextStore = saveNamedGraphLayout(layoutStoreRef.current, name, positions);
    const persisted = saveLayoutStore(nextStore, { notifyOnFailure: true });
    if (persisted) toast.success(`Saved ${name}`);
    setLayoutName("");
  }, [layoutName, saveLayoutStore]);

  const loadNamedLayout = useCallback(
    (layoutId: string) => {
      const nextStore = selectGraphLayout(layoutStoreRef.current, layoutId);
      const active = getActiveGraphLayout(nextStore);
      const persisted = saveLayoutStore(nextStore, { notifyOnFailure: true });
      if (persisted) toast.success(`Loaded ${active.name}`);
    },
    [saveLayoutStore],
  );

  const navigateToNode = useCallback(
    (node: MWGraphNode) => {
      router.push(`/nodes?node=${encodeURIComponent(node.id)}`);
    },
    [router],
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
            <button onClick={loadData} className="px-3 py-1.5 rounded text-sm bg-white/5 hover:bg-white/10 inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
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
                nodePositions={activeLayout.positions}
                onNodeClick={(node) => setSelectedNode(node)}
                onNodeDoubleClick={navigateToNode}
                onNodePositionsChange={handleNodePositionsChange}
              />
            )}
          </div>

          <div className="w-72 space-y-4">
            <div className="rounded-lg border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Dispositions</h3>
              <div className="space-y-3">
                <select
                  value={layoutStore.activeLayoutId}
                  onChange={(event) => loadNamedLayout(event.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  aria-label="Graph disposition"
                >
                  <option className="bg-[#101020]" value={CURRENT_GRAPH_LAYOUT_ID}>
                    Last positioning
                  </option>
                  {savedLayouts.map((layout) => (
                    <option className="bg-[#101020]" key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <input
                    value={layoutName}
                    onChange={(event) => setLayoutName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveNamedLayout();
                    }}
                    placeholder="Name disposition"
                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                  />
                  <button
                    onClick={saveNamedLayout}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/15"
                    aria-label="Save named disposition"
                    title="Save named disposition"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  {rememberedPositionCount} positions remembered
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Related</h3>
              <div className="grid grid-cols-2 gap-2">
                {GRAPH_COMPONENT_LINKS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white/5 px-2 text-xs text-gray-200 hover:bg-white/10"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

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
                  <Link
                    href={`/nodes?node=${encodeURIComponent(selectedNode.id)}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                  >
                    <CircleDot className="h-4 w-4" /> Open node
                  </Link>
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
