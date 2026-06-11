import { describe, expect, it } from "vitest";

import { extractCeremonyLogs } from "../lib/ceremony-response";

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
});
