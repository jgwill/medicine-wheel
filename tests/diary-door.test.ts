import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => {
  return await import("../src/storage-provider/src/index");
});
vi.mock("@medicine-wheel/ceremonial-diary", async () => {
  return await import("../src/ceremonial-diary/src/index");
});

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-diary-door-"));
  process.env.MW_DATA_DIR = tempDir;
  delete process.env.MW_STORAGE_PROVIDER;
});

afterEach(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function post(body: unknown) {
  const { POST } = await import("../app/api/diary/route");
  return POST(new Request("http://wheel/api/diary", { method: "POST", body: JSON.stringify(body) }));
}
async function get(qs = "") {
  const { GET } = await import("../app/api/diary/route");
  return GET(new Request(`http://wheel/api/diary${qs}`));
}

describe("the ceremonial diary door (0.14.0)", () => {
  it("writes an entry, reads it back by participant and by ceremony", async () => {
    const { createProvider } = await import("../src/storage-provider/src/index");
    const store = await createProvider();
    await store.logCeremony({ id: "cer-1", type: "opening", direction: "east", participants: [], medicines_used: [], intentions: [], timestamp: new Date().toISOString() } as any);

    const created = await post({ participant: "Guillaume", phase: "miigwechiwendam", entryType: "intention", content: "I come to listen.", ceremony_id: "cer-1" });
    expect(created.status).toBe(201);
    const { entry } = await created.json();
    expect(entry.metadata.ceremony_id).toBe("cer-1");

    const byParticipant = await (await get("?participant=Guillaume")).json();
    expect(byParticipant.count).toBe(1);
    const byCeremony = await (await get("?ceremony_id=cer-1")).json();
    expect(byCeremony.matched).toBe(1);
    const none = await (await get("?ceremony_id=cer-2")).json();
    expect(none.matched).toBe(0);

    const { GET: getOne, DELETE: del } = await import("../app/api/diary/[id]/route");
    const one = await getOne(new Request("http://wheel"), { params: Promise.resolve({ id: entry.id }) });
    expect(one.status).toBe(200);
    const gone = await del(new Request("http://wheel"), { params: Promise.resolve({ id: entry.id }) });
    expect(gone.status).toBe(200);
    expect((await (await get("?participant=Guillaume")).json()).count).toBe(0);
  });

  it("refuses an unknown phase, entryType, or ceremony", async () => {
    expect((await post({ participant: "g", phase: "nope", entryType: "intention", content: "x" })).status).toBe(400);
    expect((await post({ participant: "g", phase: "migwech", entryType: "nope", content: "x" })).status).toBe(400);
    expect((await post({ participant: "g", phase: "migwech", entryType: "reflection", content: "x", ceremony_id: "ghost" })).status).toBe(404);
  });
});
