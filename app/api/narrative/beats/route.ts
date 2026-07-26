import { NextResponse } from "next/server";
import { getAllBeats, createBeat } from "@/lib/store";

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
    // Pass the caller's id and timestamp through when supplied. A client that
    // authored a beat holds its id and will look it up again — minting a fresh
    // one here hands back a beat the caller can never find.
    const beat = createBeat({
      id: body.id,
      timestamp: body.timestamp,
      direction: body.direction,
      title: body.title,
      description: body.description,
      prose: body.prose,
      ceremonies: body.ceremonies ?? [],
      learnings: body.learnings ?? [],
      act: body.act,
      relations_honored: body.relations_honored ?? [],
      cycle_id: body.cycle_id,
      parent_beat_id: body.parent_beat_id,
      sub_beats: body.sub_beats,
      origin: body.origin,
    });
    return NextResponse.json(beat, { status: 201 });
  } catch (error: any) {
    // An invalid draft is the caller's error, not the server's. Reporting it
    // as a 500 would read as "we broke" when the truth is "this beat does not
    // satisfy the wheel's laws and was not stored".
    const invalid = /^Invalid beat draft/.test(error?.message ?? '');
    return NextResponse.json({ error: error.message }, { status: invalid ? 400 : 500 });
  }
}
