/**
 * `/api/edges` keeps the words a relation was woven with (#150). Before, the
 * create and patch schemas stripped `description` and every caller's text was
 * lost at the door.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => {
  return await import("../src/storage-provider/src/index");
});

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
let tempDir: string;
let edges: typeof import("../app/api/edges/route");

const send = async (method: "POST" | "PATCH", body: unknown) => {
  const request = new Request("http://wheel.test/api/edges", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const res = method === "POST" ? await edges.POST(request) : await edges.PATCH(request);
  return { status: res.status, body: await res.json() };
};

const listed = async () => {
  const res = await edges.GET(new Request("http://wheel.test/api/edges?limit=all"));
  return (await res.json()) as Array<{ from_id: string; to_id: string; description?: string }>;
};

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-edges-description-"));
  process.env.MW_DATA_DIR = tempDir;
  const nodes = await import("../app/api/nodes/route");
  edges = await import("../app/api/edges/route");
  for (const [id, name] of [["chronicle:ep-549", "Episode 549"], ["chronicle:ep-045", "Episode 045"], ["chronicle:ep-039", "Episode 039"]]) {
    const res = await nodes.POST(new Request("http://wheel.test/api/nodes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, name, type: "knowledge" }) }));
    expect(res.status).toBeLessThan(300);
  }
});

afterAll(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("/api/edges description", () => {
  it("POST keeps the description and GET returns it", async () => {
    const made = await send("POST", {
      from_id: "chronicle:ep-549",
      to_id: "chronicle:ep-045",
      relationship_type: "relates_to",
      description: "549 carries the loop 045 specified into a talking circle",
    });
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    expect(made.body.edge.description).toBe("549 carries the loop 045 specified into a talking circle");

    const edge = (await listed()).find((e) => e.from_id === "chronicle:ep-549" && e.to_id === "chronicle:ep-045");
    expect(edge?.description).toBe("549 carries the loop 045 specified into a talking circle");
  });

  it("PATCH writes a description onto a relation woven without one", async () => {
    const made = await send("POST", { from_id: "chronicle:ep-039", to_id: "chronicle:ep-045", relationship_type: "relates_to" });
    expect(made.status).toBe(201);
    expect(made.body.edge.description).toBeUndefined();

    const patched = await send("PATCH", { from_id: "chronicle:ep-039", to_id: "chronicle:ep-045", description: "the chalkboard signature every book inherits" });
    expect(patched.status, JSON.stringify(patched.body)).toBe(200);
    expect(patched.body.edge.description).toBe("the chalkboard signature every book inherits");
    expect(patched.body.edge.relationship_type).toBe("relates_to");
  });
});
