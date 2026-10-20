/**
 * `/api/charts` keeps the chart-level fields the structural tension tools write
 * since 0.23.0 (rispecs/delayed-resolution.spec.md): the GitHub issue link, the
 * status, a sub-chart's backlink to its parent, and the due-date history.
 * Before, the route rebuilt each chart from a fixed list and dropped them.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
let tempDir: string;
let charts: typeof import("../app/api/charts/route");

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-charts-route-"));
  process.env.MW_DATA_DIR = tempDir;
  charts = await import("../app/api/charts/route");
});

afterAll(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("/api/charts chart-level fields", () => {
  it("keeps github_issue, status, parent backlink, level and due_date_history; still drops unknown fields", async () => {
    const issue = { ref: "jgwill/medicine-wheel#170", owner: "jgwill", repo: "medicine-wheel", number: 170, url: "https://github.com/jgwill/medicine-wheel/issues/170" };
    const history = [{ from: null, to: "2026-11-30T00:00:00.000Z", at: "2026-10-19T00:00:00.000Z" }];
    const step = {
      id: "stc:south:1:sub_action_0", title: "t", current_reality: "r", status: "delayed", progress: 0,
      ceremonies_honored: [], relations_honored: [],
      delayed_resolution: { chosen_at: "2026-10-19T00:00:00.000Z", chosen_by: "W", resolve_by: "2026-10-26T00:00:00.000Z", reason: "r" },
    };
    const res = await charts.POST(new Request("http://wheel.test/api/charts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "stc:south:1:sub", desired_outcome: "o", current_reality: "r", direction: "south",
        action_steps: [step], phase: "germination", ceremonies_linked: [],
        github_issue: issue, status: "active", parent_chart_id: "stc:south:1", parent_action_step_id: "stc:south:1_action_0", level: 1,
        due_date_history: history, not_a_chart_field: "dropped",
      }),
    }));
    expect(res.status).toBe(201);

    const listed = await (await charts.GET(new Request("http://wheel.test/api/charts"))).json();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      github_issue: issue, status: "active", parent_chart_id: "stc:south:1", parent_action_step_id: "stc:south:1_action_0", level: 1, due_date_history: history,
    });
    expect(listed[0].action_steps[0].delayed_resolution.reason).toBe("r");
    expect(listed[0]).not.toHaveProperty("not_a_chart_field");
  });
});
