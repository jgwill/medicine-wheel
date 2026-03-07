import { NextResponse } from "next/server";
import { getAllCeremonies, getCeremoniesByDirection, getCeremoniesByType, createCeremony } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get("direction");
    const type = searchParams.get("type");

    let ceremonies;
    if (direction) {
      ceremonies = getCeremoniesByDirection(direction);
    } else if (type) {
      ceremonies = getCeremoniesByType(type);
    } else {
      ceremonies = getAllCeremonies();
    }

    return NextResponse.json(ceremonies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ceremony = createCeremony({
      type: body.type,
      direction: body.direction,
      participants: body.participants ?? [],
      medicines_used: body.medicines_used ?? [],
      intentions: body.intentions ?? [],
      research_context: body.research_context,
    });
    return NextResponse.json(ceremony, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
