import { NextResponse } from "next/server";
import { getAllCeremonies, getCeremoniesByDirection, getCeremoniesByType, createCeremony } from "@/lib/store";
import { getPhaseFraming, nextPhase } from "medicine-wheel-ceremony-protocol";

const PHASE_MAP: Record<string, string> = {
  east: "opening",
  south: "council",
  west: "integration",
  north: "closure",
};

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

    // Add ceremony-protocol metadata
    let protocolMeta: Record<string, unknown> = {};
    try {
      const allCeremonies = getAllCeremonies();
      const latestDir = allCeremonies.length > 0 ? allCeremonies[0].direction : "east";
      const cp = (PHASE_MAP[latestDir] ?? "opening") as any;
      protocolMeta = {
        currentPhase: cp,
        phaseFraming: getPhaseFraming(cp),
        nextPhase: nextPhase(cp),
      };
    } catch {
      protocolMeta = { note: "Protocol metadata unavailable" };
    }

    return NextResponse.json({ ceremonies, protocol: protocolMeta });
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
