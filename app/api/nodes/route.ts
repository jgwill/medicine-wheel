import { NextResponse } from "next/server";
import { createProvider, detectProvider } from "medicine-wheel-storage-provider";

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
    const store = await createProvider();
    const body = await request.json();
    
    const node = {
      id: body.id || crypto.randomUUID(),
      name: body.name,
      type: body.type,
      description: body.description || "",
      direction: body.direction || undefined,
      metadata: body.metadata || {},
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
