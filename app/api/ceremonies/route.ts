import { NextResponse } from "next/server";
import { parseLimit } from "@/lib/api-paging";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";
import { ceremonyBelongsToEpisode } from "@/lib/ceremony-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get("direction");
    const type = searchParams.get("type");
    const episodePath = searchParams.get("episode_path");

    const limit = parseLimit(searchParams.get("limit"));
    if (limit instanceof NextResponse) return limit;

    const store = await createProvider();

    // Always read the whole store, then filter, then page.
    //
    // This used to take the provider's 100-row default unless an episode was
    // named, and filter afterwards — so `?direction=east` searched only the
    // newest 100 ceremonies and every older east ceremony was unreachable
    // through this route. Measured 2026-09-05: an unfiltered read and a
    // direction-filtered read both stopped at the same record, because both were
    // looking at the same 100-row window.
    const all = await store.getAllCeremonies(Number.MAX_SAFE_INTEGER);
    const total = all.length;
    let ceremonies = all;

    if (direction) {
      ceremonies = ceremonies.filter((c) => c.direction === direction);
    }

    if (type) {
      ceremonies = ceremonies.filter((c) => c.type === type);
    }

    if (episodePath) {
      ceremonies = ceremonies.filter((ceremony) =>
        ceremonyBelongsToEpisode(ceremony, episodePath),
      );
    }

    const matched = ceremonies.length;
    if (limit !== null && ceremonies.length > limit) {
      ceremonies = ceremonies.slice(0, limit);
    }

    return NextResponse.json({
      ceremonies,
      provider: detectProvider(),
      count: ceremonies.length,
      // `total` is the whole store, `matched` what the filters selected. When
      // count < matched the caller holds a page and can now see that it does.
      total,
      ...(direction || type || episodePath ? { matched } : {}),
      truncated: ceremonies.length < matched,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const store = await createProvider();
    const body = await request.json();
    
    const ceremony = {
      id: body.id || crypto.randomUUID(),
      type: body.type,
      direction: body.direction,
      participants: body.participants ?? [],
      medicines_used: body.medicines_used ?? [],
      intentions: body.intentions ?? [],
      timestamp: new Date().toISOString(),
      research_context: body.research_context,
    };
    
    await store.logCeremony(ceremony);
    return NextResponse.json({ success: true, ceremony, provider: detectProvider() }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
