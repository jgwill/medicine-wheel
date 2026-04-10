/**
 * Reasoning & Observability Tools
 * 
 * These tools leverage @medicine-wheel/prompt-decomposition and
 * @medicine-wheel/session-reader to map intentions and observe
 * the patterns of agentic interactions.
 */

import { 
  MedicineWheelDecomposer 
} from "medicine-wheel-prompt-decomposition";
import { 
  getSessionDetail,
  listSessions
} from "medicine-wheel-session-reader";
import type { Tool } from "../types.js";
import { store } from "../store.js";

const decomposer = new MedicineWheelDecomposer({
  extractImplicit: true,
  mapDependencies: true,
  ceremonyThreshold: 0.3
});

export const reasoningObservabilityTools: Tool[] = [
  {
    name: "mw_decompose_prompt",
    description: "Decompose a natural language prompt into ontological intents mapped to the Four Directions (East/Vision, South/Analysis, West/Validation, North/Action). Detects implicit intents and generates ceremony guidance if balance is poor.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The natural language prompt to decompose",
        }
      },
      required: ["prompt"],
    },
    handler: async (args) => {
      try {
        const { prompt } = args;
        const result = decomposer.decompose(prompt);

        return {
          id: result.id,
          primary_intent: result.primary,
          balance_score: result.balance,
          neglected_directions: result.neglectedDirections,
          ceremony_required: result.ceremonyRequired,
          ceremony_guidance: result.ceremonyGuidance,
          action_stack: result.actionStack.map(a => ({
            text: a.text,
            direction: a.direction,
            implicit: a.implicit
          })),
          teaching: "Intention exploration is an EAST practice — honoring the vision before the action."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  },
  {
    name: "mw_analyze_session",
    description: "Analyze a specific agent session from JSONL event data. Extracts tool usage, feedback counts, and identifies potential value divergence patterns.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "ID of the agent session to analyze",
        }
      },
      required: ["sessionId"],
    },
    handler: async (args) => {
      try {
        const { sessionId } = args;
        const detail = await getSessionDetail(sessionId);

        if (!detail) {
          return { status: "error", message: `Session ${sessionId} not found in _sessiondata/` };
        }

        return {
          session_id: detail.id,
          model: detail.model,
          event_count: detail.event_count,
          analytics: detail.analytics,
          top_tools: Object.entries(detail.analytics.toolUsage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5),
          teaching: "Observing our own patterns is the first step toward relational transformation."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  }
];
