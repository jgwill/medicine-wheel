/**
 * `GET /api/health` — counting the store, not the page it just fetched.
 *
 * Health is the one endpoint whose whole purpose is to answer about the whole
 * collection. It used to build that answer from `getAllNodes()` and
 * `getAllCeremonies()`, both of which answer with a *page* (default 100), and
 * report the page's length under the name `counts`. So the reading a caller
 * would use to detect a truncated collection response was itself truncated, and
 * agreed with the incomplete answer it was meant to check.
 *
 * Observed on the live chronicle wheel, 2026-08-16 — 142 nodes and 218
 * ceremonies in the store, both reported as exactly 100:
 *
 *   {"status":"healthy","provider":"jsonl","counts":{"nodes":100,"ceremonies":100}}
 *
 * Two collections of independent size both landing on exactly 100 is the
 * signature this file exists to keep from returning.
 *
 * @see app/api/health/route.ts
 * @see app/api/nodes/route.ts — the same page-vs-store distinction, drawn
 *      deliberately: an unfiltered read keeps the default page size on purpose.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonlProvider } from "../src/storage-provider/src/index";
import type { CeremonyLog, RelationalNode } from "../src/ontology-core/src/index";

vi.mock("@medicine-wheel/storage-provider", async () => {
  return await import("../src/storage-provider/src/index");
});

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
const ORIGINAL_MW_STORAGE_PROVIDER = process.env.MW_STORAGE_PROVIDER;

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-health-counts-"));
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

describe("GET /api/health — counts describe the store", () => {
  it("reports more than the default page size when the store holds more", async () => {
    // Deliberately past 100, and deliberately unequal: the defect reported both
    // collections as 100, so two different true values are what distinguishes a
    // real count from a page length that happens to be right.
    await seed(nodes(142), ceremonies(218));
    const route = await import("../app/api/health/route");

    const body = await getJson(route.GET);

    expect(body.status).toBe("healthy");
    expect(body.counts.nodes).toBe(142);
    expect(body.counts.ceremonies).toBe(218);
    expect(body.counts.nodes).toBeGreaterThan(100);
    expect(body.counts.ceremonies).toBeGreaterThan(100);
  });

  it("still reports honestly below the page size, and on an empty store", async () => {
    // A count that only becomes correct above 100 would be a different bug.
    await seed(nodes(7), ceremonies(3));
    const route = await import("../app/api/health/route");

    expect((await getJson(route.GET)).counts).toEqual({ nodes: 7, ceremonies: 3 });

    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });

    expect((await getJson(route.GET)).counts).toEqual({ nodes: 0, ceremonies: 0 });
  });

  it("counts exactly what a full read would return, malformed lines included", async () => {
    // `readJsonl` skips a line it cannot parse. A count that disagreed with a
    // read would send a caller hunting for records the store will never hand
    // back — so the count skips the same line rather than counting raw lines.
    await seed(nodes(3), ceremonies(0));
    fs.appendFileSync(path.join(tempDir, "nodes.jsonl"), "{ this is not json\n", "utf-8");

    const provider = new JsonlProvider(tempDir);
    await provider.connect();
    const readBack = await provider.getAllNodes(Number.MAX_SAFE_INTEGER);

    const route = await import("../app/api/health/route");
    const body = await getJson(route.GET);

    expect(body.counts.nodes).toBe(readBack.length);
    expect(body.counts.nodes).toBe(3);
  });

  it("keeps the shape every existing consumer already reads", async () => {
    await seed(nodes(2), ceremonies(1));
    const route = await import("../app/api/health/route");

    const body = await getJson(route.GET);

    expect(Object.keys(body).sort()).toEqual(["counts", "env", "provider", "status"]);
    expect(Object.keys(body.counts).sort()).toEqual(["ceremonies", "nodes"]);
    expect(body.provider).toBe("jsonl");
  });
});

function nodes(count: number): RelationalNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `bulk:node-${i}`,
    type: "knowledge",
    name: `Bulk node ${i}`,
    description: "",
    metadata: {},
    created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
  })) as RelationalNode[];
}

function ceremonies(count: number): CeremonyLog[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `bulk:ceremony-${i}`,
    type: "talking_circle",
    direction: "east",
    participants: ["mia"],
    medicines_used: [],
    intentions: [],
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
  })) as CeremonyLog[];
}

async function seed(nodeRecords: RelationalNode[], ceremonyRecords: CeremonyLog[]) {
  const provider = new JsonlProvider(tempDir);
  await provider.connect();
  for (const record of nodeRecords) {
    await provider.createNode(record);
  }
  for (const record of ceremonyRecords) {
    await provider.logCeremony(record);
  }
}

async function getJson(get: () => Promise<Response>) {
  const response = await get();
  expect(response.status).toBe(200);
  return await response.json();
}
