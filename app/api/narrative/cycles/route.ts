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

    // A body carrying an id names the cycle the caller already holds — amend
    // it if we know it, open it under that id if we do not. Minting a fresh
    // id here is how archiving and beat-binding duplicated cycles instead of
    // amending them; refusing outright is how a client's own id vanished.
    if (typeof body.id === "string" && body.id.length > 0) {
      const existed = getAllCycles().some((c) => c.id === body.id);
      const cycle = upsertCycle(body);
      return NextResponse.json(cycle, { status: existed ? 200 : 201 });
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
