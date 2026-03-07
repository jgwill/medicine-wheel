/**
 * Discovery Tools - Enable browsing and searching of medicine wheel data
 *
 * These tools address the gap: users couldn't find ceremonies, nodes, beats, or cycles
 * without already knowing IDs. Discovery enables relational exploration.
 *
 * Adapted to use in-memory store instead of Redis/NCP.
 */

import type { Tool } from "../types.js";
import { store } from "../store.js";

export const discoveryTools: Tool[] = [
  {
    name: "list_relational_nodes",
    description: "List all relational nodes in the medicine wheel memory. Filter by type or direction. Returns nodes sorted by creation date (newest first).",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["human", "land", "spirit", "ancestor", "future", "knowledge"],
          description: "Filter by node type (optional)",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Filter by medicine wheel direction (optional)",
        },
        limit: {
          type: "number",
          description: "Maximum nodes to return (default: 50)",
          minimum: 1,
          maximum: 200,
        },
      },
    },
    handler: async (args) => {
      try {
        const { type, direction, limit = 50 } = args;

        let nodes;
        if (type) {
          nodes = store.getNodesByType(type);
        } else if (direction) {
          nodes = store.getNodesByDirection(direction);
        } else {
          nodes = store.getAllNodes(limit);
        }

        const sorted = nodes
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
          .slice(0, limit);

        return {
          count: sorted.length,
          total_available: nodes.length,
          filters: { type, direction, limit },
          nodes: sorted,
          teaching: "Every relation is a responsibility. Browse with intention.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to list nodes: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "list_ceremonies",
    description: "List all ceremonies logged in the medicine wheel. Filter by direction or type. Returns ceremonies sorted by timestamp (newest first).",
    inputSchema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Filter by medicine wheel direction (optional)",
        },
        type: {
          type: "string",
          enum: ["smudging", "talking_circle", "spirit_feeding", "opening", "closing"],
          description: "Filter by ceremony type (optional)",
        },
        limit: {
          type: "number",
          description: "Maximum ceremonies to return (default: 50)",
          minimum: 1,
          maximum: 200,
        },
      },
    },
    handler: async (args) => {
      try {
        const { direction, type, limit = 50 } = args;

        let ceremonies;
        if (direction) {
          ceremonies = store.getCeremoniesByDirection(direction);
        } else if (type) {
          ceremonies = store.getCeremoniesByType(type);
        } else {
          ceremonies = store.getAllCeremonies(limit);
        }

        const sorted = ceremonies.slice(0, limit);

        return {
          count: sorted.length,
          filters: { direction, type, limit },
          ceremonies: sorted,
          teaching: "Research is ceremony. Each logged ceremony is a witness to relational practice.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to list ceremonies: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "list_narrative_beats",
    description: "List narrative beats in the medicine wheel journey. Filter by direction to see specific acts. Returns beats sorted by timestamp.",
    inputSchema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Filter by direction/act (east=Act1, south=Act2, west=Act3, north=Act4)",
        },
        limit: {
          type: "number",
          description: "Maximum beats to return (default: 50)",
          minimum: 1,
          maximum: 200,
        },
      },
    },
    handler: async (args) => {
      try {
        const { direction, limit = 50 } = args;

        let beats;
        if (direction) {
          beats = store.getBeatsByDirection(direction);
        } else {
          beats = store.getAllBeats(limit);
        }

        const sorted = beats.slice(0, limit);

        const byDirection = {
          east: sorted.filter(b => b.direction === 'east').length,
          south: sorted.filter(b => b.direction === 'south').length,
          west: sorted.filter(b => b.direction === 'west').length,
          north: sorted.filter(b => b.direction === 'north').length,
        };

        return {
          count: sorted.length,
          filters: { direction, limit },
          summary: byDirection,
          beats: sorted,
          teaching: "Each beat marks a moment in the research journey. Together they form the narrative arc.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to list narrative beats: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "list_cycles",
    description: "List all medicine wheel research cycles. Shows both active and archived cycles.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "archived", "all"],
          description: "Filter by cycle status (default: all)",
        },
      },
    },
    handler: async (args) => {
      try {
        const { status = "all" } = args;

        const { active, archived } = store.getAllCycles();

        let cycles;
        if (status === "active") {
          cycles = active;
        } else if (status === "archived") {
          cycles = archived;
        } else {
          cycles = [...active, ...archived];
        }

        return {
          active_count: active.length,
          archived_count: archived.length,
          total: cycles.length,
          filter: status,
          cycles: cycles.map(c => ({
            id: c.id,
            research_question: c.research_question,
            current_direction: c.current_direction,
            start_date: c.start_date,
            ceremonies_conducted: c.ceremonies_conducted,
            relations_mapped: c.relations_mapped,
            wilson_alignment: c.wilson_alignment,
            ocap_compliant: c.ocap_compliant,
          })),
          teaching: "A cycle is a complete turn of the wheel. Each research question deserves its full journey.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to list cycles: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "telescope_narrative_beat",
    description: "Drill into a narrative beat's relational web. Shows the beat's details, linked ceremonies, honored relations, and connected nodes.",
    inputSchema: {
      type: "object",
      properties: {
        beat_id: {
          type: "string",
          description: "ID of the narrative beat to telescope into",
        },
        depth: {
          type: "number",
          description: "How deep to traverse relational connections (default: 2, max: 5)",
          minimum: 1,
          maximum: 5,
        },
      },
      required: ["beat_id"],
    },
    handler: async (args) => {
      try {
        const { beat_id, depth = 2 } = args;

        const beat = store.getBeat(beat_id);
        if (!beat) {
          return {
            status: "not_found",
            message: `Narrative beat ${beat_id} not found`,
          };
        }

        // Get linked ceremonies
        const ceremonies = [];
        for (const ceremonyId of beat.ceremonies) {
          const ceremony = store.getCeremony(ceremonyId);
          if (ceremony) ceremonies.push(ceremony);
        }

        // Get honored relations and their webs
        const relationWebs = [];
        for (const nodeId of beat.relations_honored) {
          const web = store.getRelationalWeb(nodeId, depth);
          relationWebs.push({
            center_node_id: nodeId,
            nodes: web.nodes,
            edges: web.edges,
          });
        }

        return {
          beat: beat,
          ceremonies: ceremonies,
          relations: {
            honored_count: beat.relations_honored.length,
            depth_traversed: depth,
            webs: relationWebs,
          },
          total_nodes_discovered: relationWebs.reduce((sum, w) => sum + w.nodes.length, 0),
          total_edges_discovered: relationWebs.reduce((sum, w) => sum + w.edges.length, 0),
          teaching: "Telescoping reveals the full relational context of a moment in the journey.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to telescope narrative beat: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "search_nodes",
    description: "Search relational nodes by name or description. Supports filtering by type and direction.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (matches name and description)",
        },
        type: {
          type: "string",
          enum: ["human", "land", "spirit", "ancestor", "future", "knowledge"],
          description: "Filter by node type (optional)",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Filter by direction (optional)",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 20)",
          minimum: 1,
          maximum: 100,
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      try {
        const { query, type, direction, limit = 20 } = args;

        const nodes = store.searchNodes(query, { type, direction, limit });

        return {
          query,
          count: nodes.length,
          filters: { type, direction, limit },
          nodes: nodes,
          teaching: "Searching is asking. The relations you find are those ready to be known.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to search nodes: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
];
