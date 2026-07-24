import { NextResponse } from "next/server";
import { getAllCycles, createCycle, upsertCycle } from "@/lib/store";

export async function GET() {
  try {
    return NextResponse.json(getAllCycles());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // A body carrying an id is an amendment to a cycle the caller already
    // holds, not a request for a new one. Minting a fresh cycle here is how
    // archiving and beat-binding duplicated cycles instead of amending them.
    if (typeof body.id === "string" && body.id.length > 0) {
      const updated = upsertCycle(body);
      if (!updated) {
        return NextResponse.json({ error: `Cycle ${body.id} not found` }, { status: 404 });
      }
      return NextResponse.json(updated, { status: 200 });
    }

    const cycle = createCycle({
      research_question: body.research_question,
      current_direction: body.current_direction,
    });
    return NextResponse.json(cycle, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
