import { NextResponse } from "next/server";
import { z } from "zod";
import { DirectionNameSchema, NodeTypeSchema } from "@medicine-wheel/ontology-core";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";

const NodeCreateSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string({ required_error: "name is required" }).trim().min(1, "cannot be empty"),
  type: NodeTypeSchema,
  description: z.string().optional(),
  // Forms send "" when no direction is chosen — treat that as "no direction".
  direction: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    DirectionNameSchema.optional(),
  ),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const direction = searchParams.get("direction");

    const store = await createProvider();
    let nodes = await store.getAllNodes();

    if (type) {
      nodes = nodes.filter((n) => n.type === type);
    } else if (direction) {
      nodes = nodes.filter((n) => n.direction === direction);
    }

    return NextResponse.json({
      nodes,
      provider: detectProvider(),
      count: nodes.length
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = NodeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid node — nothing was created.",
          issues: parsed.error.issues.map(
            (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const store = await createProvider();
    const node = {
      id: parsed.data.id || crypto.randomUUID(),
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description || "",
      direction: parsed.data.direction,
      metadata: parsed.data.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.createNode(node);
    return NextResponse.json({ success: true, node, provider: detectProvider() }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
