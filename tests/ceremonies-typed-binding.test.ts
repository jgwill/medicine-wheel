import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => {
  return await import("../src/storage-provider/src/index");
});

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
const ORIGINAL_MW_STORAGE_PROVIDER = process.env.MW_STORAGE_PROVIDER;
let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-ceremonies-typed-"));
  process.env.MW_DATA_DIR = tempDir;
  delete process.env.MW_STORAGE_PROVIDER;
});

afterEach(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  if (ORIGINAL_MW_STORAGE_PROVIDER === undefined) delete process.env.MW_STORAGE_PROVIDER;
  else process.env.MW_STORAGE_PROVIDER = ORIGINAL_MW_STORAGE_PROVIDER;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

const EP = "2026-09-17-episode-349-miadi-conducts-a-ceremony-its-circle-can-enter";

async function post(body: unknown) {
  const { POST } = await import("../app/api/ceremonies/route");
  return POST(new Request("http://wheel/api/ceremonies", { method: "POST", body: JSON.stringify(body) }));
}

async function get(qs = "") {
  const { GET } = await import("../app/api/ceremonies/route");
  return GET(new Request(`http://wheel/api/ceremonies${qs}`));
}

describe("ceremonies: typed episode binding, closing and circle (0.14.0)", () => {
  it("stores episode_path typed, derives episode_number, and filters on it", async () => {
    const res = await post({ type: "opening", direction: "east", intentions: ["x"], episode_path: EP, source: "test" });
    expect(res.status).toBe(201);
    const { ceremony } = await res.json();
    expect(ceremony.episode_path).toBe(EP);
    expect(ceremony.episode_number).toBe(349);
    expect(ceremony.source).toBe("test");

    const list = await (await get(`?episode_path=${EP}`)).json();
    expect(list.matched).toBe(1);
    expect(list.ceremonies[0].id).toBe(ceremony.id);
  });

  it("lifts the legacy JSON binding in research_context into the typed field", async () => {
    const res = await post({
      type: "opening",
      direction: "east",
      research_context: JSON.stringify({ episode_path: EP, episode_number: 349, source: "gmtermux:1" }),
    });
    const { ceremony } = await res.json();
    expect(ceremony.episode_path).toBe(EP);
    expect(ceremony.episode_number).toBe(349);
    const list = await (await get(`?episode_path=${EP}`)).json();
    expect(list.matched).toBe(1);
  });

  it("refuses an episode_path that is not an episode directory name", async () => {
    const res = await post({ type: "opening", direction: "east", episode_path: "../etc/passwd" });
    expect(res.status).toBe(400);
  });

  it("a closing names its opening in `closes`, and the opening is found by ?closes=", async () => {
    const opening = (await (await post({ type: "opening", direction: "east" })).json()).ceremony;
    const missing = await post({ type: "closing", direction: "east", closes: "nope" });
    expect(missing.status).toBe(404);
    const closing = (await (await post({ type: "closing", direction: "east", closes: opening.id })).json()).ceremony;
    expect(closing.closes).toBe(opening.id);
    const list = await (await get(`?closes=${opening.id}`)).json();
    expect(list.matched).toBe(1);
    expect(list.ceremonies[0].id).toBe(closing.id);
  });

  it("a ceremony held in a circle needs the circle node to exist", async () => {
    const refused = await post({ type: "talking_circle", direction: "south", circle_id: "circle:none" });
    expect(refused.status).toBe(404);
    const { createProvider } = await import("../src/storage-provider/src/index");
    const store = await createProvider();
    const now = new Date().toISOString();
    await store.createNode({ id: "circle:1", name: "c", type: "circle", metadata: { kind: "circle" }, created_at: now, updated_at: now } as any);
    const held = await post({ type: "talking_circle", direction: "south", circle_id: "circle:1" });
    expect(held.status).toBe(201);
    const list = await (await get(`?circle_id=circle:1`)).json();
    expect(list.matched).toBe(1);
  });
});
