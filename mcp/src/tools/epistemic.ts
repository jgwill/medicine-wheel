/**
 * Epistemic Tools — Importance Units & Relational Indexing
 * 
 * These tools leverage the @medicine-wheel/importance-unit and
 * @medicine-wheel/relational-index packages to manage weighted knowledge
 * and track the spiral journey of understanding.
 */

import { 
  createUnit, 
  circleBack, 
  computeWeight, 
  detectDeepening,
  type EpistemicSource,
  type AxiologicalPillar
} from "medicine-wheel-importance-unit";
import { 
  createIndex, 
  addEntry, 
  indexHealth, 
  dimensionBalance 
} from "medicine-wheel-relational-index";
import type { Tool } from "../types.js";
import { store } from "../store.js";

export const epistemicTools: Tool[] = [
  {
    name: "mw_create_importance_unit",
    description: "Create a relationally-accountable ImportanceUnit. Assigns epistemic weight based on source (land, dream, code, vision) and initializes circle depth at 1.",
    inputSchema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "The relational meaning of this unit — what it holds, not just what it says",
        },
        source: {
          type: "string",
          enum: ["land", "dream", "code", "vision"],
          description: "Relational origin dimension of knowledge",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Medicine Wheel quadrant alignment",
        },
        createdBy: {
          type: "string",
          description: "Agent or person creating this unit",
        },
        axiologicalPillar: {
          type: "string",
          enum: ["ontology", "epistemology", "methodology", "axiology"],
          description: "Wilson's axiological pillar addressed",
        },
        inquiryRef: {
          type: "string",
          description: "Reference to the parent inquiry or research cycle",
        }
      },
      required: ["summary", "source", "direction", "createdBy"],
    },
    handler: async (args) => {
      try {
        const { summary, source, direction, createdBy, axiologicalPillar, inquiryRef } = args;
        
        const unit = createUnit({
          summary,
          source: source as EpistemicSource,
          direction,
          createdBy,
          axiologicalPillar: axiologicalPillar as AxiologicalPillar,
          inquiryRef
        });

        // Map to flat knowledge node for existing UI compatibility
        store.createNode({
          id: unit.id,
          type: "knowledge",
          name: summary.slice(0, 50) + (summary.length > 50 ? "..." : ""),
          description: summary,
          direction: unit.direction,
          metadata: {
            ...unit.meta,
            source: unit.source,
            epistemicWeight: unit.epistemicWeight,
            circleDepth: unit.circleDepth,
            axiologicalPillar: unit.axiologicalPillar,
            is_importance_unit: true,
            full_content: unit.content
          },
          created_at: unit.meta.createdAt,
          updated_at: unit.meta.createdAt
        });

        return {
          status: "created",
          unit_id: unit.id,
          epistemic_weight: unit.epistemicWeight,
          circle_depth: unit.circleDepth,
          message: `ImportanceUnit created with ${source}-state authority.`,
          teaching: "Knowledge has spirit; treat respectfully, not as property."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  },
  {
    name: "mw_circle_back",
    description: "Circle back to an existing ImportanceUnit to deepen its knowledge. Increments circle depth and records what shifted in this pass.",
    inputSchema: {
      type: "object",
      properties: {
        unit_id: {
          type: "string",
          description: "ID of the ImportanceUnit to deepen",
        },
        shift: {
          type: "string",
          description: "What changed or deepened in this circle pass",
        }
      },
      required: ["unit_id", "shift"],
    },
    handler: async (args) => {
      try {
        const { unit_id, shift } = args;
        const node = store.getNode(unit_id);
        
        if (!node || !node.metadata?.is_importance_unit) {
          return { status: "error", message: `ImportanceUnit ${unit_id} not found.` };
        }

        // Reconstruct IU from stored node
        const currentUnit = {
          id: node.id,
          direction: node.direction as any,
          epistemicWeight: node.metadata.epistemicWeight as number,
          source: node.metadata.source as EpistemicSource,
          circleDepth: node.metadata.circleDepth as number,
          content: node.metadata.full_content as any,
          meta: {
            createdBy: node.metadata.createdBy as string,
            createdAt: node.created_at,
            traceId: node.metadata.traceId as string
          }
        } as any;

        const deepened = circleBack(currentUnit, shift);
        const analysis = detectDeepening(deepened);

        // Update store
        store.createNode({
          ...node,
          metadata: {
            ...node.metadata,
            epistemicWeight: deepened.epistemicWeight,
            circleDepth: deepened.circleDepth,
            full_content: deepened.content,
            lastCircledAt: deepened.meta.lastCircledAt
          },
          updated_at: deepened.meta.lastCircledAt || node.updated_at
        });

        return {
          status: "deepened",
          unit_id: deepened.id,
          new_circle_depth: deepened.circleDepth,
          new_epistemic_weight: deepened.epistemicWeight,
          is_deepening: analysis.isDeepening,
          message: `Unit deepened to circle ${deepened.circleDepth}.`,
          teaching: "Repetition is ceremony and deepening, not redundancy."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  }
];
