/**
 * Coordination Tools — Fire Keeper & Ceremony Protocol
 * 
 * These tools leverage the @medicine-wheel/fire-keeper and
 * @medicine-wheel/ceremony-protocol packages to ensure relational integrity
 * and active stewardship of the research process.
 */

import { 
  FireKeeper, 
  relationalCheckBack,
  DEFAULT_GATES
} from "@medicine-wheel/fire-keeper";
import { 
  enforceCeremonyGate,
  getPhaseFraming
} from "@medicine-wheel/ceremony-protocol";
import type { Tool } from "../types.js";
import { store } from "../store.js";

// Initialize Fire Keeper with default configuration
const keeper = new FireKeeper({
  trajectoryThreshold: 0.65,
  permissionTiers: ['observe', 'analyze', 'propose', 'act'],
  gatingConditions: DEFAULT_GATES,
  humanDecisionPoints: []
});

export const coordinationTools: Tool[] = [
  {
    name: "mw_fire_keeper_status",
    description: "Check the status of the Fire Keeper and active ceremonies. Monitors trajectory confidence and active stop-work orders.",
    inputSchema: {
      type: "object",
      properties: {
        inquiryRef: {
          type: "string",
          description: "Reference to the active inquiry or research cycle",
        }
      },
      required: ["inquiryRef"],
    },
    handler: async (args) => {
      try {
        const { inquiryRef } = args;
        const alignment = keeper.checkRelationalAlignment(inquiryRef);

        // Check store for ceremonies linked to this inquiry
        const allCeremonies = (await store.getAllCeremonies());
        const linkedCeremonies = allCeremonies.filter(c => {
          if (c.research_context) {
            try {
              const ctx = JSON.parse(c.research_context);
              return ctx.inquiryRef === inquiryRef;
            } catch {
              return c.research_context === inquiryRef;
            }
          }
          return false;
        });

        const openCeremonies = linkedCeremonies.filter(c => c.type === "opening");
        const closedCeremonies = linkedCeremonies.filter(c => c.type === "closing");
        // Active ceremonies = openings that don't have a matching closing
        const activeCeremonies = openCeremonies.filter(
          opening => !closedCeremonies.some(closing => closing.research_context === opening.id)
        );

        const state = keeper.checkCeremonyState(inquiryRef);
        const hasActiveFromStore = activeCeremonies.length > 0;
        const phase_framing = state?.ceremonyPhase 
          ? getPhaseFraming(state.ceremonyPhase as any)
          : hasActiveFromStore 
            ? `Active ceremony in store: ${activeCeremonies[0].id} (direction: ${activeCeremonies[0].direction})`
            : "No active ceremony";

        return {
          status: alignment.aligned ? "aligned" : "tension",
          confidence: alignment.confidence,
          issues: alignment.issues,
          phase: state?.ceremonyPhase || (hasActiveFromStore ? "active" : undefined),
          phase_framing,
          active_ceremonies: hasActiveFromStore ? activeCeremonies.map(c => ({
            id: c.id,
            direction: c.direction,
            intention: c.intentions?.[0],
            timestamp: c.timestamp
          })) : undefined,
          teaching: "The Fire Keeper tends the fire so the ceremony can proceed with relational integrity."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  },
  {
    name: "mw_relational_check_back",
    description: "Perform the sacred 4-step relational check-back before any autonomous action. Verifies if an action honors relations, strengthens the spirit-body relationship, is accountable to all directions, and would be approved by an Elder.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Description of the proposed action to verify",
        },
        inquiryRef: {
          type: "string",
          description: "Reference to the active inquiry",
        }
      },
      required: ["action", "inquiryRef"],
    },
    handler: async (args) => {
      try {
        const { action, inquiryRef } = args;
        const state = keeper.checkCeremonyState(inquiryRef);
        
        if (!state) {
          // Fallback: check store for active ceremonies linked to this inquiry
          const allCeremonies = (await store.getAllCeremonies());
          const linkedCeremonies = allCeremonies.filter(c => {
            if (c.research_context) {
              try {
                const ctx = JSON.parse(c.research_context);
                return ctx.inquiryRef === inquiryRef;
              } catch {
                return c.research_context === inquiryRef;
              }
            }
            return false;
          });
          
          const hasActive = linkedCeremonies.some(c => c.type === "opening");
          
          if (!hasActive) {
            return { status: "error", message: `No active ceremony found for ${inquiryRef}. Open a ceremony first with mw_ceremony_open.` };
          }
          
          // Build minimal context from store data for the check-back
          const context = {
            ceremonyState: { ceremonyPhase: "active", inquiryRef },
            wilsonAlignment: keeper.checkRelationalAlignment(inquiryRef).confidence,
            ocapCompliant: true
          } as any;
          
          const result = relationalCheckBack(action, context);
          
          return {
            approved: result.approved,
            summary: result.summary,
            steps: result.steps.map(s => ({
              step: s.step,
              question: s.question,
              passed: s.passed,
              reason: s.reason
            })),
            source: "store-fallback",
            teaching: "Before you act, listen. Every action moves the web."
          };
        }

        // Build context for check-back
        const context = {
          ceremonyState: state,
          wilsonAlignment: keeper.checkRelationalAlignment(inquiryRef).confidence,
          ocapCompliant: true
        } as any;

        const result = relationalCheckBack(action, context);

        return {
          approved: result.approved,
          summary: result.summary,
          steps: result.steps.map(s => ({
            step: s.step,
            question: s.question,
            passed: s.passed,
            reason: s.reason
          })),
          teaching: "Before you act, listen. Every action moves the web."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  },
  {
    name: "mw_enforce_gate",
    description: "Enforce a ceremony gate on a file path based on current governance configuration. Blocks changes to restricted or sacred paths without proper authority.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "The path to the file or resource to check",
        },
        governanceConfig: {
          type: "object",
          description: "Current governance configuration (optional, uses defaults if omitted)",
        }
      },
      required: ["filePath"],
    },
    handler: async (args) => {
      try {
        const { filePath, governanceConfig = {} } = args;
        
        const result = enforceCeremonyGate(filePath, governanceConfig as any);

        return {
          blocked: result.blocked,
          ...(result.blocked ? {
            reason: result.reason,
            required_authority: (result as any).requiredAuthority
          } : {
            message: "Path access permitted by ceremony gate."
          }),
          teaching: "Boundaries are not barriers; they are protocols of respect."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  }
];
