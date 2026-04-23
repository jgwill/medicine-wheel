/**
 * Ceremony Lifecycle Tools — Open, close, orient, and remember
 *
 * These tools enable Fire Keeper agents to manage the full ceremony lifecycle:
 * opening sacred space, closing with gratitude, orienting by direction,
 * and storing relational memories. Research is ceremony (Wilson, 2008).
 */

import type { Tool } from "../types.js";
import { store } from "../store.js";

const DIRECTION_MAP: Record<
  string,
  { medicine: string; season: string; teaching: string; life_stage: string; color: string }
> = {
  east: {
    medicine: "Tobacco",
    season: "Spring",
    teaching: "Vision & New Beginnings",
    life_stage: "Birth-7 (Good Life)",
    color: "Yellow",
  },
  south: {
    medicine: "Cedar",
    season: "Summer",
    teaching: "Growth & Relationships",
    life_stage: "7-14 (Fast Life)",
    color: "Red",
  },
  west: {
    medicine: "Sage",
    season: "Fall",
    teaching: "Reflection & Harvest",
    life_stage: "14-21 (Wandering Life)",
    color: "Black",
  },
  north: {
    medicine: "Sweetgrass",
    season: "Winter",
    teaching: "Wisdom & Sharing",
    life_stage: "21+ (Truth Life)",
    color: "White",
  },
};

export const ceremonyLifecycleTools: Tool[] = [
  {
    name: "mw_ceremony_open",
    description:
      "Open a new ceremony in the medicine wheel. Creates an opening ceremony record with intention, direction, participants, and medicines. Returns the ceremony ID for use in subsequent lifecycle calls. Fire Keeper agents use this to begin relational research-as-ceremony.",
    inputSchema: {
      type: "object",
      properties: {
        intention: {
          type: "string",
          description: "The intention or purpose for this ceremony",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Medicine wheel direction to open from (default: east)",
        },
        participants: {
          type: "array",
          items: { type: "string" },
          description: "Names of participants in the ceremony",
        },
        medicines: {
          type: "array",
          items: { type: "string" },
          description: "Medicines used in the ceremony (e.g. Tobacco, Cedar, Sage, Sweetgrass)",
        },
      },
      required: ["intention"],
    },
    handler: async (args) => {
      try {
        const {
          intention,
          direction = "east",
          participants = [],
          medicines = [],
        } = args;

        const ceremonyId = `ceremony:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;

        store.logCeremony({
          id: ceremonyId,
          type: "opening",
          direction,
          participants,
          medicines_used: medicines,
          intentions: [intention],
          timestamp: new Date().toISOString(),
        });

        return {
          ceremony_id: ceremonyId,
          status: "opened",
          direction,
          intention,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to open ceremony: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "mw_ceremony_close",
    description:
      "Close an existing ceremony in the medicine wheel. Logs a closing ceremony record linked to the original opening, preserving direction and participants. Fire Keeper agents use this to complete the ceremony lifecycle with summary and learnings.",
    inputSchema: {
      type: "object",
      properties: {
        ceremony_id: {
          type: "string",
          description: "The ID of the opening ceremony to close",
        },
        summary: {
          type: "string",
          description: "Summary of what occurred during the ceremony",
        },
        learnings: {
          type: "array",
          items: { type: "string" },
          description: "Key learnings or insights from the ceremony",
        },
      },
      required: ["ceremony_id"],
    },
    handler: async (args) => {
      try {
        const { ceremony_id, summary = "", learnings = [] } = args;

        const opening = store.getCeremony(ceremony_id);
        if (!opening) {
          return {
            status: "error",
            message: `Ceremony ${ceremony_id} not found. Cannot close a ceremony that was never opened.`,
          };
        }

        const closingId = `ceremony:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;

        const intentions = summary ? [summary, ...learnings] : [...learnings];

        store.logCeremony({
          id: closingId,
          type: "closing",
          direction: opening.direction,
          participants: opening.participants,
          medicines_used: opening.medicines_used,
          intentions,
          timestamp: new Date().toISOString(),
          research_context: ceremony_id,
        });

        return {
          status: "closed",
          ceremony_id,
          closing_id: closingId,
          summary,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to close ceremony: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "mw_get_direction",
    description:
      "Get directional metadata for a medicine wheel direction. Returns the sacred medicine, season, teaching, life stage, and color associated with the direction. Can look up direction from an existing ceremony or accept a direction directly. Fire Keeper agents use this to orient ceremony lifecycle work.",
    inputSchema: {
      type: "object",
      properties: {
        ceremony_id: {
          type: "string",
          description: "Look up the direction from an existing ceremony (optional)",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Medicine wheel direction to query (default: east, overridden by ceremony_id if provided)",
        },
      },
    },
    handler: async (args) => {
      try {
        const { ceremony_id, direction: directionArg } = args;

        let direction = directionArg || "east";

        if (ceremony_id) {
          const ceremony = store.getCeremony(ceremony_id);
          if (!ceremony) {
            return {
              status: "error",
              message: `Ceremony ${ceremony_id} not found`,
            };
          }
          direction = ceremony.direction;
        }

        const meta = DIRECTION_MAP[direction];
        if (!meta) {
          return {
            status: "error",
            message: `Unknown direction: ${direction}. Must be east, south, west, or north.`,
          };
        }

        return {
          direction,
          medicine: meta.medicine,
          season: meta.season,
          teaching: meta.teaching,
          life_stage: meta.life_stage,
          color: meta.color,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to get direction metadata: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "mw_store_memory",
    description:
      "Store a relational memory as a knowledge node in the medicine wheel. Optionally link the memory to a ceremony and direction. Fire Keeper agents use this to persist insights, learnings, and relational observations across the ceremony lifecycle.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "A short name or key for the memory",
        },
        value: {
          type: "string",
          description: "The content or description of the memory",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Medicine wheel direction to associate with this memory (optional)",
        },
        ceremony_id: {
          type: "string",
          description: "Link this memory to a ceremony (optional)",
        },
      },
      required: ["key", "value"],
    },
    handler: async (args) => {
      try {
        const { key, value, direction, ceremony_id } = args;

        const memoryId = `memory:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();

        store.createNode({
          id: memoryId,
          type: "knowledge",
          name: key,
          description: value,
          direction,
          metadata: ceremony_id ? { ceremony_id } : undefined,
          created_at: now,
          updated_at: now,
        });

        return {
          memory_id: memoryId,
          status: "stored",
          key,
          direction,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to store memory: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
];
