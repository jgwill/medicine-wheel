/**
 * Structural tension tools: delayed resolution, read-back, per-step due dates,
 * and the chart operations brought to parity with coaia-narrative.
 *
 * Contract: rispecs/delayed-resolution.spec.md, from the design in Miadi
 * Chronicle Episode 297 (delayed-resolution-design-261019.md).
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonlStore } from "../src/jsonl-store.js";
import { HttpStore } from "../src/http-store.js";
import { createStructuralTensionTools } from "../src/tools/structural-tension.js";
import type { Tool } from "../src/types.js";

const DAY = 86_400_000;
const T0 = Date.parse("2026-10-20T12:00:00.000Z");

let tempDir: string;
let tools: Tool[];
let store: JsonlStore;

function tool(name: string): Tool {
  const found = tools.find(t => t.name === name);
  if (!found) throw new Error(`tool ${name} not registered`);
  return found;
}

const call = (name: string, args: Record<string, unknown>) => tool(name).handler(args);
const iso = (ms: number) => new Date(ms).toISOString();

let seq = 0;

/**
 * Chart ids carry the creation millisecond, and the clock is frozen in these
 * tests, so each chart is created one millisecond apart, a second before now,
 * and the clock is put back.
 */
async function chartWithSteps(steps: string[] = ["Draft the wake list", "Walk the list with William"], due = iso(T0 + 30 * DAY)) {
  const now = Date.now();
  vi.setSystemTime(now - 1000 + (seq++ % 900));
  const created = await call("create_structural_tension_chart", {
    desired_outcome: "A wheel that holds chosen delays",
    current_reality: "Steps carry a due date but no chosen delay",
    direction: "south",
    due_date: due,
    action_steps: steps,
  });
  vi.setSystemTime(now);
  return created.chart_id as string;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-mcp-stc-"));
  store = new JsonlStore(tempDir);
  tools = createStructuralTensionTools(store);
});

afterEach(() => {
  vi.useRealTimers();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("delay_resolution", () => {
  it("records a chosen delay on a step: status delayed, due date moved to resolve_by", async () => {
    const chartId = await chartWithSteps();
    const stepId = `${chartId}_action_0`;
    const resolveBy = "2026-10-27T09:00:00-04:00";

    const result = await call("delay_resolution", {
      chart_id: chartId,
      step_id: stepId,
      resolve_by: resolveBy,
      reason: "The inventory seat owns its records until Friday",
      chosen_by: "William",
      wake_on: ["inventory seat closes its cycle"],
      session: { session_id: "abc-123", cwd: "/srv/miadi/episodes", host: "gaia" },
    });

    expect(result.status).toBe("delayed");
    expect(result.due_date).toBe(iso(Date.parse(resolveBy)));
    expect(result.delayed_resolution).toMatchObject({
      chosen_at: iso(T0),
      chosen_by: "William",
      resolve_by: iso(Date.parse(resolveBy)),
      reason: "The inventory seat owns its records until Friday",
      primary_choice: "A wheel that holds chosen delays",
      wake_on: ["inventory seat closes its cycle"],
      session: { session_id: "abc-123", agent: "claude", cwd: "/srv/miadi/episodes", host: "gaia" },
    });
    expect(result.redelayed).toBe(false);

    const stored = store.getChart(chartId)!;
    const step = stored.action_steps.find((s: any) => s.id === stepId);
    expect(step.status).toBe("delayed");
    expect(step.due_date).toBe(iso(Date.parse(resolveBy)));
    expect(step.delayed_resolution.ended_at).toBeUndefined();
  });

  it("refuses to delay a completed step", async () => {
    const chartId = await chartWithSteps();
    const stepId = `${chartId}_action_0`;
    await call("mark_action_complete", { chart_id: chartId, action_step_id: stepId });

    const result = await call("delay_resolution", {
      chart_id: chartId, step_id: stepId, resolve_by: iso(T0 + 3 * DAY), reason: "r", chosen_by: "W",
    });
    expect(result).toMatchObject({ status: "refused", refusal: "step_completed" });
    expect(store.getChart(chartId)!.action_steps[0].delayed_resolution).toBeUndefined();
  });

  it("refuses a resolve_by in the past or that is not a date", async () => {
    const chartId = await chartWithSteps();
    const base = { chart_id: chartId, step_id: `${chartId}_action_0`, reason: "r", chosen_by: "W" };

    await expect(call("delay_resolution", { ...base, resolve_by: iso(T0 - DAY) }))
      .resolves.toMatchObject({ status: "refused", refusal: "resolve_by_past" });
    await expect(call("delay_resolution", { ...base, resolve_by: iso(T0) }))
      .resolves.toMatchObject({ status: "refused", refusal: "resolve_by_past" });
    await expect(call("delay_resolution", { ...base, resolve_by: "next friday-ish" }))
      .resolves.toMatchObject({ status: "refused", refusal: "resolve_by_invalid" });
    expect(store.getChart(chartId)!.action_steps[0].status).toBe("pending");
  });

  it("refuses a session without a session_id, and reports a missing step or chart", async () => {
    const chartId = await chartWithSteps();
    const base = { chart_id: chartId, step_id: `${chartId}_action_0`, reason: "r", chosen_by: "W", resolve_by: iso(T0 + DAY) };
    await expect(call("delay_resolution", { ...base, session: { cwd: "/x" } }))
      .resolves.toMatchObject({ status: "refused", refusal: "session_invalid" });
    await expect(call("delay_resolution", { ...base, step_id: "nope" }))
      .resolves.toMatchObject({ status: "not_found" });
    await expect(call("delay_resolution", { ...base, chart_id: "stc:none" }))
      .resolves.toMatchObject({ status: "not_found" });
  });

  it("re-delaying keeps the earlier record in history; nothing is overwritten", async () => {
    const chartId = await chartWithSteps();
    const stepId = `${chartId}_action_0`;
    await call("delay_resolution", { chart_id: chartId, step_id: stepId, resolve_by: iso(T0 + 2 * DAY), reason: "first", chosen_by: "W" });
    vi.setSystemTime(T0 + DAY);
    const second = await call("delay_resolution", { chart_id: chartId, step_id: stepId, resolve_by: iso(T0 + 9 * DAY), reason: "second", chosen_by: "Mia", primary_choice: "The session inventory closes" });

    expect(second.redelayed).toBe(true);
    expect(second.history_length).toBe(1);
    const step = store.getChart(chartId)!.action_steps[0];
    expect(step.delayed_resolution).toMatchObject({ reason: "second", chosen_by: "Mia", resolve_by: iso(T0 + 9 * DAY), primary_choice: "The session inventory closes" });
    expect(step.delayed_resolution_history).toHaveLength(1);
    expect(step.delayed_resolution_history[0]).toMatchObject({ reason: "first", resolve_by: iso(T0 + 2 * DAY), chosen_at: iso(T0) });
    expect(step.due_date).toBe(iso(T0 + 9 * DAY));
  });
});

describe("list_delayed_resolutions", () => {
  it("lists open delays sorted by resolve_by, with days remaining and owed", async () => {
    const chartA = await chartWithSteps(["a0", "a1"]);
    const chartB = await chartWithSteps(["b0"]);
    await call("delay_resolution", { chart_id: chartA, step_id: `${chartA}_action_1`, resolve_by: iso(T0 + 10 * DAY), reason: "later", chosen_by: "W" });
    await call("delay_resolution", { chart_id: chartB, step_id: `${chartB}_action_0`, resolve_by: iso(T0 + 1 * DAY), reason: "soon", chosen_by: "W", session: { session_id: "s-b" } });
    await call("delay_resolution", { chart_id: chartA, step_id: `${chartA}_action_0`, resolve_by: iso(T0 + 5 * DAY), reason: "middle", chosen_by: "W", wake_on: ["PR merged"] });

    // Two days later: the soonest delay is owed.
    vi.setSystemTime(T0 + 2 * DAY);
    const listed = await call("list_delayed_resolutions", {});

    expect(listed.count).toBe(3);
    expect(listed.owed_count).toBe(1);
    expect(listed.delays.map((d: any) => d.reason)).toEqual(["soon", "middle", "later"]);
    expect(listed.delays.map((d: any) => d.days_remaining)).toEqual([-1, 3, 8]);
    expect(listed.delays.map((d: any) => d.owed)).toEqual([true, false, false]);
    expect(listed.delays[0]).toMatchObject({
      chart_id: chartB,
      step_id: `${chartB}_action_0`,
      step_title: "b0",
      state: "open",
      primary_choice: "A wheel that holds chosen delays",
      session: { session_id: "s-b", agent: "claude" },
    });
    expect(listed.delays[1].wake_on).toEqual(["PR merged"]);
  });

  it("narrows to delays due within a number of days, owed ones included", async () => {
    const chartId = await chartWithSteps(["a", "b", "c"]);
    await call("delay_resolution", { chart_id: chartId, step_id: `${chartId}_action_0`, resolve_by: iso(T0 + 1 * DAY), reason: "one", chosen_by: "W" });
    await call("delay_resolution", { chart_id: chartId, step_id: `${chartId}_action_1`, resolve_by: iso(T0 + 4 * DAY), reason: "four", chosen_by: "W" });
    await call("delay_resolution", { chart_id: chartId, step_id: `${chartId}_action_2`, resolve_by: iso(T0 + 20 * DAY), reason: "twenty", chosen_by: "W" });
    vi.setSystemTime(T0 + 2 * DAY);

    const within = await call("list_delayed_resolutions", { due_within_days: 3 });
    expect(within.delays.map((d: any) => d.reason)).toEqual(["one", "four"]);
    await expect(call("list_delayed_resolutions", { due_within_days: -1 }))
      .resolves.toMatchObject({ status: "refused", refusal: "due_within_days_invalid" });
  });

  it("hides ended delays unless include_ended, and then shows ended and superseded records", async () => {
    const chartId = await chartWithSteps(["a", "b"]);
    const a = `${chartId}_action_0`;
    await call("delay_resolution", { chart_id: chartId, step_id: a, resolve_by: iso(T0 + 2 * DAY), reason: "first", chosen_by: "W" });
    await call("delay_resolution", { chart_id: chartId, step_id: a, resolve_by: iso(T0 + 3 * DAY), reason: "second", chosen_by: "W" });
    await call("end_delayed_resolution", { chart_id: chartId, step_id: a, ended_by: "W", outcome: "released" });

    expect((await call("list_delayed_resolutions", {})).count).toBe(0);
    const all = await call("list_delayed_resolutions", { include_ended: true });
    expect(all.delays.map((d: any) => [d.reason, d.state, d.owed])).toEqual([
      ["first", "superseded", false],
      ["second", "ended", false],
    ]);
    expect(all.delays[1]).toMatchObject({ outcome: "released", ended_by: "W" });
  });
});

describe("end_delayed_resolution", () => {
  it("rehydrated returns the session's resume_command and returns the step to pending", async () => {
    const chartId = await chartWithSteps();
    const stepId = `${chartId}_action_0`;
    await call("delay_resolution", {
      chart_id: chartId, step_id: stepId, resolve_by: iso(T0 + 2 * DAY), reason: "r", chosen_by: "W",
      session: { session_id: "sess-42", resume_command: "cd /srv/miadi/episodes && claude --resume sess-42" },
    });
    vi.setSystemTime(T0 + 3 * DAY);

    const ended = await call("end_delayed_resolution", { chart_id: chartId, step_id: stepId, ended_by: "Mia", outcome: "rehydrated", end_note: "date came" });
    expect(ended).toMatchObject({
      status: "pending",
      outcome: "rehydrated",
      resume_command: "cd /srv/miadi/episodes && claude --resume sess-42",
      resume_command_derived: false,
      delayed_resolution: { ended_at: iso(T0 + 3 * DAY), ended_by: "Mia", outcome: "rehydrated", end_note: "date came", reason: "r" },
    });

    const step = store.getChart(chartId)!.action_steps[0];
    expect(step.status).toBe("pending");
    expect(step.delayed_resolution.outcome).toBe("rehydrated");
  });

  it("derives a Claude resume command when none was stored, and returns in_progress when the step had progress", async () => {
    const chartId = await chartWithSteps();
    const stepId = `${chartId}_action_0`;
    await call("update_action_progress", { chart_id: chartId, action_step_id: stepId, progress: 40 });
    await call("delay_resolution", {
      chart_id: chartId, step_id: stepId, resolve_by: iso(T0 + 2 * DAY), reason: "r", chosen_by: "W",
      session: { session_id: "sess-7", cwd: "/a/ws/my repo" },
    });
    const ended = await call("end_delayed_resolution", { chart_id: chartId, step_id: stepId, ended_by: "W", outcome: "rehydrated" });
    expect(ended.status).toBe("in_progress");
    expect(ended.resume_command).toBe("cd '/a/ws/my repo' && claude --resume sess-7");
    expect(ended.resume_command_derived).toBe(true);
  });

  it("released ends the delay without a resume command", async () => {
    const chartId = await chartWithSteps();
    const stepId = `${chartId}_action_0`;
    await call("delay_resolution", { chart_id: chartId, step_id: stepId, resolve_by: iso(T0 + 2 * DAY), reason: "r", chosen_by: "W", session: { session_id: "s" } });
    const ended = await call("end_delayed_resolution", { chart_id: chartId, step_id: stepId, ended_by: "W", outcome: "released" });
    expect(ended.status).toBe("pending");
    expect(ended.outcome).toBe("released");
    expect(ended).not.toHaveProperty("resume_command");
  });

  it("refuses an outcome other than rehydrated or released, and a step with no open delay", async () => {
    const chartId = await chartWithSteps();
    const stepId = `${chartId}_action_0`;
    await expect(call("end_delayed_resolution", { chart_id: chartId, step_id: stepId, ended_by: "W", outcome: "released" }))
      .resolves.toMatchObject({ status: "refused", refusal: "no_open_delay" });
    await call("delay_resolution", { chart_id: chartId, step_id: stepId, resolve_by: iso(T0 + 2 * DAY), reason: "r", chosen_by: "W" });
    await expect(call("end_delayed_resolution", { chart_id: chartId, step_id: stepId, ended_by: "W", outcome: "resolved" }))
      .resolves.toMatchObject({ status: "refused", refusal: "outcome_invalid" });
    expect(store.getChart(chartId)!.action_steps[0].status).toBe("delayed");
  });
});

describe("mark_action_complete", () => {
  it("adds 'Completed: <title>' to the chart's current reality once", async () => {
    const chartId = await chartWithSteps();
    const stepId = `${chartId}_action_0`;
    await call("mark_action_complete", { chart_id: chartId, action_step_id: stepId });
    const again = await call("mark_action_complete", { chart_id: chartId, action_step_id: stepId });
    expect(again.current_reality).toBe("Steps carry a due date but no chosen delay\nCompleted: Draft the wake list");
    expect(store.getChart(chartId)!.current_reality).toBe("Steps carry a due date but no chosen delay\nCompleted: Draft the wake list");
  });

  it("ends an open delay with outcome resolved (rule 4b)", async () => {
    const chartId = await chartWithSteps();
    const [a, b] = [`${chartId}_action_0`, `${chartId}_action_1`];
    await call("delay_resolution", { chart_id: chartId, step_id: a, resolve_by: iso(T0 + 2 * DAY), reason: "r", chosen_by: "W" });
    await call("delay_resolution", { chart_id: chartId, step_id: b, resolve_by: iso(T0 + 2 * DAY), reason: "r", chosen_by: "W" });
    vi.setSystemTime(T0 + DAY);

    const done = await call("mark_action_complete", { chart_id: chartId, action_step_id: a, completed_by: "William" });
    expect(done.delayed_resolution_ended).toMatchObject({ outcome: "resolved", ended_by: "William", end_note: "completed", ended_at: iso(T0 + DAY) });
    await call("mark_action_complete", { chart_id: chartId, action_step_id: b });

    const steps = store.getChart(chartId)!.action_steps;
    expect(steps.map((s: any) => s.status)).toEqual(["completed", "completed"]);
    expect(steps[1].delayed_resolution).toMatchObject({ outcome: "resolved", ended_by: "mark_action_complete", end_note: "completed" });
    expect((await call("list_delayed_resolutions", {})).count).toBe(0);
  });
});

describe("read back: get_chart and get_action_step", () => {
  it("get_chart returns the stored chart whole, with open and owed delay counts", async () => {
    const chartId = await chartWithSteps();
    await call("delay_resolution", { chart_id: chartId, step_id: `${chartId}_action_0`, resolve_by: iso(T0 + DAY), reason: "r", chosen_by: "W" });
    vi.setSystemTime(T0 + 2 * DAY);
    const got = await call("get_chart", { chart_id: chartId });
    expect(got.chart.id).toBe(chartId);
    expect(got.chart.action_steps).toHaveLength(2);
    expect(got.chart.action_steps[0].delayed_resolution.reason).toBe("r");
    expect(got).toMatchObject({ delayed_steps: 1, owed_delays: 1 });
    await expect(call("get_chart", { chart_id: "stc:none" })).resolves.toMatchObject({ status: "not_found" });
  });

  it("get_action_step returns the step, its delay, and follows sub_chart_id", async () => {
    const chartId = await chartWithSteps();
    const stepId = `${chartId}_action_1`;
    const tele = await call("telescope_action_step", { chart_id: chartId, action_step_id: stepId, new_current_reality: "Nothing walked yet", initial_action_steps: ["x", "y"] });
    await call("delay_resolution", { chart_id: chartId, step_id: stepId, resolve_by: iso(T0 + 4 * DAY), reason: "r", chosen_by: "W" });

    const got = await call("get_action_step", { chart_id: chartId, step_id: stepId });
    expect(got.step.id).toBe(stepId);
    expect(got.step.title).toBe("Walk the list with William");
    expect(got.delay).toMatchObject({ state: "open", days_remaining: 4, owed: false });
    expect(got.sub_chart.id).toBe(tele.sub_chart_id);
    expect(got.sub_chart.desired_outcome).toBe("Walk the list with William");
    // Sub-chart steps get due dates spread before the telescoped step's own date.
    for (const s of got.sub_chart.action_steps) {
      expect(Date.parse(s.due_date)).toBeLessThan(Date.parse(got.sub_chart.due_date));
    }
    await expect(call("get_action_step", { chart_id: chartId, step_id: "nope" })).resolves.toMatchObject({ status: "not_found" });
  });
});

describe("due dates per step", () => {
  it("spreads due dates over steps created with a chart, and normalizes the chart's date", async () => {
    const created = await call("create_structural_tension_chart", {
      desired_outcome: "o", current_reality: "r", direction: "east",
      due_date: "2026-11-19T12:00:00+00:00",
      action_steps: ["a", "b", "c"],
    });
    const due = Date.parse("2026-11-19T12:00:00Z");
    expect(created.chart.due_date).toBe(iso(due));
    const dates = created.chart.action_steps.map((s: any) => Date.parse(s.due_date));
    const interval = (due - T0) / 4;
    expect(dates).toEqual([T0 + interval, T0 + 2 * interval, T0 + 3 * interval]);
  });

  it("refuses a chart due date that is not a date", async () => {
    await expect(call("create_structural_tension_chart", { desired_outcome: "o", current_reality: "r", direction: "east", due_date: "soonish" }))
      .resolves.toMatchObject({ status: "refused", refusal: "due_date_invalid" });
  });

  it("add_action_step validates and normalizes its due date, or inherits the chart's", async () => {
    const chartId = await chartWithSteps([]);
    const own = await call("add_action_step", { chart_id: chartId, title: "own", current_reality: "cr", due_date: "2026-10-25" });
    expect(own.due_date).toBe("2026-10-25T00:00:00.000Z");
    expect(own.due_date_inherited).toBe(false);
    const inherited = await call("add_action_step", { chart_id: chartId, title: "inherit", current_reality: "cr" });
    expect(inherited.due_date).toBe(iso(T0 + 30 * DAY));
    expect(inherited.due_date_inherited).toBe(true);
    await expect(call("add_action_step", { chart_id: chartId, title: "bad", current_reality: "cr", due_date: "whenever" }))
      .resolves.toMatchObject({ status: "refused", refusal: "due_date_invalid" });
    expect(store.getChart(chartId)!.action_steps).toHaveLength(2);
  });

  it("shows due dates and delays in get_chart_progress and list_structural_tension_charts", async () => {
    const chartId = await chartWithSteps(["a", "b", "c"]);
    await call("delay_resolution", { chart_id: chartId, step_id: `${chartId}_action_0`, resolve_by: iso(T0 + DAY), reason: "r", chosen_by: "W" });
    vi.setSystemTime(T0 + 2 * DAY);

    const progress = await call("get_chart_progress", { chart_id: chartId });
    expect(progress.progress).toMatchObject({ delayed: 1, pending: 2, total: 3 });
    expect(progress).toMatchObject({ delayed_steps: 1, owed_delays: 1 });
    expect(progress.action_steps[0]).toMatchObject({ status: "delayed", due_date: iso(T0 + DAY), delayed: { owed: true, days_remaining: -1 } });
    expect(progress.action_steps[1].due_date).toBeDefined();
    // The next action is the open, not-delayed step due soonest.
    expect(progress.next_action.id).toBe(`${chartId}_action_1`);

    const listed = await call("list_structural_tension_charts", {});
    const row = listed.charts.find((c: any) => c.id === chartId);
    expect(row).toMatchObject({ delayed_steps: 1, owed_delays: 1 });
    expect(row.action_steps[0]).toMatchObject({ status: "delayed", resolve_by: iso(T0 + DAY), owed: true });
    expect(row.action_steps[2].due_date).toBeDefined();
  });
});

describe("chart operations brought to parity", () => {
  it("update_chart_due_date normalizes, keeps a history, and respreads open non-delayed steps", async () => {
    const chartId = await chartWithSteps(["a", "b", "c"]);
    await call("mark_action_complete", { chart_id: chartId, action_step_id: `${chartId}_action_0` });
    await call("delay_resolution", { chart_id: chartId, step_id: `${chartId}_action_1`, resolve_by: iso(T0 + 25 * DAY), reason: "r", chosen_by: "W" });

    const moved = await call("update_chart_due_date", { chart_id: chartId, due_date: "2026-10-30T12:00:00Z", redistribute_action_steps: true });
    expect(moved).toMatchObject({
      previous_due_date: iso(T0 + 30 * DAY),
      new_due_date: "2026-10-30T12:00:00.000Z",
      action_steps_rescheduled: 1,
      action_steps_past_due_date: 1, // the delayed step keeps its resolve_by, after the new date
    });
    const chart = store.getChart(chartId)!;
    expect(chart.due_date).toBe("2026-10-30T12:00:00.000Z");
    expect((chart as any).due_date_history).toEqual([{ from: iso(T0 + 30 * DAY), to: "2026-10-30T12:00:00.000Z", at: iso(T0) }]);
    expect(chart.action_steps[1].due_date).toBe(iso(T0 + 25 * DAY));
    expect(chart.action_steps[2].due_date).toBe(iso(T0 + 5 * DAY)); // one step, halfway to the new date
    await expect(call("update_chart_due_date", { chart_id: chartId, due_date: "someday" }))
      .resolves.toMatchObject({ status: "refused", refusal: "due_date_invalid" });
  });

  it("update_desired_outcome replaces the outcome and returns the previous one", async () => {
    const chartId = await chartWithSteps();
    const result = await call("update_desired_outcome", { chart_id: chartId, new_desired_outcome: "A wheel that rehydrates sessions" });
    expect(result).toMatchObject({ previous_desired_outcome: "A wheel that holds chosen delays", desired_outcome: "A wheel that rehydrates sessions" });
    expect(store.getChart(chartId)!.desired_outcome).toBe("A wheel that rehydrates sessions");
    await expect(call("update_desired_outcome", { chart_id: chartId, new_desired_outcome: "  " }))
      .resolves.toMatchObject({ status: "refused" });
  });

  it("remove_action_step removes a step, and a later step never reuses an id", async () => {
    const chartId = await chartWithSteps(["a", "b", "c"]);
    const tele = await call("telescope_action_step", { chart_id: chartId, action_step_id: `${chartId}_action_2`, new_current_reality: "r" });
    const removed = await call("remove_action_step", { chart_id: chartId, step_id: `${chartId}_action_2` });
    expect(removed.remaining_steps).toBe(2);
    expect(removed.sub_chart_left).toBe(tele.sub_chart_id);
    await call("remove_action_step", { chart_id: chartId, step_id: `${chartId}_action_0` });

    const added = await call("add_action_step", { chart_id: chartId, title: "d", current_reality: "r" });
    // Length-based ids would have produced _action_1 again, a duplicate of "b".
    expect(added.action_step_id).toBe(`${chartId}_action_2`);
    const ids = store.getChart(chartId)!.action_steps.map((s: any) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    await expect(call("remove_action_step", { chart_id: chartId, step_id: "nope" })).resolves.toMatchObject({ status: "not_found" });
  });
});

// ── Over the HTTP store, as production runs ──────────────────────────────────

/**
 * A stand-in for app/api/charts/route.ts: POST appends a copy with server-time
 * updated_at, GET returns every copy sorted newest first (stable on ties).
 */
function appendOnlyChartsRoute() {
  const lines: any[] = [];
  let failPosts = false;
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes("/api/charts")) return new Response("no route", { status: 404 });
    if (init?.method === "POST") {
      if (failPosts) return new Response(JSON.stringify({ error: "disk full" }), { status: 500, headers: { "content-type": "application/json" } });
      const body = JSON.parse(String(init.body));
      lines.push({ ...body, updated_at: new Date().toISOString() });
      return new Response(JSON.stringify({ success: true }), { status: 201, headers: { "content-type": "application/json" } });
    }
    const sorted = [...lines].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    return new Response(JSON.stringify(sorted), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { lines, failNextPosts: () => { failPosts = true; } };
}

describe("over the HTTP store", () => {
  const originalFetch = globalThis.fetch;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    consoleError.mockRestore();
  });

  it("keeps the newest copy per chart, so a chart and its delays are counted once", async () => {
    const route = appendOnlyChartsRoute();
    tools = createStructuralTensionTools(new HttpStore("http://mw.test"));

    const chartId = await chartWithSteps(["a", "b"]);
    vi.setSystemTime(T0 + 1000);
    await call("delay_resolution", { chart_id: chartId, step_id: `${chartId}_action_0`, resolve_by: iso(T0 + 3 * DAY), reason: "r", chosen_by: "W" });
    // Same millisecond as the previous save: the later copy must still win.
    await call("delay_resolution", { chart_id: chartId, step_id: `${chartId}_action_1`, resolve_by: iso(T0 + 4 * DAY), reason: "r2", chosen_by: "W" });

    expect(route.lines.filter(l => l.id === chartId)).toHaveLength(3);

    const charts = await call("list_structural_tension_charts", {});
    expect(charts.count).toBe(1);
    const delays = await call("list_delayed_resolutions", {});
    expect(delays.delays.map((d: any) => d.reason)).toEqual(["r", "r2"]);
    const got = await call("get_chart", { chart_id: chartId });
    expect(got.chart.action_steps.map((s: any) => s.status)).toEqual(["delayed", "delayed"]);
  });

  it("reports a failed write from link_ceremony_to_chart and honor_relation_in_action_step instead of success", async () => {
    const route = appendOnlyChartsRoute();
    tools = createStructuralTensionTools(new HttpStore("http://mw.test"));
    const chartId = await chartWithSteps(["a"]);
    route.failNextPosts();

    await expect(call("link_ceremony_to_chart", { chart_id: chartId, ceremony_id: "ceremony:1" }))
      .resolves.toMatchObject({ status: "error" });
    await expect(call("honor_relation_in_action_step", { chart_id: chartId, action_step_id: `${chartId}_action_0`, node_id: "node:1" }))
      .resolves.toMatchObject({ status: "error" });
  });
});

describe("HttpStore.getAllCharts de-duplication", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it("returns one copy per id, the newest, filtered by direction after de-duplication", async () => {
    const copy = (id: string, direction: string, updated: string, outcome: string) => ({
      id, direction, desired_outcome: outcome, current_reality: "r", action_steps: [],
      created_at: "2026-10-01T00:00:00.000Z", updated_at: updated, phase: "germination", ceremonies_linked: [],
    });
    const body = [
      copy("c1", "east", "2026-10-03T00:00:00.000Z", "c1 newest"),
      copy("c2", "west", "2026-10-02T00:00:00.000Z", "c2 old"),
      copy("c2", "east", "2026-10-02T00:00:00.000Z", "c2 moved east, same ms, written later"),
      copy("c1", "east", "2026-10-01T00:00:00.000Z", "c1 oldest"),
    ];
    globalThis.fetch = (async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
    const http = new HttpStore("http://mw.test");

    const all = await http.getAllCharts();
    expect(all.map(c => c.desired_outcome)).toEqual(["c1 newest", "c2 moved east, same ms, written later"]);
    expect((await http.getAllCharts("west"))).toEqual([]);
    expect((await http.getChart("c1"))?.desired_outcome).toBe("c1 newest");
  });
});
