/**
 * The wheel's event log (#164) — each write the routes commit leaves one
 * `MiadiEventEnvelope` line in `events.jsonl` beside the store, naming what
 * happened without carrying anyone's words, and a write that changes nothing
 * leaves nothing. Every line the routes write validates against the package's
 * published JSON Schema.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import Ajv from "ajv";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => await import("../src/storage-provider/src/index"));
vi.mock("@medicine-wheel/ceremonial-diary", async () => await import("../src/ceremonial-diary/src/index"));
vi.mock("@medicine-wheel/honcho", async () => await import("../src/honcho/src/index"));
vi.mock("@medicine-wheel/events", async () => await import("../src/events/src/index"));
vi.mock("@medicine-wheel/events/log", async () => await import("../src/events/src/log"));
vi.mock("@medicine-wheel/events/publish", async () => await import("../src/events/src/publish"));

import { WHEEL_EVENT_CATALOG, wheelEventsJsonSchema } from "../src/events/src/index";

const ORIGINAL = { MW_DATA_DIR: process.env.MW_DATA_DIR, MW_EVENTS_FILE: process.env.MW_EVENTS_FILE, MW_INSTANCE: process.env.MW_INSTANCE };
let tempDir: string;
let logFile: string;

const validate = new Ajv({ allErrors: true }).compile(wheelEventsJsonSchema());

// One store for the whole file: `@/lib/store` binds its JSONL directory on
// first import (see honcho-projection.test.ts).
beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-event-log-"));
  process.env.MW_DATA_DIR = tempDir;
  delete process.env.MW_STORAGE_PROVIDER;
  logFile = path.join(tempDir, "events.jsonl");
});
afterAll(() => {
  for (const k of ["MW_DATA_DIR", "MW_EVENTS_FILE", "MW_INSTANCE"] as const) {
    const v = ORIGINAL[k];
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});
beforeEach(() => {
  delete process.env.MW_EVENTS_FILE;
  delete process.env.MW_INSTANCE;
  fs.rmSync(logFile, { force: true });
});

/** Every line, each checked against the published schema and the catalog's fields. */
const lines = () => {
  const events = fs.existsSync(logFile)
    ? fs.readFileSync(logFile, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
  for (const event of events) {
    expect(validate(event), `${event.event_type}: ${JSON.stringify(validate.errors)}`).toBe(true);
    const name = event.event_type.replace(/^medicine-wheel\./, "") as keyof typeof WHEEL_EVENT_CATALOG;
    const fields = Object.keys(WHEEL_EVENT_CATALOG[name].payload);
    for (const key of Object.keys(event.payload)) expect(fields, `${name} payload`).toContain(key);
  }
  return events;
};

const routes = {
  "narrative/cycles": () => import("../app/api/narrative/cycles/route"),
  "narrative/beats": () => import("../app/api/narrative/beats/route"),
  "narrative/beats/[id]": () => import("../app/api/narrative/beats/[id]/route"),
  ceremonies: () => import("../app/api/ceremonies/route"),
  "ceremonies/[id]": () => import("../app/api/ceremonies/[id]/route"),
  diary: () => import("../app/api/diary/route"),
  "diary/[id]": () => import("../app/api/diary/[id]/route"),
  nodes: () => import("../app/api/nodes/route"),
  "nodes/[id]": () => import("../app/api/nodes/[id]/route"),
  edges: () => import("../app/api/edges/route"),
  "memory/conclusions": () => import("../app/api/memory/conclusions/route"),
  "memory/conclusions/[id]": () => import("../app/api/memory/conclusions/[id]/route"),
};
const send = async (route: keyof typeof routes, method: string, body?: unknown, params?: Record<string, string>) => {
  const mod: any = await routes[route]();
  const req = new Request(`http://0.0.0.0:8040/api/${route}`, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
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
    expect(event.subject).toEqual({ kind: "cycle", id: cycle.id });
    expect(event.correlation_id).toBe(cycle.id);
    expect(event.idempotency_key).toBe(event.id);
    expect(event.occurred_at).toBe(event.observed_at);
    expect(event.privacy).toEqual({ classification: "internal", content_included: false });
    expect(event.payload).toEqual({ current_direction: "east" });
    expect(JSON.stringify(event)).not.toContain("Which event should travel");
  });

  it("names the wheel as configured, never by the address a request reached", async () => {
    await send("narrative/cycles", "POST", { research_question: "q" });
    process.env.MW_INSTANCE = "ilex:8040";
    await send("narrative/cycles", "POST", { research_question: "q" });
    const [unnamed, named] = lines();
    expect(unnamed.source).toEqual({ kind: "miadi", system: "medicine-wheel" });
    expect(named.source).toEqual({ kind: "miadi", system: "medicine-wheel", instance: "ilex:8040" });
  });

  it("amends only in what moved, archives once, and writes nothing for a write that changes nothing", async () => {
    await send("narrative/cycles", "POST", { id: "cycle-ev-1", research_question: "first framing" });
    await send("narrative/cycles", "POST", { id: "cycle-ev-1", research_question: "first framing" });
    await send("narrative/cycles", "POST", { id: "cycle-ev-1", current_direction: "south" });
    await send("narrative/cycles", "POST", { id: "cycle-ev-1", beats: ["beat-bound-elsewhere"] });
    await send("narrative/cycles", "POST", { id: "cycle-ev-1", archived: true });

    const events = lines();
    expect(events.map((e) => e.event_type)).toEqual([
      "medicine-wheel.cycle.opened",
      "medicine-wheel.cycle.amended",
      "medicine-wheel.cycle.archived",
    ]);
    expect(events[1].payload).toEqual({ changed: ["current_direction"], current_direction: "south" });
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
    expect((await send("narrative/beats", "POST", body)).status).toBe(201);
    await send("narrative/beats/[id]", "PATCH", { witnesses: ["node:human:m"] }, { id: "beat-ev-1" });
    await send("narrative/beats/[id]", "PATCH", { witnesses: ["node:human:m"] }, { id: "beat-ev-1" });

    const [, recorded, witnessed, ...rest] = lines();
    expect(rest).toHaveLength(0);
    expect(recorded.event_type).toBe("medicine-wheel.beat.recorded");
    expect(recorded.correlation_id).toBe("cycle-ev-2");
    expect(recorded.actor).toEqual({ kind: "speaker", id: "node:human:g" });
    expect(recorded.payload).toMatchObject({ direction: "east", act: 1, cycle_id: "cycle-ev-2", ceremonies: ["cer-ev"], origin: "rest" });
    const text = JSON.stringify(recorded);
    for (const words of ["Guillaume speaks", "the first turn", "We begin in the East", "listen first"]) {
      expect(text).not.toContain(words);
    }
    expect(witnessed.event_type).toBe("medicine-wheel.beat.witnessed");
    expect(witnessed.payload).toEqual({ added_witnesses: ["node:human:m"] });
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

  it("a ceremony opens and closes under one correlation, and a record nobody entered is removed", async () => {
    const opened = await (await send("ceremonies", "POST", {
      type: "talking_circle", direction: "east", participants: ["node:human:g"], source: "mcp", episode_path: "2026-09-27-episode-548-before-choosing-a-broker-preparing-the-question-together",
    })).json();
    const closing = await (await send("ceremonies", "POST", { type: "closing", direction: "north", closes: opened.ceremony.id })).json();
    const stray = await (await send("ceremonies", "POST", { type: "smudging", direction: "east" })).json();
    expect((await send("ceremonies/[id]", "DELETE", undefined, { id: stray.ceremony.id })).status).toBe(200);

    const [open, close, , removed] = lines();
    expect(open.event_type).toBe("medicine-wheel.ceremony.opened");
    expect(open.correlation_id).toBe(opened.ceremony.id);
    expect(open.actor).toEqual({ kind: "source", id: "mcp" });
    expect(open.payload).toMatchObject({ type: "talking_circle", direction: "east", episode_number: 548 });
    expect(close.event_type).toBe("medicine-wheel.ceremony.closed");
    expect(close.subject.id).toBe(closing.ceremony.id);
    expect(close.correlation_id).toBe(opened.ceremony.id);
    expect(close.payload.closes).toBe(opened.ceremony.id);
    expect(removed.event_type).toBe("medicine-wheel.ceremony.removed");
    expect(removed.subject.id).toBe(stray.ceremony.id);
  });

  it("a diary entry is written and removed by its participant, without its content", async () => {
    const res = await send("diary", "POST", { participant: "node:human:g", phase: "miigwechiwendam", entryType: "reflection", content: "a private thought" });
    expect(res.status).toBe(201);
    const { entry } = await res.json();
    await send("diary/[id]", "DELETE", undefined, { id: entry.id });
    const [written, removed] = lines();
    expect(written.event_type).toBe("medicine-wheel.diary.written");
    expect(written.actor).toEqual({ kind: "participant", id: "node:human:g" });
    expect(written.payload).toMatchObject({ phase: "miigwechiwendam", entry_type: "reflection" });
    expect(removed.event_type).toBe("medicine-wheel.diary.removed");
    expect(JSON.stringify([written, removed])).not.toContain("a private thought");
  });
});

describe("nodes, relations and conclusions", () => {
  it("a circle is created, an episode registered, a node created, amended in what moved, removed", async () => {
    await send("nodes", "POST", { id: "circle:ev:1", name: "Episode 548 review circle", type: "circle" });
    await send("nodes", "POST", {
      id: "chronicle:2026-10-15-episode-999-ev", name: "Episode 999", type: "knowledge",
      metadata: { kind: "chronicle_episode", relative_path: "2026-10-15-episode-999-ev" },
    });
    await send("nodes", "POST", { id: "node:ev:1", name: "Turtle Island", type: "land", direction: "east" });
    await send("nodes/[id]", "PATCH", { metadata: { status: "vessel" } }, { id: "chronicle:2026-10-15-episode-999-ev" });
    await send("nodes/[id]", "PATCH", { name: "Turtle Island" }, { id: "node:ev:1" });
    await send("nodes/[id]", "DELETE", undefined, { id: "node:ev:1" });

    const events = lines();
    expect(events.map((e) => e.event_type)).toEqual([
      "medicine-wheel.circle.created",
      "medicine-wheel.chronicle.episode.registered",
      "medicine-wheel.node.created",
      "medicine-wheel.chronicle.episode.amended",
      "medicine-wheel.node.removed",
    ]);
    expect(events[0]).toMatchObject({ subject: { kind: "node", id: "circle:ev:1" }, correlation_id: "circle:ev:1", payload: { type: "circle" } });
    expect(events[1].payload).toEqual({ type: "knowledge", kind: "chronicle_episode" });
    expect(events[2].payload).toEqual({ type: "land", direction: "east" });
    expect(events[3].payload).toEqual({ type: "knowledge", kind: "chronicle_episode", changed: ["metadata.status"] });
    expect(JSON.stringify(events)).not.toContain("Turtle Island");
  });

  it("a relation is made, amended in what moved, and released", async () => {
    await send("nodes", "POST", { id: "node:ev:a", name: "a", type: "human" });
    await send("nodes", "POST", { id: "node:ev:b", name: "b", type: "human" });
    fs.rmSync(logFile, { force: true });
    await send("edges", "POST", { from_id: "node:ev:a", to_id: "node:ev:b", relationship_type: "mentorship" });
    await send("edges", "POST", { from_id: "node:ev:a", to_id: "node:ev:b", relationship_type: "mentorship" });
    const patch = new Request("http://wheel/api/edges", { method: "PATCH", body: JSON.stringify({ from_id: "node:ev:a", to_id: "node:ev:b", strength: 0.9 }) });
    expect((await (await routes.edges()).PATCH(patch)).status).toBe(200);
    const del = new Request("http://wheel/api/edges", { method: "DELETE", body: JSON.stringify({ from_id: "node:ev:a", to_id: "node:ev:b" }) });
    expect((await (await routes.edges()).DELETE(del)).status).toBe(200);

    const events = lines();
    expect(events.map((e) => e.event_type)).toEqual([
      "medicine-wheel.relation.made",
      "medicine-wheel.relation.amended",
      "medicine-wheel.relation.removed",
    ]);
    expect(events[0]).toMatchObject({
      subject: { kind: "relation", id: "node:ev:a->node:ev:b" },
      correlation_id: "node:ev:a",
      payload: { from_id: "node:ev:a", to_id: "node:ev:b", relationship_type: "mentorship" },
    });
    expect(events[1].payload.changed).toEqual(["strength"]);
  });

  it("a conclusion is recorded about its person and judged once", async () => {
    await send("nodes", "POST", { id: "node:human:ev-g", name: "G", type: "human" });
    fs.rmSync(logFile, { force: true });
    const res = await send("memory/conclusions", "POST", { about: "node:human:ev-g", content: "likes small steps", kind: "pattern" });
    expect(res.status).toBe(201);
    const { node } = await res.json();
    await send("memory/conclusions/[id]", "PATCH", { status: "confirmed", by: "node:human:ev-g" }, { id: node.id });

    const [recorded, judged] = lines();
    expect(recorded.event_type).toBe("medicine-wheel.memory.conclusion.recorded");
    expect(recorded.correlation_id).toBe("node:human:ev-g");
    expect(recorded.payload).toMatchObject({ about: "node:human:ev-g", conclusion_kind: "pattern", status: "inferred" });
    expect(judged.event_type).toBe("medicine-wheel.memory.conclusion.judged");
    expect(judged.actor).toEqual({ kind: "judge", id: "node:human:ev-g" });
    expect(judged.payload).toEqual({ about: "node:human:ev-g", status: "confirmed", judged_by: "node:human:ev-g" });
    expect(JSON.stringify([recorded, judged])).not.toContain("small steps");
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
});

describe("reading the log", () => {
  it("filters by type, family, subject, correlation and time, newest first, and refuses a bad time", async () => {
    const { recordEvent } = await import("../lib/event-log");
    recordEvent({ name: "cycle.opened", subject: { kind: "cycle", id: "c1" }, correlation_id: "c1", payload: { current_direction: "east" } });
    await new Promise((r) => setTimeout(r, 5));
    const mark = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 5));
    recordEvent({ name: "cycle.amended", subject: { kind: "cycle", id: "c1" }, correlation_id: "c1", payload: { changed: ["x"], current_direction: "east" } });
    recordEvent({ name: "beat.recorded", subject: { kind: "beat", id: "b1" }, correlation_id: "c1", payload: { direction: "east", act: 1 } });
    recordEvent({ name: "beat.recorded", subject: { kind: "beat", id: "b2" }, payload: { direction: "east", act: 1 } });

    const { GET } = await import("../app/api/events/route");
    const read = async (qs: string) => (await GET(new Request(`http://wheel/api/events${qs}`))).json();

    const all = await read("");
    expect(all.total).toBe(4);
    expect(all.events[0].subject.id).toBe("b2");
    expect((await read("?type=cycle.opened")).total).toBe(1);
    expect((await read("?type=medicine-wheel.cycle.opened")).total).toBe(1);
    expect((await read("?type=cycle.")).total).toBe(2);
    expect((await read("?subject=b1")).events[0].subject.id).toBe("b1");
    expect((await read("?correlation=c1")).total).toBe(3);
    expect((await read(`?since=${encodeURIComponent(mark)}`)).total).toBe(3);
    const page = await read("?limit=1");
    expect(page.events).toHaveLength(1);
    expect(page.total).toBe(4);

    expect((await GET(new Request("http://wheel/api/events?since=yesterday"))).status).toBe(400);
  });

  it("health counts the log", async () => {
    const { recordEvent } = await import("../lib/event-log");
    const last = recordEvent({ name: "cycle.opened", subject: { kind: "cycle", id: "h1" }, payload: { current_direction: "east" } });
    const { GET } = await import("../app/api/health/route");
    const health = await (await GET()).json();
    expect(health.events).toEqual({ count: 1, last_at: last?.observed_at });
  });
});
