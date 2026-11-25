/**
 * What identifies an edge in the store (rispecs/agent-kinship.spec.md, "What
 * the store had to learn"). An edge without a kinship type is identified by
 * its ordered pair, as every edge was. An edge that names a governed kinship
 * type is identified by the pair and that name, so two seats can hold several
 * governed relations in the same direction, and neither kind of write
 * replaces the other.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EdgeNotFoundError, JsonlProvider, NodeHasRelationsError } from "../src/storage-provider/src/index";

let dir: string;
let store: JsonlProvider;
const at = "2026-11-24T20:00:00.000Z";
const edge = (extra: Record<string, unknown> = {}) => ({
  from_id: "a",
  to_id: "p",
  relationship_type: "relates_to",
  strength: 0.5,
  ceremony_honored: false,
  obligations: [],
  created_at: at,
  ...extra,
});
const governed = (kinship: string, extra: Record<string, unknown> = {}) => edge({ relationship_type: kinship, kinship_type: kinship, ...extra });

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-edge-identity-"));
  store = new JsonlProvider(dir);
  await store.connect();
  for (const id of ["a", "p"]) {
    await store.createNode({ id, name: id, type: "knowledge", metadata: {}, created_at: at, updated_at: at });
  }
});
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe("edge identity in the JSONL provider", () => {
  it("an edge without a kinship type is still one per ordered pair", async () => {
    await store.createEdge(edge({ relationship_type: "relates_to" }));
    await store.createEdge(edge({ relationship_type: "continues_from" }));
    const all = await store.getAllEdges();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: "a:p", relationship_type: "continues_from" });
    expect(all[0].kinship_type).toBeUndefined();
    expect(all[0].context).toBeUndefined();
  });

  it("one pair holds one edge for each kinship type beside the edge without any", async () => {
    await store.createEdge(edge());
    await store.createEdge(governed("BORN_FROM", { description: "came from", context: { stated_by: "p" } }) as never);
    await store.createEdge(governed("SERVES", { context: { stated_by: "p", grants: [{ kind: "see_circles", scope: "sits_in" }] } }) as never);

    const all = await store.getAllEdges();
    expect(all.map((e) => e.id).sort()).toEqual(["a:p", "a:p:BORN_FROM", "a:p:SERVES"]);
    expect(await store.getEdge("a", "p")).toMatchObject({ relationship_type: "relates_to" });
    expect(await store.getEdge("a", "p", "BORN_FROM")).toMatchObject({ kinship_type: "BORN_FROM", description: "came from", context: { stated_by: "p" } });
    expect(await store.getEdge("a", "p", "SERVES")).toMatchObject({ context: { grants: [{ kind: "see_circles", scope: "sits_in" }] } });
    expect(await store.getEdge("a", "p", "speaks-with")).toBeNull();
  });

  it("writing one again replaces that one and leaves the others", async () => {
    await store.createEdge(edge({ description: "plain" }));
    await store.createEdge(governed("BORN_FROM", { description: "first" }) as never);
    await store.createEdge(governed("BORN_FROM", { description: "second" }) as never);
    await store.createEdge(edge({ description: "plain again" }));
    expect((await store.getAllEdges()).map((e) => [e.id, e.description]).sort()).toEqual([["a:p", "plain again"], ["a:p:BORN_FROM", "second"]]);
  });

  it("update and delete reach the edge that is named, and say which one is missing", async () => {
    await store.createEdge(edge());
    await store.createEdge(governed("SERVES") as never);

    const patched = await store.updateEdge("a", "p", { context: { stated_by: "p", state: "active" } }, "SERVES");
    expect(patched).toMatchObject({ kinship_type: "SERVES", context: { stated_by: "p", state: "active" } });
    expect((await store.getEdge("a", "p"))?.context).toBeUndefined();

    await store.deleteEdge("a", "p", "SERVES");
    expect((await store.getAllEdges()).map((e) => e.id)).toEqual(["a:p"]);
    await expect(store.deleteEdge("a", "p", "SERVES")).rejects.toBeInstanceOf(EdgeNotFoundError);
    await expect(store.updateEdge("a", "p", { strength: 1 }, "BORN_FROM")).rejects.toThrow(/BORN_FROM/);

    await store.deleteEdge("a", "p");
    expect(await store.getAllEdges()).toEqual([]);
  });

  it("a governed edge alone is not reached without its name, and still holds its nodes", async () => {
    await store.createEdge(governed("holds-responsibility-for") as never);
    expect(await store.getEdge("a", "p")).toBeNull();
    await expect(store.deleteEdge("a", "p")).rejects.toBeInstanceOf(EdgeNotFoundError);
    expect(await store.getRelatedNodes("a")).toEqual(["p"]);
    await expect(store.deleteNode("a")).rejects.toBeInstanceOf(NodeHasRelationsError);
  });

  it("a ceremony that honors the pair honors every edge of the pair", async () => {
    await store.createEdge(edge());
    await store.createEdge(governed("SERVES") as never);
    await store.updateEdgeCeremony("a", "p", "ceremony-1");
    expect((await store.getAllEdges()).map((e) => [e.id, e.ceremony_honored]).sort()).toEqual([["a:p", true], ["a:p:SERVES", true]]);
  });

  it("RV5: a governed edge keeps the date it was first written through every write; an edge without a kinship type does as it did", async () => {
    await store.createEdge(governed("SERVES", { created_at: "2026-01-01T00:00:00.000Z" }) as never);
    await store.createEdge(governed("SERVES", { created_at: "2026-11-24T22:00:00.000Z", ceremony_honored: true }) as never);
    expect(await store.getEdge("a", "p", "SERVES")).toMatchObject({ created_at: "2026-01-01T00:00:00.000Z", ceremony_honored: true });
    await store.updateEdge("a", "p", { strength: 0.9 }, "SERVES");
    await store.updateEdgeCeremony("a", "p", "ceremony-1");
    expect((await store.getEdge("a", "p", "SERVES"))?.created_at).toBe("2026-01-01T00:00:00.000Z");

    await store.createEdge(edge({ created_at: "2026-01-01T00:00:00.000Z" }));
    await store.createEdge(edge({ created_at: "2026-11-24T22:00:00.000Z" }));
    expect((await store.getEdge("a", "p"))?.created_at).toBe("2026-11-24T22:00:00.000Z");
  });

  it("a store written before these fields existed reads as it did", async () => {
    fs.writeFileSync(path.join(dir, "edges.jsonl"), JSON.stringify({ from_id: "a", to_id: "p", relationship_type: "member_of", strength: 1, ceremony_honored: false, obligations: ["show up"], created_at: at }) + "\n");
    const fresh = new JsonlProvider(dir);
    await fresh.connect();
    expect(await fresh.getAllEdges()).toEqual([
      { id: "a:p", from_id: "a", to_id: "p", relationship_type: "member_of", strength: 1, ceremony_honored: false, last_ceremony: undefined, obligations: ["show up"], created_at: at },
    ]);
  });
});
