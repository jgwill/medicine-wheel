import { NextResponse } from "next/server";
import { getAllCycles, createCycle } from "@/lib/store";

export async function GET() {
  try {
    return NextResponse.json(getAllCycles());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cycle = createCycle({
      research_question: body.research_question,
      current_direction: body.current_direction,
    });
    return NextResponse.json(cycle, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
