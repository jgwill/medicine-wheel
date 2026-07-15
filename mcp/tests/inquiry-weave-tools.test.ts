import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonlStore } from "../src/jsonl-store.js";
import { createInquiryWeaveTools } from "../src/tools/inquiry-weaves.js";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-mcp-inquiry-weaves-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("Inquiry Weave MCP tools", () => {
  it("registers, lists, filters, and gets Inquiry Weave records", async () => {
    const store = new JsonlStore(tempDir);
    const tools = createInquiryWeaveTools(store);
    const register = findTool(tools, "register_inquiry_weave");
    const list = findTool(tools, "list_inquiry_weaves");
    const get = findTool(tools, "get_inquiry_weave");

    const record = weaveRecord({
      id: "inquiry-weave:episode-a:artefact-a",
      episode: { path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 },
      issue: "miadisabelle/Etuaptmumk-RSM#245",
      artefact: { id: "ep126-mila-ai-event" },
      last_sync: { state: "never-synced" },
      future_shape: { preserved: true },
    });
    const sameNumberDifferentPath = weaveRecord({
      id: "inquiry-weave:episode-b:artefact-b",
      episode: { path: "2026-07-14-episode-126-other", number: 126 },
      issue: "miadisabelle/Etuaptmumk-RSM#246",
      artefact: { id: "ep126-other" },
    });

    await expect(register.handler({ record })).resolves.toMatchObject({
      success: true,
      provider: "jsonl",
      record,
    });
    await register.handler({ record: sameNumberDifferentPath });
    await register.handler({
      record: {
        ...record,
        last_sync: { state: "episode-copy-diverged" },
        future_shape: { preserved: "after-upsert" },
      },
    });

    const byPath = await list.handler({ episode_path: record.episode.path });
    expect(byPath.count).toBe(1);
    expect(byPath.inquiry_weaves[0].id).toBe(record.id);
    expect(byPath.inquiry_weaves[0].last_sync.state).toBe("episode-copy-diverged");
    expect(byPath.inquiry_weaves[0].future_shape).toEqual({ preserved: "after-upsert" });

    const byNumber = await list.handler({ episode_number: 126 });
    expect(byNumber.count).toBe(2);

    await expect(list.handler({ issue: record.issue })).resolves.toMatchObject({ count: 1 });
    await expect(list.handler({ artefact: record.artefact.id })).resolves.toMatchObject({
      count: 1,
    });
    await expect(list.handler({ episode_path: "missing" })).resolves.toMatchObject({
      count: 0,
      inquiry_weaves: [],
    });

    const byId = await get.handler({ id: record.id });
    expect(byId.record.id).toBe(record.id);
  });
});

function findTool(tools: ReturnType<typeof createInquiryWeaveTools>, name: string) {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

function weaveRecord(overrides: Record<string, any> = {}) {
  const base = {
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
