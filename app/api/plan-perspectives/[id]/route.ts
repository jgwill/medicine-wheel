import { NextResponse } from "next/server";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const store = await createProvider();
    const record = await store.getPlanPerspective(params.id);

    if (!record) {
      return NextResponse.json(
        { error: `Plan Perspective '${params.id}' was not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      record,
      provider: detectProvider(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
