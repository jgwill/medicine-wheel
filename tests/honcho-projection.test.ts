/**
 * The river — a wheel with HONCHO_URL set projects every stored beat,
 * ceremony and diary entry into Honcho on write, in the background, without
 * changing what it answers its own caller.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => await import("../src/storage-provider/src/index"));
vi.mock("@medicine-wheel/ceremonial-diary", async () => await import("../src/ceremonial-diary/src/index"));
vi.mock("@medicine-wheel/honcho", async () => await import("../src/honcho/src/index"));

const ORIGINAL = { MW_DATA_DIR: process.env.MW_DATA_DIR, HONCHO_URL: process.env.HONCHO_URL, HONCHO_WORKSPACE_ID: process.env.HONCHO_WORKSPACE_ID };
const originalFetch = globalThis.fetch;
let tempDir: string;
type Hit = { method: string; path: string; body?: any };
let hits: Hit[];

function stubHoncho(opts: { down?: boolean } = {}) {
  hits = [];
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    if (opts.down) throw new Error("ECONNREFUSED");
    const u = new URL(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    hits.push({ method: (init?.method ?? "GET").toUpperCase(), path: u.pathname, body });
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
    if (u.pathname.endsWith("/messages")) return json(body.messages.map((m: any, i: number) => ({ id: `m${i}`, ...m })), 201);
    return json({ id: body?.id ?? "x" });
  }) as typeof fetch;
}

// One store for the whole file: `@/lib/store` binds its JSONL directory on
// first import, so a directory swapped per test leaves it locking a path
// that no longer exists.
beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-honcho-river-"));
  process.env.MW_DATA_DIR = tempDir;
  delete process.env.MW_STORAGE_PROVIDER;
});
afterAll(() => {
  if (ORIGINAL.MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR; else process.env.MW_DATA_DIR = ORIGINAL.MW_DATA_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  process.env.HONCHO_URL = "http://honcho.test";
  process.env.HONCHO_WORKSPACE_ID = "wheel-test";
  stubHoncho();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const k of ["HONCHO_URL", "HONCHO_WORKSPACE_ID"] as const) { const v = ORIGINAL[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
});

const routes = {
  ceremonies: () => import("../app/api/ceremonies/route"),
  "narrative/beats": () => import("../app/api/narrative/beats/route"),
  diary: () => import("../app/api/diary/route"),
};
const post = async (route: keyof typeof routes, body: unknown) => {
  const mod = await routes[route]();
  const res = await mod.POST(new Request(`http://wheel/api/${route}`, { method: "POST", body: JSON.stringify(body) }));
  return res;
};
const messagesSent = () => hits.filter((h) => h.path.endsWith("/messages")).flatMap((h) => h.body.messages);

describe("the river: wheel → Honcho on write", () => {
  it("a stored ceremony, then a beat inside it, then a diary entry, all reach one Honcho session", async () => {
    const { awaitProjections } = await import("../lib/honcho-projection");
    const c = await post("ceremonies", { type: "talking_circle", direction: "east", participants: ["node:human:1:gui"], medicines_used: ["cedar"], intentions: ["hold the practice"] });
    expect(c.status).toBe(201);
    const { ceremony } = await c.json();
    const b = await post("narrative/beats", { direction: "east", title: "Guillaume speaks", description: "A daily practice is hard to hold.", learnings: ["small steps"], ceremonies: [ceremony.id], speaker: "node:human:1:gui" });
    expect(b.status).toBe(201);
    const beat = await b.json();
    const d = await post("diary", { participant: "node:human:1:gui", phase: "ningwaab", entryType: "reflection", content: "I keep starting over.", ceremony_id: ceremony.id });
    expect(d.status).toBe(201);
    const { entry } = await d.json();

    await awaitProjections();
    const sessions = new Set(hits.filter((h) => h.path.endsWith("/messages")).map((h) => h.path));
    expect(sessions.size).toBe(1);
    expect([...sessions][0]).toBe(`/v3/workspaces/wheel-test/sessions/${ceremony.id.replace(/[^a-zA-Z0-9_-]+/g, "-")}/messages`);
    const sent = messagesSent();
    expect(sent.map((m: any) => m.metadata.wheel_kind)).toEqual(["ceremony", "beat", "diary"]);
    expect(sent.map((m: any) => m.metadata.wheel_id)).toEqual([ceremony.id, beat.id, entry.id]);
    expect(sent[1].peer_id).toBe("node-human-1-gui");
    expect(sent[2].content).toContain("[ningwaab · reflection] I keep starting over.");
    expect(hits.some((h) => h.path === "/v3/workspaces/wheel-test/peers" && h.body.metadata.wheel_id === "node:human:1:gui")).toBe(true);
  });

  it("with HONCHO_URL unset nothing leaves, and health says so", async () => {
    delete process.env.HONCHO_URL;
    const { awaitProjections } = await import("../lib/honcho-projection");
    const b = await post("narrative/beats", { direction: "south", title: "Quiet", description: "No river today.", learnings: [] });
    expect(b.status).toBe(201);
    await awaitProjections();
    expect(hits).toEqual([]);
    const { GET } = await import("../app/api/health/route");
    const health = await (await GET()).json();
    expect(health.honcho).toEqual({ enabled: false });
  });

  it("a Honcho that is down changes nothing about the wheel's answer, and is reported once", async () => {
    stubHoncho({ down: true });
    const { awaitProjections } = await import("../lib/honcho-projection");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const b = await post("narrative/beats", { direction: "west", title: "Alone", description: "Honcho is unreachable.", learnings: [] });
    expect(b.status).toBe(201);
    const beat = await b.json();
    await awaitProjections();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(String(errors.mock.calls[0][0])).toContain(`beat ${beat.id}`);
    expect(String(errors.mock.calls[0][0])).toContain("ECONNREFUSED");
    errors.mockRestore();
    const { GET } = await import("../app/api/health/route");
    const health = await (await GET()).json();
    expect(health.honcho).toEqual({ enabled: true, url: "http://honcho.test", workspace: "wheel-test" });
  });
});
