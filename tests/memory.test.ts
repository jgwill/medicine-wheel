import { describe, expect, it } from "vitest";
import {
  createMemory,
  excerptAround,
  isEmptyScope,
  matchRecords,
  queryTerms,
  resolveReach,
  type CeremonyRef,
  type MemoryProvider,
  type MemoryRecord,
  type MemoryWheel,
} from "../src/memory/src/index";

const ceremonies: CeremonyRef[] = [
  { id: "c-pde", subject_id: "pde:root-1", circle_id: null, participants: ["node:human:1:mia"] },
  { id: "c-circle-about-pde", subject_id: "pde:root-1", circle_id: "circle:a", participants: [] },
  { id: "c-circle-a", circle_id: "circle:a", participants: [] },
  { id: "c-circle-a-close", circle_id: "circle:a", closes: "c-circle-a", participants: [] },
  { id: "c-circle-b", circle_id: "circle:b", participants: ["node:human:2:gui"] },
  { id: "c-ep", episode_path: "2026-09-30-episode-360-memory", participants: [] },
  { id: "c-review", subject_id: "review:9", participants: [] },
];
const seats = [{ person_id: "node:human:3:miette", circle_id: "circle:b" }];

describe("resolveReach (#149 W2, W10, W11, W13)", () => {
  it("combines fields as a union, and each field takes one value or a list", () => {
    const r = resolveReach({ subject_id: "pde:root-1", circle_id: ["circle:b"], episode_path: "2026-09-30-episode-360-memory" }, ceremonies);
    expect(r.ceremonies.sort()).toEqual(["c-circle-about-pde", "c-circle-b", "c-ep", "c-pde"]);
    expect(r.episodes).toEqual(["2026-09-30-episode-360-memory"]);
  });

  it("reaches the closing record of a ceremony it reaches", () => {
    expect(resolveReach({ ceremonies: ["c-circle-a"] }, ceremonies).ceremonies.sort()).toEqual(["c-circle-a", "c-circle-a-close"]);
  });

  it("leaves out a named ceremony the wheel does not hold", () => {
    expect(resolveReach({ ceremonies: ["c-review", "ghost"] }, ceremonies).ceremonies).toEqual(["c-review"]);
  });

  it("excludes last, so a PDE's own ceremony is not its own answer, and a circle about it stays", () => {
    const r = resolveReach({ subject_id: "pde:root-1", exclude_ceremonies: ["c-pde"] }, ceremonies);
    expect(r.ceremonies).toEqual(["c-circle-about-pde"]);
    expect(resolveReach({ ceremonies: ["c-pde"], exclude_ceremonies: ["c-pde"] }, ceremonies).ceremonies).toEqual([]);
  });

  it("reaches where a person was seated: a participant, or a member of the ceremony's circle", () => {
    expect(resolveReach({ participant: "node:human:1:mia" }, ceremonies).ceremonies).toEqual(["c-pde"]);
    expect(resolveReach({ participant: "node:human:3:miette" }, ceremonies, seats).ceremonies).toEqual(["c-circle-b"]);
  });

  it("an empty scope reaches nothing: the whole wheel is never the default", () => {
    expect(isEmptyScope({})).toBe(true);
    expect(isEmptyScope({ exclude_ceremonies: ["c-pde"] })).toBe(true);
    expect(isEmptyScope({ circle_id: [] })).toBe(true);
    expect(isEmptyScope({ participant: "x" })).toBe(false);
    expect(resolveReach({}, ceremonies).ceremonies).toEqual([]);
  });
});

const records: MemoryRecord[] = [
  { wheel_kind: "beat", wheel_id: "beat:1", ceremony_id: "c-circle-a", speaker: "node:human:1:mia", text: "[east] Mia speaks\nThe lantern is painted teal, and the circle meets at dawn.", at: "2026-09-30T10:00:00Z" },
  { wheel_kind: "diary", wheel_id: "diary:1", ceremony_id: "c-circle-a", speaker: "node:human:2:gui", text: "I asked whether the lantern colour was decided.", at: "2026-09-30T11:00:00Z" },
  { wheel_kind: "ceremony", wheel_id: "c-circle-a", ceremony_id: "c-circle-a", speaker: "medicine-wheel", text: "Ceremony: talking_circle (east)\nParticipants: node:human:1:mia, node:human:2:gui", at: "2026-09-30T09:00:00Z" },
];

describe("matchRecords (#149 W4)", () => {
  it("drops stopwords and short words, folds accents", () => {
    expect(queryTerms("What colour is the Lanterne élevée?")).toEqual(["colour", "lanterne", "elevee"]);
  });

  it("scores by distinct terms, ties go to the more recent, records with no term are left out", () => {
    const out = matchRecords("lantern colour", records);
    expect(out.map((s) => s.wheel_id)).toEqual(["diary:1", "beat:1"]);
    expect(out[0]).toMatchObject({ provider: "wheel", wheel_kind: "diary", ceremony_id: "c-circle-a", speaker: "node:human:2:gui" });
    expect(matchRecords("the and of", records)).toEqual([]);
  });

  it("gives an excerpt around the first term it finds", () => {
    const long = `${"x ".repeat(300)}the lantern is teal ${"y ".repeat(300)}`;
    const e = excerptAround(long, ["lantern"], 60);
    expect(e).toContain("lantern");
    expect(e.startsWith("…")).toBe(true);
    expect(e.endsWith("…")).toBe(true);
  });
});

function wheel(): MemoryWheel & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    ceremonies: async () => ceremonies,
    seats: async () => seats,
    records: async (reach) => {
      asked.push(`records:${reach.ceremonies.sort().join(",")}`);
      return records.filter((r) => r.ceremony_id && reach.ceremonies.includes(r.ceremony_id));
    },
    names: async (ids) => Object.fromEntries(ids.flatMap((id) => (id === "node:human:1:mia" ? [[id, "Mia"]] : id === "node:human:2:gui" ? [[id, "Guillaume"]] : []))),
    kinds: async (ids) => {
      const known: Record<string, "person" | "agent" | "wheel"> = { "node:human:1:mia": "agent", "node:human:2:gui": "person", "medicine-wheel": "wheel" };
      return Object.fromEntries(ids.filter((id) => known[id]).map((id) => [id, known[id]]));
    },
  };
}

const provider = (over: Partial<MemoryProvider> = {}): MemoryProvider => ({
  name: "stub",
  status: async () => ({ provider: "stub", enabled: true, confined: true }),
  ask: async (q) => ({
    provider: "stub",
    mode: "dialectic",
    answer: `node:human:1:mia said teal (${q.reach.ceremonies.length} ceremonies)`,
    sources: [{ provider: "stub", wheel_kind: "beat", wheel_id: "beat:1", ceremony_id: "c-circle-a", speaker: "node:human:1:mia", excerpt: "The lantern is painted teal" }],
  }),
  search: async () => ({ provider: "stub", mode: "search", sources: [] }),
  ...over,
});

describe("createMemory (#149 W1, W5, W12)", () => {
  it("answers empty and asks nothing when the scope reaches nothing", async () => {
    const w = wheel();
    const out = await createMemory({ wheel: w, providers: [provider()] }).ask({ question: "anything?", scope: { exclude_ceremonies: ["c-pde"] } });
    expect(out).toMatchObject({ mode: "empty", sources: [], reach: { ceremonies: [] } });
    expect(w.asked).toEqual([]);
  });

  it("takes the provider's answer, adds the wheel's own matches after it, one source per record, each naming its provider", async () => {
    const out = await createMemory({ wheel: wheel(), providers: [provider()] }).ask({ question: "lantern colour", scope: { circle_id: "circle:a" } });
    expect(out.provider).toBe("stub");
    expect(out.mode).toBe("dialectic");
    expect(out.reach.ceremonies.sort()).toEqual(["c-circle-a", "c-circle-a-close", "c-circle-about-pde"]);
    expect(out.sources.map((s) => [s.provider, s.wheel_id])).toEqual([["stub", "beat:1"], ["wheel", "diary:1"]]);
  });

  it("says whose words each source holds, from the wheel (#152)", async () => {
    const out = await createMemory({ wheel: wheel() }).search({ query: "lantern colour participants", scope: { circle_id: "circle:a" } });
    const kinds = Object.fromEntries(out.sources.map((s) => [s.wheel_id, s.speaker_kind]));
    expect(kinds).toEqual({ "diary:1": "person", "beat:1": "agent", "c-circle-a": "wheel" });
    const { kinds: _drop, ...without } = wheel();
    const bare = await createMemory({ wheel: without as MemoryWheel }).search({ query: "lantern", scope: { circle_id: "circle:a" } });
    expect(bare.sources.every((s) => s.speaker_kind === undefined)).toBe(true);
  });

  it("names people in the answer, the excerpts and the speakers", async () => {
    const out = await createMemory({ wheel: wheel(), providers: [provider()] }).ask({ question: "lantern", scope: { circle_id: "circle:a" } });
    expect(out.answer).toBe("Mia said teal (3 ceremonies)");
    expect(out.sources[0].speaker_name).toBe("Mia");
    const listed = await createMemory({ wheel: wheel() }).search({ query: "participants talking circle", scope: { ceremonies: "c-circle-a" } });
    expect(listed.sources[0].excerpt).toContain("Participants: Mia, Guillaume");
  });

  it("falls back to the wheel's own records when every provider fails, and says why", async () => {
    const out = await createMemory({ wheel: wheel(), providers: [provider({ ask: async () => { throw new Error("honcho unreachable"); } })] }).ask({ question: "lantern colour", scope: { circle_id: "circle:a" } });
    expect(out).toMatchObject({ provider: "wheel", mode: "matched" });
    expect(out.note).toContain("honcho unreachable");
    expect(out.sources.map((s) => s.wheel_id)).toEqual(["diary:1", "beat:1"]);
    const none = await createMemory({ wheel: wheel() }).ask({ question: "lantern", scope: { circle_id: "circle:a" } });
    expect(none.note).toContain("No memory provider is configured");
  });

  it("about keeps, from the wheel's own records, only what that person said, most recent first without a question", async () => {
    const out = await createMemory({ wheel: wheel() }).about({ person: "node:human:2:gui", scope: { circle_id: "circle:a" } });
    expect(out.sources.map((s) => s.wheel_id)).toEqual(["diary:1"]);
    expect(out.sources[0].speaker_name).toBe("Guillaume");
  });

  it("status lists every provider, a failing one included, and the wheel's own match", async () => {
    const { providers } = await createMemory({ wheel: wheel(), providers: [provider({ status: async () => { throw new Error("down"); } })] }).status();
    expect(providers).toEqual([
      { provider: "stub", enabled: false, error: "down" },
      { provider: "wheel", enabled: true, confined: true, detail: { mode: "matched" } },
    ]);
  });
});
