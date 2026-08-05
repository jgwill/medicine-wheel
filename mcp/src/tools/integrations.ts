/**
 * Integration Tools — Create and manage relational nodes, edges, ceremonies,
 * narrative beats, cycles, and seven-generations archiving.
 *
 * Adapted to use in-memory store instead of Redis/NCP/GitHub.
 */

import type { Tool } from "../types.js";
import { store } from "../store.js";
import {
  HostFacetSchema,
  TenantFacetSchema,
  ServiceFacetSchema,
} from "@medicine-wheel/infra";
import { INFRA_ENTITY_BINDING, isKinshipEdgeName } from "@medicine-wheel/ontology-core";
import {
  createBeat as authorBeat,
  validateBeatDraft,
  telescopeBeat,
  beatsInCycle,
  type BeatDraft,
} from "@medicine-wheel/narrative-engine";

export const integrationTools: Tool[] = [
  {
    name: "create_relational_node",
    description:
      "Create a relational node in the medicine wheel memory graph (human, land, spirit, ancestor, " +
      "future, knowledge). Persistent across sessions. Optionally validates and attaches a typed " +
      "infrastructure facet — see `facet_kind`; for hosts, tenants and services prefer the " +
      "register_* tools, which resolve identities, merge on re-registration and emit the edges.",
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
        facet: {
          type: "object",
          description:
            "A typed infrastructure facet to validate and attach, instead of an unchecked metadata " +
            "blob. Requires `facet_kind`. Prefer register_host / register_tenant / register_service, " +
            "which resolve identities and emit the relational edges; this is the escape hatch for a " +
            "caller that already holds a complete facet.",
        },
        facet_kind: {
          type: "string",
          enum: ["host", "tenant", "service"],
          description: "Which schema validates `facet`. Sets metadata.kind on the node.",
        },
      },
      required: ["name", "type", "description"],
    },
    handler: async (args) => {
      try {
        const { name, type, description, direction, metadata = {}, facet, facet_kind } = args;

        const id = `node:${type}:${Date.now()}:${Math.random().toString(36).substring(7)}`;
        let nodeMetadata: Record<string, unknown> = { ...metadata };

        if (facet || facet_kind) {
          if (!facet || !facet_kind) {
            return {
              status: "error",
              message:
                "`facet` and `facet_kind` travel together — a facet with no declared kind cannot be " +
                "validated, and a kind with no facet has nothing to validate.",
            };
          }
          const expected = INFRA_ENTITY_BINDING[facet_kind as "host" | "tenant" | "service"];
          if (expected.nodeType !== type) {
            return {
              status: "error",
              message:
                `A ${facet_kind} facet rides a '${expected.nodeType}' node, not '${type}'. The NodeType ` +
                `union is closed at six and infrastructure reuses it rather than widening it.`,
            };
          }
          const schema =
            facet_kind === "host" ? HostFacetSchema
            : facet_kind === "tenant" ? TenantFacetSchema
            : ServiceFacetSchema;
          const parsed = schema.safeParse({ ...facet, nodeId: id });
          if (!parsed.success) {
            return {
              status: "error",
              message: `${facet_kind} facet failed validation — nothing was written`,
              issues: parsed.error.issues.map(i => ({ field: i.path.join("."), problem: i.message })),
            };
          }
          nodeMetadata = { ...nodeMetadata, kind: facet_kind, facet: parsed.data };
        }

        const node = {
          id,
          type,
          name,
          description,
          direction,
          metadata: nodeMetadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Awaited: HttpStore returns the promise precisely so a caller can learn
        // the truth rather than being told "created" over a request that 404'd.
        await store.createNode(node);

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

        await store.createEdge(edge);

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
    description:
      "Get the full relational web around a node (all connected relations up to specified depth). " +
      "Visualizes the network of accountability. Filter by `edge_types` to walk one vocabulary — " +
      "the infrastructure edges that tools actually emit are `part-of` and `binds-port`, so a " +
      "service's containment and its port claims can be traversed without the ceremony edges, or " +
      "alongside them. (`ordered-after` is registered in KINSHIP_EDGE_TYPES but no tool emits one " +
      "yet, so filtering on it always returns an empty web.)",
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
        edge_types: {
          type: "array",
          items: { type: "string" },
          description:
            "Keep only edges whose relationship_type is in this list — e.g. ['part-of','binds-port'] " +
            "for the infrastructure topology around a host. Unregistered names are reported back " +
            "rather than silently matching nothing.",
        },
      },
      required: ["node_id"],
    },
    handler: async (args) => {
      try {
        const { node_id, depth = 2, edge_types } = args;

        // Without this, a missing node_id returns an empty web with status ok —
        // and "this host has no tenants and no services" is indistinguishable
        // from "you never named a host". A rendered success over zero bytes.
        if (typeof node_id !== "string" || node_id.trim().length === 0) {
          return {
            status: "error",
            message:
              "node_id is required. An empty centre returns an empty web, which reads as " +
              "'this node has no relations' rather than as 'no node was named'.",
          };
        }

        const web = (await store.getRelationalWeb(node_id, depth));

        let edges = web.edges;
        let nodes = web.nodes;
        let unregistered: string[] = [];
        // `[]` is not a filter. Echoing it back beside an unfiltered web read as
        // "I filtered to nothing and this is what survived."
        const filtering = Array.isArray(edge_types) && edge_types.length > 0;

        if (filtering) {
          // Name what is not in the governed registry. A filter that silently
          // matches nothing is indistinguishable from a node with no relations,
          // and the caller cannot tell which they are looking at.
          unregistered = edge_types.filter((t: string) => !isKinshipEdgeName(t));

          const wanted = new Set<string>(edge_types);
          edges = web.edges.filter((e: { relationship_type: string }) =>
            wanted.has(e.relationship_type));

          // Keep the centre plus whatever the surviving edges still touch, so
          // the returned web is connected rather than a node list with holes.
          const reachable = new Set<string>([node_id]);
          for (const e of edges as { from_id: string; to_id: string }[]) {
            reachable.add(e.from_id);
            reachable.add(e.to_id);
          }
          nodes = web.nodes.filter((n: { id: string }) => reachable.has(n.id));
        }

        return {
          center_node_id: node_id,
          depth,
          ...(filtering ? { edge_types } : {}),
          ...(unregistered.length > 0
            ? {
                unregistered_edge_types: unregistered,
                warning:
                  `${unregistered.join(", ")} — not in KINSHIP_EDGE_TYPES. Free-string edges still ` +
                  `match if they exist in the graph, but nothing governs their meaning.`,
              }
            : {}),
          nodes_count: nodes.length,
          edges_count: edges.length,
          nodes,
          edges,
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

        await store.logCeremony(ceremonyLog);

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

        // The door's advisory findings were computed and dropped here; a
        // caller who never sees "no relations honored" cannot act on it.
        const advisories = validateBeatDraft(draft)
          .violations.filter((v) => v.severity === "warning")
          .map((v) => `${v.field}: ${v.message}`);

        await store.createBeat(beat);

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
          ...(advisories.length ? { advisories } : {}),
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

        await store.createCycle(cycle);

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

        await store.createCycle(updated);

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

        await store.createNode(updated);

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

        // Parent first. Over an HTTP store the parent update re-enters the
        // validating route, and a legacy parent can be rejected there — if the
        // children were already written, that failure would leave orphan
        // sub-beats behind a parent that never learned their names. Failing on
        // the first write leaves the store untouched.
        await store.createBeat(updatedParent as any);
        for (const sub of subBeats) {
          await store.createBeat(sub as any);
        }

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
