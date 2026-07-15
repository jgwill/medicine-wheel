import { NextResponse } from "next/server";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const store = await createProvider();
    const inquiryWeave = await store.getInquiryWeave(params.id);

    if (!inquiryWeave) {
      return NextResponse.json({
        inquiry_weave: null,
        provider: detectProvider(),
      });
    }

    return NextResponse.json({
      inquiry_weave: inquiryWeave,
      provider: detectProvider(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
