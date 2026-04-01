import { NextResponse } from "next/server";
import { getAllNodes, getNodesByType, getNodesByDirection, createNode } from "@/lib/store";
import { filterNodes, sortNodes, paginate } from 'medicine-wheel-relational-query';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const direction = searchParams.get("direction");
    const sortField = searchParams.get("sort");
    const sortOrder = searchParams.get("order") as "asc" | "desc" | null;
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = parseInt(searchParams.get("limit") ?? "0", 10);

    let nodes = getAllNodes();

    // Use relational-query filterNodes when query params are provided
    try {
      const filter: Record<string, unknown> = {};
      if (type) filter.type = type;
      if (direction) filter.direction = direction;
      if (Object.keys(filter).length > 0) {
        nodes = filterNodes(nodes, filter as any);
      }
    } catch {
      // Fallback to basic filtering if package function fails
      if (type) {
        nodes = getNodesByType(type);
      } else if (direction) {
        nodes = getNodesByDirection(direction);
      }
    }

    // Apply sorting via relational-query
    if (sortField) {
      try {
        nodes = sortNodes(nodes, {
          field: sortField as any,
          order: sortOrder ?? "asc",
        });
      } catch {
        // Sorting unavailable — return unsorted
      }
    }

    // Apply pagination if requested
    if (limit > 0) {
      try {
        const result = paginate(nodes, { offset, limit });
        return NextResponse.json(result);
      } catch {
        // Pagination unavailable — return full list
      }
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
