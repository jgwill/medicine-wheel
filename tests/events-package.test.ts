/**
 * @medicine-wheel/events — the catalog is the contract, and the documents a
 * consumer reads (JSON Schema, AsyncAPI) say what it says. The committed files
 * in src/events/schema/ are what `npm run build` writes; a catalog changed
 * without rebuilding them fails here.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import Ajv from "ajv";
import { describe, expect, it } from "vitest";
import {
  WHEEL_EVENT_CATALOG,
  WHEEL_EVENTS,
  asyncApiDocument,
  buildEvent,
  conclusionJudged,
  cycleWritten,
  nodeFamily,
  nodeWritten,
  relationWritten,
  schemaId,
  wheelEventsJsonSchema,
} from "../src/events/src/index";

const schemaDir = path.join(__dirname, "..", "src", "events", "schema");
const committed = (name: string) => JSON.parse(fs.readFileSync(path.join(schemaDir, name), "utf-8"));

describe("the documents say what the catalog says", () => {
  it("the committed JSON Schema and AsyncAPI document are the ones the catalog generates", () => {
    expect(committed("wheel-events.schema.json")).toEqual(JSON.parse(JSON.stringify(wheelEventsJsonSchema())));
    expect(committed("asyncapi.json")).toEqual(JSON.parse(JSON.stringify(asyncApiDocument())));
  });

  it("the AsyncAPI document has one channel per event, addressed by its topic, and every reference resolves", () => {
    const doc = asyncApiDocument() as any;
    expect(doc.asyncapi).toBe("3.0.0");
    expect(Object.keys(doc.channels)).toHaveLength(WHEEL_EVENTS.length);
    const resolve = (ref: string) => ref.slice(2).split("/").reduce((node: any, key) => node?.[key], doc);
    for (const name of WHEEL_EVENTS) {
      const id = schemaId(name);
      expect(doc.channels[id].address).toBe(`medicine-wheel.${name}`);
      expect(resolve(doc.channels[id].messages[id].$ref).name).toBe(`medicine-wheel.${name}`);
      expect(resolve(doc.operations[id].channel.$ref)).toBe(doc.channels[id]);
      expect(resolve(doc.operations[id].messages[0].$ref)).toBeDefined();
      expect(resolve(doc.components.messages[id].payload.$ref)).toBeDefined();
    }
    expect(new Set(WHEEL_EVENTS.map(schemaId)).size).toBe(WHEEL_EVENTS.length);
  });

  it("the JSON Schema accepts a built event and refuses one that breaks its event's contract", () => {
    const validate = new Ajv({ allErrors: true }).compile(wheelEventsJsonSchema());
    const good = buildEvent({ name: "relation.made", subject: { kind: "relation", id: "a->b" }, payload: { from_id: "a", to_id: "b", relationship_type: "kin" } });
    expect(validate(good)).toBe(true);
    const missing = { ...good, payload: { from_id: "a", to_id: "b" } };
    expect(validate(missing)).toBe(false);
    const wrongKind = { ...good, subject: { kind: "beat", id: "a->b" } };
    expect(validate(wrongKind)).toBe(false);
    const unknown = { ...good, event_type: "medicine-wheel.relation.forgotten" };
    expect(validate(unknown)).toBe(false);
  });

  it("every event is about one of the six subject kinds and says what writes it", () => {
    for (const name of WHEEL_EVENTS) {
      const def = WHEEL_EVENT_CATALOG[name];
      expect(["cycle", "beat", "ceremony", "diary", "node", "relation"]).toContain(def.subject);
      expect(def.summary.length).toBeGreaterThan(0);
      expect(def.writtenBy.length).toBeGreaterThan(0);
    }
  });
});

describe("building and deciding", () => {
  it("an event must be about the kind of record its name says", () => {
    expect(() => buildEvent({ name: "cycle.opened", subject: { kind: "beat", id: "x" } } as any)).toThrow(/about a cycle/);
    expect(() => buildEvent({ name: "cycle.forgotten" as any, subject: { kind: "cycle", id: "x" } })).toThrow(/Unknown wheel event/);
  });

  it("a cycle's beats list is bound by beat.recorded, never an amendment", () => {
    const before = { id: "c", current_direction: "east", beats: [] as string[] };
    expect(cycleWritten(before, { ...before, beats: ["b1"] } as any, ["beats"])).toBeNull();
    expect(cycleWritten(before, { ...before, current_direction: "west" }, ["current_direction"])?.name).toBe("cycle.amended");
  });

  it("nodes find their family by type and kind", () => {
    expect(nodeFamily({ id: "x", type: "circle" })).toBe("circle");
    expect(nodeFamily({ id: "x", type: "knowledge", metadata: { kind: "chronicle_episode" } })).toBe("chronicle.episode");
    expect(nodeFamily({ id: "x", type: "knowledge", metadata: { kind: "memory_projection" } })).toBe("memory.conclusion");
    expect(nodeFamily({ id: "x", type: "agent" })).toBe("node");
    const was = { id: "x", type: "human", name: "a", metadata: { role: "elder", keep: 1 } };
    expect(nodeWritten(was, { ...was, metadata: { role: "youth", keep: 1 } })?.payload).toEqual({ type: "human", kind: undefined, changed: ["metadata.role"] });
    expect(nodeWritten(was, { ...was, updated_at: "later" } as any)).toBeNull();
  });

  it("a relation rewritten as it stands, or a judgement restated, is nothing", () => {
    const r = { from_id: "a", to_id: "b", relationship_type: "kin", strength: 0.5 };
    expect(relationWritten(r, { ...r })).toBeNull();
    const n = { id: "x", type: "knowledge", metadata: { kind: "memory_projection", about: "p", status: "confirmed", judged_by: "g" } };
    expect(conclusionJudged(n, { ...n })).toBeNull();
    expect(conclusionJudged(n, { ...n, metadata: { ...n.metadata, status: "rejected" } })?.name).toBe("memory.conclusion.judged");
  });
});
