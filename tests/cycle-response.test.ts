import { describe, expect, it } from "vitest";

import {
  extractCycles,
  normalizeMedicineWheelCycle,
} from "../lib/cycle-response";

describe("cycle response normalization", () => {
  it("fills in legacy cycles missing beats", () => {
    expect(
      normalizeMedicineWheelCycle({
        id: "cycle-1",
        research_question: "How do we keep legacy data loadable?",
        current_direction: "north",
        start_date: "2026-06-15T00:00:00.000Z",
        ceremonies_conducted: 2,
        relations_mapped: 4,
        wilson_alignment: 0.75,
        ocap_compliant: true,
      }),
    ).toEqual({
      id: "cycle-1",
      research_question: "How do we keep legacy data loadable?",
      current_direction: "north",
      start_date: "2026-06-15T00:00:00.000Z",
      beats: [],
      ceremonies_conducted: 2,
      relations_mapped: 4,
      wilson_alignment: 0.75,
      ocap_compliant: true,
    });
  });

  it("accepts both bare arrays and cycles envelopes", () => {
    const cycle = {
      id: "cycle-1",
      research_question: "How do we keep legacy data loadable?",
      current_direction: "east",
      start_date: "2026-06-15T00:00:00.000Z",
      beats: ["beat-1"],
      ceremonies_conducted: 1,
      relations_mapped: 1,
      wilson_alignment: 0.5,
      ocap_compliant: false,
      archived: true,
    };

    expect(extractCycles([cycle])).toEqual([cycle]);
    expect(extractCycles({ cycles: [cycle] })).toEqual([cycle]);
  });

  it("drops invalid cycle records and invalid responses", () => {
    expect(extractCycles([{ research_question: "missing id" }])).toEqual([]);
    expect(extractCycles({ count: 0 })).toEqual([]);
    expect(normalizeMedicineWheelCycle(null)).toBeNull();
  });
});
