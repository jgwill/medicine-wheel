import { NextResponse } from "next/server";
import { getAllCycles, createCycle, upsertCycle } from "@/lib/store";
import type { ApiMedicineWheelCycle } from "@/lib/cycle-response";
import { changedFields, instanceOf, recordEvent } from "@/lib/event-log";

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
    const instance = instanceOf(request);
    if (typeof body.id === "string" && body.id.length > 0) {
      const before: ApiMedicineWheelCycle | undefined = getAllCycles().find((c) => c.id === body.id);
      const cycle: ApiMedicineWheelCycle = upsertCycle(body);
      // The event log (#164): opened, archived, or amended in the fields that
      // moved. Writing back what is already stored is not an occurrence.
      const subject = { kind: "cycle" as const, id: cycle.id };
      if (!before) {
        recordEvent({ name: "cycle.opened", subject, correlation_id: cycle.id, instance, payload: { current_direction: cycle.current_direction } });
      } else if (!before.archived && cycle.archived === true) {
        recordEvent({ name: "cycle.archived", subject, correlation_id: cycle.id, instance });
      } else {
        const changed = changedFields(before, cycle, Object.keys(body));
        if (changed.length) {
          recordEvent({ name: "cycle.amended", subject, correlation_id: cycle.id, instance, payload: { changed, current_direction: cycle.current_direction } });
        }
      }
      return NextResponse.json(cycle, { status: before ? 200 : 201 });
    }

    const cycle = createCycle({
      research_question: body.research_question,
      current_direction: body.current_direction,
    });
    recordEvent({
      name: "cycle.opened",
      subject: { kind: "cycle", id: cycle.id },
      correlation_id: cycle.id,
      instance,
      payload: { current_direction: cycle.current_direction },
    });
    return NextResponse.json(cycle, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
