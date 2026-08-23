/**
 * Orientation Tools — the question asked before the instrument is chosen.
 *
 * Two situations look identical under pressure and are not: something worked
 * and stopped (a fire — restore the prior state), and something has never
 * existed and is wanted (a creating act — advance toward it). They produce
 * different structures, and using the wrong instrument is how rigorous work
 * goes in circles.
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
import { openGapAnalysis, doorAdvice } from "@medicine-wheel/gap-analysis";

export const orientationTools: Tool[] = [
  {
    name: "orient_before_solving",
    description: "Call this BEFORE any problem-solving, debugging, fixing, troubleshooting, root-cause analysis, or creative-problem-solving work. It asks the one question that decides which instrument fits: is there a prior state you are restoring? A prior state you can name, with evidence of when it existed, means the situation is a fire — problem-solving is correct and you should route to open_gap_analysis. No prior state means you are creating a state that has never existed, there is no baseline to close toward, and elimination framing will aim the work at a list of known failures rather than at the outcome — route to create_structural_tension_chart. REMEMBER: urgency is not evidence. Under pressure every situation feels like a fire. This tool reads the claim you supply, advises, and never refuses.",
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
            "Problem-solving is not the lesser craft. It is the correct craft when something worked and stopped.",
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
    description: "The fire path, served without apology. Use this when a prior state existed and stopped — an outage, a regression, a build that passed last week, a reading that used to be within range — and the work is to restore it. Supply the baseline you are restoring and the evidence it was real; that pairing is what makes the difference between the two states the literal object of the work, and it is the one thing this instrument needs that a creating act cannot supply. Problem-solving is the correct craft here, not a degraded one, and nothing in this tool will try to talk you out of it. This tool reads the claim you supply, opens the analysis, and returns any advice raised at the door — it never refuses, and an analysis opened on a thin claim is still an analysis you can act on.",
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
          teaching:
            "A fire deserves a real instrument, not a euphemism. An evidenced baseline is what makes the difference the object of the work.",
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
