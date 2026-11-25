import { NextResponse } from "next/server";
import { z } from "zod";
import { agentKinshipWriteRefusal, isAgentKinshipEdge } from "@medicine-wheel/community-identity";
import { KinshipEdgeNameSchema, RelationContextSchema } from "@medicine-wheel/ontology-core";
import type { KinshipEdgeName, RelationContext } from "@medicine-wheel/ontology-core";
import {
  createProvider,
  detectProvider,
  EdgeNotFoundError,
} from "@medicine-wheel/storage-provider";
import { relationRemoved, relationWritten } from "@medicine-wheel/events";
import { parseLimit } from "@/lib/api-paging";
import { recordEvent } from "@/lib/event-log";

/**
 * The context that authorizes and bounds a relation. Strict here: a context
 * key this wheel does not know is a 400, not a key dropped in silence.
 */
const ContextSchema = RelationContextSchema.strict();

/**
 * A relation may name its governed kinship type (`kinship_type`, from the
 * registry in ontology-core). It is then identified by its two ends and that
 * name, so the same two nodes can hold one relation for each kinship type
 * beside the one relation they hold without any. `relationship_type` may be
 * left out when `kinship_type` is given, and must say the same name when both
 * are sent: one relation does not carry two names.
 */
const EdgeCreateSchema = z
  .object({
    from_id: z.string({ required_error: "from_id is required" }).trim().min(1),
    to_id: z.string({ required_error: "to_id is required" }).trim().min(1),
    relationship_type: z.string().trim().min(1, "cannot be empty").optional(),
    kinship_type: KinshipEdgeNameSchema.optional(),
    strength: z.number().min(0).max(1).optional(),
    ceremony_honored: z.boolean().optional(),
    obligations: z.array(z.string()).optional(),
    description: z.string().trim().max(2000).optional(),
    context: ContextSchema.optional(),
  })
  .superRefine((edge, ctx) => {
    if (!edge.relationship_type && !edge.kinship_type) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["relationship_type"], message: "relationship_type is required" });
    }
    if (edge.relationship_type && edge.kinship_type && edge.relationship_type !== edge.kinship_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relationship_type"],
        message: `must be ${edge.kinship_type}, the kinship_type, or left out`,
      });
    }
  });

const EdgePatchSchema = z
  .object({
    relationship_type: z.string().trim().min(1, "cannot be empty").optional(),
    strength: z.number().min(0).max(1).optional(),
    ceremony_honored: z.boolean().optional(),
    obligations: z.array(z.string()).optional(),
    description: z.string().trim().max(2000).optional(),
    context: ContextSchema.optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message:
      "Provide at least one field to change: relationship_type, strength, ceremony_honored, obligations, description, or context.",
  });

/**
 * Relations are identified by their pair of nodes (from → to), and by their
 * kinship type when they name one.
 * Accepts ?from=&to=, ?id=<from>:<to>, or from_id/to_id in the body; and
 * ?kinship_type=, or kinship_type in the body, for a relation that names one.
 */
function resolvePair(
  request: Request,
  body: Record<string, unknown> | null,
): { from: string; to: string; kinship?: string } | null {
  const { searchParams } = new URL(request.url);
  let from = searchParams.get("from");
  let to = searchParams.get("to");

  const composite = searchParams.get("id");
  if ((!from || !to) && composite && composite.includes(":")) {
    const separator = composite.indexOf(":");
    from = composite.slice(0, separator);
    to = composite.slice(separator + 1);
  }

  if ((!from || !to) && body) {
    if (!from && typeof body.from_id === "string") from = body.from_id;
    if (!to && typeof body.to_id === "string") to = body.to_id;
  }

  const kinship =
    searchParams.get("kinship_type") ||
    (body && typeof body.kinship_type === "string" ? body.kinship_type : "") ||
    undefined;

  return from && to ? { from, to, ...(kinship ? { kinship } : {}) } : null;
}

function pairRequired() {
  return NextResponse.json(
    {
      error: "Relation not identified — nothing was changed.",
      hint: "Identify the relation with ?from=<node-id>&to=<node-id> (or ?id=<from>:<to>).",
    },
    { status: 400 },
  );
}

function relationNotFound(from: string, to: string, kinship?: string) {
  return NextResponse.json(
    {
      error: kinship
        ? `No ${kinship} relation exists from ${from} to ${to}.`
        : `No relation exists from ${from} to ${to}.`,
      hint: kinship
        ? "Relations are directional — check the from/to order and the kinship_type, or refresh the relations list."
        : "Relations are directional — check the from/to order, or refresh the relations list. A relation that names a kinship type is reached with ?kinship_type=.",
    },
    { status: 404 },
  );
}

/**
 * This door writes any relation and checks only that its two nodes exist. The
 * four relations between a person and their agents are checked by the kinship
 * door, so this one does not create them and does not change their context or
 * their words (rispecs/agent-kinship.spec.md).
 */
function leftToTheKinshipDoor(reason: string) {
  return NextResponse.json(
    {
      error: `${reason} Nothing was written.`,
      hint: "Use POST /api/nodes/{agent id}/kinship, or POST /api/agents for a new agent. This door still releases such a relation (DELETE) and still records that a ceremony honoured it.",
    },
    { status: 400 },
  );
}

function unexpected(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Relations, oldest-visible-first as the provider orders them.
 *
 * The response stays a bare array. Five callers parse it that way — the graph,
 * relations, nodes and accountability pages, and `mcp/src/http-store.ts` — so
 * wrapping it in an object to carry a total would break the MCP server to fix a
 * page. `?limit=all` is the honest ask instead, and a caller that wants the
 * count of what it received can read `.length` of a complete answer.
 *
 * Without it this route took `getAllEdges()`'s 100-row default in silence: the
 * graph drew 100 of 191 relations, and 27 of those 100 pointed at nodes the
 * nodes route had not sent, so React Flow dropped them without a word.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    if (limit instanceof NextResponse) return limit;

    const store = await createProvider();
    const edges = await store.getAllEdges(limit ?? Number.MAX_SAFE_INTEGER);
    return NextResponse.json(edges);
  } catch (error: unknown) {
    return unexpected(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = EdgeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid relation — nothing was created.",
          issues: parsed.error.issues.map(
            (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`,
          ),
        },
        { status: 400 },
      );
    }

    if (parsed.data.from_id === parsed.data.to_id) {
      return NextResponse.json(
        {
          error: "A relation needs two distinct nodes.",
          hint: "Choose a different node for one end of the relation.",
        },
        { status: 400 },
      );
    }

    const store = await createProvider();

    // Relational accountability: both ends must exist before a thread is woven.
    const [fromNode, toNode] = await Promise.all([
      store.getNode(parsed.data.from_id),
      store.getNode(parsed.data.to_id),
    ]);
    const missing = [
      ...(fromNode ? [] : [parsed.data.from_id]),
      ...(toNode ? [] : [parsed.data.to_id]),
    ];
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot weave a relation to a node that does not exist: ${missing.join(", ")}.`,
          hint: "Create the node first on /nodes, then weave the relation.",
        },
        { status: 404 },
      );
    }

    // The relation this write replaces is the one with the same identity: the
    // pair, and the kinship type when one is named.
    const kinship = parsed.data.kinship_type as KinshipEdgeName | undefined;
    const previous = await store.getEdge(parsed.data.from_id, parsed.data.to_id, kinship);
    const replaced = Boolean(previous);

    const refusal = agentKinshipWriteRefusal({
      kinship_type: kinship,
      existing: previous,
      context: parsed.data.context,
      description: parsed.data.description,
    });
    if (refusal) return leftToTheKinshipDoor(refusal);
    // Past that check, one of the four exists already and this write brings
    // its context and its words as they are, or does not bring them: both stay.
    const kept = previous && isAgentKinshipEdge(kinship) ? previous : null;
    const description = kept ? kept.description : parsed.data.description;
    const context = kept ? kept.context : (parsed.data.context as RelationContext | undefined);

    const edge = {
      from_id: parsed.data.from_id,
      to_id: parsed.data.to_id,
      relationship_type: parsed.data.relationship_type ?? (kinship as string),
      // For one of the four, what the write leaves out stays as it is: this
      // door cannot create such a relation, so a write here is never its first.
      strength: parsed.data.strength ?? kept?.strength ?? 0.5,
      ceremony_honored: parsed.data.ceremony_honored ?? kept?.ceremony_honored ?? false,
      obligations: parsed.data.obligations ?? kept?.obligations ?? [],
      ...(kept?.last_ceremony ? { last_ceremony: kept.last_ceremony } : {}),
      ...(description ? { description } : {}),
      ...(kinship ? { kinship_type: kinship } : {}),
      ...(context ? { context } : {}),
      // A governed relation keeps the date it was first written: a ceremony
      // that honours it, or a write that says it again, does not restart it.
      created_at: kinship && previous ? previous.created_at : new Date().toISOString(),
    };

    await store.createEdge(edge);
    // The event log (#164): a relation made, or — over an existing pair —
    // amended in what moved. Between two chronicle episodes it is lineage,
    // and carries the sentence that says why.
    recordEvent(relationWritten(previous, edge, { from: fromNode, to: toNode }));
    return NextResponse.json(
      { success: true, edge, replaced, provider: detectProvider() },
      { status: 201 },
    );
  } catch (error: unknown) {
    return unexpected(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const pair = resolvePair(request, body);
    if (!pair) return pairRequired();

    // from_id/to_id/kinship_type in the body only identify the relation — strip before validating the patch.
    const patchBody = body ? { ...body } : {};
    delete patchBody.from_id;
    delete patchBody.to_id;
    delete patchBody.kinship_type;

    const parsed = EdgePatchSchema.safeParse(patchBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid relation patch — nothing was changed.",
          issues: parsed.error.issues.map(
            (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`,
          ),
        },
        { status: 400 },
      );
    }

    if (pair.kinship && parsed.data.relationship_type && parsed.data.relationship_type !== pair.kinship) {
      return NextResponse.json(
        {
          error: "Invalid relation patch — nothing was changed.",
          issues: [`relationship_type: a ${pair.kinship} relation keeps its name; remove it and weave another to change its kind`],
        },
        { status: 400 },
      );
    }

    const store = await createProvider();
    const previous = await store.getEdge(pair.from, pair.to, pair.kinship);
    if (previous) {
      const refusal = agentKinshipWriteRefusal({
        kinship_type: pair.kinship,
        existing: previous,
        context: parsed.data.context,
        description: parsed.data.description,
      });
      if (refusal) return leftToTheKinshipDoor(refusal);
    }
    const edge = await store.updateEdge(
      pair.from,
      pair.to,
      { ...parsed.data, ...(parsed.data.context ? { context: parsed.data.context as RelationContext } : {}) },
      pair.kinship,
    );
    const [fromNode, toNode] = await Promise.all([store.getNode(pair.from), store.getNode(pair.to)]);
    recordEvent(relationWritten(previous ?? edge, edge, { from: fromNode, to: toNode }));
    return NextResponse.json({ success: true, edge, provider: detectProvider() });
  } catch (error: unknown) {
    if (error instanceof EdgeNotFoundError) {
      return relationNotFound(error.fromId, error.toId, error.kinshipType);
    }
    return unexpected(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const pair = resolvePair(request, body);
    if (!pair) return pairRequired();

    const store = await createProvider();
    const previous = await store.getEdge(pair.from, pair.to, pair.kinship);
    const [fromNode, toNode] = await Promise.all([store.getNode(pair.from), store.getNode(pair.to)]);
    await store.deleteEdge(pair.from, pair.to, pair.kinship);
    recordEvent(relationRemoved(previous ?? { from_id: pair.from, to_id: pair.to }, { from: fromNode, to: toNode }));
    return NextResponse.json({
      success: true,
      deleted: { from_id: pair.from, to_id: pair.to, ...(pair.kinship ? { kinship_type: pair.kinship } : {}) },
      provider: detectProvider(),
    });
  } catch (error: unknown) {
    if (error instanceof EdgeNotFoundError) {
      return relationNotFound(error.fromId, error.toId, error.kinshipType);
    }
    return unexpected(error);
  }
}
