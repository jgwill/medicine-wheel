import type { MWGraphNodePositions } from "@medicine-wheel/graph-viz";

export const GRAPH_LAYOUT_STORE_VERSION = 1;
export const GRAPH_LAYOUT_STORAGE_KEY = "medicine-wheel:graph-layouts:v1";
export const CURRENT_GRAPH_LAYOUT_ID = "current";

export interface GraphLayoutDisposition {
  id: string;
  name: string;
  positions: MWGraphNodePositions;
  updatedAt: string;
  nodeCount: number;
}

export interface GraphLayoutStore {
  version: typeof GRAPH_LAYOUT_STORE_VERSION;
  activeLayoutId: string;
  layouts: GraphLayoutDisposition[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function currentLayout(
  positions: MWGraphNodePositions = {},
  updatedAt: string = nowIso(),
): GraphLayoutDisposition {
  return {
    id: CURRENT_GRAPH_LAYOUT_ID,
    name: "Last positioning",
    positions,
    updatedAt,
    nodeCount: Object.keys(positions).length,
  };
}

function slugLayoutName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || "layout";
}

function layoutIdForName(name: string): string {
  return `layout:${slugLayoutName(name)}`;
}

export function sanitizeGraphPositions(
  positions: unknown,
): MWGraphNodePositions {
  if (!positions || typeof positions !== "object" || Array.isArray(positions)) {
    return {};
  }

  const sanitized: MWGraphNodePositions = {};

  for (const [nodeId, value] of Object.entries(positions)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;

    const x = (value as { x?: unknown }).x;
    const y = (value as { y?: unknown }).y;

    if (typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)) {
      sanitized[nodeId] = {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };
    }
  }

  return sanitized;
}

export function createEmptyGraphLayoutStore(
  updatedAt: string = nowIso(),
): GraphLayoutStore {
  return {
    version: GRAPH_LAYOUT_STORE_VERSION,
    activeLayoutId: CURRENT_GRAPH_LAYOUT_ID,
    layouts: [currentLayout({}, updatedAt)],
  };
}

export function normalizeGraphLayoutStore(value: unknown): GraphLayoutStore {
  const empty = createEmptyGraphLayoutStore();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return empty;
  }

  const candidate = value as {
    version?: unknown;
    activeLayoutId?: unknown;
    layouts?: unknown;
  };

  if (candidate.version !== GRAPH_LAYOUT_STORE_VERSION || !Array.isArray(candidate.layouts)) {
    return empty;
  }

  const layouts = candidate.layouts.flatMap((layout): GraphLayoutDisposition[] => {
    if (!layout || typeof layout !== "object" || Array.isArray(layout)) return [];

    const item = layout as {
      id?: unknown;
      name?: unknown;
      positions?: unknown;
      updatedAt?: unknown;
    };

    if (typeof item.id !== "string" || typeof item.name !== "string") {
      return [];
    }

    const positions = sanitizeGraphPositions(item.positions);

    return [{
      id: item.id,
      name: item.name,
      positions,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : empty.layouts[0].updatedAt,
      nodeCount: Object.keys(positions).length,
    }];
  });

  const withoutDuplicateCurrent = layouts.filter((layout) => layout.id !== CURRENT_GRAPH_LAYOUT_ID);
  const current = layouts.find((layout) => layout.id === CURRENT_GRAPH_LAYOUT_ID) ?? empty.layouts[0];
  const normalizedLayouts = [current, ...withoutDuplicateCurrent];
  const activeLayoutId =
    typeof candidate.activeLayoutId === "string" &&
    normalizedLayouts.some((layout) => layout.id === candidate.activeLayoutId)
      ? candidate.activeLayoutId
      : CURRENT_GRAPH_LAYOUT_ID;

  return {
    version: GRAPH_LAYOUT_STORE_VERSION,
    activeLayoutId,
    layouts: normalizedLayouts,
  };
}

export function parseGraphLayoutStore(raw: string | null): GraphLayoutStore {
  if (!raw) return createEmptyGraphLayoutStore();

  try {
    return normalizeGraphLayoutStore(JSON.parse(raw));
  } catch {
    return createEmptyGraphLayoutStore();
  }
}

export function loadStoredGraphLayoutStore(
  storage: StorageLike | null = safeStorage(),
): GraphLayoutStore {
  if (!storage) return createEmptyGraphLayoutStore();

  try {
    return parseGraphLayoutStore(storage.getItem(GRAPH_LAYOUT_STORAGE_KEY));
  } catch {
    return createEmptyGraphLayoutStore();
  }
}

export function persistGraphLayoutStore(
  store: GraphLayoutStore,
  storage: StorageLike | null = safeStorage(),
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(GRAPH_LAYOUT_STORAGE_KEY, JSON.stringify(normalizeGraphLayoutStore(store)));
    return true;
  } catch {
    return false;
  }
}

export function getActiveGraphLayout(
  store: GraphLayoutStore,
): GraphLayoutDisposition {
  return (
    store.layouts.find((layout) => layout.id === store.activeLayoutId) ??
    store.layouts.find((layout) => layout.id === CURRENT_GRAPH_LAYOUT_ID) ??
    currentLayout()
  );
}

export function upsertCurrentGraphLayout(
  store: GraphLayoutStore,
  positions: MWGraphNodePositions,
  updatedAt: string = nowIso(),
): GraphLayoutStore {
  const current = currentLayout(sanitizeGraphPositions(positions), updatedAt);
  const savedLayouts = store.layouts.filter((layout) => layout.id !== CURRENT_GRAPH_LAYOUT_ID);

  return {
    version: GRAPH_LAYOUT_STORE_VERSION,
    activeLayoutId: CURRENT_GRAPH_LAYOUT_ID,
    layouts: [current, ...savedLayouts],
  };
}

export function saveNamedGraphLayout(
  store: GraphLayoutStore,
  name: string,
  positions: MWGraphNodePositions,
  updatedAt: string = nowIso(),
): GraphLayoutStore {
  const trimmedName = name.trim() || "Untitled disposition";
  const id = layoutIdForName(trimmedName);
  const sanitized = sanitizeGraphPositions(positions);
  const namedLayout: GraphLayoutDisposition = {
    id,
    name: trimmedName,
    positions: sanitized,
    updatedAt,
    nodeCount: Object.keys(sanitized).length,
  };

  const current =
    store.layouts.find((layout) => layout.id === CURRENT_GRAPH_LAYOUT_ID) ??
    currentLayout(sanitized, updatedAt);
  const savedLayouts = store.layouts.filter(
    (layout) => layout.id !== CURRENT_GRAPH_LAYOUT_ID && layout.id !== id,
  );

  return {
    version: GRAPH_LAYOUT_STORE_VERSION,
    activeLayoutId: id,
    layouts: [current, namedLayout, ...savedLayouts],
  };
}

export function selectGraphLayout(
  store: GraphLayoutStore,
  layoutId: string,
): GraphLayoutStore {
  const activeLayoutId = store.layouts.some((layout) => layout.id === layoutId)
    ? layoutId
    : CURRENT_GRAPH_LAYOUT_ID;

  return {
    ...store,
    activeLayoutId,
  };
}
