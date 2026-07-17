import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createProvider,
  detectProvider,
  EdgeNotFoundError,
} from "@medicine-wheel/storage-provider";

const EdgeCreateSchema = z.object({
  from_id: z.string({ required_error: "from_id is required" }).trim().min(1),
  to_id: z.string({ required_error: "to_id is required" }).trim().min(1),
  relationship_type: z
    .string({ required_error: "relationship_type is required" })
    .trim()
    .min(1, "cannot be empty"),
  strength: z.number().min(0).max(1).optional(),
  ceremony_honored: z.boolean().optional(),
  obligations: z.array(z.string()).optional(),
});

const EdgePatchSchema = z
  .object({
    relationship_type: z.string().trim().min(1, "cannot be empty").optional(),
    strength: z.number().min(0).max(1).optional(),
    ceremony_honored: z.boolean().optional(),
    obligations: z.array(z.string()).optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message:
      "Provide at least one field to change: relationship_type, strength, ceremony_honored, or obligations.",
  });

/**
 * Relations are identified by their pair of nodes (from → to).
 * Accepts ?from=&to=, ?id=<from>:<to>, or from_id/to_id in the body.
 */
function resolvePair(
  request: Request,
  body: Record<string, unknown> | null,
): { from: string; to: string } | null {
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

  return from && to ? { from, to } : null;
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

function relationNotFound(from: string, to: string) {
  return NextResponse.json(
    {
      error: `No relation exists from ${from} to ${to}.`,
      hint: "Relations are directional — check the from/to order, or refresh the relations list.",
    },
    { status: 404 },
  );
}

function unexpected(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const store = await createProvider();
    const edges = await store.getAllEdges();
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

    const replaced = Boolean(await store.getEdge(parsed.data.from_id, parsed.data.to_id));

    const edge = {
      from_id: parsed.data.from_id,
      to_id: parsed.data.to_id,
      relationship_type: parsed.data.relationship_type,
      strength: parsed.data.strength ?? 0.5,
      ceremony_honored: parsed.data.ceremony_honored ?? false,
      obligations: parsed.data.obligations ?? [],
      created_at: new Date().toISOString(),
    };

    await store.createEdge(edge);
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

    // from_id/to_id in the body only identify the relation — strip before validating the patch.
    const patchBody = body ? { ...body } : {};
    delete patchBody.from_id;
    delete patchBody.to_id;

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

    const store = await createProvider();
    const edge = await store.updateEdge(pair.from, pair.to, parsed.data);
    return NextResponse.json({ success: true, edge, provider: detectProvider() });
  } catch (error: unknown) {
    if (error instanceof EdgeNotFoundError) {
      return relationNotFound(error.fromId, error.toId);
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
    await store.deleteEdge(pair.from, pair.to);
    return NextResponse.json({
      success: true,
      deleted: { from_id: pair.from, to_id: pair.to },
      provider: detectProvider(),
    });
  } catch (error: unknown) {
    if (error instanceof EdgeNotFoundError) {
      return relationNotFound(error.fromId, error.toId);
    }
    return unexpected(error);
  }
}
