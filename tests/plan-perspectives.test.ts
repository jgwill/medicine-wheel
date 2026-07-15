import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonlProvider, type PlanPerspectiveRecord } from "../src/storage-provider/src/index";

vi.mock("@medicine-wheel/storage-provider", async () => {
  return await import("../src/storage-provider/src/index");
});

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
const ORIGINAL_MW_STORAGE_PROVIDER = process.env.MW_STORAGE_PROVIDER;

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-plan-perspectives-"));
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

describe("Plan Perspective storage provider", () => {
  it("upserts by id, unions episodes by path, preserves registered_at, and keeps unknown fields", async () => {
    const provider = new JsonlProvider(tempDir);
    await provider.connect();

    const initial = perspectiveRecord({
      episodes: [{ path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 }],
      future_shape: { survives: true },
    });
    const first = await provider.registerPlanPerspective(initial);
    expect(first).toEqual(initial);

    const reRegistration = perspectiveRecord({
      episodes: [
        { path: "2026-07-13-episode-126-mila-ai-indigenous-gathering" },
        { path: "2026-07-14-episode-127-second-relation", number: 127 },
      ],
      source: {
        registered_at: "2026-07-16T00:00:00Z",
        updated_at: "2026-07-16T00:00:00Z",
      },
      future_shape: { survives: "after-upsert" },
    });
    const merged = await provider.registerPlanPerspective(reRegistration);

    expect(merged.episodes).toEqual([
      { path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 },
      { path: "2026-07-14-episode-127-second-relation", number: 127 },
    ]);
    expect(merged.source.registered_at).toBe(initial.source.registered_at);
    expect(merged.source.updated_at).toBe("2026-07-16T00:00:00Z");
    expect(merged.future_shape).toEqual({ survives: "after-upsert" });
    expect(merged.narrative.body_markdown).toBe(reRegistration.narrative.body_markdown);

    const records = await provider.listPlanPerspectives({ id: initial.id });
    expect(records).toEqual([merged]);

    const filePath = path.join(tempDir, "plan-perspectives.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, "utf-8").trim().split("\n")).toHaveLength(1);
  });

  it("accepts a zero-episode record and returns it by id", async () => {
    const provider = new JsonlProvider(tempDir);
    await provider.connect();

    const zeroEpisode = perspectiveRecord({ episodes: [] });
    await provider.registerPlanPerspective(zeroEpisode);

    await expect(provider.getPlanPerspective(zeroEpisode.id)).resolves.toEqual(zeroEpisode);
    await expect(provider.listPlanPerspectives({ id: zeroEpisode.id })).resolves.toEqual([
      zeroEpisode,
    ]);
  });

  it("matches episode_path against any episode entry exactly and returns empty lists otherwise", async () => {
    const provider = new JsonlProvider(tempDir);
    await provider.connect();

    const target = perspectiveRecord({
      id: "plan-perspective:session-a",
      plan: { session_id: "session-a" },
      episodes: [
        { path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 },
        { path: "2026-07-14-episode-127-second-relation", number: 127 },
      ],
    });
    const other = perspectiveRecord({
      id: "plan-perspective:session-b",
      plan: { session_id: "session-b" },
      episodes: [{ path: "2026-07-14-episode-127-second-relation-extended", number: 128 }],
    });
    await provider.registerPlanPerspective(target);
    await provider.registerPlanPerspective(other);

    await expect(
      provider.listPlanPerspectives({ episode_path: target.episodes[1].path }),
    ).resolves.toEqual([target]);
    await expect(
      provider.listPlanPerspectives({ episode_path: "2026-07-14-episode-127-second-relation-ext" }),
    ).resolves.toEqual([]);
    await expect(provider.listPlanPerspectives({ session_id: "session-b" })).resolves.toEqual([
      other,
    ]);
    await expect(provider.listPlanPerspectives({ id: target.id })).resolves.toEqual([target]);
    await expect(provider.listPlanPerspectives({ session_id: "session-missing" })).resolves.toEqual(
      [],
    );
    await expect(provider.getPlanPerspective("plan-perspective:absent")).resolves.toBeNull();
  });
});

describe("Plan Perspective REST routes", () => {
  it("satisfies the plan-insight registration and Forgewright read contracts", async () => {
    const collectionRoute = await import("../app/api/plan-perspectives/route");
    const itemRoute = await import("../app/api/plan-perspectives/[id]/route");

    const initial = perspectiveRecord({
      episodes: [{ path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 }],
      future_shape: { survives: true },
    });
    const firstResponse = await postPerspective(collectionRoute.POST, initial);
    expect(firstResponse.record).toEqual(initial);
    expect(firstResponse.success).toBe(true);

    const reRegistered = await postPerspective(collectionRoute.POST, {
      ...initial,
      episodes: [{ path: "2026-07-14-episode-127-second-relation", number: 127 }],
      source: { ...initial.source, updated_at: "2026-07-16T00:00:00Z" },
      future_shape: { survives: "after-upsert" },
    });
    expect(reRegistered.record.episodes).toEqual([
      { path: "2026-07-13-episode-126-mila-ai-indigenous-gathering", number: 126 },
      { path: "2026-07-14-episode-127-second-relation", number: 127 },
    ]);
    expect(reRegistered.record.source.registered_at).toBe(initial.source.registered_at);
    expect(reRegistered.record.source.updated_at).toBe("2026-07-16T00:00:00Z");
    expect(reRegistered.record.future_shape).toEqual({ survives: "after-upsert" });

    const byEpisode = await getJson(
      collectionRoute.GET,
      `http://localhost/api/plan-perspectives?episode_path=${encodeURIComponent(
        "2026-07-14-episode-127-second-relation",
      )}`,
    );
    expect(byEpisode.count).toBe(1);
    // The exact field paths Forgewright's normalizePlanPerspective reads.
    const rendered = byEpisode.plan_perspectives[0];
    expect(rendered.id).toBe(initial.id);
    expect(rendered.plan.session_id).toBe(initial.plan.session_id);
    expect(rendered.plan.plan_filename).toBe(initial.plan.plan_filename);
    expect(rendered.narrative.title).toBe(initial.narrative.title);
    expect(rendered.narrative.body_markdown).toBe(initial.narrative.body_markdown);
    expect(rendered.narrative.mia_context).toBe(initial.narrative.mia_context);
    expect(rendered.episodes.map((episode: { path: string }) => episode.path)).toEqual([
      "2026-07-13-episode-126-mila-ai-indigenous-gathering",
      "2026-07-14-episode-127-second-relation",
    ]);
    expect(rendered.source.registered_at).toBe(initial.source.registered_at);
    expect(rendered.source.generator.system).toBe(initial.source.generator?.system);

    const bySession = await getJson(
      collectionRoute.GET,
      `http://localhost/api/plan-perspectives?session_id=${encodeURIComponent(
        initial.plan.session_id,
      )}`,
    );
    expect(bySession.count).toBe(1);

    const empty = await getJson(
      collectionRoute.GET,
      "http://localhost/api/plan-perspectives?episode_path=missing",
    );
    expect(empty).toMatchObject({ count: 0, plan_perspectives: [] });

    const unfiltered = await collectionRoute.GET(
      new Request("http://localhost/api/plan-perspectives"),
    );
    expect(unfiltered.status).toBe(400);

    const byIdResponse = await itemRoute.GET(
      new Request("http://localhost/api/plan-perspectives/id"),
      { params: Promise.resolve({ id: initial.id }) },
    );
    expect(byIdResponse.status).toBe(200);
    const byId = await byIdResponse.json();
    expect(byId.record.id).toBe(initial.id);

    const absentResponse = await itemRoute.GET(
      new Request("http://localhost/api/plan-perspectives/id"),
      { params: Promise.resolve({ id: "plan-perspective:absent" }) },
    );
    expect(absentResponse.status).toBe(404);
  });

  it("rejects malformed records with 400 and never stores them", async () => {
    const collectionRoute = await import("../app/api/plan-perspectives/route");

    const missingId = perspectiveRecord() as Record<string, unknown>;
    delete missingId.id;
    const wrongPrefix = perspectiveRecord({ id: "inquiry-weave:not-a-perspective" });
    const missingNarrative = perspectiveRecord() as Record<string, unknown>;
    delete missingNarrative.narrative;
    const badEpisode = perspectiveRecord({
      episodes: [{ path: "" }] as PlanPerspectiveRecord["episodes"],
    });

    for (const malformed of [missingId, wrongPrefix, missingNarrative, badEpisode, "not-json"]) {
      const response = await collectionRoute.POST(
        new Request("http://localhost/api/plan-perspectives", {
          method: "POST",
          body: typeof malformed === "string" ? malformed : JSON.stringify(malformed),
        }),
      );
      expect(response.status).toBe(400);
    }

    const provider = new JsonlProvider(tempDir);
    await provider.connect();
    await expect(
      provider.listPlanPerspectives({ id: "inquiry-weave:not-a-perspective" }),
    ).resolves.toEqual([]);
  });
});

type PerspectiveOverrides = Omit<
  Partial<PlanPerspectiveRecord>,
  "plan" | "narrative" | "lineage" | "source"
> & {
  plan?: Partial<PlanPerspectiveRecord["plan"]>;
  narrative?: Partial<PlanPerspectiveRecord["narrative"]>;
  lineage?: Partial<PlanPerspectiveRecord["lineage"]>;
  source?: Partial<PlanPerspectiveRecord["source"]>;
};

function perspectiveRecord(overrides: PerspectiveOverrides = {}): PlanPerspectiveRecord {
  const base: PlanPerspectiveRecord = {
    id: "plan-perspective:98c18eda-7539-46a2-8d73-fd6dc7070f7b",
    perspective: 1,
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
      mia_context: "Structural tension resolved through relational projection.",
    },
    lineage: {
      user_inputs_path: "_claude_user_inputs.jsonl",
      input_count: 3,
      first_input_at: "2026-07-14T22:00:00Z",
      last_input_at: "2026-07-15T00:00:00Z",
    },
    episodes: [],
    source: {
      package: "@miadi/plan-insight",
      generator: {
        system: "claude-code",
        model: "claude-fable-5",
      },
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

async function postPerspective(
  post: (request: Request) => Promise<Response>,
  record: PlanPerspectiveRecord,
) {
  const response = await post(
    new Request("http://localhost/api/plan-perspectives", {
      method: "POST",
      body: JSON.stringify(record),
    }),
  );
  expect(response.status).toBe(201);
  return await response.json();
}

async function getJson(get: (request: Request) => Promise<Response>, url: string) {
  const response = await get(new Request(url));
  expect(response.status).toBe(200);
  return await response.json();
}
