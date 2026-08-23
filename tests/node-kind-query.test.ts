/**
 * `GET /api/nodes` filtering — asking the wheel instead of downloading it.
 *
 * Node `type` is a closed enum of six, so every artifact kind the ecosystem
 * invented entered through `metadata.kind` and every containment link through
 * `metadata.parent_id`. Measured against the live wheel on 2026-08-07 (76
 * nodes): `chronicle_episode` 31, `service` 24, `<none>` 7, `structured_plan` 3,
 * `product_goal` 3, `tenant` 2, `host` 2, `stc_chart` 2, `consumer_interface` 1,
 * `chronicle_root` 1 — and 31 nodes carrying `metadata.parent_id`. Neither was
 * askable, so consumers fetched all 76 and filtered client-side.
 *
 * What these tests hold, in order of what would hurt most if it broke:
 *
 *  1. **A bare `GET /api/nodes` is untouched.** Four in-repo callers and
 *     forgewright read it; parity is the whole license for this change.
 *  2. **A filter that matches nothing says so.** An empty array is only
 *     trustworthy when it cannot also mean "your filter was never applied".
 *  3. **An unknown param is a 400**, never a shrug that returns a payload the
 *     caller believes was filtered.
 *  4. **Filters narrow together.** `type` and `direction` used to be `else if`;
 *     supplying both silently dropped the second.
 *  5. **A filtered read sees the whole store.** `getAllNodes()` defaults to 100
 *     and the wheel already holds 76 — filtering after that slice would answer
 *     from a truncated window without ever failing.
 *
 * @see app/api/nodes/route.ts
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

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
const ORIGINAL_MW_STORAGE_PROVIDER = process.env.MW_STORAGE_PROVIDER;

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-node-kind-query-"));
  process.env.MW_DATA_DIR = tempDir;
  delete process.env.MW_STORAGE_PROVIDER;
});

afterEach(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) {
    delete process.env.MW_DATA_DIR;
  } else {
    process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  }

  if (ORIGINAL_MW_STORAGE_PROVIDER === undefined) {
    delete process.env.MW_STORAGE_PROVIDER;
  } else {
    process.env.MW_STORAGE_PROVIDER = ORIGINAL_MW_STORAGE_PROVIDER;
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("GET /api/nodes — artifact-kind and parent filtering", () => {
  it("returns every node and no filters echo when asked without parameters", async () => {
    await seed(corpus());
    const route = await import("../app/api/nodes/route");

    const body = await getJson(route.GET, "http://localhost/api/nodes");

    expect(body.count).toBe(corpus().length);
    expect(body.nodes).toHaveLength(corpus().length);
    // The exact keys every existing consumer already destructures.
    expect(Object.keys(body).sort()).toEqual(["count", "nodes", "provider"]);
    expect(body).not.toHaveProperty("filters");
    expect(new Set(body.nodes.map((n: RelationalNode) => n.id))).toEqual(
      new Set(corpus().map((n) => n.id)),
    );
  });

  it("filters by metadata.kind and echoes the filter it applied", async () => {
    await seed(corpus());
    const route = await import("../app/api/nodes/route");

    const episodes = await getJson(
      route.GET,
      "http://localhost/api/nodes?kind=chronicle_episode",
    );
    expect(episodes.count).toBe(3);
    expect(episodes.nodes.map((n: RelationalNode) => n.id).sort()).toEqual([
      "chronicle:ep-300",
      "chronicle:ep-301",
      "chronicle:ep-315",
    ]);
    expect(episodes.filters).toEqual({ kind: "chronicle_episode" });

    const services = await getJson(route.GET, "http://localhost/api/nodes?kind=service");
    expect(services.count).toBe(2);
  });

  it("distinguishes an empty result from an unapplied filter", async () => {
    await seed(corpus());
    const route = await import("../app/api/nodes/route");

    // `state_machine` is declared by forgewright and produced by nothing yet —
    // zero live nodes carry it. The answer must be an honest empty set that
    // still names the question it answered.
    const response = await route.GET(
      new Request("http://localhost/api/nodes?kind=state_machine"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ count: 0, nodes: [], filters: { kind: "state_machine" } });
  });

  it("filters by metadata.parent_id", async () => {
    await seed(corpus());
    const route = await import("../app/api/nodes/route");

    const children = await getJson(
      route.GET,
      `http://localhost/api/nodes?parent_id=${encodeURIComponent("chronicle:miadi-chronicle")}`,
    );
    expect(children.count).toBe(3);
    expect(children.filters).toEqual({ parent_id: "chronicle:miadi-chronicle" });

    const grandchildren = await getJson(
      route.GET,
      `http://localhost/api/nodes?parent_id=${encodeURIComponent("chronicle:ep-300")}`,
    );
    expect(grandchildren.count).toBe(1);
    expect(grandchildren.nodes[0].id).toBe("plan:ep-300-anim");

    const absent = await getJson(
      route.GET,
      "http://localhost/api/nodes?parent_id=chronicle:no-such-parent",
    );
    expect(absent).toMatchObject({ count: 0, nodes: [] });
  });

  it("narrows on every supplied filter at once", async () => {
    await seed(corpus());
    const route = await import("../app/api/nodes/route");

    // The question a consumer actually has: artifacts of kind X under episode Y.
    const scoped = await getJson(
      route.GET,
      `http://localhost/api/nodes?kind=structured_plan&parent_id=${encodeURIComponent("chronicle:ep-300")}`,
    );
    expect(scoped.count).toBe(1);
    expect(scoped.nodes[0].id).toBe("plan:ep-300-anim");
    expect(scoped.filters).toEqual({
      kind: "structured_plan",
      parent_id: "chronicle:ep-300",
    });

    // Same kind, different parent — proves the parent term is load-bearing
    // rather than decorative.
    const otherParent = await getJson(
      route.GET,
      `http://localhost/api/nodes?kind=structured_plan&parent_id=${encodeURIComponent("chronicle:ep-301")}`,
    );
    expect(otherParent.count).toBe(0);

    // `type` and `direction` were `else if` before this change: supplying both
    // dropped the direction and returned all four knowledge nodes.
    const both = await getJson(
      route.GET,
      "http://localhost/api/nodes?type=knowledge&direction=south",
    );
    expect(both.count).toBe(1);
    expect(both.nodes[0].id).toBe("chronicle:ep-315");

    const typeOnly = await getJson(route.GET, "http://localhost/api/nodes?type=knowledge");
    expect(typeOnly.count).toBe(4);
  });

  it("rejects an unknown parameter with 400 and names what it accepts", async () => {
    await seed(corpus());
    const route = await import("../app/api/nodes/route");

    for (const query of ["?kinds=service", "?metadata.kind=service", "?limit=5", "?kind=service&bogus=1"]) {
      const response = await route.GET(new Request(`http://localhost/api/nodes${query}`));
      expect(response.status, query).toBe(400);
      const body = await response.json();
      expect(body.accepted).toEqual(["type", "direction", "kind", "parent_id"]);
      expect(body.nodes, query).toBeUndefined();
    }
  });

  it("treats an empty value as no filter rather than as a filter matching nothing", async () => {
    await seed(corpus());
    const route = await import("../app/api/nodes/route");

    // The nodes page submits "" for an unchosen dropdown.
    const body = await getJson(route.GET, "http://localhost/api/nodes?type=&direction=");
    expect(body.count).toBe(corpus().length);
    expect(body).not.toHaveProperty("filters");
  });

  it("filters across the whole store, not the default 100-node page", async () => {
    // 120 nodes, of which the 10 oldest carry the kind under test. `getAllNodes()`
    // defaults to 100 and sorts newest-first, so a filter applied after the
    // default slice would find 0 of them and report that as truth.
    const many: RelationalNode[] = [];
    for (let i = 0; i < 120; i += 1) {
      many.push(
        node({
          id: `bulk:${i}`,
          name: `Bulk ${i}`,
          // Oldest first in the array; created_at ascending means index 0 is the
          // one the default page drops.
          created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
          metadata: { kind: i < 10 ? "state_machine" : "service" },
        }),
      );
    }
    await seed(many);
    const route = await import("../app/api/nodes/route");

    const unfiltered = await getJson(route.GET, "http://localhost/api/nodes");
    expect(unfiltered.count).toBe(100);

    const machines = await getJson(route.GET, "http://localhost/api/nodes?kind=state_machine");
    expect(machines.count).toBe(10);
  });
});

/** A miniature of the live wheel's actual shape, kinds and parent links included. */
function corpus(): RelationalNode[] {
  return [
    node({
      id: "chronicle:miadi-chronicle",
      name: "Miadi Chronicle",
      direction: "north",
      metadata: { kind: "chronicle_root", contract: "miadi.artifact-ref.v1" },
    }),
    node({
      id: "chronicle:ep-300",
      name: "Episode 300 — from shadow to song",
      direction: "north",
      metadata: { kind: "chronicle_episode", parent_id: "chronicle:miadi-chronicle" },
    }),
    node({
      id: "chronicle:ep-301",
      name: "Episode 301 — plan f3",
      direction: "north",
      metadata: { kind: "chronicle_episode", parent_id: "chronicle:miadi-chronicle" },
    }),
    node({
      id: "chronicle:ep-315",
      name: "Episode 315 — the last mile",
      direction: "south",
      metadata: { kind: "chronicle_episode", parent_id: "chronicle:miadi-chronicle" },
    }),
    node({
      id: "plan:ep-300-anim",
      name: "Animation preproduction plan",
      type: "future",
      direction: "east",
      metadata: { kind: "structured_plan", parent_id: "chronicle:ep-300" },
    }),
    node({
      id: "svc:voice-mcp",
      name: "voice-mcp",
      type: "land",
      metadata: { kind: "service" },
    }),
    node({
      id: "svc:medicine-wheel",
      name: "medicine-wheel",
      type: "land",
      metadata: { kind: "service" },
    }),
    // Seven live nodes carry no `kind` at all — the filter must not invent one.
    node({ id: "human:william", name: "William", type: "human", metadata: {} }),
  ];
}

function node(overrides: Partial<RelationalNode> & { id: string; name: string }): RelationalNode {
  return {
    type: "knowledge",
    description: "",
    metadata: {},
    created_at: "2026-08-07T00:00:00.000Z",
    updated_at: "2026-08-07T00:00:00.000Z",
    ...overrides,
  } as RelationalNode;
}

async function seed(nodes: RelationalNode[]) {
  const provider = new JsonlProvider(tempDir);
  await provider.connect();
  for (const record of nodes) {
    await provider.createNode(record);
  }
}

async function getJson(get: (request: Request) => Promise<Response>, url: string) {
  const response = await get(new Request(url));
  expect(response.status).toBe(200);
  return await response.json();
}
