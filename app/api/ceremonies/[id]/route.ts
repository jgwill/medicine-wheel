import { NextResponse } from "next/server";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";
import { getAllBeats } from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const store = await createProvider();
    const ceremony = await store.getCeremony(id);

    if (!ceremony) {
      return NextResponse.json(
        { error: `Ceremony not found: ${id}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ ceremony, provider: detectProvider() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Remove one ceremony record (0.15.6, #146). A ceremony someone took part in is
 * never removed: the wheel refuses (409) while a closing, a turn (a beat that
 * names it) or a diary entry holds it, the way a node is refused while
 * relations hold it. What remains removable is a record nobody entered, such
 * as one a test run wrote to the wrong wheel.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const store = await createProvider();
    const ceremony = await store.getCeremony(id);
    if (!ceremony) {
      return NextResponse.json({ error: `Ceremony not found: ${id}` }, { status: 404 });
    }
    const closings = (await store.getAllCeremonies(Number.MAX_SAFE_INTEGER)).filter((c) => c.closes === id).length;
    const turns = getAllBeats().filter((b) => Array.isArray(b.ceremonies) && b.ceremonies.includes(id)).length;
    const diary = (await store.listDiaryEntries()).filter((e) => e.metadata?.ceremony_id === id).length;
    if (closings + turns + diary > 0) {
      return NextResponse.json(
        {
          error: `Ceremony ${id} is held by ${closings} closing(s), ${turns} turn(s) and ${diary} diary entr${diary === 1 ? "y" : "ies"} — nothing was removed.`,
          holders: { closings, turns, diary },
        },
        { status: 409 },
      );
    }
    await store.deleteCeremony(id);
    return NextResponse.json({ success: true, deleted: { id }, provider: detectProvider() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
