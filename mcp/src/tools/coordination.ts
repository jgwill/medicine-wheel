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
import {
  readyService,
  PreconditionSchema,
  type Precondition,
  type ServiceFacet,
} from "@medicine-wheel/infra";
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
    description:
      "Enforce a gate before something proceeds. Two modes, and they answer different questions:\n" +
      "• `filePath` — a ceremony gate on a path. Blocks changes to restricted or sacred paths " +
      "without proper authority.\n" +
      "• `service_node_id` + `preconditions` — a readiness gate on a registered service. Runs " +
      "preconditionGuard over each precondition. A machine fact and the human ConsentRecord that " +
      "authorized it are referenced BY ID and never collapse: a withdrawn consent returns " +
      "`unauthorized`, which is not `unsatisfied` and cannot be fixed by restarting anything. An " +
      "unread fact returns `unknown`, which is not failure.\n" +
      "Supply exactly one of `filePath` or `service_node_id` — with neither there is nothing to " +
      "gate. Preconditions are schema-validated and a malformed one blocks the whole call rather " +
      "than being skipped, because a gate that is skipped is a gate that opens.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "The path to the file or resource to check (ceremony-gate mode)",
        },
        governanceConfig: {
          type: "object",
          description: "Current governance configuration (optional, uses defaults if omitted)",
        },
        service_node_id: {
          type: "string",
          description: "A registered service node to gate on readiness (precondition mode)",
        },
        preconditions: {
          type: "array",
          description:
            "Preconditions gating the service. Those gating other services are ignored, so passing " +
            "a whole host's set is fine.",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              gates: { type: "string", description: "Service node id this gates" },
              description: { type: "string" },
              fact: {
                type: "object",
                description:
                  "Machine half: { kind, facetNodeId, expected, observed?, observedAt? }. `kind` must " +
                  "be one of 'linger' | 'port-free' | 'unit-present' | 'working-directory' — an " +
                  "unrecognised kind is rejected, not evaluated. Omitting `observed` means NOBODY " +
                  "LOOKED, reported as `unknown` and never as false.",
              },
              consent: {
                type: "object",
                description:
                  "Human half: { consentId, state?, readAt? } → ConsentRecord.id in " +
                  "consent-lifecycle. A reference, never an embed.",
              },
              metis: { type: "object" },
            },
            required: ["id", "gates"],
          },
        },
      },
    },
    handler: async (args) => {
      try {
        const { filePath, governanceConfig = {}, service_node_id, preconditions } = args;

        if (service_node_id) {
          const node = (await store.getNode(service_node_id)) as
            | { id: string; name: string; metadata?: Record<string, unknown> }
            | undefined;
          if (!node) {
            return { status: "not_found", message: `No node ${service_node_id}` };
          }
          if (node.metadata?.kind !== "service") {
            return {
              status: "error",
              message:
                `Node ${service_node_id} is not a registered service ` +
                `(metadata.kind=${JSON.stringify(node.metadata?.kind)}). Register it with register_service first.`,
            };
          }

          const facet = node.metadata.facet as ServiceFacet | undefined;
          if (!facet || typeof facet.unit !== "string") {
            // Reachable: a `knowledge` node with a hand-set metadata.kind and no
            // facet. Gating on it would read `undefined` fields as absent
            // preconditions and answer ready.
            return {
              status: "error",
              message:
                `Node ${service_node_id} claims kind 'service' but carries no valid facet. It was not ` +
                `registered through register_service, so there is nothing here to gate on.`,
            };
          }

          const raw = Array.isArray(preconditions) ? preconditions : [];
          const declared: Precondition[] = [];
          const rejected: { index: number; issues: { field: string; problem: string }[] }[] = [];
          for (const [index, candidate] of raw.entries()) {
            const parsed = PreconditionSchema.safeParse(candidate);
            if (parsed.success) declared.push(parsed.data as Precondition);
            else {
              rejected.push({
                index,
                issues: parsed.error.issues.map(i => ({ field: i.path.join("."), problem: i.message })),
              });
            }
          }

          // A precondition that does not parse is NOT dropped quietly. An invented
          // `kind` would otherwise sail through as a satisfied fact and turn the
          // gate green on a condition that does not exist.
          if (rejected.length > 0) {
            return {
              status: "error",
              blocked: true,
              message:
                `${rejected.length} of ${raw.length} precondition(s) failed validation — nothing was ` +
                `evaluated. A malformed gate that is skipped is a gate that opens.`,
              rejected,
              valid_fact_kinds: ["linger", "port-free", "unit-present", "working-directory"],
            };
          }

          const readiness = readyService(facet, declared);

          return {
            mode: "precondition",
            blocked: !readiness.ready,
            service: node.name,
            service_node_id,
            ready: readiness.ready,
            declared: readiness.declared,
            results: readiness.results,
            blocking: readiness.blocking,
            metis: readiness.metis,
            reason: readiness.reason,
            ...(readiness.declared === 0
              ? {
                  warning:
                    "No preconditions were declared. `ready` is vacuously true — nothing was verified.",
                }
              : {}),
            ...(readiness.blocking.some(r => r.verdict === "unauthorized")
              ? {
                  consent_note:
                    "At least one gate is `unauthorized`: the machine is ready and a human has not " +
                    "said yes, or has withdrawn. This is not a technical failure and restarting " +
                    "something will not clear it.",
                }
              : {}),
            teaching:
              "A machine fact is a checkbox. Consent is a relationship that can be withdrawn. " +
              "A gate that reads one as the other has stopped being a gate.",
          };
        }

        if (!filePath) {
          return {
            status: "error",
            message:
              "Pass either `filePath` (ceremony gate) or `service_node_id` (+ `preconditions`, " +
              "readiness gate). With neither, there is nothing to gate.",
          };
        }

        const result = enforceCeremonyGate(filePath, governanceConfig as any);

        return {
          mode: "ceremony",
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
