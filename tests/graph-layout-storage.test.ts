import { describe, expect, it } from "vitest";

import {
  CURRENT_GRAPH_LAYOUT_ID,
  GRAPH_LAYOUT_STORE_VERSION,
  getActiveGraphLayout,
  normalizeGraphLayoutStore,
  parseGraphLayoutStore,
  saveNamedGraphLayout,
  selectGraphLayout,
  sanitizeGraphPositions,
  upsertActiveGraphLayout,
  upsertCurrentGraphLayout,
} from "../lib/graph-layout-storage";

describe("graph layout storage", () => {
  it("falls back to an empty current disposition for invalid storage", () => {
    const parsed = parseGraphLayoutStore("{bad json");

    expect(parsed.version).toBe(GRAPH_LAYOUT_STORE_VERSION);
    expect(parsed.activeLayoutId).toBe(CURRENT_GRAPH_LAYOUT_ID);
    expect(parsed.layouts).toHaveLength(1);
    expect(parsed.layouts[0].positions).toEqual({});
  });

  it("keeps only finite x/y coordinate pairs", () => {
    expect(
      sanitizeGraphPositions({
        east: { x: 10.123, y: 20.987 },
        badX: { x: Number.NaN, y: 10 },
        badY: { x: 10, y: "20" },
        nope: null,
      }),
    ).toEqual({
      east: { x: 10.12, y: 20.99 },
    });
  });

  it("autosaves the current positioning as the active disposition", () => {
    const store = normalizeGraphLayoutStore({
      version: GRAPH_LAYOUT_STORE_VERSION,
      activeLayoutId: "layout:circle",
      layouts: [
        {
          id: "layout:circle",
          name: "Circle",
          positions: { a: { x: 1, y: 2 } },
          updatedAt: "2026-06-11T00:00:00.000Z",
        },
      ],
    });

    const updated = upsertCurrentGraphLayout(
      store,
      { b: { x: 3, y: 4 } },
      "2026-06-11T01:00:00.000Z",
    );

    expect(updated.activeLayoutId).toBe(CURRENT_GRAPH_LAYOUT_ID);
    expect(getActiveGraphLayout(updated).positions).toEqual({ b: { x: 3, y: 4 } });
    expect(updated.layouts.find((layout) => layout.id === "layout:circle")).toBeDefined();
  });

  it("saves, overwrites, and selects named dispositions by name", () => {
    const first = saveNamedGraphLayout(
      upsertCurrentGraphLayout(
        parseGraphLayoutStore(null),
        { nodeA: { x: 1, y: 2 } },
        "2026-06-11T00:00:00.000Z",
      ),
      "Council Layout",
      { nodeA: { x: 1, y: 2 } },
      "2026-06-11T00:01:00.000Z",
    );

    const second = saveNamedGraphLayout(
      first,
      "Council Layout",
      { nodeA: { x: 5, y: 8 } },
      "2026-06-11T00:02:00.000Z",
    );

    const namedLayouts = second.layouts.filter((layout) => layout.id !== CURRENT_GRAPH_LAYOUT_ID);
    expect(namedLayouts).toHaveLength(1);
    expect(second.activeLayoutId).toBe("layout:council-layout");
    expect(getActiveGraphLayout(second).positions).toEqual({ nodeA: { x: 5, y: 8 } });

    const selectedCurrent = selectGraphLayout(second, CURRENT_GRAPH_LAYOUT_ID);
    expect(getActiveGraphLayout(selectedCurrent).id).toBe(CURRENT_GRAPH_LAYOUT_ID);
  });

  it("merges dragged positions into the active named disposition without dropping prior nodes", () => {
    const saved = saveNamedGraphLayout(
      upsertCurrentGraphLayout(
        parseGraphLayoutStore(null),
        {
          nodeA: { x: 10, y: 20 },
          nodeB: { x: 30, y: 40 },
        },
        "2026-06-11T00:00:00.000Z",
      ),
      "Council Layout",
      {
        nodeA: { x: 10, y: 20 },
        nodeB: { x: 30, y: 40 },
      },
      "2026-06-11T00:01:00.000Z",
    );

    const updated = upsertActiveGraphLayout(
      saved,
      { nodeB: { x: 90, y: 120 } },
      "2026-06-11T00:02:00.000Z",
    );

    expect(updated.activeLayoutId).toBe("layout:council-layout");
    expect(getActiveGraphLayout(updated).positions).toEqual({
      nodeA: { x: 10, y: 20 },
      nodeB: { x: 90, y: 120 },
    });
  });
});
