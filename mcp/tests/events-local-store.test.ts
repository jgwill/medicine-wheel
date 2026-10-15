/**
 * The MCP server's own files keep the same moments the wheel's routes do
 * (jgwill/medicine-wheel#164). Without MW_API_URL the MCP tools write the
 * local JSONL store directly, past every route; the store records what each
 * write was, with the same decider, in `events.jsonl` beside it.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/events", async () => await import("../../src/events/src/index"));
vi.mock("@medicine-wheel/events/log", async () => await import("../../src/events/src/log"));

import { JsonlStore } from "../src/jsonl-store.js";

let dataDir: string;
let store: JsonlStore;

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-mcp-events-"));
  store = new JsonlStore(dataDir);
});
afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));

const events = () =>
  fs.readFileSync(path.join(dataDir, "events.jsonl"), "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

const now = new Date().toISOString();

describe("the MCP local store records what its writes were", () => {
  it("a cycle opened, a beat recorded in it, the cycle's binding unremarked, then archived", () => {
    const cycle = { id: "cycle-m1", research_question: "q", start_date: now, current_direction: "east", beats: [], ceremonies_conducted: 0, relations_mapped: 0, wilson_alignment: 0, ocap_compliant: false } as any;
    store.createCycle(cycle);
    store.createBeat({ id: "beat-m1", direction: "east", title: "t", description: "d", ceremonies: [], learnings: [], timestamp: now, act: 1, relations_honored: [], cycle_id: "cycle-m1" } as any);
    // create_narrative_beat binds the cycle side like this; beat.recorded already said so.
    store.createCycle({ ...cycle, beats: ["beat-m1"] });
    store.createCycle({ ...cycle, beats: ["beat-m1"], current_direction: "south" });
    store.archiveCycle("cycle-m1");

    expect(events().map((e) => [e.event_type, e.subject.id, e.correlation_id])).toEqual([
      ["medicine-wheel.cycle.opened", "cycle-m1", "cycle-m1"],
      ["medicine-wheel.beat.recorded", "beat-m1", "cycle-m1"],
      ["medicine-wheel.cycle.amended", "cycle-m1", "cycle-m1"],
      ["medicine-wheel.cycle.archived", "cycle-m1", "cycle-m1"],
    ]);
    expect(events()[2].payload).toEqual({ changed: ["current_direction"], current_direction: "south" });
  });

  it("a circle, a relation, the ceremony that honours it, and an opened ceremony", () => {
    store.createNode({ id: "circle:m1", name: "c", type: "circle", description: "", metadata: {}, created_at: now, updated_at: now } as any);
    store.createNode({ id: "node:m2", name: "n", type: "human", description: "", metadata: {}, created_at: now, updated_at: now } as any);
    store.createEdge({ from_id: "circle:m1", to_id: "node:m2", relationship_type: "holds", strength: 0.5, ceremony_honored: false, obligations: [], created_at: now } as any);
    store.logCeremony({ id: "cer-m1", type: "talking_circle", direction: "east", participants: [], medicines_used: [], intentions: [], timestamp: now, source: "mcp" } as any);
    store.updateEdgeCeremony("circle:m1", "node:m2", "cer-m1");

    const ev = events();
    expect(ev.map((e) => e.event_type)).toEqual([
      "medicine-wheel.circle.created",
      "medicine-wheel.node.created",
      "medicine-wheel.relation.made",
      "medicine-wheel.ceremony.opened",
      "medicine-wheel.relation.amended",
    ]);
    expect(ev[4].payload.changed).toEqual(["ceremony_honored", "ceremony_id"]);
    expect(ev[3].actor).toEqual({ kind: "source", id: "mcp" });
  });
});
