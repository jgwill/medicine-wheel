import { NextResponse } from "next/server";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";
import { ceremonyBelongsToEpisode } from "@/lib/ceremony-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get("direction");
    const type = searchParams.get("type");
    const episodePath = searchParams.get("episode_path");

    const store = await createProvider();
    // Provider list methods intentionally default to one page (100). A scoped
    // episode query must search the complete ceremony store before filtering,
    // or an older but valid ceremony silently disappears from its episode.
    let ceremonies = await store.getAllCeremonies(
      episodePath ? Number.MAX_SAFE_INTEGER : undefined,
    );

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

    return NextResponse.json({ 
      ceremonies, 
      provider: detectProvider(),
      count: ceremonies.length 
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
