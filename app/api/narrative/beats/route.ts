import { NextResponse } from "next/server";
import { getAllBeats, createBeat } from "@/lib/store";

export async function GET() {
  try {
    return NextResponse.json(getAllBeats());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const beat = createBeat({
      direction: body.direction,
      title: body.title,
      description: body.description,
      prose: body.prose,
      ceremonies: body.ceremonies ?? [],
      learnings: body.learnings ?? [],
      act: body.act ?? 1,
      relations_honored: body.relations_honored ?? [],
    });
    return NextResponse.json(beat, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
