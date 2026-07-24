import { describe, expect, it } from "vitest";

import { extractBeats, normalizeNarrativeBeat } from "../lib/beat-response";

const beat = {
  id: "beat-1",
  direction: "east",
  title: "Vision Quest Beginning",
  description: "Initial visioning for the research journey",
  ceremonies: [],
  learnings: ["Relational accountability starts with listening"],
  timestamp: "2026-06-15T00:00:00.000Z",
  act: 1,
  relations_honored: [],
};

describe("beat response normalization", () => {
  it("fills in legacy beats missing their list fields", () => {
    const repaired = normalizeNarrativeBeat({
      id: "beat-legacy",
      direction: "west",
      title: "Before the lists existed",
      description: "Recorded when a beat was only a title",
      timestamp: "2026-06-15T00:00:00.000Z",
      act: 3,
    });

    expect(repaired?.ceremonies).toEqual([]);
    expect(repaired?.learnings).toEqual([]);
    expect(repaired?.relations_honored).toEqual([]);
  });

  it("keeps provenance fields it does not know about", () => {
    const repaired = normalizeNarrativeBeat({
      ...beat,
      origin: { producer: "narrative-cluster", source_ref: "cluster-7" },
      sub_beats: ["beat-2"],
      some_field_added_later: "kept",
    }) as unknown as Record<string, unknown>;

    expect(repaired.origin).toEqual({ producer: "narrative-cluster", source_ref: "cluster-7" });
    expect(repaired.sub_beats).toEqual(["beat-2"]);
    expect(repaired.some_field_added_later).toBe("kept");
  });

  it("gives a beat with no readable direction or timestamp something to render", () => {
    const repaired = normalizeNarrativeBeat({ id: "beat-bare" });

    expect(repaired?.direction).toBe("east");
    expect(repaired?.timestamp).toBe(new Date(0).toISOString());
  });

  it("accepts both bare arrays and beats envelopes", () => {
    expect(extractBeats([beat])).toEqual([beat]);
    expect(extractBeats({ beats: [beat] })).toEqual([beat]);
  });

  it("drops records that carry no identity", () => {
    expect(extractBeats([{ title: "missing id" }, null, "not-a-beat"])).toEqual([]);
    expect(extractBeats({ count: 0 })).toEqual([]);
    expect(normalizeNarrativeBeat(null)).toBeNull();
  });
});
