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
 */

import type { Tool } from "../types.js";
import { store } from "../store.js";

interface ActionStep {
  id: string;
  title: string;
  current_reality: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
  sub_chart_id?: string;
  due_date?: string;
  completed_at?: string;
  ceremonies_honored: string[];
  relations_honored: string[];
}

export const structuralTensionTools: Tool[] = [
  {
    name: "create_structural_tension_chart",
    description: "Create a structural tension chart with desired outcome, current reality, and optional action steps. Charts are associated with a medicine wheel direction. REMEMBER: Desired outcome is what you want to CREATE (not solve). Current reality must be factual assessment (never 'ready to begin').",
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
          description: "When you want to achieve this outcome (ISO date string, optional)",
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
        const chartId = `stc:${args.direction}:${Date.now()}`;

        const actionSteps: ActionStep[] = (args.action_steps || []).map((title: string, idx: number) => ({
          id: `${chartId}_action_${idx}`,
          title,
          current_reality: 'Not yet assessed',
          status: 'pending' as const,
          progress: 0,
          ceremonies_honored: [],
          relations_honored: [],
        }));

        const chart = {
          id: chartId,
          desired_outcome: args.desired_outcome,
          current_reality: args.current_reality,
          direction: args.direction,
          action_steps: actionSteps,
          due_date: args.due_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phase: 'germination',
          ceremonies_linked: [] as string[],
        };

        store.saveChart(chart);

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
    name: "add_action_step",
    description: "Add a strategic secondary choice (action step) to an existing structural tension chart. Each action step is NOT a task — it's a strategic choice that supports the primary goal. Can be telescoped into its own sub-chart.",
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
          description: "Optional due date for this action step",
        },
      },
      required: ["chart_id", "title", "current_reality"],
    },
    handler: async (args) => {
      try {
        const chart = store.getChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const actionStep: ActionStep = {
          id: `${args.chart_id}_action_${chart.action_steps.length}`,
          title: args.title,
          current_reality: args.current_reality,
          status: 'pending',
          progress: 0,
          due_date: args.due_date,
          ceremonies_honored: [],
          relations_honored: [],
        };

        chart.action_steps.push(actionStep);
        chart.updated_at = new Date().toISOString();

        store.saveChart(chart);

        return {
          action_step_id: actionStep.id,
          chart_id: args.chart_id,
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
        const parentChart = store.getChart(args.chart_id);
        if (!parentChart) {
          return { status: "not_found", message: `Parent chart ${args.chart_id} not found` };
        }

        const actionStep = parentChart.action_steps.find((s: ActionStep) => s.id === args.action_step_id);
        if (!actionStep) {
          return { status: "not_found", message: `Action step ${args.action_step_id} not found` };
        }

        const subChartId = `stc:${parentChart.direction}:${Date.now()}:sub`;

        const subActionSteps: ActionStep[] = (args.initial_action_steps || []).map((title: string, idx: number) => ({
          id: `${subChartId}_action_${idx}`,
          title,
          current_reality: 'Not yet assessed',
          status: 'pending' as const,
          progress: 0,
          ceremonies_honored: [],
          relations_honored: [],
        }));

        const subChart = {
          id: subChartId,
          desired_outcome: actionStep.title,
          current_reality: args.new_current_reality,
          direction: parentChart.direction,
          action_steps: subActionSteps,
          due_date: actionStep.due_date || parentChart.due_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phase: 'germination',
          ceremonies_linked: [] as string[],
        };

        store.saveChart(subChart);

        // Link sub-chart to action step
        actionStep.sub_chart_id = subChartId;
        parentChart.updated_at = new Date().toISOString();
        store.saveChart(parentChart);

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
        const chart = store.getChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const actionStep = chart.action_steps.find((s: ActionStep) => s.id === args.action_step_id);
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
        store.saveChart(chart);

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
    description: "Mark an action step as complete. Optionally link a ceremony that honored this completion.",
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
      },
      required: ["chart_id", "action_step_id"],
    },
    handler: async (args) => {
      try {
        const chart = store.getChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const actionStep = chart.action_steps.find((s: ActionStep) => s.id === args.action_step_id);
        if (!actionStep) {
          return { status: "not_found", message: `Action step ${args.action_step_id} not found` };
        }

        actionStep.status = 'completed';
        actionStep.progress = 100;
        actionStep.completed_at = new Date().toISOString();

        if (args.ceremony_id) {
          actionStep.ceremonies_honored.push(args.ceremony_id);
          if (!chart.ceremonies_linked.includes(args.ceremony_id)) {
            chart.ceremonies_linked.push(args.ceremony_id);
          }
        }

        // Update chart phase based on completion
        const completedCount = chart.action_steps.filter((s: ActionStep) => s.status === 'completed').length;
        const totalCount = chart.action_steps.length;

        if (totalCount > 0) {
          if (completedCount === totalCount) {
            chart.phase = 'completion';
          } else if (completedCount > 0) {
            chart.phase = 'assimilation';
          }
        }

        chart.updated_at = new Date().toISOString();
        store.saveChart(chart);

        const allComplete = completedCount === totalCount && totalCount > 0;

        return {
          action_step_id: args.action_step_id,
          completed_at: actionStep.completed_at,
          chart_phase: chart.phase,
          completed_count: completedCount,
          total_count: totalCount,
          all_complete: allComplete,
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
        const chart = store.getChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const previous = chart.current_reality;
        chart.current_reality = args.new_current_reality;
        chart.updated_at = new Date().toISOString();

        store.saveChart(chart);

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
    name: "get_chart_progress",
    description: "Get progress report for a structural tension chart. Shows desired outcome, current reality, action step status, and overall phase.",
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
        const chart = store.getChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const completedSteps = chart.action_steps.filter((s: ActionStep) => s.status === 'completed').length;
        const inProgressSteps = chart.action_steps.filter((s: ActionStep) => s.status === 'in_progress').length;
        const pendingSteps = chart.action_steps.filter((s: ActionStep) => s.status === 'pending').length;
        const avgProgress = chart.action_steps.length > 0
          ? chart.action_steps.reduce((sum: number, s: ActionStep) => sum + s.progress, 0) / chart.action_steps.length
          : 0;

        return {
          chart_id: chart.id,
          direction: chart.direction,
          phase: chart.phase,
          desired_outcome: chart.desired_outcome,
          current_reality: chart.current_reality,
          due_date: chart.due_date,
          progress: {
            overall_percentage: Math.round(avgProgress),
            completed: completedSteps,
            in_progress: inProgressSteps,
            pending: pendingSteps,
            total: chart.action_steps.length,
          },
          action_steps: chart.action_steps.map((s: ActionStep) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            progress: s.progress,
            has_sub_chart: !!s.sub_chart_id,
          })),
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
    description: "List all active structural tension charts. Filter by medicine wheel direction.",
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
        const charts = store.getAllCharts(args.direction);

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
            completed_steps: c.action_steps.filter((s: ActionStep) => s.status === 'completed').length,
            due_date: c.due_date,
            updated_at: c.updated_at,
          })),
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
        const chart = store.getChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const mmotId = `mmot:${args.chart_id}:${Date.now()}`;

        store.saveMmot({
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
        store.saveChart(chart);

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
        const chart = store.getChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        if (!chart.ceremonies_linked.includes(args.ceremony_id)) {
          chart.ceremonies_linked.push(args.ceremony_id);
          chart.updated_at = new Date().toISOString();
          store.saveChart(chart);
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
        const chart = store.getChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        chart.cycle_id = args.cycle_id;
        chart.updated_at = new Date().toISOString();
        store.saveChart(chart);

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
        const chart = store.getChart(args.chart_id);
        if (!chart) {
          return { status: "not_found", message: `Chart ${args.chart_id} not found` };
        }

        const actionStep = chart.action_steps.find((s: ActionStep) => s.id === args.action_step_id);
        if (!actionStep) {
          return { status: "not_found", message: `Action step ${args.action_step_id} not found` };
        }

        if (!actionStep.relations_honored.includes(args.node_id)) {
          actionStep.relations_honored.push(args.node_id);
          chart.updated_at = new Date().toISOString();
          store.saveChart(chart);
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
