import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonlProvider, type WeaveRecord } from "../src/storage-provider/src/index";

vi.mock("@medicine-wheel/storage-provider", async () => {
  return await import("../src/storage-provider/src/index");
});

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
const ORIGINAL_MW_STORAGE_PROVIDER = process.env.MW_STORAGE_PROVIDER;

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-inquiry-weaves-"));
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

describe("Inquiry Weave storage provider", () => {
  it("maps JSONL storage to inquiry-weaves.jsonl and upserts by id while preserving unknown fields", async () => {
    const provider = new JsonlProvider(tempDir);
    await provider.connect();

    const initial = weaveRecord({
      id: "inquiry-weave:episode-a:artefact-a",
      extra_relation_context: { future: "preserved" },
    });
    await provider.registerInquiryWeave(initial);

    const updated = weaveRecord({
      id: initial.id,
      last_sync: { state: "stale", tree_sha256: "new-tree" },
      extra_relation_context: { future: "still-preserved" },
    });
    await provider.registerInquiryWeave(updated);

    const records = await provider.listInquiryWeaves();
    expect(records).toHaveLength(1);
    expect(records[0].last_sync.state).toBe("stale");
    expect(records[0].extra_relation_context).toEqual({ future: "still-preserved" });

    const filePath = path.join(tempDir, "inquiry-weaves.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, "utf-8").trim().split("\n")).toHaveLength(1);
  });

  it("filters by episode path, episode number, issue, and artefact id", async () => {
    const provider = new JsonlProvider(tempDir);
    await provider.connect();

    const target = weaveRecord({
      id: "inquiry-weave:episode-a:artefact-a",
      episode: { path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 },
      issue: "miadisabelle/Etuaptmumk-RSM#245",
      artefact: { id: "ep126-mila-ai-event" },
    });
    const sameNumberDifferentPath = weaveRecord({
      id: "inquiry-weave:episode-b:artefact-b",
      episode: { path: "2026-07-14-episode-126-other", number: 126 },
      issue: "miadisabelle/Etuaptmumk-RSM#246",
      artefact: { id: "ep126-other" },
    });
    await provider.registerInquiryWeave(target);
    await provider.registerInquiryWeave(sameNumberDifferentPath);

    await expect(
      provider.listInquiryWeaves({ episode_path: target.episode.path }),
    ).resolves.toEqual([target]);
    await expect(provider.listInquiryWeaves({ episode_number: 126 })).resolves.toHaveLength(2);
    await expect(provider.listInquiryWeaves({ issue: target.issue })).resolves.toEqual([target]);
    await expect(provider.listInquiryWeaves({ artefact: target.artefact.id })).resolves.toEqual([
      target,
    ]);
  });
});

describe("Inquiry Weave REST routes", () => {
  it("satisfies the Forgewright read path acceptance criteria", async () => {
    const collectionRoute = await import("../app/api/inquiry-weaves/route");
    const itemRoute = await import("../app/api/inquiry-weaves/[id]/route");

    const target = weaveRecord({
      id: "inquiry-weave:episode-a:artefact-a",
      episode: { path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 },
      issue: "miadisabelle/Etuaptmumk-RSM#245",
      artefact: { id: "ep126-mila-ai-event" },
      last_sync: { state: "episode-copy-diverged" },
      future_shape: { survives: true },
    });
    const sameNumberDifferentPath = weaveRecord({
      id: "inquiry-weave:episode-b:artefact-b",
      episode: { path: "2026-07-14-episode-126-other", number: 126 },
      issue: "miadisabelle/Etuaptmumk-RSM#246",
      artefact: { id: "ep126-other" },
    });

    await postWeave(collectionRoute.POST, target);
    await postWeave(collectionRoute.POST, sameNumberDifferentPath);
    await postWeave(collectionRoute.POST, {
      ...target,
      last_sync: { state: "stale" },
      future_shape: { survives: "after-upsert" },
    });

    const byPath = await getJson(
      collectionRoute.GET,
      `http://localhost/api/inquiry-weaves?episode_path=${encodeURIComponent(target.episode.path)}`,
    );
    expect(byPath.count).toBe(1);
    expect(byPath.inquiry_weaves[0].id).toBe(target.id);
    expect(byPath.inquiry_weaves[0].artefact.id).toBe(target.artefact.id);
    expect(byPath.inquiry_weaves[0].issue).toBe(target.issue);
    expect(byPath.inquiry_weaves[0].episode).toEqual(target.episode);
    expect(byPath.inquiry_weaves[0].last_sync.state).toBe("stale");
    expect(byPath.inquiry_weaves[0].future_shape).toEqual({ survives: "after-upsert" });

    const byNumber = await getJson(
      collectionRoute.GET,
      "http://localhost/api/inquiry-weaves?episode_number=126",
    );
    expect(byNumber.count).toBe(2);

    const byIssue = await getJson(
      collectionRoute.GET,
      `http://localhost/api/inquiry-weaves?issue=${encodeURIComponent(target.issue)}`,
    );
    expect(byIssue.count).toBe(1);

    const byArtefact = await getJson(
      collectionRoute.GET,
      `http://localhost/api/inquiry-weaves?artefact=${encodeURIComponent(target.artefact.id)}`,
    );
    expect(byArtefact.count).toBe(1);

    const empty = await getJson(
      collectionRoute.GET,
      "http://localhost/api/inquiry-weaves?episode_path=missing",
    );
    expect(empty).toMatchObject({ count: 0, inquiry_weaves: [] });

    const byIdResponse = await itemRoute.GET(new Request("http://localhost/api/inquiry-weaves/id"), {
      params: Promise.resolve({ id: target.id }),
    });
    expect(byIdResponse.status).toBe(200);
    const byId = await byIdResponse.json();
    expect(byId.inquiry_weave.id).toBe(target.id);
  });
});

function weaveRecord(overrides: Partial<WeaveRecord> = {}): WeaveRecord {
  const base: WeaveRecord = {
    id: "inquiry-weave:episode:artefact",
    weave: 1,
    artefact: {
      id: "ep126-mila-ai-event-260715-b08218a8-0441-4596-a16e-47483d3ab57c",
    },
    issue: "miadisabelle/Etuaptmumk-RSM#245",
    issue_url: "https://github.com/miadisabelle/Etuaptmumk-RSM/issues/245",
    episode: {
      path: "2026-07-13-episode-126-mila-ai-indigenous-gathering",
      number: 126,
    },
    last_sync: {
      state: "in-sync",
      at: "2026-07-15T00:00:00Z",
      tree_sha256: "sha256-of-source-tree",
      file_count: 4,
      bytes_total: 341001,
    },
    source: {
      package: "@miadi/inquiry-weave",
      record_path: "2026-07-13-episode-126-mila-ai-indigenous-gathering/inquiry/weave.yaml",
      registered_at: "2026-07-15T00:00:00Z",
      updated_at: "2026-07-15T00:00:00Z",
    },
  };

  return {
    ...base,
    ...overrides,
    artefact: { ...base.artefact, ...overrides.artefact },
    episode: { ...base.episode, ...overrides.episode },
    last_sync: { ...base.last_sync, ...overrides.last_sync },
    source: { ...base.source, ...overrides.source },
  };
}

async function postWeave(post: (request: Request) => Promise<Response>, record: WeaveRecord) {
  const response = await post(
    new Request("http://localhost/api/inquiry-weaves", {
      method: "POST",
      body: JSON.stringify(record),
    }),
  );
  expect(response.status).toBe(201);
}

async function getJson(get: (request: Request) => Promise<Response>, url: string) {
  const response = await get(new Request(url));
  expect(response.status).toBe(200);
  return await response.json();
}
