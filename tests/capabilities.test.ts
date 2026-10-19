/**
 * @medicine-wheel/capabilities — the 55-word limit, the attribution every row
 * carries, and capabilities given by more than one provider.
 *
 * Spec: rispecs/developer-suite/repository-mapping/capabilities.spec.md
 */

import { describe, expect, it } from "vitest";

import {
  CapabilityFacetSchema,
  STATEMENT_WORD_LIMIT,
  StatementSchema,
  capabilityClaims,
  capabilityNodeId,
  checkStatement,
  countWords,
  findSharedCapabilities,
} from "../src/capabilities/src/index";

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

const capability = {
  nodeId: "capability:draw-a-specification",
  name: "Draw a specification",
  statement: "Behaviour, data and usage drawn beside a RISE spec.",
  status: "clear",
  providedBy: ["repository:jgwill/smcraft"],
  statedBy: "claude-opus-5-5",
  statedAt: "2026-10-18T22:00:00Z",
  grounding: ["llms-rise-framework.txt, Drawn Specifications"],
  revision: "pending",
};

describe("the word limit", () => {
  it("counts tokens holding a letter or digit, so a dash is not a word and a hyphenated word is one", () => {
    expect(countWords("A state-machine — drawn, then run.")).toBe(5);
    expect(countWords("   ")).toBe(0);
  });

  it("fits at 55 words and not at 56", () => {
    expect(STATEMENT_WORD_LIMIT).toBe(55);
    expect(checkStatement(words(55))).toEqual({ words: 55, limit: 55, fits: true });
    expect(checkStatement(words(56)).fits).toBe(false);
    expect(checkStatement("").fits).toBe(false);
  });

  it("tells an over-long writer to record needs-resolution and move on", () => {
    const parsed = StatementSchema.safeParse(words(56));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toMatch(/56 words, the limit is 55: record the row as needs-resolution/);
  });
});

describe("CapabilityFacetSchema", () => {
  it("accepts a clear, pending, grounded capability", () => {
    expect(CapabilityFacetSchema.safeParse(capability).success).toBe(true);
  });

  it("requires the statement of a clear or unclear row, not of an undefinable one", () => {
    const { statement: _statement, ...bare } = capability;
    expect(CapabilityFacetSchema.safeParse(bare).success).toBe(false);
    expect(CapabilityFacetSchema.safeParse({ ...bare, status: "unclear" }).success).toBe(false);
    expect(CapabilityFacetSchema.safeParse({ ...bare, status: "undefinable" }).success).toBe(true);
    expect(CapabilityFacetSchema.safeParse({ ...bare, status: "needs-resolution" }).success).toBe(true);
  });

  it("refuses a row with no evidence read", () => {
    expect(CapabilityFacetSchema.safeParse({ ...capability, grounding: [] }).success).toBe(false);
  });

  it("refuses an affirmed or revised row that names nobody", () => {
    const affirmed = CapabilityFacetSchema.safeParse({ ...capability, revision: "affirmed" });
    expect(affirmed.success).toBe(false);
    expect(affirmed.error?.issues.map((i) => i.path.join("."))).toEqual(["revisedBy", "revisedAt"]);
    expect(
      CapabilityFacetSchema.safeParse({
        ...capability,
        revision: "affirmed",
        revisedBy: "Guillaume",
        revisedAt: "2026-10-19T09:00:00-04:00",
      }).success,
    ).toBe(true);
  });

  it("refuses an unknown key, which in a model-written row is usually a misspelling", () => {
    expect(CapabilityFacetSchema.safeParse({ ...capability, statment: "typo" }).success).toBe(false);
  });

  it("refuses an id that is not capability:<kebab-case>", () => {
    expect(CapabilityFacetSchema.safeParse({ ...capability, nodeId: "capability:Draw_Spec" }).success).toBe(false);
    expect(() => capabilityNodeId("Draw Spec")).toThrow(/kebab-case/);
    expect(capabilityNodeId("draw-a-specification")).toBe("capability:draw-a-specification");
  });
});

describe("findSharedCapabilities", () => {
  it("names a capability two providers give, each provider once, sorted", () => {
    const shared = findSharedCapabilities([
      { capability: "capability:b", provider: "repository:x/two" },
      { capability: "capability:b", provider: "repository:x/one", via: "feature:x/one#a" },
      { capability: "capability:b", provider: "repository:x/one", via: "feature:x/one#b" },
      { capability: "capability:a", provider: "repository:x/one" },
    ]);
    expect(shared).toEqual([{ capability: "capability:b", providers: ["repository:x/one", "repository:x/two"] }]);
  });

  it("reads the claims a capability makes through its own providedBy", () => {
    expect(capabilityClaims([{ ...capability, status: "clear", revision: "pending" } as never])).toEqual([
      { capability: "capability:draw-a-specification", provider: "repository:jgwill/smcraft" },
    ]);
  });
});
