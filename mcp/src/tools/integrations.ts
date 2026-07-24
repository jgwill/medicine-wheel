/**
 * Integration Tools — Create and manage relational nodes, edges, ceremonies,
 * narrative beats, cycles, and seven-generations archiving.
 *
 * Adapted to use in-memory store instead of Redis/NCP/GitHub.
 */

import type { Tool } from "../types.js";
import { store } from "../store.js";
import {
  createBeat as authorBeat,
  telescopeBeat,
  beatsInCycle,
  type BeatDraft,
} from "@medicine-wheel/narrative-engine";

export const integrationTools: Tool[] = [
  {
    name: "create_relational_node",
    description: "Create a relational node in the medicine wheel memory graph (human, land, spirit, ancestor, future, knowledge). Persistent across sessions.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the relation (person, place, ancestor, teaching)",
        },
        type: {
          type: "string",
          enum: ["human", "land", "spirit", "ancestor", "future", "knowledge"],
          description: "Type of relational node",
        },
        description: {
          type: "string",
          description: "Description of this relation and their role",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Associated medicine wheel direction (optional)",
        },
        metadata: {
          type: "object",
          description: "Additional metadata (optional)",
        },
      },
      required: ["name", "type", "description"],
    },
    handler: async (args) => {
      try {
        const { name, type, description, direction, metadata = {} } = args;

        const node = {
          id: `node:${type}:${Date.now()}:${Math.random().toString(36).substring(7)}`,
          type,
          name,
          description,
          direction,
          metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        store.createNode(node);

        return {
          status: "created",
          node_id: node.id,
          message: `Relational node created: ${name} (${type})`,
          node: node,
          teaching: "Once in relationship, you are responsible for that relationship's wellbeing",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to create relational node: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "create_relational_edge",
    description: "Create relationship between two nodes. Defines obligations and tracks if ceremony has honored this relationship.",
    inputSchema: {
      type: "object",
      properties: {
        from_node_id: {
          type: "string",
          description: "ID of the source node",
        },
        to_node_id: {
          type: "string",
          description: "ID of the target node",
        },
        relationship_type: {
          type: "string",
          description: "Type of relationship (e.g., 'mentor', 'co-investigator', 'knowledge-holder', 'ancestor-of')",
        },
        strength: {
          type: "number",
          description: "Strength of relationship 0-1",
          minimum: 0,
          maximum: 1,
        },
        obligations: {
          type: "array",
          items: { type: "string" },
          description: "Relational obligations for this connection",
        },
      },
      required: ["from_node_id", "to_node_id", "relationship_type"],
    },
    handler: async (args) => {
      try {
        const { from_node_id, to_node_id, relationship_type, strength = 0.5, obligations = [] } = args;

        const edge = {
          from_id: from_node_id,
          to_id: to_node_id,
          relationship_type,
          strength,
          ceremony_honored: false,
          obligations,
          created_at: new Date().toISOString(),
        };

        store.createEdge(edge);

        return {
          status: "created",
          message: `Relationship created: ${relationship_type}`,
          edge: edge,
          reminder: "Ceremony should be conducted to honor this relationship",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to create relational edge: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "get_relational_web",
    description: "Get the full relational web around a node (all connected relations up to specified depth). Visualizes the network of accountability.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "Center node ID",
        },
        depth: {
          type: "number",
          description: "How many relationship hops to traverse (default: 2)",
          minimum: 1,
          maximum: 5,
        },
      },
      required: ["node_id"],
    },
    handler: async (args) => {
      try {
        const { node_id, depth = 2 } = args;

        const web = (await store.getRelationalWeb(node_id, depth));

        return {
          center_node_id: node_id,
          depth,
          nodes_count: web.nodes.length,
          edges_count: web.edges.length,
          nodes: web.nodes,
          edges: web.edges,
          teaching: "Reality is relational; everything interconnected",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to get relational web: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "log_ceremony_with_memory",
    description: "Log ceremony to relational memory. Creates permanent record with community visibility.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["smudging", "talking_circle", "spirit_feeding", "opening", "closing"],
          description: "Type of ceremony",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Medicine wheel direction",
        },
        participants: {
          type: "array",
          items: { type: "string" },
          description: "Participant names or node IDs",
        },
        medicines_used: {
          type: "array",
          items: { type: "string" },
          description: "Medicines used (tobacco, cedar, sage, strawberry)",
        },
        intentions: {
          type: "array",
          items: { type: "string" },
          description: "Ceremony intentions",
        },
        research_context: {
          type: "string",
          description: "Research context (optional)",
        },
        relations_honored: {
          type: "array",
          items: { type: "string" },
          description: "Node IDs of relations honored in ceremony",
        },
      },
      required: ["type", "direction", "participants", "medicines_used", "intentions"],
    },
    handler: async (args) => {
      try {
        const ceremonyId = `ceremony:${Date.now()}:${Math.random().toString(36).substring(7)}`;

        const ceremonyLog = {
          id: ceremonyId,
          type: args.type,
          direction: args.direction,
          participants: args.participants,
          medicines_used: args.medicines_used,
          intentions: args.intentions,
          timestamp: new Date().toISOString(),
          research_context: args.research_context,
        };

        store.logCeremony(ceremonyLog);

        // Update relationship edges as ceremony-honored
        if (args.relations_honored) {
          for (const nodeId of args.relations_honored) {
            const related = (await store.getRelatedNodeIds(nodeId));
            for (const relatedId of related) {
              store.updateEdgeCeremony(nodeId, relatedId, ceremonyId);
            }
          }
        }

        return {
          ceremony_id: ceremonyId,
          logged_to_memory: true,
          ceremony: ceremonyLog,
          teaching: "Research is ceremony. This act has been witnessed and honored.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to log ceremony: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "create_narrative_beat",
    description: "Create narrative beat for medicine wheel journey. Links ceremonies, learnings, and relations to direction-specific story.",
    inputSchema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Which direction this beat belongs to",
        },
        title: {
          type: "string",
          description: "Title of this narrative beat",
        },
        description: {
          type: "string",
          description: "What happened in this beat",
        },
        learnings: {
          type: "array",
          items: { type: "string" },
          description: "Key learnings from this beat",
        },
        ceremony_ids: {
          type: "array",
          items: { type: "string" },
          description: "Ceremony IDs associated with this beat",
        },
        relations_honored: {
          type: "array",
          items: { type: "string" },
          description: "Node IDs of relations honored",
        },
        prose: {
          type: "string",
          description: "Narrative prose for this beat — how the moment reads, not just what it recorded",
        },
        cycle_id: {
          type: "string",
          description: "Research cycle this beat belongs to. Without it the beat is an orphan no arc will read.",
        },
        parent_beat_id: {
          type: "string",
          description: "Parent beat, when this one was telescoped out of a coarser moment",
        },
        origin_producer: {
          type: "string",
          description: "What put this beat on the wheel — e.g. hand, narrative-cluster, github-ceremony, session-reader",
        },
        origin_source_ref: {
          type: "string",
          description: "Identifier of the thing the beat was derived from (cluster id, event id, commit sha)",
        },
      },
      required: ["direction", "title", "description", "learnings"],
    },
    handler: async (args) => {
      try {
        const draft: BeatDraft = {
          direction: args.direction,
          title: args.title,
          description: args.description,
          prose: args.prose,
          ceremonies: args.ceremony_ids || [],
          learnings: args.learnings,
          relations_honored: args.relations_honored || [],
          cycle_id: args.cycle_id,
          parent_beat_id: args.parent_beat_id,
          origin: args.origin_producer
            ? { producer: args.origin_producer, source_ref: args.origin_source_ref }
            : { producer: "mcp" },
        };

        const beat = authorBeat(draft, {
          idFactory: () => `beat:${args.direction}:${Date.now()}`,
        });

        store.createBeat(beat);

        // Bind the cycle side of the relation. A beat that names its cycle
        // while the cycle does not list it back is how arcs silently lose beats.
        let cycleBound = false;
        if (beat.cycle_id) {
          const cycle = await store.getCycle(beat.cycle_id);
          if (cycle) {
            const listed = cycle.beats ?? [];
            if (!listed.includes(beat.id)) {
              store.createCycle({ ...cycle, beats: [...listed, beat.id] });
            }
            cycleBound = true;
          }
        }

        // Record the parent side of a telescoped beat, likewise.
        if (beat.parent_beat_id) {
          const parent = await store.getBeat(beat.parent_beat_id);
          if (parent) {
            const children = parent.sub_beats ?? [];
            if (!children.includes(beat.id)) {
              store.createBeat({ ...parent, sub_beats: [...children, beat.id] });
            }
          }
        }

        return {
          beat_id: beat.id,
          direction: args.direction,
          act: beat.act,
          cycle_id: beat.cycle_id ?? null,
          cycle_bound: cycleBound,
          message: `Narrative beat created for ${args.direction.toUpperCase()} direction`,
          ...(beat.cycle_id && !cycleBound
            ? { warning: `Cycle ${beat.cycle_id} not found — the beat names a cycle that does not exist` }
            : {}),
          ...(!beat.cycle_id
            ? { warning: "No cycle_id given — this beat is an orphan and will not appear in any narrative arc" }
            : {}),
          beat: beat,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to create narrative beat: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "create_research_cycle",
    description: "Create a new medicine wheel research cycle. Each cycle is a complete turn of the wheel around a research question. Starts in the East (vision) and progresses through South (growth), West (reflection), North (wisdom).",
    inputSchema: {
      type: "object",
      properties: {
        research_question: {
          type: "string",
          description: "The research question driving this cycle",
        },
        current_direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "Starting direction (default: east)",
        },
      },
      required: ["research_question"],
    },
    handler: async (args) => {
      try {
        const { research_question, current_direction = 'east' } = args;

        const cycle = {
          id: `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          research_question,
          current_direction,
          start_date: new Date().toISOString(),
          ceremonies_conducted: 0,
          relations_mapped: 0,
          wilson_alignment: 0,
          ocap_compliant: false,
          archived: false,
        };

        store.createCycle(cycle);

        return {
          cycle_id: cycle.id,
          research_question: cycle.research_question,
          current_direction: cycle.current_direction,
          start_date: cycle.start_date,
          cycle: cycle,
          teaching: "A cycle is a complete turn of the wheel. Each research question deserves its full journey through all four directions.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to create research cycle: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "get_narrative_arc",
    description: "Get complete narrative arc across all four directions for a medicine wheel cycle. Shows full research journey.",
    inputSchema: {
      type: "object",
      properties: {
        cycle_id: {
          type: "string",
          description: "Medicine wheel cycle ID",
        },
      },
      required: ["cycle_id"],
    },
    handler: async (args) => {
      try {
        const cycle = (await store.getCycle(args.cycle_id));
        if (!cycle) {
          return {
            status: "not_found",
            message: `Cycle ${args.cycle_id} not found`,
          };
        }

        const storedBeats = (await store.getAllBeats(500));

        // Read membership from both sides. Beats recorded before cycles were
        // bound carry no cycle_id and are reachable only through the cycle's
        // own list; reading one side alone silently drops half the arc.
        const cycleBeats = beatsInCycle(
          { ...cycle, beats: cycle.beats ?? [] } as any,
          storedBeats as any,
        ) as unknown as typeof storedBeats;

        const eastBeats = cycleBeats.filter(b => b.direction === 'east');
        const southBeats = cycleBeats.filter(b => b.direction === 'south');
        const westBeats = cycleBeats.filter(b => b.direction === 'west');
        const northBeats = cycleBeats.filter(b => b.direction === 'north');

        const totalCeremonies = new Set(cycleBeats.flatMap(b => b.ceremonies)).size;
        const orphanCount = storedBeats.length - cycleBeats.length;

        const journeySummary = `Research cycle "${cycle.research_question}" — ` +
          `${eastBeats.length} East beats, ${southBeats.length} South beats, ` +
          `${westBeats.length} West beats, ${northBeats.length} North beats. ` +
          `${totalCeremonies} ceremonies conducted.`;

        return {
          cycle_id: args.cycle_id,
          research_question: cycle.research_question,
          current_direction: cycle.current_direction,
          east_beats: eastBeats.length,
          south_beats: southBeats.length,
          west_beats: westBeats.length,
          north_beats: northBeats.length,
          total_beats: cycleBeats.length,
          total_ceremonies: totalCeremonies,
          wilson_alignment: cycle.wilson_alignment,
          ocap_compliant: cycle.ocap_compliant,
          journey_summary: journeySummary,
          beats_outside_this_cycle: orphanCount,
          ...(cycleBeats.length === 0 && orphanCount > 0
            ? {
                note: `This cycle holds no beats, though ${orphanCount} beats exist elsewhere in the store. Pass cycle_id when creating beats so they join an arc.`,
              }
            : {}),
          full_arc: {
            cycle,
            east_beats: eastBeats,
            south_beats: southBeats,
            west_beats: westBeats,
            north_beats: northBeats,
            total_ceremonies: totalCeremonies,
            journey_summary: journeySummary,
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to get narrative arc: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "archive_for_seven_generations",
    description: "Archive medicine wheel cycle for seven generations with OCAP® compliance. Requires Elder approval and community verification.",
    inputSchema: {
      type: "object",
      properties: {
        cycle_id: {
          type: "string",
          description: "Medicine wheel cycle ID to archive",
        },
        consent_level: {
          type: "string",
          enum: ["public", "community_only", "restricted", "sacred_private"],
          description: "Access level for archive",
        },
        community_verified: {
          type: "boolean",
          description: "Has community verified and approved?",
        },
        elder_approved: {
          type: "boolean",
          description: "Has Elder approved archiving?",
        },
      },
      required: ["cycle_id", "consent_level", "community_verified", "elder_approved"],
    },
    handler: async (args) => {
      try {
        const cycle = (await store.getCycle(args.cycle_id));
        if (!cycle) {
          return {
            status: "not_found",
            message: `Cycle ${args.cycle_id} not found`,
          };
        }

        const archiveId = `archive:${args.cycle_id}:${Date.now()}`;

        const ocapCompliance = {
          ownership: true,
          control: args.community_verified,
          access: args.consent_level !== 'public',
          possession: true,
          on_premise: true,
        };

        let status: string;
        let location: string;

        if (args.community_verified && args.elder_approved) {
          store.archiveCycle(args.cycle_id);
          status = 'archived';
          location = 'in-memory (community-controlled)';
        } else if (args.community_verified || args.elder_approved) {
          status = 'pending_approval';
          location = 'pending';
        } else {
          status = 'rejected';
          location = 'not archived';
        }

        return {
          archive_id: archiveId,
          status,
          location,
          ocap_compliance: ocapCompliance,
          message: status === 'archived'
            ? "Story archived for seven generations with community ownership"
            : status === 'pending_approval'
            ? "Archive created but pending Elder/community approval"
            : "Archive rejected - OCAP® compliance requirements not met",
          teaching: "Knowledge belongs to community; seven generations will inherit this story",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to archive for seven generations: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "update_cycle_direction",
    description: "Advance a medicine wheel research cycle to a new direction. The wheel turns: east → south → west → north.",
    inputSchema: {
      type: "object",
      properties: {
        cycle_id: {
          type: "string",
          description: "The ID of the cycle to update",
        },
        new_direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "The new current direction for the cycle",
        },
      },
      required: ["cycle_id", "new_direction"],
    },
    handler: async (args) => {
      try {
        const { cycle_id, new_direction } = args;

        const cycle = (await store.getCycle(cycle_id));
        if (!cycle) {
          return {
            status: "not_found",
            message: `Cycle ${cycle_id} not found`,
          };
        }

        const previousDirection = cycle.current_direction;
        const updated = {
          ...cycle,
          current_direction: new_direction,
        };

        store.createCycle(updated);

        return {
          status: "updated",
          cycle_id,
          previous_direction: previousDirection,
          new_direction,
          cycle: updated,
          teaching: "The wheel turns. Each direction holds its own medicine.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to update cycle direction: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "update_relational_node",
    description: "Update a relational node's description, metadata, or direction. Preserves existing fields not specified in the update.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "The ID of the relational node to update",
        },
        description: {
          type: "string",
          description: "New description for the node (optional)",
        },
        metadata: {
          type: "object",
          description: "Metadata to merge into existing metadata (optional)",
        },
        direction: {
          type: "string",
          enum: ["east", "south", "west", "north"],
          description: "New medicine wheel direction (optional)",
        },
      },
      required: ["node_id"],
    },
    handler: async (args) => {
      try {
        const { node_id, description, metadata, direction } = args;

        const node = (await store.getNode(node_id));
        if (!node) {
          return {
            status: "not_found",
            message: `Relational node ${node_id} not found`,
          };
        }

        const updated = {
          ...node,
          ...(description !== undefined && { description }),
          ...(direction !== undefined && { direction }),
          metadata: { ...(node.metadata || {}), ...(metadata || {}) },
          updated_at: new Date().toISOString(),
        };

        store.createNode(updated);

        return {
          status: "updated",
          node_id,
          node: updated,
          teaching: "Relations grow and change. Updating a node honours that living reality.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: "error",
          message: `Failed to update relational node: ${errorMsg}`,
          error: errorMsg,
        };
      }
    },
  },
  {
    name: "create_sub_beats",
    description:
      "Telescope a narrative beat into sub-beats. A moment that read as one turns out to hold several; the finer grain is recorded without losing the coarser one. The parent remains as the lens through which the children are read. Sub-beats inherit the parent's cycle and, unless told otherwise, its direction. Note: this WRITES. To READ a beat's relational web instead, use telescope_narrative_beat.",
    inputSchema: {
      type: "object",
      properties: {
        parent_beat_id: {
          type: "string",
          description: "The beat being telescoped",
        },
        sub_beats: {
          type: "array",
          description: "The finer-grained beats this moment holds",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              prose: { type: "string" },
              direction: {
                type: "string",
                enum: ["east", "south", "west", "north"],
                description: "Defaults to the parent's direction",
              },
              learnings: { type: "array", items: { type: "string" } },
              ceremonies: { type: "array", items: { type: "string" } },
              relations_honored: { type: "array", items: { type: "string" } },
            },
            required: ["title", "description"],
          },
        },
      },
      required: ["parent_beat_id", "sub_beats"],
    },
    handler: async (args) => {
      try {
        const parent = await store.getBeat(args.parent_beat_id);
        if (!parent) {
          return {
            status: "not_found",
            message: `Narrative beat ${args.parent_beat_id} not found`,
          };
        }

        if (!Array.isArray(args.sub_beats) || args.sub_beats.length === 0) {
          return {
            status: "error",
            message: "Supply at least one sub-beat — telescoping into nothing loses the moment rather than refining it",
          };
        }

        const drafts: BeatDraft[] = args.sub_beats.map((s: any) => ({
          direction: s.direction ?? parent.direction,
          title: s.title,
          description: s.description,
          prose: s.prose,
          learnings: s.learnings ?? [],
          ceremonies: s.ceremonies ?? [],
          relations_honored: s.relations_honored ?? [],
          origin: { producer: "mcp", source_ref: parent.id, method: "telescope" },
        }));

        const { parent: updatedParent, subBeats } = telescopeBeat(parent as any, drafts);

        for (const sub of subBeats) {
          store.createBeat(sub as any);
        }
        store.createBeat(updatedParent as any);

        // Sub-beats join the parent's cycle on the cycle's side too.
        if (updatedParent.cycle_id) {
          const cycle = await store.getCycle(updatedParent.cycle_id);
          if (cycle) {
            const listed = cycle.beats ?? [];
            const additions = subBeats.map(b => b.id).filter(id => !listed.includes(id));
            if (additions.length > 0) {
              store.createCycle({ ...cycle, beats: [...listed, ...additions] });
            }
          }
        }

        return {
          parent_beat_id: updatedParent.id,
          sub_beat_ids: subBeats.map(b => b.id),
          count: subBeats.length,
          cycle_id: updatedParent.cycle_id ?? null,
          parent: updatedParent,
          sub_beats: subBeats,
          teaching:
            "Telescoping does not replace the moment — it reveals what the moment was already holding.",
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
];
