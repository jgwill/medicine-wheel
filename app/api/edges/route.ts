import { NextResponse } from "next/server";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";

export async function GET() {
  try {
    const store = await createProvider();
    const edges = await store.getAllEdges();
    return NextResponse.json(edges);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const store = await createProvider();
    const body = await request.json();
    
    const edge = {
      from_id: body.from_id,
      to_id: body.to_id,
      relationship_type: body.relationship_type,
      strength: body.strength ?? 0.5,
      ceremony_honored: body.ceremony_honored ?? false,
      obligations: body.obligations ?? [],
      created_at: new Date().toISOString(),
    };
    
    await store.createEdge(edge);
    return NextResponse.json({ success: true, edge, provider: detectProvider() }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
