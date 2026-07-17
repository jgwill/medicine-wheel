import { NextResponse } from "next/server";
import { z } from "zod";
import { DirectionNameSchema, NodeTypeSchema } from "@medicine-wheel/ontology-core";
import {
  createProvider,
  detectProvider,
  NodeNotFoundError,
  NodeHasRelationsError,
} from "@medicine-wheel/storage-provider";

// `direction: null` releases the node from its direction.
const NodePatchSchema = z
  .object({
    name: z.string().trim().min(1, "cannot be empty").optional(),
    type: NodeTypeSchema.optional(),
    description: z.string().optional(),
    direction: DirectionNameSchema.nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message:
      "Provide at least one field to change: name, type, description, direction, or metadata.",
  });

type RouteContext = { params: Promise<{ id: string }> };

function notFound(id: string) {
  return NextResponse.json(
    {
      error: `Node not found: ${id}`,
      hint: "It may already be released — refresh the nodes list.",
    },
    { status: 404 },
  );
}

function unexpected(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const store = await createProvider();
    const node = await store.getNode(id);
    if (!node) return notFound(id);
    return NextResponse.json({ node, provider: detectProvider() });
  } catch (error: unknown) {
    return unexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = NodePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid node patch — nothing was changed.",
          issues: parsed.error.issues.map(
            (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const store = await createProvider();
    const node = await store.updateNode(id, parsed.data);
    return NextResponse.json({ success: true, node, provider: detectProvider() });
  } catch (error: unknown) {
    if (error instanceof NodeNotFoundError) return notFound(error.nodeId);
    return unexpected(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const store = await createProvider();
    await store.deleteNode(id);
    return NextResponse.json({ success: true, deleted: id, provider: detectProvider() });
  } catch (error: unknown) {
    if (error instanceof NodeNotFoundError) return notFound(error.nodeId);
    if (error instanceof NodeHasRelationsError) {
      return NextResponse.json(
        {
          error: error.message,
          relation_count: error.relationCount,
          hint: "Release its relations on /relations, then delete the node.",
        },
        { status: 409 },
      );
    }
    return unexpected(error);
  }
}
