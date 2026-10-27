/**
 * Orientation Tools — the question asked before the instrument is chosen, and
 * the turn after a gap analysis.
 *
 * Two situations look identical under pressure and are not: something worked
 * and stopped (a prior state to restore), and something has never existed and
 * is wanted (a creating act, which advances toward it). They produce different
 * structures, and using the wrong instrument is how rigorous work goes in
 * circles.
 *
 * A gap analysis looks for what is missing. It can be useful, and it is not
 * part of the creative orientation. After one, `turn_to_creative_orientation`
 * keeps its findings as current reality and asks for the desired outcome, so a
 * structural tension chart can follow.
 *
 * These tools are listed first because list order is scan order. Every string
 * here says what is true: the tool reads a claim the caller supplies. It does
 * not inspect the caller's reasoning, and it never refuses.
 */

import type { Tool } from "../types.js";
import {
  readOrientation,
  reorient,
  worthSaying,
} from "@medicine-wheel/creative-orientation";
import {
  openGapAnalysis,
  doorAdvice,
  turnToCreativeOrientation,
  type GapAnalysis,
  type CheckFindings,
} from "@medicine-wheel/gap-analysis";

export const orientationTools: Tool[] = [
  {
    name: "orient_before_solving",
    description: "Call this BEFORE any problem-solving, debugging, fixing, troubleshooting, root-cause analysis, or creative-problem-solving work. It asks the one question that decides which instrument fits: is there a prior state you are restoring? A prior state you can name, with evidence of when it existed, routes to open_gap_analysis: a gap analysis looks for what is missing against that baseline. It can be useful, and it is not part of the creative orientation; after it, call turn_to_creative_orientation. No prior state means you are creating a state that has never existed, there is no baseline to measure against, and elimination framing will aim the work at a list of known failures rather than at the outcome: route to create_structural_tension_chart. REMEMBER: urgency is not evidence. Under pressure every situation feels like a fire. This tool reads the claim you supply, advises, and never refuses.",
    inputSchema: {
      type: "object",
      properties: {
        outcome: {
          type: "string",
          description: "What you want, in your own words. The phrasing is read for signals but never decides the route.",
        },
        restores: {
          type: "string",
          description: "The prior state you are returning to, if any. Leave this empty when nothing is being restored — the emptiness IS the answer, not a missing field.",
        },
        evidence: {
          type: "string",
          description: "When the prior state existed, and how you know. A feeling of urgency does not go here.",
        },
      },
      required: ["outcome"],
    },
    handler: async (args) => {
      try {
        const { outcome, restores, evidence } = args;

        const reading = readOrientation({
          outcome,
          restores: restores ?? null,
          evidence,
        });

        return {
          orientation: reading.orientation,
          route: reading.route,
          signals: reading.signals,
          advice: reading.advice,
          advice_worth_saying: worthSaying(reading),
          suggested_outcome: reading.suggestedOutcome,
          next_tool:
            reading.route === "gap-analysis"
              ? "open_gap_analysis"
              : "create_structural_tension_chart",
          teaching:
            reading.route === "gap-analysis"
              ? "A gap analysis looks for what is missing against a baseline that existed. It can be useful, and it is not part of the creative orientation. After it, turn_to_creative_orientation keeps its findings as current reality and asks for the desired outcome."
              : "Nothing is being restored. Name the desired outcome as something that will exist, state current reality as fact, and let the chart's action steps resolve the tension between them.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to read orientation: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "open_gap_analysis",
    description: "Open a gap analysis. A gap analysis looks for what is missing: it measures what is true now against a prior state that existed, and names the difference. Use it when a prior state existed and stopped: an outage, a regression, a build that passed last week, a reading that used to be within range. Supply the baseline and the evidence it was real; the analysis needs that pairing, and a creating act cannot supply it. The technique can be useful, and it is not part of the creative orientation. After it comes the turn: the pull is to fill each missing item, and that is not what we are doing. Call turn_to_creative_orientation with the returned analysis; it keeps the findings as current reality and asks for the desired outcome. This tool reads the claim you supply, opens the analysis, and returns any advice raised at the door. It never refuses, and an analysis opened on a thin claim is still returned.",
    inputSchema: {
      type: "object",
      properties: {
        baseline_description: {
          type: "string",
          description: "The state you are restoring, described concretely. Not 'it was fine' — what specifically was true.",
        },
        baseline_evidence: {
          type: "string",
          description: "When that state existed and how you know: a date, a commit, a reading, a receipt. If you cannot name one, say so plainly here — the analysis still opens, and the reading will note that the routing rests on a feeling.",
        },
        current_description: {
          type: "string",
          description: "What is true now, stated as measurement rather than interpretation.",
        },
        current_source: {
          type: "string",
          description: "Where the current reading came from (optional).",
        },
        difference: {
          type: "string",
          description: "What is missing or wrong, derived from the two states above. Here elimination language is correct — there is a baseline to close toward.",
        },
      },
      required: ["baseline_description", "baseline_evidence", "current_description", "difference"],
    },
    handler: async (args) => {
      try {
        const {
          baseline_description,
          baseline_evidence,
          current_description,
          current_source,
          difference,
        } = args;

        const analysis = openGapAnalysis(
          { description: baseline_description, evidence: baseline_evidence },
          { description: current_description, source: current_source },
          difference,
        );

        return {
          status: "opened",
          analysis,
          door_advice: doorAdvice(analysis),
          next_tool: "turn_to_creative_orientation",
          teaching:
            "This analysis looks for what is missing against an evidenced baseline. The next pull is to fill each missing item. Turn instead: pass this analysis to turn_to_creative_orientation.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to open gap analysis: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "turn_to_creative_orientation",
    description: "Call this after open_gap_analysis, or after a check that reports what it did not find (accountability_validator, ocap_compliance_checker, wilson_paradigm_checker, mw_snapshot_transformation answer next_tool: turn_to_creative_orientation and next_tool_args to pass here). A gap analysis looks for what is missing, and the pull after one is to fill each missing item, one task per item. That is not what we are doing. This tool keeps the analysis's findings as current reality, stated as fact and never as tasks, and returns a reflection that names that pull. The next step is create_structural_tension_chart, which needs a desired outcome named on its own terms: what do we want to create, stated as something that will exist? Give desired_outcome and the tool also returns a draft chart input whose action_steps are empty, because no action step is taken from the findings; add a direction and pass it to create_structural_tension_chart. This tool reads what you supply, stores nothing, and never refuses.",
    inputSchema: {
      type: "object",
      properties: {
        analysis: {
          type: "object",
          description: "The analysis returned by open_gap_analysis (its `analysis` field): id, baseline, current, difference, steps. Or a check's findings, as a check returns them in next_tool_args.analysis: { check, findings, holds? }. Holds (what must be in place before the work continues) are kept as current reality, as the check states them.",
        },
        desired_outcome: {
          type: "string",
          description: "What you want to create, stated as something that will exist. Name it on its own terms, not from the findings. Leave it out if it is not named yet; the turn asks for it.",
        },
      },
      required: ["analysis"],
    },
    handler: async (args) => {
      try {
        const { desired_outcome } = args;
        // Some clients send an object argument as its JSON text.
        const analysis = typeof args.analysis === "string" ? JSON.parse(args.analysis) : args.analysis;
        const turn = turnToCreativeOrientation(analysis as GapAnalysis | CheckFindings, {
          desiredOutcome: typeof desired_outcome === "string" ? desired_outcome : undefined,
        });

        return {
          status: "turned",
          analysis_id: turn.analysisId,
          current_reality: turn.currentReality,
          reflection: turn.reflection,
          next_tool: turn.nextStep.tool,
          next_step: turn.nextStep,
          chart_draft: turn.chartDraft,
          desired_outcome_advice: turn.desiredOutcomeAdvice,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to turn to the creative orientation: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "check_emitted_outcome",
    description: "Call this on an outcome, option, or recommendation in the moment before you say it to a human. An elimination-shaped option, once a human selects it, stops looking like the agent's proposal and starts looking like the requirement — the framing outlives the moment it was offered in, and the work that follows aims at a list of known failures rather than at the state someone wanted. Supply the statement as you intend to speak it, plus the prior state it restores if one exists. When a prior state is named, elimination phrasing fits the situation and this tool says so plainly rather than sanding it down. When none is named, it returns a restatement prompt for you to finish — deliberately unfinished, because a machine that confidently rewrites what someone wants has decided it for them. This tool reads the statement you supply and never refuses.",
    inputSchema: {
      type: "object",
      properties: {
        statement: {
          type: "string",
          description: "The outcome, option, or recommendation exactly as you intend to speak it.",
        },
        restores: {
          type: "string",
          description: "The prior state this statement returns to, if any. Leave this empty when nothing is being restored — the emptiness IS the answer, not a missing field.",
        },
        evidence: {
          type: "string",
          description: "When the prior state existed, and how you know. A feeling of urgency does not go here.",
        },
      },
      required: ["statement"],
    },
    handler: async (args) => {
      try {
        const { statement, restores, evidence } = args;

        const reading = readOrientation({
          outcome: statement,
          restores: restores ?? null,
          evidence,
        });

        const restating = reading.route === "structural-tension";

        return {
          statement,
          orientation: reading.orientation,
          route: reading.route,
          signals: reading.signals,
          advice: reading.advice,
          advice_worth_saying: worthSaying(reading),
          restatement: restating
            ? reading.suggestedOutcome ?? reorient(statement)
            : undefined,
          restatement_advice: restating
            ? "Nothing is being restored, so this statement has no baseline to close toward. Finish the restatement in your own words before you speak it — once a human selects it, the phrasing becomes the requirement."
            : "A prior state is named, so elimination phrasing fits this situation. Say it as it is; restating it would be a euphemism for work that is correctly aimed.",
          next_tool:
            reading.route === "gap-analysis"
              ? "open_gap_analysis"
              : "create_structural_tension_chart",
          teaching:
            "The moment an option is spoken it stops being a proposal and starts being the requirement. Read it before you say it.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to check emitted outcome: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
];
