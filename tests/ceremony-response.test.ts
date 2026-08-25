import { describe, expect, it } from "vitest";

import {
  ceremonyBelongsToEpisode,
  ceremonyEpisodePath,
  extractCeremonyLogs,
  normalizeCeremonyLog,
} from "../lib/ceremony-response";

const ceremony = {
  id: "ceremony-1",
  type: "opening",
  direction: "east",
  participants: ["Mia"],
  medicines_used: ["tobacco"],
  intentions: ["begin well"],
  timestamp: "2026-06-11T00:00:00.000Z",
};

describe("ceremony response normalization", () => {
  it("accepts the current API envelope", () => {
    expect(
      extractCeremonyLogs({
        ceremonies: [ceremony],
        provider: "jsonl",
        count: 1,
      }),
    ).toEqual([ceremony]);
  });

  it("keeps compatibility with the legacy bare array shape", () => {
    expect(extractCeremonyLogs([ceremony])).toEqual([ceremony]);
  });

  it("falls back to an empty list for invalid responses", () => {
    expect(extractCeremonyLogs({ count: 0 })).toEqual([]);
    expect(extractCeremonyLogs(null)).toEqual([]);
  });

  it("fills in legacy ceremonies missing their list fields", () => {
    const [repaired] = extractCeremonyLogs([
      { id: "ceremony-legacy", type: "smudging", direction: "north", timestamp: "2026-06-11T00:00:00.000Z" },
    ]);

    expect(repaired.participants).toEqual([]);
    expect(repaired.medicines_used).toEqual([]);
    expect(repaired.intentions).toEqual([]);
    expect(repaired.direction).toBe("north");
  });

  it("gives a ceremony with no readable direction or timestamp something to render", () => {
    const repaired = normalizeCeremonyLog({ id: "ceremony-bare", type: "opening" });

    expect(repaired?.direction).toBe("east");
    expect(repaired?.timestamp).toBe(new Date(0).toISOString());
  });

  it("drops records that carry no identity", () => {
    expect(extractCeremonyLogs([{ type: "opening" }, null, "not-a-ceremony"])).toEqual([]);
    expect(normalizeCeremonyLog(null)).toBeNull();
  });

  it("reads canonical and legacy episode membership from research context", () => {
    expect(ceremonyEpisodePath({
      research_context: JSON.stringify({ episode_path: "episode-339" }),
    })).toBe("episode-339");
    expect(ceremonyEpisodePath({
      research_context: JSON.stringify({ episodePath: "episode-legacy" }),
    })).toBe("episode-legacy");
    expect(ceremonyBelongsToEpisode({
      research_context: JSON.stringify({ episode_path: "episode-339" }),
    }, "episode-339")).toBe(true);
  });

  it("does not infer membership from malformed or unrelated context", () => {
    expect(ceremonyEpisodePath({ research_context: "not-json" })).toBeUndefined();
    expect(ceremonyEpisodePath({ research_context: JSON.stringify({ source: "elsewhere" }) })).toBeUndefined();
    expect(ceremonyBelongsToEpisode(ceremony, "episode-339")).toBe(false);
  });
});
