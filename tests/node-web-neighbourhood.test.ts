/**
 * `GET /api/nodes/[id]/web` — asking for one node's neighbourhood.
 *
 * `@medicine-wheel/relational-query` has shipped bounded traversal — depth
 * limits, direction, ceremony boundaries, OCAP guards — and has been a declared
 * dependency of this app throughout. Nothing imported it. The graph drew every
 * node it was handed on a single wheel, so the answer to "what does this episode
 * touch" was "look at 205 dots and find out".
 *
 * What these tests hold, in order of what would hurt most if it broke:
 *
 *  1. **The root always comes back**, even when it fails the caller's own
 *     filter. A web with no centre is not a web, and dropping it makes an empty
 *     neighbourhood indistinguishable from a missing node.
 *  2. **Only induced edges are returned** — both endpoints present. An edge to a
 *     node that was not sent is the dangling reference that made the main graph
 *     render 53 unconnected dots out of 100: the renderer receives it, cannot
 *     place one end, and drops it in silence.
 *  3. **Depth bounds the walk**, and `truncated` says when the walk stopped at
 *     the horizon rather than at the edge of the graph.
 *  4. **Filters narrow what is returned, never what is walked.** Filtering
 *     during the walk would cut the graph at every non-matching node and hide
 *     matches sitting two hops behind one.
 *  5. **`follow` is not `direction`.** This route has two unrelated notions of
 *     direction — the wheel's (east/south/west/north) and the traversal's
 *     (outgoing/incoming/both). Collapsing them would be a permanent trap.
 *
 * @see app/api/nodes/[id]/web/route.ts
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonlProvider } from "../src/storage-provider/src/index";
import type { RelationalNode } from "../src/ontology-core/src/index";

vi.mock("@medicine-wheel/storage-provider", async () => {
  return await import("../src/storage-provider/src/index");
});

vi.mock("@medicine-wheel/relational-query", async () => {
  return await import("../src/relational-query/src/index");
});

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
const ORIGINAL_MW_STORAGE_PROVIDER = process.env.MW_STORAGE_PROVIDER;

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-node-web-"));
  process.env.MW_DATA_DIR = tempDir;
  delete process.env.MW_STORAGE_PROVIDER;
});

afterEach(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;

  if (ORIGINAL_MW_STORAGE_PROVIDER === undefined) delete process.env.MW_STORAGE_PROVIDER;
  else process.env.MW_STORAGE_PROVIDER = ORIGINAL_MW_STORAGE_PROVIDER;

  fs.rmSync(tempDir, { recursive: true, force: true });
});

function node(partial: Partial<RelationalNode> & { id: string }): RelationalNode {
  return {
    name: partial.id,
    type: "knowledge",
    description: "",
    direction: "north",
    metadata: {},
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
    ...partial,
  } as RelationalNode;
}

/**
 * A chain plus a detached island:
 *
 *   root ── ep-a ── ep-b ── ep-c        island (no edges)
 *
 * The chain gives depth something to bite on; the island proves the walk
 * follows relations rather than returning whatever the store held.
 */
async function seedChain() {
  const provider = new JsonlProvider(tempDir);
  await provider.connect();

  const nodes = [
    node({ id: "root", direction: "north", metadata: { kind: "chronicle_root" } }),
    node({ id: "ep-a", direction: "east", metadata: { kind: "chronicle_episode" } }),
    node({ id: "ep-b", direction: "south", metadata: { kind: "chronicle_episode" } }),
    node({ id: "ep-c", direction: "west", metadata: { kind: "chronicle_episode" } }),
    node({ id: "island", direction: "north", metadata: { kind: "service" } }),
  ];
  for (const n of nodes) await provider.createNode(n);

  const edges = [
    { from_id: "ep-a", to_id: "root" },
    { from_id: "ep-b", to_id: "ep-a" },
    { from_id: "ep-c", to_id: "ep-b" },
  ];
  for (const e of edges) {
    await provider.createEdge({
      ...e,
      relationship_type: "belongs_to",
      strength: 1,
      ceremony_honored: false,
      obligations: [],
      created_at: "2026-09-03T00:00:00.000Z",
    });
  }
}

async function getWeb(id: string, query = "") {
  const route = await import("../app/api/nodes/[id]/web/route");
  const response = await route.GET(
    new Request(`http://localhost/api/nodes/${id}/web${query}`),
    { params: Promise.resolve({ id }) },
  );
  expect(response.status).toBe(200);
  return await response.json();
}

describe("GET /api/nodes/[id]/web — one node's relational web", () => {
  it("returns the node, its neighbours within depth, and nothing detached", async () => {
    await seedChain();

    const body = await getWeb("ep-a", "?depth=1");
    const ids = new Set(body.nodes.map((n: RelationalNode) => n.id));

    expect(body.root.id).toBe("ep-a");
    expect(ids).toEqual(new Set(["ep-a", "root", "ep-b"]));
    // The island shares the store and no relation. A neighbourhood that returned
    // it would be a page of the store wearing a traversal's name.
    expect(ids.has("island")).toBe(false);
  });

  it("widens with depth and reports when it stopped at the horizon", async () => {
    await seedChain();

    const shallow = await getWeb("ep-c", "?depth=1");
    expect(shallow.nodes).toHaveLength(2); // ep-c, ep-b
    // The walk ran out of allowance, not out of graph — raising depth shows more.
    expect(shallow.truncated).toBe(true);

    const deep = await getWeb("ep-c", "?depth=5");
    const ids = new Set(deep.nodes.map((n: RelationalNode) => n.id));
    expect(ids).toEqual(new Set(["ep-c", "ep-b", "ep-a", "root"]));
    expect(deep.truncated).toBe(false);
  });

  it("returns only edges whose endpoints are both present", async () => {
    await seedChain();

    const body = await getWeb("ep-a", "?depth=1");
    const ids = new Set(body.nodes.map((n: RelationalNode) => n.id));

    expect(body.edges.length).toBeGreaterThan(0);
    for (const edge of body.edges) {
      expect(ids.has(edge.from_id), `from ${edge.from_id}`).toBe(true);
      expect(ids.has(edge.to_id), `to ${edge.to_id}`).toBe(true);
    }
    // ep-c ── ep-b exists in the store; ep-c is outside this neighbourhood, so
    // the edge must not be handed to a renderer that cannot place it.
    expect(body.edges.some((e: { from_id: string }) => e.from_id === "ep-c")).toBe(false);
  });

  it("filters the returned set without cutting the walk, and always keeps the root", async () => {
    await seedChain();

    const body = await getWeb("root", "?depth=3&kind=chronicle_episode");
    const ids = new Set(body.nodes.map((n: RelationalNode) => n.id));

    // root is a chronicle_root and fails its own filter — and still comes back,
    // because a web with no centre cannot be told apart from a missing node.
    expect(body.root.id).toBe("root");
    expect(ids.has("root")).toBe(true);
    // ep-b and ep-c sit behind ep-a. Had the filter cut the walk they would be
    // unreachable; they are episodes, so they are here.
    expect(ids.has("ep-b")).toBe(true);
    expect(ids.has("ep-c")).toBe(true);
    expect(ids.has("island")).toBe(false);
  });

  it("keeps `follow` and `direction` as separate questions", async () => {
    await seedChain();

    // `direction` still means the wheel's direction, exactly as on /api/nodes.
    const eastOnly = await getWeb("root", "?depth=3&direction=east");
    const ids = new Set(eastOnly.nodes.map((n: RelationalNode) => n.id));
    expect(ids.has("ep-a")).toBe(true); // east
    expect(ids.has("ep-b")).toBe(false); // south

    // `follow` means edge orientation. Every edge points child → parent, so
    // following outgoing from root reaches nobody but root.
    const outgoing = await getWeb("root", "?depth=3&follow=outgoing");
    expect(outgoing.nodes.map((n: RelationalNode) => n.id)).toEqual(["root"]);
    expect(outgoing.follow).toBe("outgoing");
  });

  it("refuses a bad depth, a bad follow, and an unknown parameter", async () => {
    await seedChain();
    const route = await import("../app/api/nodes/[id]/web/route");

    const cases = ["?depth=0", "?depth=99", "?depth=two", "?follow=sideways", "?bogus=1"];
    for (const query of cases) {
      const response = await route.GET(
        new Request(`http://localhost/api/nodes/ep-a/web${query}`),
        { params: Promise.resolve({ id: "ep-a" }) },
      );
      expect(response.status, query).toBe(400);
      const body = await response.json();
      expect(body.nodes, query).toBeUndefined();
    }
  });

  it("404s an unknown node rather than returning an empty web", async () => {
    await seedChain();
    const route = await import("../app/api/nodes/[id]/web/route");

    const response = await route.GET(
      new Request("http://localhost/api/nodes/no-such-node/web"),
      { params: Promise.resolve({ id: "no-such-node" }) },
    );
    // An empty neighbourhood and a missing node are different answers and must
    // not share a status code.
    expect(response.status).toBe(404);
  });
});
