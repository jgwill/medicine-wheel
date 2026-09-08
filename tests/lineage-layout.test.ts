/**
 * `applyLineageLayout` — the chronicle as a spine, x is time.
 *
 * The wheel answers "what direction is this?" and cannot answer "what came
 * before this?", because a circle has no before. This layout does, and it is
 * only honest because `occurred_at` exists: before the backfill, 0 of 84
 * episodes carried an occurrence date and twelve May episodes shared one
 * September `created_at` from a single import batch. Drawn on that, a timeline
 * stacks four months on one pixel and looks correct.
 *
 * @see src/graph-viz/src/lineage-layout.ts
 */

import { describe, expect, it } from "vitest";
import { applyLineageLayout } from "../src/graph-viz/src/lineage-layout";
import type { MWGraphNode } from "../src/graph-viz/src/types";

function node(
  id: string,
  occurred?: string,
  created?: string,
  direction?: "east" | "south" | "west" | "north",
): MWGraphNode {
  return {
    id,
    label: id,
    type: "knowledge",
    direction,
    metadata: {
      ...(occurred ? { occurred_at: occurred } : {}),
      ...(created ? { created_at: created } : {}),
    },
  };
}

describe("applyLineageLayout", () => {
  it("orders by when things happened, not when the wheel learned of them", () => {
    // The exact shape the backfill fixed: episode 001 happened in May and was
    // registered in September, after episodes that happened later.
    const data = {
      nodes: [
        node("ep-346", "2026-08-31", "2026-09-03", "north"),
        node("ep-001", "2026-05-04", "2026-09-02", "north"),
        node("ep-012", "2026-05-12", "2026-09-02", "north"),
      ],
      links: [],
    };

    const out = applyLineageLayout(data);
    const order = out.nodes.map((n) => n.id);

    expect(order).toEqual(["ep-001", "ep-012", "ep-346"]);
    // Registration order would have been the reverse of the first two, and by
    // created_at alone all three sit within one day of each other.
    expect(out.nodes[0].x!).toBeLessThan(out.nodes[2].x!);
    expect(out.span).toEqual({ from: "2026-05-04", to: "2026-08-31" });
    expect(out.undated).toEqual([]);
  });

  it("falls back to created_at and names which nodes it had to", () => {
    const data = {
      nodes: [
        node("dated", "2026-05-04", "2026-09-02", "east"),
        node("undated", undefined, "2026-06-01", "east"),
      ],
      links: [],
    };

    const out = applyLineageLayout(data);

    // Placed, not dropped — but the caller is told, so it can say "registration
    // order" rather than presenting it as history.
    expect(out.nodes).toHaveLength(2);
    expect(out.undated).toEqual(["undated"]);
  });

  it("puts each direction in its own band", () => {
    const data = {
      nodes: [
        node("e", "2026-05-01", undefined, "east"),
        node("s", "2026-05-02", undefined, "south"),
        node("w", "2026-05-03", undefined, "west"),
        node("n", "2026-05-04", undefined, "north"),
        node("none", "2026-05-05"),
      ],
      links: [],
    };

    const out = applyLineageLayout(data);
    const y = (id: string) => out.nodes.find((n) => n.id === id)!.y!;

    // Bands are ordered and distinct; a node with no direction gets its own.
    expect(y("e")).toBeLessThan(y("s"));
    expect(y("s")).toBeLessThan(y("w"));
    expect(y("w")).toBeLessThan(y("n"));
    expect(y("n")).toBeLessThan(y("none"));
  });

  it("is deterministic — the same graph lays out identically twice", () => {
    // A saved disposition is meaningless if positions move between renders, so
    // the stagger is positional rather than random.
    const data = {
      nodes: [
        node("a", "2026-05-04", undefined, "north"),
        node("b", "2026-05-04", undefined, "north"),
        node("c", "2026-05-04", undefined, "north"),
      ],
      links: [],
    };

    const first = applyLineageLayout(data);
    const second = applyLineageLayout(data);

    expect(second.nodes.map((n) => [n.id, n.x, n.y])).toEqual(
      first.nodes.map((n) => [n.id, n.x, n.y]),
    );
    // Same day, same band — the stagger must still separate them.
    const ys = new Set(first.nodes.map((n) => n.y));
    expect(ys.size).toBeGreaterThan(1);
  });

  it("does not mutate the input, so switching layouts is reversible", () => {
    // applyWheelLayout mutates in place; a caller toggling between the two
    // needs the wheel's positions to survive the round trip.
    const original = node("a", "2026-05-04", undefined, "north");
    const data = { nodes: [original], links: [] };

    applyLineageLayout(data);

    expect(original.x).toBeUndefined();
    expect(original.y).toBeUndefined();
  });

  it("widens the canvas with the corpus rather than crushing it", () => {
    const few = applyLineageLayout({
      nodes: Array.from({ length: 5 }, (_, i) => node(`n${i}`, `2026-05-0${i + 1}`)),
      links: [],
    });
    const many = applyLineageLayout({
      nodes: Array.from({ length: 200 }, (_, i) =>
        node(`n${i}`, `2026-05-${String((i % 28) + 1).padStart(2, "0")}`),
      ),
      links: [],
    });

    expect(many.width).toBeGreaterThan(few.width);
  });
});
