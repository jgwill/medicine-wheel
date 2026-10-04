/**
 * Reading an episode's lineage from the wheel's relations.
 *
 * What these tests hold, in order of what would mislead a reader most:
 *
 *  1. **A relation reads from where you stand.** `549 continues_from 045` is
 *     "continues from" on 549 and "continued by" on 045 — never the raw type
 *     on both, which says 045 continues 549.
 *  2. **A relation woven both ways is one relation**, keeping both sets of
 *     words, not the same neighbour listed twice.
 *  3. **The chronicle's order is the folders' order** — date, then number —
 *     not when the wheel learned of an episode.
 *
 * @see lib/episode-lineage.ts
 */

import { describe, expect, it } from "vitest";
import {
  chronicleKey,
  episodeDateOf,
  episodeFolderOfNode,
  lineageEdges,
  readEdge,
  relationsOf,
  type LineageEdge,
} from "../lib/episode-lineage";

const E549 = "chronicle:2026-09-30-episode-549-a-milestone-into-a-circle";
const E045 = "chronicle:2026-06-05-episode-045-the-decomposition-loop";
const E550 = "chronicle:2026-10-01-episode-550-the-screenwalk";
const ROOT = "chronicle:miadi-chronicle";

function edge(from: string, to: string, type: string, description?: string): LineageEdge {
  return { id: `${from}:${type}:${to}`, from_id: from, to_id: to, relationship_type: type, description };
}

describe("a relation reads from where you stand", () => {
  it("continues from on one end, continued by on the other", () => {
    const e = edge(E549, E045, "continues_from");
    expect(readEdge(E549, e)).toEqual({ other: E045, label: "continues from" });
    expect(readEdge(E045, e)).toEqual({ other: E549, label: "continued by" });
  });

  it("reads both spellings the chronicle wheel holds the same way", () => {
    expect(readEdge(E549, edge(E549, E045, "continues-from"))?.label).toBe("continues from");
  });

  it("relates to reads the same from either end", () => {
    const e = edge(E549, E550, "relates_to");
    expect(readEdge(E549, e)?.label).toBe("relates to");
    expect(readEdge(E550, e)?.label).toBe("relates to");
  });

  it("keeps an unnamed type's own words, with an arrow for the way it was written", () => {
    const e = edge(E549, E550, "separates-practice-from");
    expect(readEdge(E549, e)?.label).toBe("→ separates practice from");
    expect(readEdge(E550, e)?.label).toBe("← separates practice from");
  });

  it("ignores an edge that does not touch the episode, and a loop on it", () => {
    expect(readEdge(E549, edge(E045, E550, "relates_to"))).toBeNull();
    expect(readEdge(E549, edge(E549, E549, "relates_to"))).toBeNull();
  });
});

describe("relations of one episode", () => {
  it("merges a relation woven both ways and keeps both sets of words", () => {
    const relations = relationsOf(E549, [
      edge(E549, E550, "relates_to", "549 opened the circle 550 filmed."),
      edge(E550, E549, "relates_to", "550 is the screenwalk of 549's circle."),
    ]);
    expect(relations).toHaveLength(1);
    expect(relations[0].descriptions).toEqual([
      "549 opened the circle 550 filmed.",
      "550 is the screenwalk of 549's circle.",
    ]);
    expect(relations[0].edgeIds).toHaveLength(2);
  });

  it("keeps two different readings of one pair as two relations", () => {
    const relations = relationsOf(E549, [
      edge(E549, E045, "continues_from"),
      edge(E549, E045, "relates_to"),
    ]);
    expect(relations.map((r) => r.label)).toEqual(["continues from", "relates to"]);
  });

  it("puts what it continues from first, then what continues it, then what it relates to", () => {
    const relations = relationsOf(E549, [
      edge(E549, E550, "relates_to"),
      edge(E550, E549, "continues_from"),
      edge(E549, E045, "continues_from"),
      edge(E549, "review:abc", "discusses"),
    ]);
    expect(relations.map((r) => r.label)).toEqual([
      "continues from",
      "continued by",
      "relates to",
      "→ discusses",
    ]);
  });

  it("lineage keeps episode↔episode relations and leaves the chronicle root and reviews out", () => {
    const isEpisode = (id: string) => id.startsWith("chronicle:") && id !== ROOT;
    const kept = lineageEdges(
      [edge(E549, E045, "continues_from"), edge(E549, ROOT, "belongs_to"), edge(E549, "review:abc", "discusses")],
      isEpisode,
    );
    expect(kept.map((e) => e.to_id)).toEqual([E045]);
  });
});

describe("where an episode sits in the chronicle", () => {
  it("takes the folder from the id, or from the node's own reference", () => {
    expect(episodeFolderOfNode({ id: E549 })).toBe(E549.slice("chronicle:".length));
    expect(
      episodeFolderOfNode({
        id: "0cdb9158-b4bc-4f86-8733-1c5255995af5",
        metadata: { root: "MIADI_CHRONICLE_ROOT", relative_path: "2026-07-18-episode-141-herdr/episode.yaml" },
      }),
    ).toBe("2026-07-18-episode-141-herdr");
    expect(episodeFolderOfNode({ id: "x", metadata: { root: "HOME", relative_path: "a/b" } })).toBeNull();
  });

  it("orders by the folder's date, then its number — not by registration", () => {
    const later = { id: "chronicle:2026-10-03-episode-1000-two-repositories", created_at: "2026-01-01T00:00:00Z" };
    const earlier = { id: E550, created_at: "2026-12-01T00:00:00Z" };
    const sameDay99 = { id: "chronicle:2026-10-01-episode-099-a" };
    expect([later, earlier, sameDay99].sort((a, b) => chronicleKey(a).localeCompare(chronicleKey(b))).map((n) => n.id))
      .toEqual([sameDay99.id, E550, later.id]);
    expect(episodeDateOf(later)).toBe("2026-10-03");
  });
});
