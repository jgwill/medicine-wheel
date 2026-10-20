/**
 * Structural Tension Chart Tools for Medicine Wheel
 *
 * Implements Robert Fritz's structural tension methodology with Four Directions integration.
 * Adapted to use in-memory store instead of Redis.
 *
 * Direction mapping:
 * - EAST: Vision/Desired Outcome (where we want to be)
 * - SOUTH: Growth/Action Steps (embodied practice)
 * - WEST: Reflection/Current Reality assessment (honest truth)
 * - NORTH: Wisdom/Completion (integration)
 *
 * Delayed resolution (Episode 297, 2026-10-19): a step can record that someone
 * strategically chose to delay its resolution — when resolution is wanted, why
 * waiting serves the work, and which agent session to rehydrate when the time
 * or the event comes. Contract: rispecs/delayed-resolution.spec.md.
 */

import type { Tool } from "../types.js";
import { store } from "../store.js";

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

/** The agent session a delayed step brings back when its delay ends. */
export interface AgentSessionRef {
  session_id: string;
  agent: string;
  host?: string;
  cwd?: string;
  tmux?: string;
  resume_command?: string;
  inventory_record?: string;
}

/** A strategic choice to delay a step's resolution, kept after it ends. */
export interface DelayedResolution {
  chosen_at: string;
  chosen_by: string;
  resolve_by: string;
  reason: string;
  primary_choice?: string;
  wake_on?: string[];
  session?: AgentSessionRef;
  ended_at?: string;
  ended_by?: string;
  /** rehydrated and released come from end_delayed_resolution; resolved from completing the step. */
  outcome?: 'rehydrated' | 'released' | 'resolved';
  end_note?: string;
}

interface ActionStep {
  id: string;
  title: string;
  current_reality: string;
  status: StepStatus;
  progress: number;
  sub_chart_id?: string;
  due_date?: string;
  completed_at?: string;
  ceremonies_honored: string[];
  relations_honored: string[];
  delayed_resolution?: DelayedResolution;
  delayed_resolution_history?: DelayedResolution[];
}

interface DueDateChange {
  from: string | null;
  to: string;
  at: string;
}

interface Chart {
  id: string;
  desired_outcome: string;
  current_reality: string;
  direction: string;
  action_steps: ActionStep[];
  due_date?: string;
  due_date_history?: DueDateChange[];
  created_at: string;
  updated_at: string;
  phase: string;
  ceremonies_linked: string[];
  cycle_id?: string;
  [key: string]: unknown;
}

type MaybePromise<T> = T | Promise<T>;

/**
 * What these tools need from a store. Both the JSONL store and the HTTP store
 * satisfy it; tests pass a JsonlStore over a temporary directory.
 */
export interface StructuralTensionStore {
  saveChart(chart: any): MaybePromise<void>;
  getChart(id: string): MaybePromise<any | undefined>;
  getAllCharts(direction?: string): MaybePromise<any[]>;
  saveMmot(mmot: any): MaybePromise<void>;
}

const DAY_MS = 86_400_000;

// ── Helpers ────────────────────────────────────────────────────────────────

/** ISO form of a date the caller gave, or null when it is not a date. */
function isoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function refuse(refusal: string, message: string, extra: Record<string, unknown> = {}) {
  return { status: "refused", refusal, message, ...extra };
}

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * The next step id for a chart: one past the highest index already used.
 * The array length is not an index once a step can be removed — two steps
 * would then share an id.
 */
function nextStepId(chart: Chart): string {
  const prefix = `${chart.id}_action_`;
  let max = -1;
  for (const s of chart.action_steps) {
    if (typeof s.id === 'string' && s.id.startsWith(prefix)) {
      const n = Number(s.id.slice(prefix.length));
      if (Number.isInteger(n) && n > max) max = n;
    }
  }
  const ids = new Set(chart.action_steps.map(s => s.id));
  let next = max + 1;
  while (ids.has(`${prefix}${next}`)) next++;
  return `${prefix}${next}`;
}

/**
 * Due dates for steps written with a chart: spread evenly between now and the
 * chart's due date, leaving one interval before it. A chart already past its
 * date gives each step that date; a chart without one gives none.
 */
function spreadDueDates(chartDue: string | undefined, count: number, now = Date.now()): (string | undefined)[] {
  const due = chartDue ? Date.parse(chartDue) : NaN;
  if (Number.isNaN(due)) return Array.from({ length: count }, () => undefined);
  if (due <= now) return Array.from({ length: count }, () => new Date(due).toISOString());
  const interval = (due - now) / (count + 1);
  return Array.from({ length: count }, (_, i) => new Date(now + interval * (i + 1)).toISOString());
}

function newStep(id: string, title: string, due: string | undefined, currentReality = 'Not yet assessed'): ActionStep {
  const step: ActionStep = {
    id,
    title,
    current_reality: currentReality,
    status: 'pending',
    progress: 0,
    ceremonies_honored: [],
    relations_honored: [],
  };
  if (due) step.due_date = due;
  return step;
}

function findStep(chart: Chart, stepId: string): ActionStep | undefined {
  return chart.action_steps.find(s => s.id === stepId);
}

function isOpen(delay: DelayedResolution | undefined): delay is DelayedResolution {
  return !!delay && !delay.ended_at;
}

/** The status a step returns to when its delay ends: it never completed while waiting. */
function statusAfterDelay(step: ActionStep): StepStatus {
  return (step.progress ?? 0) > 0 ? 'in_progress' : 'pending';
}

function daysRemaining(resolveBy: string, now: number): number {
  // `+ 0` turns -0 into 0 so a delay due within the day reads as 0.
  return Math.ceil((Date.parse(resolveBy) - now) / DAY_MS) + 0;
}

function isOwed(delay: DelayedResolution, now: number): boolean {
  return isOpen(delay) && Date.parse(delay.resolve_by) <= now;
}

function settlePhase(chart: Chart): { completed: number; total: number } {
  const total = chart.action_steps.length;
  const completed = chart.action_steps.filter(s => s.status === 'completed').length;
  if (total > 0) {
    if (completed === total) chart.phase = 'completion';
    else if (completed > 0) chart.phase = 'assimilation';
  }
  return { completed, total };
}

function appendReality(chart: Chart, line: string): void {
  chart.current_reality = chart.current_reality ? `${chart.current_reality}\n${line}` : line;
}

function shellQuote(value: string): string {
  return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}

/** The command that resumes a session: the stored one, or for Claude, `claude --resume <id>`. */
function resumeCommandFor(session: AgentSessionRef | undefined): { resume_command: string | null; resume_command_derived?: boolean } {
  if (!session) return { resume_command: null };
  if (session.resume_command) return { resume_command: session.resume_command, resume_command_derived: false };
  if ((session.agent ?? 'claude') === 'claude') {
    const cmd = `claude --resume ${shellQuote(session.session_id)}`;
    return {
      resume_command: session.cwd ? `cd ${shellQuote(session.cwd)} && ${cmd}` : cmd,
      resume_command_derived: true,
    };
  }
  return { resume_command: null };
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

function normalizeSession(input: unknown): { session?: AgentSessionRef; error?: string } {
  const value = parseMaybeJson(input);
  if (value === undefined || value === null || value === '') return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'session must be an object carrying session_id' };
  }
  const s = value as Record<string, unknown>;
  const sessionId = nonEmpty(s.session_id);
  if (!sessionId) return { error: 'session.session_id is required' };
  const session: AgentSessionRef = { session_id: sessionId, agent: nonEmpty(s.agent) ?? 'claude' };
  for (const key of ['host', 'cwd', 'tmux', 'resume_command', 'inventory_record'] as const) {
    const v = nonEmpty(s[key]);
    if (v) session[key] = v;
  }
  return { session };
}

function normalizeWakeOn(input: unknown): string[] | undefined {
  const value = parseMaybeJson(input);
  if (value === undefined || value === null || value === '') return undefined;
  const list = Array.isArray(value) ? value : [value];
  const cues = list.map(v => nonEmpty(v)).filter((v): v is string => !!v);
  return cues.length > 0 ? cues : undefined;
}

type DelayState = 'open' | 'ended' | 'superseded';

/** One row of a delay listing. `owed` is true only for an open delay whose date has passed. */
function delayRow(chart: Chart, step: ActionStep, delay: DelayedResolution, state: DelayState, now: number) {
  return {
    chart_id: chart.id,
    desired_outcome: chart.desired_outcome,
    step_id: step.id,
    step_title: step.title,
    step_status: step.status,
    state,
    resolve_by: delay.resolve_by,
    days_remaining: daysRemaining(delay.resolve_by, now),
    owed: state === 'open' && isOwed(delay, now),
    reason: delay.reason,
    chosen_by: delay.chosen_by,
    chosen_at: delay.chosen_at,
    primary_choice: delay.primary_choice,
    wake_on: delay.wake_on ?? [],
    session: delay.session ?? null,
    ...(delay.ended_at
      ? { ended_at: delay.ended_at, ended_by: delay.ended_by, outcome: delay.outcome, end_note: delay.end_note }
      : {}),
  };
}

function stepSummary(step: ActionStep, now: number) {
  const delay = isOpen(step.delayed_resolution) ? step.delayed_resolution : undefined;
  return {
    id: step.id,
    title: step.title,
    status: step.status,
    progress: step.progress,
    due_date: step.due_date,
    has_sub_chart: !!step.sub_chart_id,
    ...(delay
      ? { delayed: { resolve_by: delay.resolve_by, days_remaining: daysRemaining(delay.resolve_by, now), owed: isOwed(delay, now) } }
      : {}),
  };
}

function openDelayCounts(chart: Chart, now: number): { delayed_steps: number; owed_delays: number } {
  let delayed = 0;
  let owed = 0;
  for (const s of chart.action_steps) {
    if (isOpen(s.delayed_resolution)) {
      delayed++;
      if (isOwed(s.delayed_resolution, now)) owed++;
    }
  }
  return { delayed_steps: delayed, owed_delays: owed };
}

// ── Tools ──────────────────────────────────────────────────────────────────

export function createStructuralTensionTools(targetStore: StructuralTensionStore): Tool[] {
  const store = targetStore;

  async function loadChart(chartId: string): Promise<Chart | undefined> {
    return (await store.getChart(chartId)) as Chart | undefined;
  }

  return [
  {
    name: "create_structural_tension_chart",
    description: "Create a structural tension chart with desired outcome, current reality, and optional action steps. Charts are associated with a medicine wheel direction. REMEMBER: Desired outcome is what you want to CREATE (not solve). Current reality must be factual assessment (never 'ready to begin'). When the chart has a due date, the initial steps get due dates spread between now and that date.",
    inputSchema: {
      type: "object",
      properties: {
        desired_outcome: {
          type: "string",
          description: "What you want to CREATE (not solve/fix). Focus on positive outcomes, not problems to eliminate. Must be visualizable, specific, quantified where possible.",
        },
        current_reality: {
          type: "string",
          description: "Factual assessment of where you are NOW relative to the desired outcome. NEVER use 'ready to begin' or readiness statements. Just facts.",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Which medicine wheel direction this chart serves (east=vision, south=growth, west=reflection, north=wisdom)",
        },
        due_date: {
          type: "string",
          description: "When you want to achieve this outcome (ISO date string, optional). Stored in ISO form.",
        },
        action_steps: {
          type: "array",
          items: { type: "string" },
          description: "Optional strategic secondary choices (NOT tasks). Each step should support advancement toward the desired outcome.",
        },
      },
      required: ["desired_outcome", "current_reality", "direction"],
    },
    handler: async (args) => {
      try {
        let dueDate: string | undefined;
        if (args.due_date !== undefined && args.due_date !== null && args.due_date !== '') {
          const iso = isoOrNull(args.due_date);
          if (!iso) return refuse("due_date_invalid", `due_date is not a date: ${JSON.stringify(args.due_date)}. Use an ISO date, e.g. 2026-11-30T17:00:00Z`);
          dueDate = iso;
        }

        const chartId = `stc:${args.direction}:${Date.now()}`;
        const titles: string[] = args.action_steps || [];
        const stepDue = spreadDueDates(dueDate, titles.length);

        const actionSteps: ActionStep[] = titles.map((title: string, idx: number) =>
          newStep(`${chartId}_action_${idx}`, title, stepDue[idx]));

        const chart: Chart = {
          id: chartId,
          desired_outcome: args.desired_outcome,
          current_reality: args.current_reality,
          direction: args.direction,
          action_steps: actionSteps,
          due_date: dueDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phase: 'germination',
          ceremonies_linked: [] as string[],
        };

        await store.saveChart(chart);

        return {
          chart_id: chartId,
          direction: args.direction,
          phase: 'germination',
          action_steps_count: actionSteps.length,
          chart: chart,
          teaching: "Structural tension is the generative force. The tension between desired outcome and current reality naturally seeks resolution through advancement.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to create chart: ${errorMsg}` };
      }
    },
  },
  {
    name: "get_chart",
    description: "Read a structural tension chart whole: desired outcome, current reality, due date and every action step as stored, including delayed resolutions and their history.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: { type: "string", description: "ID of the chart" },
      },
      required: ["chart_id"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }
        const now = Date.now();
        return {
          chart_id: chart.id,
          chart,
          ...openDelayCounts(chart, now),
          teaching: "The chart is read as a whole: the tension lives between its desired outcome and its current reality, not in any single step.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to get chart: ${errorMsg}` };
      }
    },
  },
  {
    name: "get_action_step",
    description: "Read one action step of a chart, with its due date, any delayed resolution (open or ended) and its history, and the sub-chart it telescopes into when it has one.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: { type: "string", description: "ID of the chart holding the step" },
        step_id: { type: "string", description: "ID of the action step" },
      },
      required: ["chart_id", "step_id"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }
        const step = findStep(chart, args.step_id);
        if (!step) {
          return { status: "not_found", message: `Action step ${args.step_id} not found in chart ${args.chart_id}` };
        }
        const now = Date.now();
        let subChart: Chart | undefined;
        if (step.sub_chart_id) subChart = await loadChart(step.sub_chart_id);

        return {
          chart_id: chart.id,
          chart: {
            id: chart.id,
            desired_outcome: chart.desired_outcome,
            direction: chart.direction,
            due_date: chart.due_date,
          },
          step,
          delay: step.delayed_resolution
            ? delayRow(chart, step, step.delayed_resolution, isOpen(step.delayed_resolution) ? 'open' : 'ended', now)
            : null,
          ...(step.sub_chart_id
            ? subChart
              ? { sub_chart: subChart }
              : { sub_chart: null, sub_chart_missing: step.sub_chart_id }
            : {}),
          teaching: "A step is a strategic secondary choice, read in the context of the chart it serves.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to get action step: ${errorMsg}` };
      }
    },
  },
  {
    name: "add_action_step",
    description: "Add a strategic secondary choice (action step) to an existing structural tension chart. Each action step is NOT a task — it's a strategic choice that supports the primary goal. Can be telescoped into its own sub-chart. A step without its own due date takes the chart's.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the chart to add action step to",
        },
        title: {
          type: "string",
          description: "Title of the action step (strategic secondary choice)",
        },
        current_reality: {
          type: "string",
          description: "Current reality for this specific action step",
        },
        due_date: {
          type: "string",
          description: "Optional due date for this action step (ISO date). When omitted, the step takes the chart's due date.",
        },
      },
      required: ["chart_id", "title", "current_reality"],
    },
    handler: async (args) => {
      try {
        let dueDate: string | undefined;
        if (args.due_date !== undefined && args.due_date !== null && args.due_date !== '') {
          const iso = isoOrNull(args.due_date);
          if (!iso) return refuse("due_date_invalid", `due_date is not a date: ${JSON.stringify(args.due_date)}. Use an ISO date, e.g. 2026-11-30T17:00:00Z`);
          dueDate = iso;
        }

        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const inherited = dueDate === undefined;
        if (inherited) dueDate = isoOrNull(chart.due_date) ?? undefined;

        const actionStep = newStep(nextStepId(chart), args.title, dueDate, args.current_reality);

        chart.action_steps.push(actionStep);
        chart.updated_at = new Date().toISOString();

        await store.saveChart(chart);

        return {
          action_step_id: actionStep.id,
          chart_id: args.chart_id,
          due_date: actionStep.due_date ?? null,
          due_date_inherited: inherited && actionStep.due_date !== undefined,
          total_steps: chart.action_steps.length,
          teaching: "Action steps are strategic secondary choices understood in context of the structural tension, not isolated tasks.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to add action step: ${errorMsg}` };
      }
    },
  },
  {
    name: "remove_action_step",
    description: "Remove an action step from a chart. A sub-chart the step telescoped into is not deleted; its id is returned so it can be reached.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: { type: "string", description: "ID of the chart" },
        step_id: { type: "string", description: "ID of the action step to remove" },
      },
      required: ["chart_id", "step_id"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }
        const index = chart.action_steps.findIndex(s => s.id === args.step_id);
        if (index === -1) {
          return { status: "not_found", message: `Action step ${args.step_id} not found in chart ${args.chart_id}` };
        }
        const [removed] = chart.action_steps.splice(index, 1);
        settlePhase(chart);
        chart.updated_at = new Date().toISOString();
        await store.saveChart(chart);

        return {
          chart_id: chart.id,
          removed_step: removed,
          remaining_steps: chart.action_steps.length,
          ...(removed.sub_chart_id ? { sub_chart_left: removed.sub_chart_id } : {}),
          teaching: "Removing a step is a strategic choice too: the structure is rebuilt around what still serves the desired outcome.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to remove action step: ${errorMsg}` };
      }
    },
  },
  {
    name: "telescope_action_step",
    description: "Expand an action step into its own structural tension chart (sub-chart). The action step title becomes the desired outcome of the new chart. This enables hierarchical planning while maintaining structural tension at each level.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the parent chart",
        },
        action_step_id: {
          type: "string",
          description: "ID of the action step to telescope",
        },
        new_current_reality: {
          type: "string",
          description: "Current reality for the telescoped chart (required, must be factual)",
        },
        initial_action_steps: {
          type: "array",
          items: { type: "string" },
          description: "Optional initial action steps for the sub-chart",
        },
      },
      required: ["chart_id", "action_step_id", "new_current_reality"],
    },
    handler: async (args) => {
      try {
        const parentChart = await loadChart(args.chart_id);
        if (!parentChart) {
          return { status: "not_found", message: `Parent chart ${args.chart_id} not found` };
        }

        const actionStep = findStep(parentChart, args.action_step_id);
        if (!actionStep) {
          return { status: "not_found", message: `Action step ${args.action_step_id} not found` };
        }

        const subChartId = `stc:${parentChart.direction}:${Date.now()}:sub`;
        const subDue = actionStep.due_date || parentChart.due_date;
        const titles: string[] = args.initial_action_steps || [];
        const stepDue = spreadDueDates(subDue, titles.length);

        const subActionSteps: ActionStep[] = titles.map((title: string, idx: number) =>
          newStep(`${subChartId}_action_${idx}`, title, stepDue[idx]));

        const subChart: Chart = {
          id: subChartId,
          desired_outcome: actionStep.title,
          current_reality: args.new_current_reality,
          direction: parentChart.direction,
          action_steps: subActionSteps,
          due_date: subDue,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phase: 'germination',
          ceremonies_linked: [] as string[],
        };

        await store.saveChart(subChart);

        // Link sub-chart to action step
        actionStep.sub_chart_id = subChartId;
        parentChart.updated_at = new Date().toISOString();
        await store.saveChart(parentChart);

        return {
          sub_chart_id: subChartId,
          parent_chart_id: args.chart_id,
          action_step_id: args.action_step_id,
          desired_outcome: actionStep.title,
          sub_action_steps: subActionSteps.length,
          teaching: "Each action step can become its own structural tension chart. The hierarchy maintains tension at every level.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to telescope action step: ${errorMsg}` };
      }
    },
  },
  {
    name: "update_action_progress",
    description: "Update progress on an action step without marking it complete. Progress can advance while work continues.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the chart",
        },
        action_step_id: {
          type: "string",
          description: "ID of the action step",
        },
        progress: {
          type: "number",
          description: "Progress percentage (0-100)",
          minimum: 0,
          maximum: 100,
        },
        new_current_reality: {
          type: "string",
          description: "Optional updated current reality for this action step",
        },
      },
      required: ["chart_id", "action_step_id", "progress"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const actionStep = findStep(chart, args.action_step_id);
        if (!actionStep) {
          return { status: "not_found", message: `Action step ${args.action_step_id} not found` };
        }

        actionStep.progress = args.progress;
        if (args.progress > 0 && actionStep.status === 'pending') {
          actionStep.status = 'in_progress';
        }
        if (args.new_current_reality) {
          actionStep.current_reality = args.new_current_reality;
        }

        chart.updated_at = new Date().toISOString();
        await store.saveChart(chart);

        return {
          action_step_id: args.action_step_id,
          progress: args.progress,
          status: actionStep.status,
          teaching: "Progress without completion is honest advancement. The structure continues to seek resolution.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to update progress: ${errorMsg}` };
      }
    },
  },
  {
    name: "mark_action_complete",
    description: "Mark an action step as complete and add 'Completed: <title>' to the chart's current reality. Optionally link a ceremony that honored this completion. A step completed while its resolution was delayed ends that delay with outcome 'resolved'.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the chart",
        },
        action_step_id: {
          type: "string",
          description: "ID of the action step to complete",
        },
        ceremony_id: {
          type: "string",
          description: "Optional ceremony ID that honored this completion",
        },
        completed_by: {
          type: "string",
          description: "Optional: the person or seat completing the step. Recorded as ended_by when the completion ends a delayed resolution.",
        },
      },
      required: ["chart_id", "action_step_id"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const actionStep = findStep(chart, args.action_step_id);
        if (!actionStep) {
          return { status: "not_found", message: `Action step ${args.action_step_id} not found` };
        }

        const wasCompleted = actionStep.status === 'completed';
        const now = new Date().toISOString();

        let delayEnded: DelayedResolution | undefined;
        if (isOpen(actionStep.delayed_resolution)) {
          // Rule 4b: resolution reached is the third way a delay ends.
          Object.assign(actionStep.delayed_resolution, {
            ended_at: now,
            ended_by: nonEmpty(args.completed_by) ?? 'mark_action_complete',
            outcome: 'resolved',
            end_note: 'completed',
          });
          delayEnded = actionStep.delayed_resolution;
        }

        actionStep.status = 'completed';
        actionStep.progress = 100;
        if (!wasCompleted) actionStep.completed_at = now;

        if (args.ceremony_id) {
          actionStep.ceremonies_honored.push(args.ceremony_id);
          if (!chart.ceremonies_linked.includes(args.ceremony_id)) {
            chart.ceremonies_linked.push(args.ceremony_id);
          }
        }

        // Completion flows into current reality, once.
        if (!wasCompleted) appendReality(chart, `Completed: ${actionStep.title}`);

        const { completed: completedCount, total: totalCount } = settlePhase(chart);

        chart.updated_at = now;
        await store.saveChart(chart);

        const allComplete = completedCount === totalCount && totalCount > 0;

        return {
          action_step_id: args.action_step_id,
          completed_at: actionStep.completed_at,
          chart_phase: chart.phase,
          completed_count: completedCount,
          total_count: totalCount,
          all_complete: allComplete,
          current_reality: chart.current_reality,
          ...(delayEnded ? { delayed_resolution_ended: delayEnded } : {}),
          ceremony_suggestion: allComplete
            ? "All action steps complete. Consider logging a closing ceremony (direction: north) to honor this achievement."
            : undefined,
          teaching: "Completion flows into current reality. Each completed step advances the whole structure.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to mark complete: ${errorMsg}` };
      }
    },
  },
  {
    name: "delay_resolution",
    description: "Record on an action step that someone strategically chose to delay its resolution: when resolution is wanted (resolve_by, in the future), why waiting serves the work now, what the delay serves (defaults to the chart's desired outcome), event cues to wake on, and the agent session to rehydrate. Sets the step's due date to resolve_by and its status to 'delayed'. Re-delaying keeps the earlier record in delayed_resolution_history. A completed step cannot be delayed.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: { type: "string", description: "ID of the chart holding the step" },
        step_id: { type: "string", description: "ID of the action step" },
        resolve_by: { type: "string", description: "When resolution is wanted (ISO date-time, in the future). Becomes the step's due date." },
        reason: { type: "string", description: "Why delaying resolution serves the work now" },
        chosen_by: { type: "string", description: "The person or seat that made the choice" },
        primary_choice: { type: "string", description: "What the delay serves. Defaults to the chart's desired outcome, copied now." },
        wake_on: {
          type: "array",
          items: { type: "string" },
          description: "Event cues, in words, that should end the wait before resolve_by",
        },
        session: {
          type: "object",
          description: "The agent session to rehydrate when the delay ends",
          properties: {
            session_id: { type: "string", description: "Claude Code session id, or another agent's" },
            agent: { type: "string", description: "Agent kind (default 'claude')" },
            host: { type: "string", description: "Host the session lives on (gaia, ilex, eury)" },
            cwd: { type: "string", description: "Working directory of the session" },
            tmux: { type: "string", description: "tmux session or pane" },
            resume_command: { type: "string", description: "Command that resumes it, e.g. `cd <cwd> && claude --resume <id>`" },
            inventory_record: { type: "string", description: "Path of its record in the session inventory" },
          },
          required: ["session_id"],
        },
      },
      required: ["chart_id", "step_id", "resolve_by", "reason", "chosen_by"],
    },
    handler: async (args) => {
      try {
        const reason = nonEmpty(args.reason);
        if (!reason) return refuse("reason_missing", "reason is required: say why delaying resolution serves the work now");
        const chosenBy = nonEmpty(args.chosen_by);
        if (!chosenBy) return refuse("chosen_by_missing", "chosen_by is required: the person or seat that made the choice");

        const resolveBy = isoOrNull(args.resolve_by);
        if (!resolveBy) {
          return refuse("resolve_by_invalid", `resolve_by is not a date: ${JSON.stringify(args.resolve_by)}. Use an ISO date-time, e.g. 2026-11-02T09:00:00Z`);
        }
        const now = Date.now();
        if (Date.parse(resolveBy) <= now) {
          return refuse("resolve_by_past", `resolve_by ${resolveBy} is not in the future. A delay names when resolution is wanted, later than now.`);
        }

        const { session, error: sessionError } = normalizeSession(args.session);
        if (sessionError) return refuse("session_invalid", sessionError);

        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }
        const step = findStep(chart, args.step_id);
        if (!step) {
          return { status: "not_found", message: `Action step ${args.step_id} not found in chart ${args.chart_id}` };
        }
        if (step.status === 'completed') {
          return refuse("step_completed", `Action step ${step.id} is completed; a completed step cannot be delayed.`);
        }

        const record: DelayedResolution = {
          chosen_at: new Date(now).toISOString(),
          chosen_by: chosenBy,
          resolve_by: resolveBy,
          reason,
          primary_choice: nonEmpty(args.primary_choice) ?? chart.desired_outcome,
        };
        const wakeOn = normalizeWakeOn(args.wake_on);
        if (wakeOn) record.wake_on = wakeOn;
        if (session) record.session = session;

        // Nothing is overwritten: an earlier record, open or ended, moves to history.
        const previous = step.delayed_resolution;
        if (previous) {
          step.delayed_resolution_history = [...(step.delayed_resolution_history ?? []), previous];
        }
        step.delayed_resolution = record;
        step.due_date = resolveBy;
        step.status = 'delayed';

        chart.updated_at = new Date(now).toISOString();
        await store.saveChart(chart);

        return {
          chart_id: chart.id,
          step_id: step.id,
          status: step.status,
          due_date: step.due_date,
          days_remaining: daysRemaining(resolveBy, now),
          delayed_resolution: record,
          redelayed: !!previous && isOpen(previous),
          history_length: step.delayed_resolution_history?.length ?? 0,
          step,
          teaching: "Delaying resolution is a secondary choice in service of a primary choice. The tension is held on purpose, with a date when resolution is wanted.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to delay resolution: ${errorMsg}` };
      }
    },
  },
  {
    name: "list_delayed_resolutions",
    description: "List open delayed resolutions across all charts, sorted by resolve_by (soonest first), with days_remaining and owed (resolve_by has passed). Each row names the step, its chart, the primary choice, wake_on cues and the session to rehydrate.",
    inputSchema: {
      type: "object",
      properties: {
        due_within_days: {
          type: "number",
          minimum: 0,
          description: "Only delays whose resolve_by falls within this many days from now (owed ones included)",
        },
        include_ended: {
          type: "boolean",
          description: "Also list ended delays and earlier records kept in history (default false)",
        },
      },
    },
    handler: async (args) => {
      try {
        let windowEnd = Infinity;
        const now = Date.now();
        if (args.due_within_days !== undefined && args.due_within_days !== null) {
          const days = Number(args.due_within_days);
          if (!Number.isFinite(days) || days < 0) {
            return refuse("due_within_days_invalid", `due_within_days must be a number of days, 0 or more: ${JSON.stringify(args.due_within_days)}`);
          }
          windowEnd = now + days * DAY_MS;
        }
        const includeEnded = args.include_ended === true || args.include_ended === 'true';

        const charts = (await store.getAllCharts()) as Chart[];
        const rows: ReturnType<typeof delayRow>[] = [];
        for (const chart of charts) {
          for (const step of chart.action_steps ?? []) {
            const current = step.delayed_resolution;
            if (current) {
              const state: DelayState = isOpen(current) ? 'open' : 'ended';
              if (state === 'open' || includeEnded) rows.push(delayRow(chart, step, current, state, now));
            }
            if (includeEnded) {
              for (const past of step.delayed_resolution_history ?? []) {
                rows.push(delayRow(chart, step, past, past.ended_at ? 'ended' : 'superseded', now));
              }
            }
          }
        }

        const listed = rows
          .filter(r => Date.parse(r.resolve_by) <= windowEnd)
          .sort((a, b) => Date.parse(a.resolve_by) - Date.parse(b.resolve_by));

        return {
          count: listed.length,
          open_count: listed.filter(r => r.state === 'open').length,
          owed_count: listed.filter(r => r.owed).length,
          as_of: new Date(now).toISOString(),
          filter: {
            due_within_days: args.due_within_days ?? null,
            include_ended: includeEnded,
          },
          delays: listed,
          teaching: "A delay whose date has passed is owed: the choice to wait has come due and asks to be resolved, re-chosen, or released.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to list delayed resolutions: ${errorMsg}` };
      }
    },
  },
  {
    name: "end_delayed_resolution",
    description: "End a step's open delayed resolution, either by rehydrating its agent session or by releasing the step. The record is kept with ended_at, ended_by and outcome, and the step returns to pending or in_progress. When rehydrated, returns the session's resume_command.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: { type: "string", description: "ID of the chart holding the step" },
        step_id: { type: "string", description: "ID of the action step" },
        ended_by: { type: "string", description: "The person or seat ending the delay" },
        outcome: {
          type: "string",
          enum: ["rehydrated", "released"],
          description: "rehydrated: the session is being resumed; released: the step is let go from the wait",
        },
        end_note: { type: "string", description: "Optional note on how the delay ended" },
      },
      required: ["chart_id", "step_id", "ended_by", "outcome"],
    },
    handler: async (args) => {
      try {
        const endedBy = nonEmpty(args.ended_by);
        if (!endedBy) return refuse("ended_by_missing", "ended_by is required: the person or seat ending the delay");
        if (args.outcome !== 'rehydrated' && args.outcome !== 'released') {
          return refuse("outcome_invalid", `outcome must be 'rehydrated' or 'released', got ${JSON.stringify(args.outcome)}`);
        }

        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }
        const step = findStep(chart, args.step_id);
        if (!step) {
          return { status: "not_found", message: `Action step ${args.step_id} not found in chart ${args.chart_id}` };
        }
        const delay = step.delayed_resolution;
        if (!isOpen(delay)) {
          return refuse("no_open_delay", `Action step ${step.id} has no open delayed resolution to end.`);
        }

        const now = new Date().toISOString();
        delay.ended_at = now;
        delay.ended_by = endedBy;
        delay.outcome = args.outcome;
        const note = nonEmpty(args.end_note);
        if (note) delay.end_note = note;

        if (step.status === 'delayed') step.status = statusAfterDelay(step);

        chart.updated_at = now;
        await store.saveChart(chart);

        const resume = args.outcome === 'rehydrated' ? resumeCommandFor(delay.session) : undefined;

        return {
          chart_id: chart.id,
          step_id: step.id,
          status: step.status,
          outcome: delay.outcome,
          delayed_resolution: delay,
          ...(resume
            ? {
                session: delay.session ?? null,
                ...resume,
                ...(resume.resume_command === null
                  ? { note: delay.session ? `No resume command is known for agent '${delay.session.agent}'.` : 'This delay carried no session to rehydrate.' }
                  : {}),
              }
            : {}),
          teaching: args.outcome === 'rehydrated'
            ? "Rehydrating brings the waiting session back with its state, so the work resumes where the choice to wait left it."
            : "Releasing ends the wait. The step returns to the structure as an ordinary secondary choice.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to end delayed resolution: ${errorMsg}` };
      }
    },
  },
  {
    name: "update_current_reality",
    description: "Update the current reality assessment of a chart. Current reality should be updated as circumstances change. Always factual, never readiness statements.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the chart",
        },
        new_current_reality: {
          type: "string",
          description: "Updated factual assessment of current reality",
        },
      },
      required: ["chart_id", "new_current_reality"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const previous = chart.current_reality;
        chart.current_reality = args.new_current_reality;
        chart.updated_at = new Date().toISOString();

        await store.saveChart(chart);

        return {
          chart_id: args.chart_id,
          previous_reality: previous,
          current_reality: args.new_current_reality,
          teaching: "Honest assessment of current reality is essential. The tension between reality and vision drives advancement.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to update current reality: ${errorMsg}` };
      }
    },
  },
  {
    name: "update_desired_outcome",
    description: "Replace the desired outcome of a chart. The desired outcome names what is being created, not a problem to remove.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: { type: "string", description: "ID of the chart" },
        new_desired_outcome: { type: "string", description: "What you want to CREATE, stated as something that will exist" },
      },
      required: ["chart_id", "new_desired_outcome"],
    },
    handler: async (args) => {
      try {
        const outcome = nonEmpty(args.new_desired_outcome);
        if (!outcome) return refuse("desired_outcome_missing", "new_desired_outcome must be a non-empty statement of what is being created");
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }
        const previous = chart.desired_outcome;
        chart.desired_outcome = outcome;
        chart.updated_at = new Date().toISOString();
        await store.saveChart(chart);

        return {
          chart_id: chart.id,
          previous_desired_outcome: previous,
          desired_outcome: outcome,
          teaching: "Changing the desired outcome changes the whole structure: every step is re-read against what is now being created.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to update desired outcome: ${errorMsg}` };
      }
    },
  },
  {
    name: "update_chart_due_date",
    description: "Move a chart's due date. The date is stored in ISO form and the move is recorded in the chart's due_date_history. Optionally respread the due dates of open, non-delayed steps between now and the new date. Reports how many open steps fall after the new date.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: { type: "string", description: "ID of the chart" },
        due_date: { type: "string", description: "The new due date (ISO date)" },
        redistribute_action_steps: {
          type: "boolean",
          description: "Respread open steps' due dates between now and the new date (default false). Steps with an open delay keep their resolve_by.",
        },
      },
      required: ["chart_id", "due_date"],
    },
    handler: async (args) => {
      try {
        const iso = isoOrNull(args.due_date);
        if (!iso) return refuse("due_date_invalid", `due_date is not a date: ${JSON.stringify(args.due_date)}. Use an ISO date, e.g. 2026-11-30T17:00:00Z`);

        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const now = Date.now();
        const at = new Date(now).toISOString();
        const previous = chart.due_date ?? null;
        chart.due_date = iso;
        chart.due_date_history = [...(chart.due_date_history ?? []), { from: previous, to: iso, at }];

        const open = chart.action_steps.filter(s => s.status !== 'completed');
        let rescheduled = 0;
        if (args.redistribute_action_steps === true || args.redistribute_action_steps === 'true') {
          const movable = open
            .filter(s => !isOpen(s.delayed_resolution))
            .sort((a, b) => {
              const da = a.due_date ? Date.parse(a.due_date) : Infinity;
              const db = b.due_date ? Date.parse(b.due_date) : Infinity;
              return da - db;
            });
          const dates = spreadDueDates(iso, movable.length, now);
          movable.forEach((s, i) => { s.due_date = dates[i]; });
          rescheduled = movable.length;
        }

        const newTime = Date.parse(iso);
        const pastDue = open.filter(s => s.due_date && Date.parse(s.due_date) > newTime);

        chart.updated_at = at;
        await store.saveChart(chart);

        return {
          chart_id: chart.id,
          previous_due_date: previous,
          new_due_date: iso,
          action_steps_rescheduled: rescheduled,
          action_steps_past_due_date: pastDue.length,
          ...(pastDue.length > 0 ? { steps_after_due_date: pastDue.map(s => ({ id: s.id, title: s.title, due_date: s.due_date, status: s.status })) } : {}),
          teaching: "The due date is part of the structure. Moving it is a choice that every open step is read against.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to update chart due date: ${errorMsg}` };
      }
    },
  },
  {
    name: "get_chart_progress",
    description: "Get progress report for a structural tension chart. Shows desired outcome, current reality, action step status and due dates, delayed resolutions (owed when their date has passed), the next action, and overall phase.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the chart",
        },
      },
      required: ["chart_id"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const now = Date.now();
        const steps = chart.action_steps;
        const count = (status: StepStatus) => steps.filter(s => s.status === status).length;
        const avgProgress = steps.length > 0
          ? steps.reduce((sum, s) => sum + (s.progress ?? 0), 0) / steps.length
          : 0;

        // The next action is the open, not-delayed step due soonest. A delayed
        // step was chosen to wait; when its date passes it is reported as owed.
        const next = steps
          .filter(s => s.status !== 'completed' && !isOpen(s.delayed_resolution))
          .sort((a, b) => {
            const da = a.due_date ? Date.parse(a.due_date) : Infinity;
            const db = b.due_date ? Date.parse(b.due_date) : Infinity;
            return da - db;
          })[0];

        return {
          chart_id: chart.id,
          direction: chart.direction,
          phase: chart.phase,
          desired_outcome: chart.desired_outcome,
          current_reality: chart.current_reality,
          due_date: chart.due_date,
          progress: {
            overall_percentage: Math.round(avgProgress),
            completed: count('completed'),
            in_progress: count('in_progress'),
            pending: count('pending'),
            delayed: count('delayed'),
            total: steps.length,
          },
          ...openDelayCounts(chart, now),
          next_action: next ? { id: next.id, title: next.title, status: next.status, due_date: next.due_date ?? null } : null,
          action_steps: steps.map(s => stepSummary(s, now)),
          ceremonies_linked: chart.ceremonies_linked.length,
          teaching: "Progress is not linear. The structure advances through maintained tension, not willpower.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to get chart progress: ${errorMsg}` };
      }
    },
  },
  {
    name: "list_structural_tension_charts",
    description: "List all active structural tension charts, each with its steps' status, due dates and delayed resolutions. Filter by medicine wheel direction.",
    inputSchema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Filter by medicine wheel direction (optional)",
        },
      },
    },
    handler: async (args) => {
      try {
        const charts = (await store.getAllCharts(args.direction)) as Chart[];
        const now = Date.now();

        return {
          count: charts.length,
          filter: args.direction || 'all',
          charts: charts.map(c => ({
            id: c.id,
            direction: c.direction,
            desired_outcome: c.desired_outcome,
            current_reality: c.current_reality,
            phase: c.phase,
            action_steps_count: c.action_steps.length,
            completed_steps: c.action_steps.filter(s => s.status === 'completed').length,
            ...openDelayCounts(c, now),
            due_date: c.due_date,
            updated_at: c.updated_at,
            action_steps: c.action_steps.map(s => {
              const delay = isOpen(s.delayed_resolution) ? s.delayed_resolution : undefined;
              return {
                id: s.id,
                title: s.title,
                status: s.status,
                due_date: s.due_date,
                ...(delay ? { resolve_by: delay.resolve_by, owed: isOwed(delay, now) } : {}),
              };
            }),
          })),
          // An empty chart store and "there is no structural tension work" are
          // different facts, and this tool used to make them look identical:
          // `{count: 0}` plus a teaching about the strategic landscape reads as
          // an answer. Meanwhile `list_relational_nodes` with kind "stc_chart"
          // returns rows — a DIFFERENT record, a relational node carrying that
          // metadata kind rather than a chart in the chart store. Saying where
          // this tool looked lets a caller tell the two apart instead of
          // concluding nothing exists.
          ...(charts.length === 0
            ? {
                searched: "the chart store (/api/charts)",
                note:
                  "No charts in the chart store. Nodes carrying metadata.kind 'stc_chart' are a separate record — list_relational_nodes with kind 'stc_chart' searches those.",
              }
            : {}),
          teaching: "Each chart holds structural tension that seeks resolution. Together they form the strategic landscape.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to list charts: ${errorMsg}` };
      }
    },
  },
  {
    name: "creator_moment_of_truth",
    description: "Four-step review process (MMOT) for a structural tension chart. Acknowledges truth, analyzes how things happened, creates plan for adjustment, and sets up feedback. Aligns with West direction (reflection/truth).",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the chart to review",
        },
        expected_outcome: {
          type: "string",
          description: "What was expected to happen",
        },
        actual_outcome: {
          type: "string",
          description: "What actually happened (factual)",
        },
        analysis: {
          type: "string",
          description: "How did this come to pass? Step-by-step tracking, not blame.",
        },
        adjustments: {
          type: "array",
          items: { type: "string" },
          description: "What specific changes will be made based on learnings",
        },
        feedback_system: {
          type: "string",
          description: "How will you track whether changes are being made",
        },
      },
      required: ["chart_id", "expected_outcome", "actual_outcome", "analysis", "adjustments"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const mmotId = `mmot:${args.chart_id}:${Date.now()}`;

        await store.saveMmot({
          id: mmotId,
          chart_id: args.chart_id,
          timestamp: new Date().toISOString(),
          step1_expected: args.expected_outcome,
          step1_actual: args.actual_outcome,
          step2_analysis: args.analysis,
          step3_adjustments: args.adjustments,
          step4_feedback: args.feedback_system || '',
        });

        // Update current reality based on MMOT
        chart.current_reality = args.actual_outcome;
        chart.updated_at = new Date().toISOString();
        await store.saveChart(chart);

        return {
          mmot_id: mmotId,
          chart_id: args.chart_id,
          steps: {
            step1_acknowledge: {
              expected: args.expected_outcome,
              actual: args.actual_outcome,
              discrepancy: args.expected_outcome !== args.actual_outcome,
            },
            step2_analyze: args.analysis,
            step3_plan: args.adjustments,
            step4_feedback: args.feedback_system || 'Not specified',
          },
          current_reality_updated: true,
          teaching: "The goal is effectiveness, not perfection. Use discrepancies to learn, not to judge. Truth as a verb.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to complete MMOT: ${errorMsg}` };
      }
    },
  },
  {
    name: "link_ceremony_to_chart",
    description: "Link a ceremony to a structural tension chart. Ceremonies witness and honor the work of advancing toward desired outcomes.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the chart",
        },
        ceremony_id: {
          type: "string",
          description: "ID of the ceremony to link",
        },
      },
      required: ["chart_id", "ceremony_id"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        if (!chart.ceremonies_linked.includes(args.ceremony_id)) {
          chart.ceremonies_linked.push(args.ceremony_id);
          chart.updated_at = new Date().toISOString();
          await store.saveChart(chart);
        }

        return {
          chart_id: args.chart_id,
          ceremony_id: args.ceremony_id,
          total_ceremonies: chart.ceremonies_linked.length,
          teaching: "Ceremony witnesses the work. Strategic advancement is relational practice.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to link ceremony: ${errorMsg}` };
      }
    },
  },
  {
    name: "link_chart_to_cycle",
    description: "Link a structural tension chart to a medicine wheel research cycle. Charts can belong to cycles for organizational grouping.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the chart",
        },
        cycle_id: {
          type: "string",
          description: "ID of the medicine wheel cycle to link to",
        },
      },
      required: ["chart_id", "cycle_id"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        chart.cycle_id = args.cycle_id;
        chart.updated_at = new Date().toISOString();
        await store.saveChart(chart);

        return {
          chart_id: args.chart_id,
          cycle_id: args.cycle_id,
          teaching: "Charts within cycles form the strategic landscape of a research journey.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to link chart to cycle: ${errorMsg}` };
      }
    },
  },
  {
    name: "honor_relation_in_action_step",
    description: "Honor a relational node in an action step. Links the strategic work to relational accountability.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "ID of the chart",
        },
        action_step_id: {
          type: "string",
          description: "ID of the action step",
        },
        node_id: {
          type: "string",
          description: "ID of the relational node to honor",
        },
      },
      required: ["chart_id", "action_step_id", "node_id"],
    },
    handler: async (args) => {
      try {
        const chart = await loadChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const actionStep = findStep(chart, args.action_step_id);
        if (!actionStep) {
          return { status: "not_found", message: `Action step ${args.action_step_id} not found` };
        }

        if (!actionStep.relations_honored.includes(args.node_id)) {
          actionStep.relations_honored.push(args.node_id);
          chart.updated_at = new Date().toISOString();
          await store.saveChart(chart);
        }

        return {
          action_step_id: args.action_step_id,
          node_id: args.node_id,
          total_relations_honored: actionStep.relations_honored.length,
          teaching: "Strategic action is relational. Honoring relations grounds advancement in accountability.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to honor relation: ${errorMsg}` };
      }
    },
  },
  ];
}

export const structuralTensionTools: Tool[] = createStructuralTensionTools(store as StructuralTensionStore);
