import { NextResponse } from "next/server";
import { getAllBeats, getAllCeremonies, createBeat } from "@/lib/store";
import { validateCadence } from "medicine-wheel-narrative-engine";

export async function GET() {
  try {
    return NextResponse.json(getAllBeats());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    // Run cadence validation after adding the beat
    let cadenceValidation = null;
    try {
      const allBeats = getAllBeats();
      const allCeremonies = getAllCeremonies();
      cadenceValidation = validateCadence(allBeats, allCeremonies);
    } catch {
      cadenceValidation = { valid: false, note: "Cadence validation unavailable" };
    }

    return NextResponse.json({ beat, cadenceValidation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
