/**
 * The wheel's event log (#164) — each narrative and ceremony write the routes
 * commit leaves one `MiadiEventEnvelope` line in `events.jsonl` beside the
 * store, naming what happened without carrying anyone's words, and a write
 * that changes nothing leaves nothing.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => await import("../src/storage-provider/src/index"));
vi.mock("@medicine-wheel/ceremonial-diary", async () => await import("../src/ceremonial-diary/src/index"));
vi.mock("@medicine-wheel/honcho", async () => await import("../src/honcho/src/index"));

const ORIGINAL = { MW_DATA_DIR: process.env.MW_DATA_DIR, MW_EVENTS_FILE: process.env.MW_EVENTS_FILE };
let tempDir: string;
let logFile: string;

// One store for the whole file: `@/lib/store` binds its JSONL directory on
// first import (see honcho-projection.test.ts).
beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-event-log-"));
  process.env.MW_DATA_DIR = tempDir;
  delete process.env.MW_STORAGE_PROVIDER;
  logFile = path.join(tempDir, "events.jsonl");
});
afterAll(() => {
  for (const k of ["MW_DATA_DIR", "MW_EVENTS_FILE"] as const) {
    const v = ORIGINAL[k];
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});
beforeEach(() => {
  delete process.env.MW_EVENTS_FILE;
  fs.rmSync(logFile, { force: true });
});

const lines = () =>
  fs.existsSync(logFile)
    ? fs.readFileSync(logFile, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];

const routes = {
  "narrative/cycles": () => import("../app/api/narrative/cycles/route"),
  "narrative/beats": () => import("../app/api/narrative/beats/route"),
  "narrative/beats/[id]": () => import("../app/api/narrative/beats/[id]/route"),
  ceremonies: () => import("../app/api/ceremonies/route"),
  diary: () => import("../app/api/diary/route"),
};
const send = async (route: keyof typeof routes, method: string, body: unknown, params?: Record<string, string>) => {
  const mod: any = await routes[route]();
  const req = new Request(`http://127.0.0.1:8040/api/${route}`, { method, body: JSON.stringify(body) });
  return params ? mod[method](req, { params: Promise.resolve(params) }) : mod[method](req);
};

describe("a narrative cycle leaves its moments in the log", () => {
  it("opening a cycle writes cycle.opened, without its question", async () => {
    const res = await send("narrative/cycles", "POST", { research_question: "Which event should travel?" });
    expect(res.status).toBe(201);
    const cycle = await res.json();

    const [event, ...rest] = lines();
    expect(rest).toHaveLength(0);
    expect(event.event_type).toBe("medicine-wheel.cycle.opened");
    expect(event.schema_version).toBe("0.1.0");
    expect(event.source).toEqual({ kind: "miadi", system: "medicine-wheel", instance: "127.0.0.1:8040" });
    expect(event.subject).toEqual({ kind: "cycle", id: cycle.id });
    expect(event.correlation_id).toBe(cycle.id);
    expect(event.idempotency_key).toBe(event.id);
    expect(event.occurred_at).toBe(event.observed_at);
    expect(event.privacy).toEqual({ classification: "internal", content_included: false });
    expect(event.payload).toEqual({ current_direction: "east" });
    expect(JSON.stringify(event)).not.toContain("Which event should travel");
  });

  it("amends only in what moved, archives once, and writes nothing for a write that changes nothing", async () => {
    await send("narrative/cycles", "POST", { id: "cycle-ev-1", research_question: "first framing" });
    await send("narrative/cycles", "POST", { id: "cycle-ev-1", research_question: "first framing" });
    await send("narrative/cycles", "POST", { id: "cycle-ev-1", current_direction: "south" });
    await send("narrative/cycles", "POST", { id: "cycle-ev-1", archived: true });

    const events = lines();
    expect(events.map((e) => e.event_type)).toEqual([
      "medicine-wheel.cycle.opened",
      "medicine-wheel.cycle.amended",
      "medicine-wheel.cycle.archived",
    ]);
    expect(events[1].payload).toEqual({ changed: ["current_direction"], current_direction: "south" });
    expect(events.every((e) => e.subject.id === "cycle-ev-1")).toBe(true);
  });
});

describe("beats, ceremonies and diary entries", () => {
  it("a beat is recorded in its cycle, by its speaker, without its words; witnessing adds once", async () => {
    await send("narrative/cycles", "POST", { id: "cycle-ev-2", research_question: "q" });
    const body = {
      id: "beat-ev-1", direction: "east", title: "Guillaume speaks", description: "the first turn",
      prose: "We begin in the East.", learnings: ["listen first"], ceremonies: ["cer-ev"],
      cycle_id: "cycle-ev-2", speaker: "node:human:g",
    };
    expect((await send("narrative/beats", "POST", body)).status).toBe(201);
    // Posted again as it stands: not an occurrence.
    expect((await send("narrative/beats", "POST", body)).status).toBe(201);
    await send("narrative/beats/[id]", "PATCH", { witnesses: ["node:human:m"] }, { id: "beat-ev-1" });
    await send("narrative/beats/[id]", "PATCH", { witnesses: ["node:human:m"] }, { id: "beat-ev-1" });

    const [, recorded, witnessed, ...rest] = lines();
    expect(rest).toHaveLength(0);
    expect(recorded.event_type).toBe("medicine-wheel.beat.recorded");
    expect(recorded.subject).toEqual({ kind: "beat", id: "beat-ev-1" });
    expect(recorded.correlation_id).toBe("cycle-ev-2");
    expect(recorded.actor).toEqual({ kind: "speaker", id: "node:human:g" });
    expect(recorded.payload).toMatchObject({ direction: "east", act: 1, cycle_id: "cycle-ev-2", ceremonies: ["cer-ev"], origin: "rest" });
    const text = JSON.stringify(recorded);
    for (const words of ["Guillaume speaks", "the first turn", "We begin in the East", "listen first"]) {
      expect(text).not.toContain(words);
    }
    expect(witnessed.event_type).toBe("medicine-wheel.beat.witnessed");
    expect(witnessed.payload).toMatchObject({ added_witnesses: ["node:human:m"] });
  });

  it("a beat amended in its prose says which field moved", async () => {
    const body = { id: "beat-ev-2", direction: "west", title: "t", description: "d", prose: "first" };
    await send("narrative/beats", "POST", body);
    await send("narrative/beats", "POST", { ...body, prose: "second" });
    const [, amended] = lines();
    expect(amended.event_type).toBe("medicine-wheel.beat.amended");
    expect(amended.payload.changed).toEqual(["prose"]);
    expect(JSON.stringify(amended)).not.toContain("second");
  });

  it("a ceremony opens and closes under one correlation", async () => {
    const opened = await (await send("ceremonies", "POST", {
      type: "talking_circle", direction: "east", participants: ["node:human:g"], source: "mcp", episode_path: "2026-09-27-episode-548-before-choosing-a-broker-preparing-the-question-together",
    })).json();
    const closing = await (await send("ceremonies", "POST", {
      type: "closing", direction: "north", closes: opened.ceremony.id,
    })).json();

    const [open, close] = lines();
    expect(open.event_type).toBe("medicine-wheel.ceremony.opened");
    expect(open.correlation_id).toBe(opened.ceremony.id);
    expect(open.actor).toEqual({ kind: "source", id: "mcp" });
    expect(open.payload).toMatchObject({ type: "talking_circle", direction: "east", episode_number: 548 });
    expect(close.event_type).toBe("medicine-wheel.ceremony.closed");
    expect(close.subject.id).toBe(closing.ceremony.id);
    expect(close.correlation_id).toBe(opened.ceremony.id);
  });

  it("a diary entry is written by its participant, without its content", async () => {
    const res = await send("diary", "POST", { participant: "node:human:g", phase: "miigwechiwendam", entryType: "reflection", content: "a private thought" });
    expect(res.status).toBe(201);
    const [written] = lines();
    expect(written.event_type).toBe("medicine-wheel.diary.written");
    expect(written.actor).toEqual({ kind: "participant", id: "node:human:g" });
    expect(written.payload).toMatchObject({ phase: "miigwechiwendam", entry_type: "reflection" });
    expect(JSON.stringify(written)).not.toContain("a private thought");
  });
});

describe("the log never decides the write", () => {
  it("a log that cannot be written leaves the record stored and says so on stderr", async () => {
    const blocker = path.join(tempDir, "not-a-directory");
    fs.writeFileSync(blocker, "");
    process.env.MW_EVENTS_FILE = path.join(blocker, "events.jsonl");
    const spoken = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await send("narrative/cycles", "POST", { id: "cycle-ev-3", research_question: "q" });
      expect(res.status).toBe(201);
      expect(spoken.mock.calls.some(([m]) => String(m).includes("medicine-wheel.cycle.opened for cycle cycle-ev-3 was not written"))).toBe(true);
    } finally {
      spoken.mockRestore();
    }
    const { getAllCycles } = await import("../lib/store");
    expect(getAllCycles().some((c) => c.id === "cycle-ev-3")).toBe(true);
  });

  it("a line torn by a crash costs only itself", async () => {
    const { recordEvent, readEvents } = await import("../lib/event-log");
    recordEvent({ name: "cycle.opened", subject: { kind: "cycle", id: "a" } });
    fs.appendFileSync(logFile, '{"id":"mwev:torn');
    recordEvent({ name: "cycle.opened", subject: { kind: "cycle", id: "b" } });
    expect(readEvents().map((e) => e.subject.id)).toEqual(["a", "b"]);
  });
});

describe("reading the log", () => {
  it("filters by type, family, subject and time, newest first, and refuses a bad time", async () => {
    const { recordEvent } = await import("../lib/event-log");
    recordEvent({ name: "cycle.opened", subject: { kind: "cycle", id: "c1" } });
    await new Promise((r) => setTimeout(r, 5));
    const mark = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 5));
    recordEvent({ name: "cycle.amended", subject: { kind: "cycle", id: "c1" } });
    recordEvent({ name: "beat.recorded", subject: { kind: "beat", id: "b1" } });

    const { GET } = await import("../app/api/events/route");
    const read = async (qs: string) => (await GET(new Request(`http://wheel/api/events${qs}`))).json();

    const all = await read("");
    expect(all.total).toBe(3);
    expect(all.events.map((e: any) => e.event_type)).toEqual([
      "medicine-wheel.beat.recorded", "medicine-wheel.cycle.amended", "medicine-wheel.cycle.opened",
    ]);
    expect((await read("?type=cycle.opened")).total).toBe(1);
    expect((await read("?type=medicine-wheel.cycle.opened")).total).toBe(1);
    expect((await read("?type=cycle.")).total).toBe(2);
    expect((await read("?subject=b1")).events[0].subject.id).toBe("b1");
    expect((await read(`?since=${encodeURIComponent(mark)}`)).total).toBe(2);
    const page = await read("?limit=1");
    expect(page.events).toHaveLength(1);
    expect(page.total).toBe(3);

    expect((await GET(new Request("http://wheel/api/events?since=yesterday"))).status).toBe(400);
  });

  it("health counts the log", async () => {
    const { recordEvent } = await import("../lib/event-log");
    const last = recordEvent({ name: "cycle.opened", subject: { kind: "cycle", id: "h1" } });
    const { GET } = await import("../app/api/health/route");
    const health = await (await GET()).json();
    expect(health.events).toEqual({ count: 1, last_at: last?.observed_at });
  });
});
