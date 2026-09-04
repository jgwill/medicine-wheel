"use client";

import "@xyflow/react/dist/style.css";
import "./medicine-wheel-flow.css";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
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
  SlidersHorizontal,
  X,
} from "lucide-react";
import { type RelationalNode, type RelationalEdge, DIRECTION_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  applyWheelLayout,
  buildGraphData,
  type MWGraphData,
  type MWGraphLink,
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
  upsertActiveGraphLayout,
  upsertCurrentGraphLayout,
  type GraphLayoutStore,
} from "@/lib/graph-layout-storage";
import {
  DEFAULT_GRAPH_ANIMATION_ENABLED,
  loadStoredGraphAnimationPreference,
  persistGraphAnimationPreference,
} from "@/lib/graph-animation-storage";
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

const DIRECTION_NAMES = ["east", "south", "west", "north"] as const;
type DirectionParam = (typeof DIRECTION_NAMES)[number];

export default function GraphPage() {
  const router = useRouter();
  const [graph, setGraph] = useState<MWGraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<MWGraphNode | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | undefined>(undefined);
  /**
   * Scope is not focus.
   *
   * `focusedNodeId` zooms the viewport at a node and leaves all 205 mounted —
   * useful, and not an answer to "I cannot navigate", because the field is still
   * there behind the zoom. `scopeId` replaces the graph with one node's
   * neighbourhood, so the canvas holds only what was asked for. Two names
   * because they are two questions; collapsing them would make the control
   * silently mean different things depending on how the page was entered.
   */
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [scopeDepth, setScopeDepth] = useState(2);
  const [scopeMeta, setScopeMeta] = useState<{ count: number; truncated: boolean } | null>(null);
  const [storeTotal, setStoreTotal] = useState<number | null>(null);
  const [highlightDirection, setHighlightDirection] = useState<DirectionParam | undefined>(undefined);
  const [radialSnap, setRadialSnap] = useState<"off" | "ring" | "sector">("off");
  const [loading, setLoading] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(
    DEFAULT_GRAPH_ANIMATION_ENABLED,
  );
  const [layoutName, setLayoutName] = useState("");
  const [layoutsHydrated, setLayoutsHydrated] = useState(false);
  const [layoutStore, setLayoutStore] = useState<GraphLayoutStore>(() =>
    loadStoredGraphLayoutStore(null),
  );
  const layoutStoreRef = useRef(layoutStore);

  // Mobile presentation: the side panel becomes a slide-up sheet so the
  // canvas can own the screen, and the canvas height fills the viewport.
  const [isMobile, setIsMobile] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [graphHeight, setGraphHeight] = useState<number | string>(600);
  const selectedPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      setIsMobile(mq.matches);
      setGraphHeight(
        mq.matches ? Math.max(360, Math.round(window.innerHeight * 0.66)) : 600,
      );
    };
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  // When a being is tapped on mobile the sheet opens; bring its details into
  // view once the slide-up transition settles.
  useEffect(() => {
    if (!isMobile || !sheetOpen || !selectedNode) return;
    const t = window.setTimeout(() => {
      selectedPanelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 320);
    return () => window.clearTimeout(t);
  }, [isMobile, sheetOpen, selectedNode]);

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
      // Scoped and whole-wheel are different questions, not the same question
      // with a filter. `focusedNodeId` already existed and only zooms the
      // viewport — every one of the 205 nodes stays mounted, so "focus" was
      // never a way to look at less. Scope replaces the data.
      if (scopeId) {
        const res = await fetch(
          `/api/nodes/${encodeURIComponent(scopeId)}/web?depth=${scopeDepth}`,
        );
        if (!res.ok) {
          toast.error(
            res.status === 404
              ? "That node is not in the wheel."
              : "Could not read that neighbourhood.",
          );
          setScopeId(null);
          return;
        }
        const web = await res.json();
        setGraph(buildGraphData(web.nodes ?? [], web.edges ?? []));
        setScopeMeta({ count: web.count ?? 0, truncated: Boolean(web.truncated) });
        return;
      }

      const [nodesRes, edgesRes] = await Promise.all([fetch("/api/nodes?limit=all"), fetch("/api/edges?limit=all")]);
      const nodesResponse = await nodesRes.json();
      const edgesData: RelationalEdge[] = await edgesRes.json();

      // API returns { nodes: [...], provider: '...', count: N, total, truncated }
      const nodesData: RelationalNode[] = Array.isArray(nodesResponse)
        ? nodesResponse
        : nodesResponse.nodes || [];

      setGraph(buildGraphData(nodesData, edgesData));
      setScopeMeta(null);
      setStoreTotal(
        Array.isArray(nodesResponse) ? nodesData.length : (nodesResponse.total ?? nodesData.length),
      );
    } catch {
      toast.error("Failed to load graph data");
    } finally {
      setLoading(false);
    }
  }, [scopeId, scopeDepth]);

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
    setAnimationsEnabled(loadStoredGraphAnimationPreference());
  }, []);

  // Deep links: ?node=<id> focuses a being; ?direction=<dir> keeps that
  // quadrant's beings lit (arriving from the home wheel).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const node = params.get("node");
    if (node) setFocusedNodeId(node);
    // ?scope=<id> arrives from an episode page's "Open in graph" and means
    // "show me this and its neighbours", not "zoom at this".
    const scope = params.get("scope");
    if (scope) {
      setScopeId(scope);
      setFocusedNodeId(scope);
    }
    const direction = params.get("direction");
    if (direction && (DIRECTION_NAMES as readonly string[]).includes(direction)) {
      setHighlightDirection(direction as DirectionParam);
    }
  }, []);

  // Escape leaves the neighbourhood and returns the whole wheel. It is the only
  // way out that needs no aiming, which matters when the reason you scoped was
  // that you could not find anything.
  useEffect(() => {
    if (!scopeId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScopeId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scopeId]);

  // Surface the deep-linked node in the side panel once data arrives.
  useEffect(() => {
    if (!focusedNodeId || graph.nodes.length === 0) return;
    const node = graph.nodes.find((n) => n.id === focusedNodeId);
    if (node) setSelectedNode(node);
  }, [focusedNodeId, graph.nodes]);

  const graphData = useMemo<MWGraphData>(
    () => (focusedNodeId ? { ...graph, focusedNodeId } : graph),
    [graph, focusedNodeId],
  );

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
      saveLayoutStore(upsertActiveGraphLayout(layoutStoreRef.current, positions));
    },
    [saveLayoutStore],
  );

  const saveNamedLayout = useCallback(() => {
    const active = getActiveGraphLayout(layoutStoreRef.current);
    const name =
      layoutName.trim() ||
      (active.id !== CURRENT_GRAPH_LAYOUT_ID ? active.name : "");

    if (!name) {
      toast.error("Name the disposition first");
      return;
    }

    const positions = active.positions;
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

  const handleRelationCreate = useCallback(
    async (sourceId: string, targetId: string) => {
      try {
        const res = await fetch("/api/edges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_id: sourceId,
            to_id: targetId,
            relationship_type: "speaks-with",
            strength: 0.5,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success("Relation woven — speaks-with");
      } catch {
        toast.error("Could not save the relation — restoring the canvas");
      } finally {
        // Reload canonical data: confirms the new thread or reverts it.
        await loadData();
      }
    },
    [loadData],
  );

  const handleAnimationsEnabledChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const enabled = event.target.checked;
      setAnimationsEnabled(enabled);

      if (!persistGraphAnimationPreference(enabled)) {
        toast.error("Could not save graph animation preference");
      }
    },
    [],
  );

  const handleNodeCreateRequest = useCallback(
    async (request: {
      name: string;
      type: string;
      direction?: string;
      position: { x: number; y: number };
    }) => {
      try {
        const res = await fetch("/api/nodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: request.name,
            type: request.type,
            direction: request.direction,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { node } = await res.json();
        // Seat the new being exactly where the circle was opened.
        if (node?.id) {
          saveLayoutStore(
            upsertActiveGraphLayout(layoutStoreRef.current, {
              [node.id]: request.position,
            }),
          );
        }
        toast.success(`${request.name} placed in the ${request.direction ?? "center"}`);
      } catch {
        toast.error("Could not create the node");
      } finally {
        await loadData();
      }
    },
    [loadData, saveLayoutStore],
  );

  const handleEdgeCeremonyRequest = useCallback(
    async (link: MWGraphLink) => {
      try {
        const res = await fetch(
          `/api/edges?from=${encodeURIComponent(link.source)}&to=${encodeURIComponent(link.target)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ceremony_honored: true }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success("Ceremony honored — the thread turns gold");
      } catch {
        toast.error("Could not honor the ceremony");
      } finally {
        await loadData();
      }
    },
    [loadData],
  );

  const handleEdgeDeleteRequest = useCallback(
    async (link: MWGraphLink) => {
      try {
        const res = await fetch(
          `/api/edges?from=${encodeURIComponent(link.source)}&to=${encodeURIComponent(link.target)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success("Relation released");
      } catch {
        toast.error("Could not release the relation");
      } finally {
        await loadData();
      }
    },
    [loadData],
  );

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 mb-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <span className="text-2xl sm:text-3xl">🔮</span> Medicine Wheel Graph
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Interactive relational web — tap a being, drag, pan, and pinch to zoom
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`min-h-11 px-3 py-1.5 rounded text-sm ${showLabels ? "bg-white/10" : "bg-white/5"}`}
            >
              Labels {showLabels ? "ON" : "OFF"}
            </button>
            <button
              onClick={() =>
                setRadialSnap((s) => (s === "off" ? "ring" : s === "ring" ? "sector" : "off"))
              }
              className={`min-h-11 px-3 py-1.5 rounded text-sm ${radialSnap !== "off" ? "bg-white/10" : "bg-white/5"}`}
              title="Radial snapping: the wheel guides dragged beings — ring keeps them in their band, sector also inside their quadrant"
            >
              Snap {radialSnap === "off" ? "OFF" : radialSnap.toUpperCase()}
            </button>
            <button onClick={loadData} className="min-h-11 px-3 py-1.5 rounded text-sm bg-white/5 hover:bg-white/10 inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {scopeId && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-yellow-400/30 bg-yellow-400/5 px-3 py-2 text-sm">
            <span className="text-gray-300">
              Showing{" "}
              <strong className="text-yellow-300">{scopeMeta?.count ?? graph.nodes.length}</strong>{" "}
              nodes within {scopeDepth} {scopeDepth === 1 ? "hop" : "hops"} of
            </span>
            <code className="font-mono text-xs text-gray-400 break-all">{scopeId}</code>
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-400">
              Depth
              <select
                value={scopeDepth}
                onChange={(e) => setScopeDepth(Number(e.target.value))}
                className="rounded bg-white/5 px-1.5 py-0.5 text-gray-200"
                aria-label="Neighbourhood depth"
              >
                {[1, 2, 3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            {scopeMeta?.truncated && (
              <span className="text-xs text-gray-500">
                stopped at the depth limit — there is more further out
              </span>
            )}
            <button
              onClick={() => setScopeId(null)}
              className="ml-auto min-h-8 rounded bg-white/5 px-2 py-1 text-xs hover:bg-white/10 inline-flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Whole wheel
              <span className="text-gray-500">(Esc)</span>
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="relative flex-1 rounded-xl border border-white/10 overflow-hidden">
            {!loading && graph.nodes.length > 0 && (
              <label className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#0a0a1a]/80 px-2 py-1 text-[11px] text-gray-300 shadow-sm backdrop-blur">
                <input
                  type="checkbox"
                  checked={animationsEnabled}
                  onChange={handleAnimationsEnabledChange}
                  className="h-3 w-3 accent-yellow-400"
                  aria-label="Animate graph edges"
                />
                <span>Animation</span>
              </label>
            )}
            {loading ? (
              <div className="flex items-center justify-center text-gray-500" style={{ height: graphHeight }}>Loading graph data...</div>
            ) : graph.nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-500" style={{ height: graphHeight }}>
                <span className="text-4xl mb-3">🌀</span>
                <p>No relational nodes yet.</p>
                <p className="text-sm mt-1">Create nodes via the Nodes page.</p>
              </div>
            ) : (
              <MedicineWheelFlowGraph
                data={graphData}
                height={graphHeight}
                darkMode
                showNodeLabels={showLabels}
                showMiniMap={!isMobile}
                animationsEnabled={animationsEnabled}
                nodePositions={activeLayout.positions}
                onNodeClick={(node) => {
                  setSelectedNode(node);
                  if (isMobile) setSheetOpen(true);
                }}
                onNodeDoubleClick={navigateToNode}
                onNodePositionsChange={handleNodePositionsChange}
                enableConnections
                onRelationCreate={handleRelationCreate}
                onNodeOpen={navigateToNode}
                onNodeCreateRequest={handleNodeCreateRequest}
                onEdgeCeremonyRequest={handleEdgeCeremonyRequest}
                onEdgeDeleteRequest={handleEdgeDeleteRequest}
                highlightDirection={highlightDirection}
                radialSnap={radialSnap}
              />
            )}
          </div>

          {/* Mobile: floating toggle opens the panels as a slide-up sheet so
              the canvas keeps the whole screen. */}
          {isMobile && !sheetOpen && (
            <button
              onClick={() => setSheetOpen(true)}
              className="fixed bottom-4 right-4 z-30 inline-flex min-h-11 max-w-[70vw] items-center gap-2 rounded-full border border-white/15 bg-[#12122a]/95 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur"
              aria-label="Open graph panels"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedNode ? selectedNode.label : "Panels"}</span>
            </button>
          )}

          {/* Mobile: dim backdrop behind the open sheet. */}
          {isMobile && sheetOpen && (
            <div
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-40 bg-black/60"
              aria-hidden="true"
            />
          )}

          <div
            className={cn(
              isMobile
                ? cn(
                    "fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#0a0a1a] px-4 pb-8 shadow-2xl transition-transform duration-300 ease-out",
                    sheetOpen ? "translate-y-0" : "translate-y-full",
                  )
                : "w-72",
            )}
            aria-hidden={isMobile && !sheetOpen ? "true" : undefined}
          >
            {isMobile && (
              <div className="sticky top-0 z-10 -mx-4 mb-3 flex items-center justify-between gap-2 border-b border-white/10 bg-[#0a0a1a] px-4 pb-3 pt-3">
                <span className="text-sm font-semibold text-gray-300">Graph panels</span>
                <button
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close panels"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/15"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="space-y-4">
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
                    placeholder={
                      activeLayout.id === CURRENT_GRAPH_LAYOUT_ID
                        ? "Name disposition"
                        : activeLayout.name
                    }
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
              <div ref={selectedPanelRef} className="rounded-xl border border-white/10 p-4 scroll-mt-16">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Selected Node</h3>
                <div className="space-y-2">
                  <div><span className="text-xs text-gray-500">Name</span><p className="font-medium">{selectedNode.label}</p></div>
                  <div><span className="text-xs text-gray-500">Type</span><p className="capitalize">{selectedNode.type}</p></div>
                  {selectedNode.direction && <div><span className="text-xs text-gray-500">Direction</span><p className="capitalize">{selectedNode.direction}</p></div>}
                  <div><span className="text-xs text-gray-500">ID</span><p className="text-xs text-gray-400 font-mono break-all">{selectedNode.id}</p></div>
                  {scopeId !== selectedNode.id && (
                    <button
                      onClick={() => setScopeId(selectedNode.id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow-400/15 px-3 py-2 text-sm text-yellow-200 hover:bg-yellow-400/25"
                    >
                      <Route className="h-4 w-4" /> Show only its neighbourhood
                    </button>
                  )}
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
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                Graph Stats
                {/* This panel read "100 Nodes / 100 Relations" against a store of
                    205 and 191 until 2026-09-03, because the page fetched without
                    a limit and took the provider's default page in silence. A
                    count with nothing to compare it to cannot be doubted, which
                    is what made it a lie rather than a number. */}
                {scopeId && <span className="ml-2 font-normal text-yellow-300/80">scoped</span>}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{graph.nodes.length}</p>
                  <p className="text-xs text-gray-500">
                    Nodes
                    {storeTotal !== null && graph.nodes.length < storeTotal && (
                      <span className="text-gray-600"> of {storeTotal}</span>
                    )}
                  </p>
                </div>
                <div><p className="text-2xl font-bold">{graph.links.length}</p><p className="text-xs text-gray-500">Relations</p></div>
                <div><p className="text-2xl font-bold">{ceremoniedCount}</p><p className="text-xs text-gray-500">Ceremonied</p></div>
                <div><p className="text-2xl font-bold">{directionCount}</p><p className="text-xs text-gray-500">Directions</p></div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
