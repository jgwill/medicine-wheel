import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonlStore } from "../src/jsonl-store.js";
import { createPlanPerspectiveTools } from "../src/tools/plan-perspectives.js";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-mcp-plan-perspectives-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("Plan Perspective MCP tools", () => {
  it("registers, upsert-unions, lists, filters, and gets Plan Perspective records", async () => {
    const store = new JsonlStore(tempDir);
    const tools = createPlanPerspectiveTools(store);
    const register = findTool(tools, "register_plan_perspective");
    const list = findTool(tools, "list_plan_perspectives");
    const get = findTool(tools, "get_plan_perspective");

    const record = perspectiveRecord({
      episodes: [{ path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 }],
      future_shape: { preserved: true },
    });
    const otherSession = perspectiveRecord({
      id: "plan-perspective:session-b",
      plan: { session_id: "session-b" },
      episodes: [],
    });

    await expect(register.handler({ record })).resolves.toMatchObject({
      success: true,
      provider: "jsonl",
      record,
    });
    await register.handler({ record: otherSession });
    const upserted = await register.handler({
      record: {
        ...record,
        episodes: [{ path: "2026-07-14-episode-127-second-relation", number: 127 }],
        source: { ...record.source, updated_at: "2026-07-16T00:00:00Z" },
        future_shape: { preserved: "after-upsert" },
      },
    });
    expect(upserted.record.episodes).toEqual([
      { path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 },
      { path: "2026-07-14-episode-127-second-relation", number: 127 },
    ]);
    expect(upserted.record.source.registered_at).toBe(record.source.registered_at);
    expect(upserted.record.source.updated_at).toBe("2026-07-16T00:00:00Z");
    expect(upserted.record.future_shape).toEqual({ preserved: "after-upsert" });

    const byPath = await list.handler({
      episode_path: "2026-07-14-episode-127-second-relation",
    });
    expect(byPath.count).toBe(1);
    expect(byPath.plan_perspectives[0].id).toBe(record.id);

    const bySession = await list.handler({ session_id: "session-b" });
    expect(bySession.count).toBe(1);
    expect(bySession.plan_perspectives[0].episodes).toEqual([]);

    await expect(list.handler({ id: record.id })).resolves.toMatchObject({ count: 1 });
    await expect(list.handler({ episode_path: "missing" })).resolves.toMatchObject({
      count: 0,
      plan_perspectives: [],
    });
    await expect(list.handler({})).resolves.toMatchObject({
      success: false,
      status: "error",
    });

    const fetched = await get.handler({ id: otherSession.id });
    expect(fetched.record.id).toBe(otherSession.id);
    await expect(get.handler({ id: "plan-perspective:absent" })).resolves.toMatchObject({
      record: null,
    });
  });

  it("refuses registration without a plan-perspective id", async () => {
    const store = new JsonlStore(tempDir);
    const tools = createPlanPerspectiveTools(store);
    const register = findTool(tools, "register_plan_perspective");

    const wrongPrefix = perspectiveRecord({ id: "inquiry-weave:not-a-perspective" });
    await expect(register.handler({ record: wrongPrefix })).resolves.toMatchObject({
      success: false,
      status: "error",
    });
    expect(store.listPlanPerspectives({ id: wrongPrefix.id })).toEqual([]);
  });
});

function findTool(tools: { name: string; handler: (args: any) => any }[], name: string) {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

function perspectiveRecord(overrides: Record<string, any> = {}) {
  const base = {
    id: "plan-perspective:98c18eda-7539-46a2-8d73-fd6dc7070f7b",
    perspective: 1 as const,
    plan: {
      session_id: "98c18eda-7539-46a2-8d73-fd6dc7070f7b",
      plan_path: "plans/mission-from-the-coordinator.md",
      plan_filename: "mission-from-the-coordinator.md",
      plan_sha256: "0f3a2c666b67d4f60b38dc9e1a4a2c666b67d4f60b38db158ea57027f0f3a2c6",
      captured_at: "2026-07-15T00:00:00Z",
    },
    narrative: {
      title: "The Forge That Remembers",
      body_markdown: "# The Forge That Remembers\n\nMiette's untouched prose.\n",
    },
    lineage: {
      user_inputs_path: "_claude_user_inputs.jsonl",
      input_count: 3,
    },
    episodes: [] as { path: string; number?: number }[],
    source: {
      package: "@miadi/plan-insight",
      generator: { system: "claude-code" },
      registered_at: "2026-07-15T00:00:00Z",
      updated_at: "2026-07-15T00:00:00Z",
    },
  };

  return {
    ...base,
    ...overrides,
    plan: { ...base.plan, ...overrides.plan },
    narrative: { ...base.narrative, ...overrides.narrative },
    lineage: { ...base.lineage, ...overrides.lineage },
    source: { ...base.source, ...overrides.source },
  };
}
