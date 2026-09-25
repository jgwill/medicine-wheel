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

function stubHoncho(opts: { down?: boolean; refuse?: number } = {}) {
  hits = [];
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    if (opts.down) throw new Error("ECONNREFUSED");
    if (opts.refuse) return new Response(JSON.stringify({ detail: "no" }), { status: opts.refuse });
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
  fs.rmSync(path.join(tempDir, "honcho-pending.jsonl"), { force: true });
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

  it("a projection that cannot even be shaped is reported, never raised at the writer", async () => {
    // Paid for on 2026-09-19 against the real chronicle: an importer sent
    // `learnings` as a string. The beat was created and written to disk, then
    // `projectBeat` threw building the message — evaluated in the route's own
    // argument list, outside the fire-and-forget boundary — and the caller was
    // told 500 about a beat the wheel was holding. Shaping runs inside the
    // boundary now, so no defect in it can reach the writer.
    const { projectAfterWrite, awaitProjections } = await import("../lib/honcho-projection");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => projectAfterWrite({ kind: "beat", id: "b-1" }, () => { throw new Error("cannot shape this record"); })).not.toThrow();
    await awaitProjections();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(String(errors.mock.calls[0][0])).toContain("beat b-1");
    expect(String(errors.mock.calls[0][0])).toContain("cannot shape this record");
    expect(messagesSent()).toEqual([]);
    // Shaping it again would fail the same way: it is not queued.
    const { listPending } = await import("../lib/honcho-projection");
    expect(listPending()).toEqual([]);
    errors.mockRestore();
  });

  it("a list field that arrives as a string is stored, answered 201, and projected as one item", async () => {
    const { awaitProjections } = await import("../lib/honcho-projection");
    const b = await post("narrative/beats", { direction: "south", title: "One learning", description: "A caller sent a bare string.", learnings: "small steps" as unknown as string[] });
    expect(b.status).toBe(201);
    await awaitProjections();
    expect(messagesSent()[0].content).toContain("Learnings: small steps");
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
    expect(health.honcho).toEqual({ enabled: true, url: "http://honcho.test", workspace: "wheel-test", pending: 1 });
  });
});

const pendingPath = () => path.join(tempDir, "honcho-pending.jsonl");

describe("the pending ledger: a record Honcho could not take waits for it (#147)", () => {
  it("a turn spoken while Honcho is down waits on the ledger, and arrives when Honcho is back", async () => {
    const { awaitProjections, listPending, retryPending } = await import("../lib/honcho-projection");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    stubHoncho({ down: true });
    const c = await post("ceremonies", { type: "talking_circle", direction: "south", participants: ["node:human:2:wil"] });
    const { ceremony } = await c.json();
    const b = await post("narrative/beats", { direction: "south", title: "William speaks", description: "Spoken while Honcho was away.", learnings: [], ceremonies: [ceremony.id], speaker: "node:human:2:wil" });
    const beat = await b.json();
    const d = await post("diary", { participant: "node:human:2:wil", phase: "nindoodam", entryType: "reflection", content: "Still here.", ceremony_id: ceremony.id });
    const { entry } = await d.json();
    await awaitProjections();

    expect(String(errors.mock.calls[1][0])).toContain("waiting to be sent again (2 pending)");
    expect(listPending().map((p) => [p.kind, p.id])).toEqual([["ceremony", ceremony.id], ["beat", beat.id], ["diary", entry.id]]);
    // Only the reference waits; the words stay in the wheel.
    expect(fs.readFileSync(pendingPath(), "utf-8")).not.toContain("Spoken while Honcho was away");

    // Still down: the pass stops at the first record and keeps them all.
    expect(await retryPending()).toEqual({ sent: 0, dropped: 0, pending: 3 });

    stubHoncho();
    expect(await retryPending()).toEqual({ sent: 3, dropped: 0, pending: 0 });
    expect(messagesSent().map((m: any) => m.metadata.wheel_id)).toEqual([ceremony.id, beat.id, entry.id]);
    expect(messagesSent()[1].content).toContain("Spoken while Honcho was away.");
    // An empty ledger is no file.
    expect(fs.existsSync(pendingPath())).toBe(false);
    const { GET } = await import("../app/api/health/route");
    expect((await (await GET()).json()).honcho.pending).toBe(0);
    errors.mockRestore();
    logs.mockRestore();
  });

  it("a projection that gets through carries what waited behind it", async () => {
    const { awaitProjections, listPending } = await import("../lib/honcho-projection");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    stubHoncho({ down: true });
    const first = await (await post("narrative/beats", { direction: "west", title: "First", description: "While away.", learnings: [] })).json();
    await awaitProjections();
    expect(listPending()).toHaveLength(1);

    stubHoncho();
    const second = await (await post("narrative/beats", { direction: "west", title: "Second", description: "Honcho is back.", learnings: [] })).json();
    await awaitProjections();
    expect(messagesSent().map((m: any) => m.metadata.wheel_id)).toEqual([second.id, first.id]);
    expect(listPending()).toEqual([]);
    errors.mockRestore();
    logs.mockRestore();
  });

  it("a refusal is reported and not queued; a record the wheel no longer holds is dropped", async () => {
    const { awaitProjections, listPending, markPending, retryPending } = await import("../lib/honcho-projection");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    stubHoncho({ refuse: 422 });
    await post("narrative/beats", { direction: "north", title: "Refused", description: "Honcho says no.", learnings: [] });
    await awaitProjections();
    expect(String(errors.mock.calls[0][0])).toContain("honcho 422");
    expect(listPending()).toEqual([]);

    stubHoncho();
    markPending({ kind: "beat", id: "beat-that-never-was" });
    expect(await retryPending()).toEqual({ sent: 0, dropped: 1, pending: 0 });
    expect(String(errors.mock.calls.at(-1)![0])).toContain("no longer holds it");
    expect(messagesSent()).toEqual([]);
    errors.mockRestore();
  });

  it("the ledger's door queues records lost before it existed, and refuses what the wheel does not hold", async () => {
    const { awaitProjections, listPending } = await import("../lib/honcho-projection");
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    delete process.env.HONCHO_URL;
    const beat = await (await post("narrative/beats", { direction: "east", title: "Lost", description: "Before the ledger.", learnings: [] })).json();
    const door = await import("../app/api/honcho/pending/route");
    const send = (body: unknown) => door.POST(new Request("http://wheel/api/honcho/pending", { method: "POST", body: JSON.stringify(body) }));

    expect((await send({ kind: "beat", id: beat.id })).status).toBe(409);
    process.env.HONCHO_URL = "http://honcho.test";
    expect((await send({ kind: "cycle", id: "x" })).status).toBe(400);
    expect((await send({ kind: "beat", id: "not-a-beat" })).status).toBe(404);

    stubHoncho({ down: true });
    const res = await send({ refs: [{ kind: "beat", id: beat.id }] });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ queued: 1, pending: 1 });
    await awaitProjections();
    const listed = await (await door.GET()).json();
    expect(listed.pending.map((p: any) => p.id)).toEqual([beat.id]);
    expect(listed.honcho.pending).toBe(1);

    stubHoncho();
    expect((await send({ refs: [] })).status).toBe(202);
    await awaitProjections();
    expect(messagesSent().map((m: any) => m.metadata.wheel_id)).toEqual([beat.id]);
    expect(listPending()).toEqual([]);
    logs.mockRestore();
  });
});
