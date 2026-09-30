/**
 * `/api/memory` — the one place a memory question is asked (#149).
 *
 * These run with no memory provider configured (vitest.config.ts pins
 * HONCHO_URL empty), so they pin the wheel's own half: the reach a scope
 * resolves to, the records match that answers when no provider does, sources
 * given as wheel records with names, and conclusions that record who judged
 * them. The Honcho half is pinned against a stub in honcho.test.ts.
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

const post = async (route: { POST: (r: Request, ctx?: any) => Promise<Response> }, body: unknown, ctx?: unknown) => {
  const res = await route.POST(new Request("http://wheel.test/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), ctx);
  return { status: res.status, body: await res.json() };
};

let ids: { circleCeremony: string; otherCeremony: string; pde: string; closing: string; beat: string; diary: string };

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-memory-routes-"));
  process.env.MW_DATA_DIR = tempDir;
  const ceremonies = await import("../app/api/ceremonies/route");
  const nodes = await import("../app/api/nodes/route");
  const beats = await import("../app/api/narrative/beats/route");
  const diary = await import("../app/api/diary/route");

  const person = await post(nodes, { id: "node:human:1:mia", name: "Mia", type: "human" });
  expect(person.status).toBeLessThan(300);
  await post(nodes, { id: "pde:root-1", name: "PDE root-1", type: "knowledge" });
  await post(nodes, { id: "circle:a", name: "Circle A", type: "circle" });
  await post(nodes, { id: "circle:b", name: "Circle B", type: "circle" });

  const circleCeremony = "ceremony:test:a";
  const made = [
    await post(ceremonies, { id: circleCeremony, type: "talking_circle", direction: "east", participants: ["node:human:1:mia"], medicines_used: [], intentions: ["decide the lantern"], circle_id: "circle:a" }),
    await post(ceremonies, { id: "ceremony:test:b", type: "talking_circle", direction: "east", participants: [], medicines_used: [], intentions: ["another circle entirely"], circle_id: "circle:b" }),
    await post(ceremonies, { id: "ceremony:test:pde", type: "opening", direction: "east", participants: [], medicines_used: [], intentions: ["PDE root-1 opened"], subject_id: "pde:root-1" }),
    await post(ceremonies, { id: "ceremony:test:a-close", type: "closing", direction: "west", participants: [], medicines_used: [], intentions: ["the lantern stays teal"], circle_id: "circle:a", closes: circleCeremony }),
  ];
  for (const m of made) expect(m.status, JSON.stringify(m.body)).toBeLessThan(300);
  const beat = await post(beats, { direction: "east", title: "Mia speaks", description: "The lantern is painted teal.", learnings: [], ceremonies: [circleCeremony], speaker: "node:human:1:mia" });
  const entry = await post(diary, { participant: "node:human:1:mia", phase: "nindokendaan", entryType: "observation", content: "Teal was chosen for the lantern at dawn.", ceremony_id: circleCeremony });
  ids = {
    circleCeremony,
    otherCeremony: "ceremony:test:b",
    pde: "ceremony:test:pde",
    closing: "ceremony:test:a-close",
    beat: beat.body.id,
    diary: entry.body.entry?.id,
  };
  for (const [k, v] of Object.entries(ids)) expect(v, k).toBeTruthy();
});

afterAll(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("/api/memory (#149)", () => {
  it("GET names the providers: none configured here, the wheel's own match always", async () => {
    const { GET } = await import("../app/api/memory/route");
    const body = await (await GET()).json();
    expect(body.providers).toEqual([{ provider: "wheel", enabled: true, confined: true, detail: { mode: "matched" } }]);
    expect(body.river).toEqual({ enabled: false });
  });

  it("ask answers from the wheel's own records within the circle, closing included, and nothing from another circle", async () => {
    const route = await import("../app/api/memory/ask/route");
    const { status, body } = await post(route, { question: "What colour is the lantern?", scope: { circle_id: "circle:a" } });
    expect(status).toBe(200);
    expect(body).toMatchObject({ provider: "wheel", mode: "matched" });
    expect(body.note).toContain("No memory provider is configured");
    expect(body.reach.ceremonies.sort()).toEqual([ids.circleCeremony, ids.closing].sort());
    const kinds = body.sources.map((s: any) => [s.wheel_kind, s.wheel_id]);
    expect(kinds).toContainEqual(["beat", ids.beat]);
    expect(kinds).toContainEqual(["diary", ids.diary]);
    expect(body.sources.every((s: any) => [ids.circleCeremony, ids.closing].includes(s.ceremony_id))).toBe(true);
    const turn = body.sources.find((s: any) => s.wheel_id === ids.beat);
    expect(turn).toMatchObject({ provider: "wheel", speaker: "node:human:1:mia", speaker_name: "Mia" });
  });

  it("a PDE's scope with its own ceremony excluded is empty until a circle is held about it", async () => {
    const route = await import("../app/api/memory/ask/route");
    const own = await post(route, { question: "lantern", scope: { subject_id: "pde:root-1", exclude_ceremonies: [ids.pde] } });
    expect(own.body).toMatchObject({ mode: "empty", sources: [], reach: { ceremonies: [] } });
    const withIt = await post(route, { question: "PDE opened", scope: { subject_id: "pde:root-1" } });
    expect(withIt.body.reach.ceremonies).toEqual([ids.pde]);
  });

  it("participant reaches where that person sat", async () => {
    const route = await import("../app/api/memory/search/route");
    const { body } = await post(route, { query: "lantern teal", scope: { participant: "node:human:1:mia" } });
    expect(body.reach.ceremonies).toContain(ids.circleCeremony);
    expect(body.reach.ceremonies).not.toContain(ids.otherCeremony);
  });

  it("about keeps what that person said and wrote", async () => {
    const route = await import("../app/api/memory/about/route");
    const { body } = await post(route, { person: "node:human:1:mia", scope: { circle_id: "circle:a" } });
    expect(body.sources.length).toBeGreaterThan(0);
    expect(body.sources.every((s: any) => s.speaker === "node:human:1:mia")).toBe(true);
  });

  it("refuses what is not a question or not a scope", async () => {
    const route = await import("../app/api/memory/ask/route");
    expect((await post(route, { question: " ", scope: { circle_id: "circle:a" } })).status).toBe(400);
    expect((await post(route, { question: "x", scope: "circle:a" })).status).toBe(400);
    expect((await post(route, { question: "x", scope: { circle: "circle:a" } })).body.error).toContain("does not know circle");
    expect((await post(route, { question: "x", scope: { circle_id: [1] } })).status).toBe(400);
  });

  it("a conclusion returns to the wheel, and confirming it records who and when (W8)", async () => {
    const create = await import("../app/api/memory/conclusions/route");
    const made = await post(create, { about: "node:human:1:mia", content: "Mia settles colours at dawn.", kind: "pattern", source_event_ids: [ids.beat] });
    expect(made.status).toBe(201);
    expect(made.body.node.metadata).toMatchObject({ kind: "memory_projection", status: "inferred", about: "node:human:1:mia", source_event_ids: [ids.beat] });
    const judge = await import("../app/api/memory/conclusions/[id]/route");
    const res = await judge.PATCH(
      new Request("http://wheel.test/x", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "confirmed", by: "node:human:1:mia" }) }),
      { params: Promise.resolve({ id: made.body.node.id }) },
    );
    const judged = await res.json();
    expect(res.status).toBe(200);
    expect(judged.node.metadata).toMatchObject({ status: "confirmed", judged_by: "node:human:1:mia" });
    expect(typeof judged.node.metadata.judged_at).toBe("string");
    const missing = await judge.PATCH(new Request("http://wheel.test/x", { method: "PATCH", body: JSON.stringify({ status: "confirmed", by: "x" }) }), { params: Promise.resolve({ id: ids.beat }) });
    expect(missing.status).toBe(404);
  });
});
