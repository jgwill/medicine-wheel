import { NextResponse } from "next/server";
import { parseLimit } from "@/lib/api-paging";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";
import { ceremonyBelongsToEpisode, ceremonyEpisodePath } from "@/lib/ceremony-response";
import { projectCeremony } from "@medicine-wheel/honcho";
import { projectAfterWrite } from "@/lib/honcho-projection";

/** Episode directory names are `YYYY-MM-DD-episode-NNN-slug`; nothing else may bind. */
const EPISODE_PATH = /^\d{4}-\d{2}-\d{2}-episode-\d{3,}-[a-z0-9-]+$/;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get("direction");
    const type = searchParams.get("type");
    const episodePath = searchParams.get("episode_path");
    const circleId = searchParams.get("circle_id");
    const closes = searchParams.get("closes");
    const subjectId = searchParams.get("subject_id");

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

    if (circleId) {
      ceremonies = ceremonies.filter((c) => c.circle_id === circleId);
    }

    // `?closes=<opening id>` answers "is this ceremony closed, and by which record".
    if (closes) {
      ceremonies = ceremonies.filter((c) => c.closes === closes);
    }

    // `?subject_id=<node id>` answers "which ceremonies gathered around this node" (#146).
    if (subjectId) {
      ceremonies = ceremonies.filter((c) => c.subject_id === subjectId);
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
      ...(direction || type || episodePath || circleId || closes || subjectId ? { matched } : {}),
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

    // Typed episode binding (0.14.0). A caller may still pass the legacy JSON
    // string in `research_context`; it is lifted into the typed fields so every
    // reader sees one shape. When both are given the typed fields win.
    const legacy = ceremonyEpisodePath(body);
    const episodePath: string | undefined =
      typeof body.episode_path === "string" && body.episode_path ? body.episode_path : legacy;
    if (episodePath !== undefined && !EPISODE_PATH.test(episodePath)) {
      return NextResponse.json(
        { error: `Invalid episode_path: ${episodePath}`, hint: "YYYY-MM-DD-episode-NNN-slug" },
        { status: 400 },
      );
    }
    const fromName = episodePath ? Number(episodePath.match(/-episode-(\d+)-/)?.[1]) : NaN;
    const episodeNumber: number | undefined =
      typeof body.episode_number === "number" ? body.episode_number : Number.isFinite(fromName) ? fromName : undefined;

    if (body.closes !== undefined) {
      if (typeof body.closes !== "string" || !body.closes) {
        return NextResponse.json({ error: "closes must be a ceremony id" }, { status: 400 });
      }
      if (!(await store.getCeremony(body.closes))) {
        return NextResponse.json(
          { error: `Cannot close a ceremony that does not exist: ${body.closes}` },
          { status: 404 },
        );
      }
    }
    if (body.circle_id !== undefined) {
      if (typeof body.circle_id !== "string" || !body.circle_id) {
        return NextResponse.json({ error: "circle_id must be a node id" }, { status: 400 });
      }
      const circle = await store.getNode(body.circle_id);
      if (!circle) {
        return NextResponse.json(
          { error: `Cannot hold a ceremony in a circle that does not exist: ${body.circle_id}`, hint: "Create the circle node first on /nodes." },
          { status: 404 },
        );
      }
    }

    if (body.subject_id !== undefined) {
      if (typeof body.subject_id !== "string" || !body.subject_id) {
        return NextResponse.json({ error: "subject_id must be a node id" }, { status: 400 });
      }
      if (!(await store.getNode(body.subject_id))) {
        return NextResponse.json(
          { error: `Cannot hold a ceremony about a node that does not exist: ${body.subject_id}`, hint: "Create the node first on /nodes." },
          { status: 404 },
        );
      }
    }

    const ceremony = {
      id: body.id || crypto.randomUUID(),
      type: body.type,
      direction: body.direction,
      participants: body.participants ?? [],
      medicines_used: body.medicines_used ?? [],
      intentions: body.intentions ?? [],
      timestamp: typeof body.timestamp === "string" && body.timestamp ? body.timestamp : new Date().toISOString(),
      research_context: body.research_context,
      ...(Array.isArray(body.relations_honored) ? { relations_honored: body.relations_honored } : {}),
      ...(episodePath ? { episode_path: episodePath } : {}),
      ...(episodeNumber !== undefined ? { episode_number: episodeNumber } : {}),
      ...(typeof body.source === "string" && body.source ? { source: body.source } : {}),
      ...(typeof body.closes === "string" ? { closes: body.closes } : {}),
      ...(typeof body.circle_id === "string" ? { circle_id: body.circle_id } : {}),
      ...(typeof body.subject_id === "string" ? { subject_id: body.subject_id } : {}),
    };

    await store.logCeremony(ceremony);
    // The river: the stored ceremony leaves for Honcho in the background when
    // HONCHO_URL is set. Never awaited.
    projectAfterWrite({ kind: "ceremony", id: ceremony.id }, () => projectCeremony(ceremony));
    return NextResponse.json({ success: true, ceremony, provider: detectProvider() }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
