import { NextResponse } from "next/server";
import { getAllEdges, createEdge } from "@/lib/store";

export async function GET() {
  try {
    return NextResponse.json(getAllEdges());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const edge = createEdge({
      from_id: body.from_id,
      to_id: body.to_id,
      relationship_type: body.relationship_type,
      strength: body.strength ?? 0.5,
      ceremony_honored: body.ceremony_honored ?? false,
      obligations: body.obligations ?? [],
    });
    return NextResponse.json(edge, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
