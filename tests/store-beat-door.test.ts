import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { NarrativeBeat } from "../src/ontology-core/src/types";

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;

let tempDir: string;
let storeApi: typeof import("../lib/store");

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-store-beat-door-"));

  // A beat whose provenance predates this session — its origin must survive
  // updates that do not state a new one.
  fs.writeFileSync(
    path.join(tempDir, "beats.jsonl"),
    `${JSON.stringify({
      id: "beat:west:kept",
      direction: "west",
      title: "Holds its first producer",
      description: "Stamped at creation",
      timestamp: "2026-07-01T00:00:00.000Z",
      act: 3,
      ceremonies: [],
      learnings: ["provenance is a record, not a default"],
      relations_honored: ["the author"],
      origin: { producer: "chronicle-episode", source_ref: "ep-000" },
    })}\n`,
    "utf-8",
  );
  // One node keeps the demo seed (which runs on import) from filling the store.
  fs.writeFileSync(
    path.join(tempDir, "nodes.jsonl"),
    `${JSON.stringify({
      id: "node-1",
      type: "human",
      name: "Elder Sarah",
      created_at: "2026-06-15T00:00:00.000Z",
      updated_at: "2026-06-15T00:00:00.000Z",
    })}\n`,
    "utf-8",
  );

  process.env.MW_DATA_DIR = tempDir;
  storeApi = await import("../lib/store");
});

afterAll(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) {
    delete process.env.MW_DATA_DIR;
  } else {
    process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("the authoring door on the server store", () => {
  it("rejects an act that contradicts the direction instead of storing it", () => {
    expect(() =>
      storeApi.createBeat({
        direction: "west",
        title: "A west beat claiming act 1",
        description: "The contradiction the form used to allow",
        ceremonies: [],
        learnings: ["x"],
        relations_honored: ["y"],
        act: 1,
      }),
    ).toThrow(/act 1 contradicts the west direction/);
  });

  it("derives the act when none is supplied", () => {
    const { beat } = storeApi.createBeat({
      direction: "north",
      title: "Act comes from the wheel",
      description: "derived, never chosen",
      ceremonies: [],
      learnings: ["x"],
      relations_honored: ["y"],
    });
    expect(beat.act).toBe(4);
  });

  it("returns the door's advisory findings instead of discarding them", () => {
    const { warnings } = storeApi.createBeat({
      direction: "east",
      title: "Carries events but no knowledge",
      description: "no learnings, no relations",
      ceremonies: [],
      learnings: [],
      relations_honored: [],
    });
    expect(warnings.some((w) => w.includes("no learnings recorded"))).toBe(true);
    expect(warnings.some((w) => w.includes("no relations honored"))).toBe(true);
  });

  it("preserves origin on an update that does not state a new one", () => {
    const { beat } = storeApi.createBeat({
      id: "beat:west:kept",
      direction: "west",
      title: "Holds its first producer",
      description: "Amended without a stated origin",
      ceremonies: [],
      learnings: ["provenance is a record, not a default"],
      relations_honored: ["the author"],
    });
    expect(beat.origin?.producer).toBe("chronicle-episode");
    expect(beat.origin?.source_ref).toBe("ep-000");
  });

  it("reciprocates the child side when a parent names sub_beats", () => {
    const { beat: child } = storeApi.createBeat({
      direction: "south",
      title: "A child not yet claimed",
      description: "exists before the parent names it",
      ceremonies: [],
      learnings: ["x"],
      relations_honored: ["y"],
    });

    const { beat: parent } = storeApi.createBeat({
      direction: "south",
      title: "A parent naming its child",
      description: "the one-sided link, closed",
      ceremonies: [],
      learnings: ["x"],
      relations_honored: ["y"],
      sub_beats: [child.id],
    } as Omit<NarrativeBeat, "id" | "timestamp" | "act">);

    const reread = storeApi.getAllBeats().find((b) => b.id === child.id);
    expect(parent.sub_beats).toContain(child.id);
    expect(reread?.parent_beat_id).toBe(parent.id);
  });
});
