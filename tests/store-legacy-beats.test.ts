import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { NarrativeBeat } from "../src/ontology-core/src/types";

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;

let tempDir: string;
let getAllBeats: () => NarrativeBeat[];

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-store-legacy-beats-"));

  // A beat recorded before ceremonies/learnings/relations_honored existed.
  fs.writeFileSync(
    path.join(tempDir, "beats.jsonl"),
    `${JSON.stringify({
      id: "beat-legacy",
      direction: "west",
      title: "Before the lists existed",
      description: "Recorded when a beat was only a title",
      timestamp: "2026-06-15T00:00:00.000Z",
      act: 3,
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
  ({ getAllBeats } = await import("../lib/store"));
});

afterAll(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) {
    delete process.env.MW_DATA_DIR;
  } else {
    process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("beats read from a store written before the list fields existed", () => {
  it("hands readers a beat whose lists can be counted", () => {
    const legacy = getAllBeats().find((beat) => beat.id === "beat-legacy");

    expect(legacy).toBeDefined();
    expect(legacy?.learnings).toEqual([]);
    expect(legacy?.ceremonies).toEqual([]);
    expect(legacy?.relations_honored).toEqual([]);
    // Everything the record did carry is still there.
    expect(legacy?.title).toBe("Before the lists existed");
    expect(legacy?.act).toBe(3);
  });
});
