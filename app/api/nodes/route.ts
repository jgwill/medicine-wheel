import { NextResponse } from "next/server";
import { getAllNodes, getNodesByType, getNodesByDirection, createNode } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const direction = searchParams.get("direction");

    let nodes;
    if (type) {
      nodes = getNodesByType(type);
    } else if (direction) {
      nodes = getNodesByDirection(direction);
    } else {
      nodes = getAllNodes();
    }

    return NextResponse.json(nodes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const node = createNode({
      name: body.name,
      type: body.type,
      direction: body.direction || undefined,
      metadata: body.metadata || {},
    });
    return NextResponse.json(node, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
