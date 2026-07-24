import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JsonlStore } from "../lib/jsonl-store";

let tempDir: string;
let store: JsonlStore;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-jsonl-store-"));
  store = new JsonlStore(tempDir);
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function node(id: string) {
  const now = new Date().toISOString();
  return { id, type: "human", name: id, created_at: now, updated_at: now };
}

function edge(from_id: string, to_id: string) {
  return {
    from_id,
    to_id,
    relationship_type: "mentorship",
    strength: 0.5,
    ceremony_honored: false,
    obligations: [],
    created_at: new Date().toISOString(),
  };
}

describe("malformed lines", () => {
  it("sets an unparseable line aside instead of erasing it on the next write", () => {
    const nodesFile = path.join(tempDir, "nodes.jsonl");
    const halfWritten = '{"id":"elder-2","type":"human","na';
    fs.writeFileSync(
      nodesFile,
      `${JSON.stringify(node("elder-1"))}\n${halfWritten}\n`,
      "utf-8",
    );

    store.createNode(node("elder-3") as never);

    // The rewrite drops the line it could not parse…
    expect(fs.readFileSync(nodesFile, "utf-8")).not.toContain(halfWritten);
    // …but it survives in the sidecar rather than vanishing.
    expect(fs.readFileSync(`${nodesFile}.quarantine`, "utf-8")).toContain(halfWritten);
    // The records that were readable are all still there.
    expect(store.getAllNodes().map((n) => n.id).sort()).toEqual(["elder-1", "elder-3"]);
  });
});

describe("edge identity", () => {
  it("keeps two relations apart when their ids carry the key delimiter", () => {
    store.createEdge(edge("memory:1775381859564", "e2e") as never);
    store.createEdge(edge("memory", "1775381859564:e2e") as never);

    const stored = store.edges.getAll();
    expect(stored).toHaveLength(2);
    expect(stored.map((e) => e.from_id).sort()).toEqual(["memory", "memory:1775381859564"]);
  });
});

describe("write lock", () => {
  it("releases its own lock once the write lands", () => {
    store.createNode(node("elder-1") as never);

    expect(fs.existsSync(path.join(tempDir, "nodes.jsonl.lock"))).toBe(false);
  });

  it("refuses to reap a lock whose owner is still alive, and says so", () => {
    const lockPath = path.join(tempDir, "nodes.jsonl.lock");
    const tenMinutesAgo = new Date(Date.now() - 600_000);
    fs.writeFileSync(
      lockPath,
      JSON.stringify({
        token: "another-writer",
        pid: process.pid, // alive by definition — this test is that process
        created_at: tenMinutesAgo.toISOString(),
      }),
      "utf-8",
    );
    fs.utimesSync(lockPath, tenMinutesAgo, tenMinutesAgo);

    expect(() => store.createNode(node("elder-1") as never)).toThrow(
      /Failed to acquire write lock/,
    );
    // The living writer still holds it: age alone must not hand it away.
    expect(fs.existsSync(lockPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(lockPath, "utf-8")).token).toBe("another-writer");
  });
});
