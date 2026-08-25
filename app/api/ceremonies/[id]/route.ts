import { NextResponse } from "next/server";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";

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
