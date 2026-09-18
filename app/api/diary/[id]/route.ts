import { NextResponse } from "next/server";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const store = await createProvider();
    const entry = await store.getDiaryEntry(id);
    if (!entry) return NextResponse.json({ error: `No diary entry with id ${id}` }, { status: 404 });
    return NextResponse.json({ entry, provider: detectProvider() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const store = await createProvider();
    const entry = await store.getDiaryEntry(id);
    if (!entry) return NextResponse.json({ error: `No diary entry with id ${id}` }, { status: 404 });
    await store.deleteDiaryEntry(id);
    return NextResponse.json({ success: true, deleted: { id }, provider: detectProvider() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
