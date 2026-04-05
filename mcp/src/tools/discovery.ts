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
  {
    name: "get_relational_node",
    description: "Get a single relational node by its ID. Returns the full node object or not_found.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "The ID of the relational node to retrieve",
        },
      },
      required: ["node_id"],
    },
    handler: async (args) => {
      try {
        const { node_id } = args;
        const node = store.getNode(node_id);
        if (!node) {
          return {
            status: "not_found",
            message: `Relational node ${node_id} not found`,
          };
        }
        return {
          status: "found",
          node,
          teaching: "To know a relation by name is to accept responsibility for it.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to get relational node: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "get_ceremony",
    description: "Get a single ceremony by its ID. Returns the full ceremony object or not_found.",
    inputSchema: {
      type: "object",
      properties: {
        ceremony_id: {
          type: "string",
          description: "The ID of the ceremony to retrieve",
        },
      },
      required: ["ceremony_id"],
    },
    handler: async (args) => {
      try {
        const { ceremony_id } = args;
        const ceremony = store.getCeremony(ceremony_id);
        if (!ceremony) {
          return {
            status: "not_found",
            message: `Ceremony ${ceremony_id} not found`,
          };
        }
        return {
          status: "found",
          ceremony,
          teaching: "Research is ceremony. Each record is a witness to relational practice.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to get ceremony: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "get_cycle",
    description: "Get a single medicine wheel research cycle by its ID. Lighter than get_narrative_arc — returns the cycle object without beats.",
    inputSchema: {
      type: "object",
      properties: {
        cycle_id: {
          type: "string",
          description: "The ID of the cycle to retrieve",
        },
      },
      required: ["cycle_id"],
    },
    handler: async (args) => {
      try {
        const { cycle_id } = args;
        const cycle = store.getCycle(cycle_id);
        if (!cycle) {
          return {
            status: "not_found",
            message: `Cycle ${cycle_id} not found`,
          };
        }
        return {
          status: "found",
          cycle,
          teaching: "A cycle is a complete turn of the wheel. Each question deserves its full journey.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to get cycle: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "list_edges",
    description: "List relational edges (connections between nodes). Optionally filter by a specific node to see all its relationships.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "Filter edges connected to this node ID (optional)",
        },
        limit: {
          type: "number",
          description: "Maximum edges to return (default: 50)",
          minimum: 1,
          maximum: 200,
        },
      },
    },
    handler: async (args) => {
      try {
        const { node_id, limit = 50 } = args;

        let edges;
        if (node_id) {
          edges = store.getEdgesForNode(node_id);
        } else {
          edges = store.edges.getAll();
        }

        const limited = edges.slice(0, limit);

        return {
          count: limited.length,
          total_available: edges.length,
          filters: { node_id, limit },
          edges: limited,
          teaching: "Every edge is a responsibility. Relationships are not mere links — they carry obligations.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to list edges: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "list_mmots",
    description: "List Medicine-wheel Marks-On-Time (MMOTs) for a specific chart. MMOTs are temporal annotations on medicine wheel charts.",
    inputSchema: {
      type: "object",
      properties: {
        chart_id: {
          type: "string",
          description: "The chart ID to list MMOTs for",
        },
      },
      required: ["chart_id"],
    },
    handler: async (args) => {
      try {
        const { chart_id } = args;
        const mmots = store.getMmotsByChart(chart_id);

        return {
          count: mmots.length,
          chart_id,
          mmots,
          teaching: "Marks on time honour the moments that shaped the journey.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to list MMOTs: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
];
