/**
 * Sending the log (#164) — episode 548's Named → Sent → Arrived | Failed →
 * Replayed, run against a real HTTP receiver on this machine. Nothing here
 * leaves localhost.
 */
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => await import("../src/storage-provider/src/index"));
vi.mock("@medicine-wheel/events", async () => await import("../src/events/src/index"));
vi.mock("@medicine-wheel/events/log", async () => await import("../src/events/src/log"));
vi.mock("@medicine-wheel/events/publish", async () => await import("../src/events/src/publish"));

import { buildEvent } from "../src/events/src/index";
import { appendEvent, readEventLog } from "../src/events/src/log";
import { drainLog, httpPublisher, publisherStatus, readCursor, readReceipts, rewind, type Publisher } from "../src/events/src/publish";

const ORIGINAL = { MW_DATA_DIR: process.env.MW_DATA_DIR, MW_EVENTS_PUBLISH_URL: process.env.MW_EVENTS_PUBLISH_URL };
let tempDir: string;
let logFile: string;

// A receiver that answers what it is told to, and keeps what it took.
let answer = 200;
let received: { headers: http.IncomingHttpHeaders; body: any }[] = [];
let server: http.Server;
let url: string;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-events-publish-"));
  process.env.MW_DATA_DIR = tempDir;
  delete process.env.MW_STORAGE_PROVIDER;
  logFile = path.join(tempDir, "events.jsonl");
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (answer < 300) received.push({ headers: req.headers, body: JSON.parse(raw) });
      res.writeHead(answer, { "content-type": "application/json" }).end(JSON.stringify({ ok: answer < 300 }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/events`;
});
afterAll(async () => {
  await new Promise((r) => server.close(r));
  for (const k of ["MW_DATA_DIR", "MW_EVENTS_PUBLISH_URL"] as const) {
    const v = ORIGINAL[k];
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});
beforeEach(() => {
  for (const f of fs.readdirSync(tempDir)) if (f.startsWith("events")) fs.rmSync(path.join(tempDir, f), { force: true });
  answer = 200;
  received = [];
  delete process.env.MW_EVENTS_PUBLISH_URL;
});
afterEach(() => vi.restoreAllMocks());

const named = (id: string) => {
  const event = buildEvent({ name: "cycle.opened", subject: { kind: "cycle", id }, correlation_id: id, payload: { current_direction: "east" } });
  appendEvent(logFile, event);
  return event;
};

describe("drainLog: Send, Receipt, Failure", () => {
  it("sends in order, advances the cursor on each arrival, and has nothing left", async () => {
    const [a, b] = [named("c1"), named("c2")];
    const result = await drainLog(logFile, httpPublisher({ url, token: "t0k" }));
    expect(result).toMatchObject({ publisher: "http", arrived: 2, refused: 0, stopped: false, pending: 0 });
    expect(received.map((r) => r.body.id)).toEqual([a.id, b.id]);
    expect(received[0].headers["idempotency-key"]).toBe(a.idempotency_key);
    expect(received[0].headers["x-event-type"]).toBe("medicine-wheel.cycle.opened");
    expect(received[0].headers.authorization).toBe("Bearer t0k");
    expect(readCursor(logFile, "http").last_event_id).toBe(b.id);
    expect(readReceipts(logFile).map((r) => r.outcome)).toEqual(["arrived", "arrived"]);
    expect((await drainLog(logFile, httpPublisher({ url }))).arrived).toBe(0);
  });

  it("stops on a failure that may pass, and the next pass starts from the same event", async () => {
    const a = named("c1");
    answer = 503;
    const down = await drainLog(logFile, httpPublisher({ url }));
    expect(down).toMatchObject({ arrived: 0, stopped: true, pending: 1 });
    expect(down.error).toMatch(/^HTTP 503/);
    expect(readCursor(logFile, "http").last_event_id).toBeUndefined();
    expect(publisherStatus(logFile, "http")).toMatchObject({ pending: 1, last_failure: { event_id: a.id } });

    answer = 200;
    expect(await drainLog(logFile, httpPublisher({ url }))).toMatchObject({ arrived: 1, pending: 0 });
    const status = publisherStatus(logFile, "http");
    expect(status.last_failure).toBeUndefined();
    expect(status.last_arrived_at).toBeDefined();
  });

  it("an unreachable receiver is a failure, not an error", async () => {
    named("c1");
    const result = await drainLog(logFile, httpPublisher({ url: "http://127.0.0.1:9/nowhere", timeoutMs: 2000 }));
    expect(result).toMatchObject({ arrived: 0, stopped: true, pending: 1 });
  });

  it("a refusal is recorded and passed, so one bad event does not hold the rest", async () => {
    named("c1");
    named("c2");
    const picky: Publisher = {
      name: "picky",
      publish: async (e) => (e.subject.id === "c1" ? { outcome: "refused", status: 422, error: "no" } : { outcome: "arrived", status: 202 }),
    };
    expect(await drainLog(logFile, picky)).toMatchObject({ arrived: 1, refused: 1, stopped: false, pending: 0 });
    expect(readReceipts(logFile, "picky").map((r) => [r.outcome, r.status])).toEqual([["refused", 422], ["arrived", 202]]);
  });

  it("each publisher keeps its own cursor", async () => {
    named("c1");
    await drainLog(logFile, httpPublisher({ url, name: "first" }));
    expect(publisherStatus(logFile, "first").pending).toBe(0);
    expect(publisherStatus(logFile, "second").pending).toBe(1);
  });
});

describe("rewind: Replay", () => {
  it("sends the same lines again, with the same idempotency keys, from the event named", async () => {
    const [, b, c] = [named("c1"), named("c2"), named("c3")];
    await drainLog(logFile, httpPublisher({ url }));
    received = [];
    expect(rewind(logFile, "http", b.id)).toEqual({ pending: 2 });
    await drainLog(logFile, httpPublisher({ url }));
    expect(received.map((r) => r.headers["idempotency-key"])).toEqual([b.idempotency_key, c.idempotency_key]);
    expect(rewind(logFile, "http")).toEqual({ pending: 3 });
    expect(() => rewind(logFile, "http", "mwev:0:missing")).toThrow(/No event/);
    expect(readEventLog(logFile)).toHaveLength(3);
  });
});

describe("the wheel's publishing door", () => {
  it("without a publisher nothing leaves, and the door says how to configure one", async () => {
    const { GET, POST } = await import("../app/api/events/publish/route");
    expect((await GET()).status).toBe(409);
    const res = await POST(new Request("http://wheel/api/events/publish", { method: "POST", body: "{}" }));
    expect(res.status).toBe(409);
    expect((await res.json()).hint).toMatch(/MW_EVENTS_PUBLISH_URL/);
  });

  it("a recorded event is sent soon after; the door reports, publishes and replays", async () => {
    process.env.MW_EVENTS_PUBLISH_URL = url;
    const { recordEvent, publishPending } = await import("../lib/event-log");
    const event = recordEvent({ name: "cycle.opened", subject: { kind: "cycle", id: "w1" }, payload: { current_direction: "east" } });
    await publishPending();
    expect(received.map((r) => r.body.id)).toEqual([event?.id]);

    const { GET, POST } = await import("../app/api/events/publish/route");
    const report = await (await GET()).json();
    expect(report.publisher).toMatchObject({ publisher: "http", pending: 0, last_event_id: event?.id });
    expect(report.receipts[0]).toMatchObject({ event_id: event?.id, outcome: "arrived" });

    const replayed = await (await POST(new Request("http://wheel/api/events/publish", { method: "POST", body: JSON.stringify({ replay_from: "all" }) }))).json();
    expect(replayed).toMatchObject({ replayed: 1, arrived: 1, pending: 0 });
    expect(received).toHaveLength(2);

    const { GET: health } = await import("../app/api/health/route");
    expect((await (await health()).json()).events.publisher).toMatchObject({ publisher: "http", pending: 0 });
  });
});
