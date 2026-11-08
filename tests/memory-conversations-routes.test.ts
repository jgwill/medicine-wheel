/**
 * `/api/memory/conversations` (#174): a conversation with the wheel's memory,
 * kept in the store and never projected. Runs with no memory provider
 * (vitest.config.ts pins HONCHO_URL empty), so every answer is the wheel's own
 * records match; the provider's half is in memory-conversations.test.ts.
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

const call = async (fn: (r: Request, ctx?: any) => Promise<Response>, method: string, body?: unknown, ctx?: unknown, url = "http://wheel.test/x") => {
  const res = await fn(new Request(url, { method, headers: { "content-type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }), ctx);
  return { status: res.status, body: await res.json() };
};
const ctx = (id: string) => ({ params: Promise.resolve({ id: encodeURIComponent(id) }) });

let list: typeof import("../app/api/memory/conversations/route");
let one: typeof import("../app/api/memory/conversations/[id]/route");
let ask: typeof import("../app/api/memory/ask/route");

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-memory-conversations-routes-"));
  process.env.MW_DATA_DIR = tempDir;
  const ceremonies = await import("../app/api/ceremonies/route");
  const beats = await import("../app/api/narrative/beats/route");
  const made = await call(ceremonies.POST, "POST", { id: "ceremony:conv:a", type: "talking_circle", direction: "east", participants: [], medicines_used: [], intentions: ["decide the lantern"] });
  expect(made.status, JSON.stringify(made.body)).toBeLessThan(300);
  const beat = await call(beats.POST, "POST", { direction: "east", title: "Mia speaks", description: "The lantern is painted teal.", learnings: [], ceremonies: ["ceremony:conv:a"] });
  expect(beat.status, JSON.stringify(beat.body)).toBeLessThan(300);
  list = await import("../app/api/memory/conversations/route");
  one = await import("../app/api/memory/conversations/[id]/route");
  ask = await import("../app/api/memory/ask/route");
});

afterAll(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("/api/memory/conversations (#174)", () => {
  it("starts a conversation, continues it, lists, renames, shares and deletes it", async () => {
    const started = await call(list.POST, "POST", { question: "What colour is the lantern?", scope: { ceremonies: "ceremony:conv:a" }, asked_by: "node:human:2:gui", asked_by_name: "Guillaume", opened_from: "ceremony:conv:a" });
    expect(started.status, JSON.stringify(started.body)).toBe(201);
    const id = started.body.conversation.id as string;
    expect(id).toMatch(/^memory-conversation:/);
    expect(started.body.turn.mode).toBe("matched");
    expect(started.body.turn.sources.map((s: { excerpt: string }) => s.excerpt).join(" ")).toContain("teal");

    // A reply that names nothing still finds the lantern: the first question travels with it.
    const reply = await call(list.POST, "POST", { conversation: id, question: "Say more about that", scope: { ceremonies: "ceremony:conv:a" }, asked_by: "node:human:2:gui" });
    expect(reply.status, JSON.stringify(reply.body)).toBe(200);
    expect(reply.body.conversation.turn_count).toBe(2);
    expect(reply.body.turn.sources.length).toBeGreaterThan(0);

    const stranger = await call(list.POST, "POST", { conversation: id, question: "Mine?", scope: { ceremonies: "ceremony:conv:a" }, asked_by: "node:human:9:x" });
    expect(stranger.status).toBe(403);

    const mine = await call(list.GET, "GET", undefined, undefined, "http://wheel.test/api/memory/conversations?held_by=node%3Ahuman%3A2%3Agui");
    expect(mine.body.conversations.map((c: { id: string }) => c.id)).toEqual([id]);
    expect(mine.body.conversations[0].turns).toBeUndefined();

    const renamed = await call(one.PATCH, "PATCH", { title: "The lantern", shared_in: "ceremony:conv:a" }, ctx(id));
    expect(renamed.status).toBe(200);
    expect(renamed.body.title).toBe("The lantern");
    const read = await call(one.GET, "GET", undefined, ctx(id));
    expect(read.body.turns.map((t: { question: string }) => t.question)).toEqual(["What colour is the lantern?", "Say more about that"]);
    expect(read.body.shared_in).toBe("ceremony:conv:a");

    // Nothing of it reached the ceremonies, beats or diary files: it is kept beside them.
    expect(fs.readFileSync(path.join(tempDir, "memory-conversations.jsonl"), "utf8")).toContain(id);
    expect(fs.readFileSync(path.join(tempDir, "ceremonies.jsonl"), "utf8")).not.toContain("Say more about that");

    // Shared, it holds other people's turns: it is unshared first.
    expect((await call(one.DELETE, "DELETE", undefined, ctx(id))).status).toBe(409);
    expect((await call(one.PATCH, "PATCH", { shared_in: null }, ctx(id))).body.shared_in).toBeNull();
    expect((await call(one.DELETE, "DELETE", undefined, ctx(id))).status).toBe(200);
    expect((await call(one.GET, "GET", undefined, ctx(id))).status).toBe(404);
    expect((await call(one.DELETE, "DELETE", undefined, ctx(id))).status).toBe(404);
  });

  it("never lists the whole collection: a holder or a ceremony is named", async () => {
    const all = await call(list.GET, "GET", undefined, undefined, "http://wheel.test/api/memory/conversations");
    expect(all.status).toBe(400);
    const opened = await call(list.GET, "GET", undefined, undefined, "http://wheel.test/api/memory/conversations?opened_from=ceremony%3Aconv%3Aa");
    expect(opened.status).toBe(400);
  });

  it("refuses a body without a question, an asker or a scope", async () => {
    expect((await call(list.POST, "POST", { scope: { ceremonies: "ceremony:conv:a" }, asked_by: "a" })).status).toBe(400);
    expect((await call(list.POST, "POST", { question: "Q", scope: { ceremonies: "ceremony:conv:a" } })).status).toBe(400);
    expect((await call(list.POST, "POST", { question: "Q", asked_by: "a" })).status).toBe(400);
    expect((await call(list.POST, "POST", { conversation: "memory-conversation:0:none", question: "Q", scope: { ceremonies: "ceremony:conv:a" }, asked_by: "a" })).status).toBe(404);
  });

  it("lets /api/memory/ask take earlier turns a host keeps itself", async () => {
    const out = await call(ask.POST, "POST", { question: "Say more about that", scope: { ceremonies: "ceremony:conv:a" }, earlier: [{ question: "What colour is the lantern?", answer: "Teal." }] });
    expect(out.status, JSON.stringify(out.body)).toBe(200);
    expect(out.body.sources.length).toBeGreaterThan(0);
    expect((await call(ask.POST, "POST", { question: "Q", scope: { ceremonies: "ceremony:conv:a" }, earlier: [{ answer: "no question" }] })).status).toBe(400);
  });
});
