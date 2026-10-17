/**
 * What every broker needs, apart from what one broker needs (#165): topics,
 * partition keys and CloudEvents for all; the request shape, answers and
 * promises of each adapter. Each provider is played by a local receiver that
 * checks its path, authentication and body the way the provider's docs give
 * them. Nothing here leaves localhost.
 */
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import type { AddressInfo } from "node:net";
import Ajv from "ajv";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => await import("../src/storage-provider/src/index"));
vi.mock("@medicine-wheel/events", async () => await import("../src/events/src/index"));
vi.mock("@medicine-wheel/events/log", async () => await import("../src/events/src/log"));
vi.mock("@medicine-wheel/events/publish", async () => await import("../src/events/src/publish"));
vi.mock("@medicine-wheel/events/git", async () => await import("../src/events/src/git"));

import { buildEvent, cloudEventHeaders, fromCloudEvent, nameFor, partitionKey, toCloudEvent, topicFor, wheelEventsJsonSchema } from "../src/events/src/index";
import { appendEvent } from "../src/events/src/log";
import { classifyHttpStatus, cloudflareQueuesPublisher, drainLog, hookdeckPublisher, httpPublisher, readCursor } from "../src/events/src/publish";

const lineage = () => buildEvent(
  { name: "chronicle.lineage.made", subject: { kind: "relation", id: "chronicle:a->chronicle:b" }, correlation_id: "chronicle:a",
    actor: { kind: "speaker", id: "node:human:g" }, payload: { from_id: "chronicle:a", to_id: "chronicle:b", relationship_type: "relates_to", relation: "why" } },
  { instance: "ilex:8040" },
);

describe("topics and keys, for any broker", () => {
  const e = lineage();
  it("divides events four ways", () => {
    expect(topicFor(e)).toBe("medicine-wheel.chronicle.lineage.made");
    expect(topicFor(e, { scheme: "family" })).toBe("medicine-wheel.chronicle.lineage");
    expect(topicFor(e, { scheme: "subject" })).toBe("medicine-wheel.relation");
    expect(topicFor(e, { scheme: "single" })).toBe("medicine-wheel.events");
    expect(topicFor(e, { scheme: "single", single: "wheel" })).toBe("wheel");
  });
  it("names them as each provider allows", () => {
    expect(topicFor(e, { naming: "nats" })).toBe("medicine-wheel.chronicle.lineage.made");
    expect(nameFor("a b.*.>", "nats")).toBe("a_b._._");
    expect(topicFor(e, { naming: "kafka" })).toBe("medicine-wheel.chronicle.lineage.made");
    expect(nameFor("x/y:z", "kafka")).toBe("x_y_z");
    expect(topicFor(e, { naming: "cloudflare" })).toBe("medicine-wheel-chronicle-lineage-made");
    expect(nameFor("A".repeat(80), "cloudflare")).toHaveLength(63);
  });
  it("keys related events together: the correlation, else the subject", () => {
    expect(partitionKey(e)).toBe("chronicle:a");
    expect(partitionKey({ subject: { kind: "cycle", id: "c" } })).toBe("c");
  });
});

describe("CloudEvents 1.0", () => {
  it("carries the envelope and comes back field for field", () => {
    const e = lineage();
    const ce = toCloudEvent(e);
    expect(ce).toMatchObject({
      specversion: "1.0", id: e.id, source: "urn:medicine-wheel:ilex:8040", type: "medicine-wheel.chronicle.lineage.made",
      subject: "chronicle:a->chronicle:b", time: e.observed_at, datacontenttype: "application/json", data: e.payload,
      mwsubjectkind: "relation", mwcorrelation: "chronicle:a", mwactorkind: "speaker", mwactor: "node:human:g",
      mwclassification: "chronicle", mwcontentincluded: true,
    });
    for (const key of Object.keys(ce)) expect(key).toMatch(/^[a-z0-9]+$/);
    const back = fromCloudEvent(ce);
    expect(back).toEqual(e);
    expect(new Ajv().compile(wheelEventsJsonSchema())(back)).toBe(true);
  });
  it("binary mode puts every attribute but data in ce- headers", () => {
    const h = cloudEventHeaders(toCloudEvent(lineage()));
    expect(h["content-type"]).toBe("application/json");
    expect(h["ce-type"]).toBe("medicine-wheel.chronicle.lineage.made");
    expect(h["ce-mwcontentincluded"]).toBe("true");
    expect(h["ce-data"]).toBeUndefined();
  });
});

describe("one rule for what an HTTP answer means", () => {
  it("stops on credentials, address and load; passes only a judgement of the event", () => {
    for (const s of [200, 201, 202, 204]) expect(classifyHttpStatus(s)).toBe("arrived");
    for (const s of [301, 401, 403, 404, 405, 407, 408, 410, 421, 425, 429, 500, 502, 503]) expect(classifyHttpStatus(s)).toBe("failed");
    for (const s of [400, 409, 413, 415, 422]) expect(classifyHttpStatus(s)).toBe("refused");
  });
});

// ── a receiver that plays each provider ─────────────────────────────────────

type Hit = { method: string; url: string; headers: http.IncomingHttpHeaders; body: string };
let hits: Hit[] = [];
let answer: (hit: Hit) => { status: number; body?: unknown } = () => ({ status: 200, body: { ok: true } });
let server: http.Server;
let base: string;
let dir: string;
let logFile: string;
const ORIGINAL = { ...process.env };

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const hit = { method: req.method ?? "", url: req.url ?? "", headers: req.headers, body: raw };
      hits.push(hit);
      const { status, body } = answer(hit);
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body ?? {}));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-events-adapters-"));
  logFile = path.join(dir, "events.jsonl");
  process.env.MW_DATA_DIR = dir;
});
afterAll(async () => {
  await new Promise((r) => server.close(r));
  for (const key of Object.keys(process.env)) if (!(key in ORIGINAL)) delete process.env[key];
  Object.assign(process.env, ORIGINAL);
  fs.rmSync(dir, { recursive: true, force: true });
});
beforeEach(() => {
  hits = [];
  answer = () => ({ status: 200, body: { ok: true } });
  for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });
  for (const key of Object.keys(process.env)) if (key.startsWith("MW_EVENTS_")) delete process.env[key];
});

describe("adapters", () => {
  it("http: the envelope, or CloudEvents structured or binary", async () => {
    const e = lineage();
    await httpPublisher({ url: `${base}/in`, format: "cloudevents" }).publish(e);
    await httpPublisher({ url: `${base}/in`, format: "cloudevents-binary" }).publish(e);
    await httpPublisher({ url: `${base}/in` }).publish(e);
    const [structured, binary, envelope] = hits;
    expect(structured.headers["content-type"]).toBe("application/cloudevents+json");
    expect(JSON.parse(structured.body).specversion).toBe("1.0");
    expect(binary.headers["ce-id"]).toBe(e.id);
    expect(JSON.parse(binary.body)).toEqual(e.payload);
    expect(JSON.parse(envelope.body)).toEqual(e);
    for (const hit of hits) expect(hit.headers["idempotency-key"]).toBe(e.idempotency_key);
  });

  it("a wrong token stops the pass and keeps every event for that destination", async () => {
    appendEvent(logFile, lineage());
    appendEvent(logFile, lineage());
    answer = () => ({ status: 401, body: { error: "bad token" } });
    const result = await drainLog(logFile, httpPublisher({ url: `${base}/in` }));
    expect(result).toMatchObject({ arrived: 0, refused: 0, stopped: true, pending: 2 });
    expect(readCursor(logFile, "http").last_event_id).toBeUndefined();
  });

  it("hookdeck: a POST to the source URL, under its own name and promises", async () => {
    const p = hookdeckPublisher({ sourceUrl: `${base}/e/src_123` });
    expect(p.name).toBe("hookdeck");
    expect(p.guarantees?.retention).toMatch(/3 days on the free Developer plan/);
    expect(await p.publish(lineage())).toMatchObject({ outcome: "arrived" });
    expect(hits[0]).toMatchObject({ method: "POST", url: "/e/src_123" });
  });

  it("cloudflare queues: the documented request; success true is arrival, anything less is not", async () => {
    const p = cloudflareQueuesPublisher({ accountId: "acc1", queueId: "q1", token: "cf-token", apiBase: `${base}/client/v4` });
    expect(p.name).toBe("cloudflare-queues");
    answer = () => ({ status: 200, body: { success: true, errors: [], messages: [] } });
    const e = lineage();
    expect(await p.publish(e)).toEqual({ outcome: "arrived", status: 200 });
    expect(hits[0].method).toBe("POST");
    expect(hits[0].url).toBe("/client/v4/accounts/acc1/queues/q1/messages");
    expect(hits[0].headers.authorization).toBe("Bearer cf-token");
    expect(JSON.parse(hits[0].body)).toEqual({ body: e });

    answer = () => ({ status: 200, body: { success: false, errors: [{ code: 10000, message: "nope" }] } });
    expect(await p.publish(e)).toMatchObject({ outcome: "failed", status: 200 });
    answer = () => ({ status: 403, body: { success: false } });
    expect(await p.publish(e)).toMatchObject({ outcome: "failed", status: 403 });
    answer = () => ({ status: 400, body: { success: false } });
    expect(await p.publish(e)).toMatchObject({ outcome: "refused", status: 400 });

    const ce = cloudflareQueuesPublisher({ accountId: "a", queueId: "q", token: "t", apiBase: `${base}/v4`, format: "cloudevents" });
    answer = () => ({ status: 200, body: { success: true } });
    await ce.publish(e);
    expect(JSON.parse(hits[hits.length - 1].body).body.specversion).toBe("1.0");
  });
});

describe("the wheel with several destinations", () => {
  it("each from its own environment, each with its own cursor; one down never holds another back", async () => {
    process.env.MW_EVENTS_PUBLISH_URL = `${base}/plain`;
    process.env.MW_EVENTS_PUBLISH_FORMAT = "cloudevents";
    process.env.MW_EVENTS_CF_ACCOUNT_ID = "acc1";
    process.env.MW_EVENTS_CF_QUEUE_ID = "q1";
    process.env.MW_EVENTS_CF_API_TOKEN = "cf";
    process.env.MW_EVENTS_CF_API_BASE = `${base}/client/v4`;
    answer = (hit) => (hit.url.startsWith("/client") ? { status: 503, body: { success: false } } : { status: 202 });

    const { recordEvent, publishPending, publishersFromEnv, replayEvents } = await import("../lib/event-log");
    expect(publishersFromEnv().map((p) => p.name)).toEqual(["http", "cloudflare-queues"]);
    recordEvent({ name: "cycle.opened", subject: { kind: "cycle", id: "c1" }, payload: { current_direction: "east" } });
    // Recording already started a pass; this one joins it and returns the last run's results.
    const results = (await publishPending()) ?? [];
    expect(results.map((r) => [r.publisher, r.stopped, r.pending])).toEqual([["http", false, 0], ["cloudflare-queues", true, 1]]);
    expect(hits.filter((h) => h.url === "/plain")).toHaveLength(1);
    expect(hits.filter((h) => h.url === "/plain")[0].headers["content-type"]).toBe("application/cloudevents+json");

    const { GET, POST } = await import("../app/api/events/publish/route");
    const report = await (await GET()).json();
    expect(report.publishers.map((p: any) => [p.status.publisher, p.status.pending])).toEqual([["http", 0], ["cloudflare-queues", 1]]);
    expect(report.publishers[1].guarantees.retention).toMatch(/24 hours on the Workers free plan/);

    expect(() => replayEvents()).toThrow(/Name the publisher/);
    answer = () => ({ status: 200, body: { success: true } });
    const replayed = await (await POST(new Request("http://wheel", { method: "POST", body: JSON.stringify({ replay_from: "all", publisher: "http" }) }))).json();
    expect(replayed.replayed).toEqual({ publisher: "http", pending: 1 });
    expect(replayed.results.map((r: any) => [r.publisher, r.arrived])).toEqual([["http", 1], ["cloudflare-queues", 1]]);

    const { GET: health } = await import("../app/api/health/route");
    expect((await (await health()).json()).events.publishers.map((p: any) => p.pending)).toEqual([0, 0]);
  });
});
