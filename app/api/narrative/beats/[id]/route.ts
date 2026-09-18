import { NextResponse } from "next/server";
import { z } from "zod";
import { getBeat, witnessBeat } from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * One beat, by id — and the witnessing door.
 *
 * In a talking circle a beat is one person's turn. Those who held the circle
 * while it was spoken are its witnesses (`witnesses[]`, 0.14.0). PATCH adds
 * witnesses (a set: repeating a name changes nothing) and may name the
 * `speaker` when the beat was authored without one. Nothing else on a beat is
 * editable here: what was said is what was said.
 */
const BeatPatchSchema = z
  .object({
    witnesses: z.array(z.string().trim().min(1)).optional(),
    speaker: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((patch) => patch.witnesses !== undefined || patch.speaker !== undefined, {
    message: "Provide witnesses to add, a speaker, or both.",
  });

function notFound(id: string) {
  return NextResponse.json({ error: `No beat with id ${id}` }, { status: 404 });
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const beat = getBeat(id);
  if (!beat) return notFound(id);
  return NextResponse.json(beat);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = BeatPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid patch", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const beat = witnessBeat(id, parsed.data);
  if (!beat) return notFound(id);
  return NextResponse.json(beat);
}
