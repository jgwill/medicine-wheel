/**
 * The lineage web — which episodes a view shows, where they sit, how arcs run.
 *
 * What these tests hold, in order of what would mislead a reader most:
 *
 *  1. **A search keeps a match's relatives.** Searching "044" on the chronicle
 *     drew one dot while episode 044's page listed three relations
 *     (jgwill/medicine-wheel#162). The relatives stay, marked as related.
 *  2. **No arc leaves the canvas**, even between two bands, and the two kinds
 *     bow to opposite sides.
 *  3. **Long and short arcs rise to different heights**, so the relations of
 *     one band do not stack into one line along the top edge.
 *
 * @see src/graph-viz/src/lineage-web.ts
 */

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_LINEAGE_VIEW,
  fitZoom,
  layoutLineageWeb,
  lineageWebWidth,
  relationsAround,
  stepAlongSpine,
  zoomScrollLeft,
  lineageArcPath,
  lineageNeighbourhood,
  threadChains,
  visibleLineage,
  type LineageWebEdge,
  type LineageWebEpisode,
  type LineageWebView,
} from "../src/graph-viz/src/lineage-web";
import { LineageWeb } from "../src/graph-viz/src/LineageWeb";

const ep = (id: string, direction = "east", date?: string, thread?: string): LineageWebEpisode => ({
  id,
  label: id,
  direction,
  date,
  thread,
});
const cont = (from: string, to: string): LineageWebEdge => ({ from, to, kind: "continuation" });
const rel = (from: string, to: string): LineageWebEdge => ({ from, to, kind: "relation" });

// Episode 044 on disk: it continues from 001, relates to 040 and 552; 039 and 045 name it.
const EPISODES = ["001", "039", "040", "044", "045", "100", "552"].map((id) => ep(id));
const EDGES = [cont("044", "001"), rel("044", "040"), rel("044", "552"), rel("039", "044"), cont("045", "044"), rel("100", "039")];
const view = (patch: Partial<LineageWebView> = {}): LineageWebView => ({ ...DEFAULT_LINEAGE_VIEW, ...patch });

describe("a search keeps a match's relatives", () => {
  it("shows the match and every episode one relation away, either direction", () => {
    const v = visibleLineage(EPISODES, EDGES, { view: view(), matches: new Set(["044"]) });
    expect(v.episodes.map((e) => e.id)).toEqual(["001", "039", "040", "044", "045", "552"]);
    expect([...v.found!]).toEqual(["044"]);
    expect(v.edges).toHaveLength(5);
  });

  it("reaches two relations away at depth 2", () => {
    const v = visibleLineage(EPISODES, EDGES, { view: view({ depth: 2 }), matches: new Set(["044"]) });
    expect(v.episodes.map((e) => e.id)).toContain("100");
  });

  it("fades instead of hiding when asked", () => {
    const v = visibleLineage(EPISODES, EDGES, { view: view(), matches: new Set(["044"]), matchMode: "fade" });
    expect(v.episodes).toHaveLength(EPISODES.length);
    expect(v.found).toBeNull();
    expect(v.faded.has("100")).toBe(true);
    expect(v.faded.has("044")).toBe(false);
  });

  it("a relation to an episode not on the list adds nothing", () => {
    const v = visibleLineage(EPISODES.filter((e) => e.id !== "552"), EDGES, { view: view(), matches: new Set(["044"]) });
    expect(v.episodes.map((e) => e.id)).not.toContain("552");
    expect(v.edges.every((e) => e.to !== "552")).toBe(true);
  });
});

describe("view options", () => {
  it("around the selected episode keeps its relatives only", () => {
    const v = visibleLineage(EPISODES, EDGES, { view: view({ scope: "around" }), focus: "039" });
    expect(v.episodes.map((e) => e.id)).toEqual(["039", "044", "100"]);
  });

  it("around with nothing selected shows the whole chronicle", () => {
    expect(visibleLineage(EPISODES, EDGES, { view: view({ scope: "around" }) }).episodes).toHaveLength(EPISODES.length);
  });

  it("a kind turned off is neither drawn nor walked", () => {
    const v = visibleLineage(EPISODES, EDGES, {
      view: view({ kinds: { continuation: false, relation: true } }),
      matches: new Set(["044"]),
    });
    expect(v.edges.every((e) => e.kind === "relation")).toBe(true);
    expect(v.episodes.map((e) => e.id)).toEqual(["039", "040", "044", "552"]);
  });

  it("neighbourhood ignores self-relations and includes its seeds", () => {
    expect([...lineageNeighbourhood(["100"], [...EDGES, rel("100", "100")], 1)].sort()).toEqual(["039", "100"]);
  });

  it("threads chain consecutive episodes of one thread", () => {
    const eps = [ep("a", "east", undefined, "t"), ep("b", "east"), ep("c", "east", undefined, "t")];
    expect(threadChains(eps)).toEqual([{ from: "a", to: "c", thread: "t" }]);
  });
});

describe("layout", () => {
  it("spreads episodes across the canvas, each in its band, months marked", () => {
    const eps = [ep("a", "east", "2026-05-04"), ep("b", "north", "2026-05-20"), ep("c", "mystery", "2026-06-01")];
    const l = layoutLineageWeb(eps);
    expect(l.width).toBe(960);
    expect(l.positions.get("a")!.x).toBe(64);
    expect(l.positions.get("c")!.x).toBe(960 - 40);
    expect(l.positions.get("b")!.y).toBe(l.bandY.north - 14);
    expect(l.positions.get("c")!.y).toBe(l.bandY.south + 60 - 14);
    expect(l.months).toEqual([
      { x: 64, label: "2026-05" },
      { x: 960 - 40, label: "2026-06" },
    ]);
  });

  it("widens the canvas when episodes would crowd", () => {
    const many = Array.from({ length: 200 }, (_, i) => ep(String(i)));
    expect(layoutLineageWeb(many).width).toBe(64 + 40 + 199 * 19);
  });
});

/** Extreme y of the quadratic in a path `M ax ay Q cx cy bx by`. */
function extremeY(d: string): number {
  const [, ay, , cy, , by] = d.replace(/[MQ]/g, "").trim().split(/\s+/).map(Number);
  const denom = ay - 2 * cy + by;
  const t = denom === 0 ? 0.5 : Math.min(1, Math.max(0, (ay - cy) / denom));
  return (1 - t) ** 2 * ay + 2 * t * (1 - t) * cy + t ** 2 * by;
}

describe("arcs", () => {
  const eps = Array.from({ length: 120 }, (_, i) => ep(String(i), i % 2 ? "north" : "east"));
  const l = layoutLineageWeb(eps);
  const at = (id: string) => l.positions.get(id)!;

  it("continuation bows above, relation below", () => {
    const a = at("0");
    const b = at("40");
    expect(extremeY(lineageArcPath(a, b, "continuation", l))).toBeLessThan(Math.min(a.y, b.y));
    expect(extremeY(lineageArcPath(a, b, "relation", l))).toBeGreaterThan(Math.max(a.y, b.y));
  });

  it("no arc leaves the canvas, within a band or across bands", () => {
    for (const [x, y] of [["0", "118"], ["0", "119"], ["1", "119"], ["0", "2"]]) {
      for (const kind of ["continuation", "relation"] as const) {
        const top = extremeY(lineageArcPath(at(x), at(y), kind, l));
        expect(top).toBeGreaterThanOrEqual(5.9);
        expect(top).toBeLessThanOrEqual(l.height - l.config.axis - 5.9);
      }
    }
  });

  it("a longer relation rises higher than a shorter one", () => {
    const short = extremeY(lineageArcPath(at("0"), at("4"), "continuation", l));
    const long = extremeY(lineageArcPath(at("0"), at("60"), "continuation", l));
    expect(long).toBeLessThan(short);
  });
});

describe("<LineageWeb>", () => {
  it("draws a found episode filled and its relatives as rings", () => {
    const html = renderToStaticMarkup(
      createElement(LineageWeb, { episodes: EPISODES, edges: EDGES, matches: new Set(["044"]) }),
    );
    expect(html).toContain("1 found · 5 related · 5 relations");
    expect((html.match(/<circle r="4.5" fill="none"/g) ?? []).length).toBe(5);
    expect((html.match(/<circle r="4" fill=/g) ?? []).length).toBe(1);
    expect((html.match(/data-edge/g) ?? []).length).toBe(5); // one hit target per arc, beside the arc it lights
  });

  it("without a search, every episode and relation", () => {
    const html = renderToStaticMarkup(createElement(LineageWeb, { episodes: EPISODES, edges: EDGES, controls: false }));
    expect(html).not.toContain("toolbar");
    expect(html).toContain("7 episodes · 6 relations");
  });
});

describe("moving through the web by hand (#163)", () => {
  it("width grows with zoom and never falls under the box", () => {
    expect(lineageWebWidth(201, 1, 1100)).toBe(64 + 40 + 200 * 19);
    expect(lineageWebWidth(201, 2, 1100)).toBe(64 + 40 + 400 * 19);
    expect(lineageWebWidth(7, 1, 1100)).toBe(1100);
  });

  it("fit puts the whole span in the box", () => {
    const z = fitZoom(201, 1100);
    expect(lineageWebWidth(201, z, 1100)).toBeCloseTo(1100, 6);
  });

  it("zoom keeps the moment under the pointer in place", () => {
    const oldWidth = lineageWebWidth(201, 1, 1100);
    const newWidth = lineageWebWidth(201, 2, 1100);
    const left = zoomScrollLeft(500, 300, oldWidth, newWidth);
    const before = (500 + 300 - 64) / (oldWidth - 104);
    const after = (left + 300 - 64) / (newWidth - 104);
    expect(after).toBeCloseTo(before, 9);
    expect(zoomScrollLeft(0, 0, newWidth, oldWidth)).toBeGreaterThanOrEqual(0);
  });

  it("steps along the spine and stops at its ends", () => {
    const order = ["a", "b", "c"];
    expect(stepAlongSpine(order, null, 1)).toBe("a");
    expect(stepAlongSpine(order, null, -1)).toBe("c");
    expect(stepAlongSpine(order, "b", 1)).toBe("c");
    expect(stepAlongSpine(order, "c", 1)).toBe("c");
    expect(stepAlongSpine(order, "a", -1)).toBe("a");
    expect(stepAlongSpine([], "a", 1)).toBeNull();
  });

  it("an episode's relations in the order their other ends sit on the spine", () => {
    const order = EPISODES.map((e) => e.id);
    expect(relationsAround("044", EDGES, order).map((e) => (e.from === "044" ? e.to : e.from))).toEqual([
      "001", "039", "040", "045", "552",
    ]);
    expect(relationsAround("100", [...EDGES, rel("100", "100")], order)).toHaveLength(1);
  });
});
