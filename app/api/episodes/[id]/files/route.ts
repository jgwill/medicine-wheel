import { NextResponse } from "next/server";
import { EpisodePathError } from "@miadi/episode-vessel";
import { episodeFolderOf, openEpisodeRoom, readEpisodeRoomText } from "@/lib/episode-files";

/**
 * An episode's folder, read-only.
 *
 *   GET /api/episodes/<chronicle:folder>/files              the room's listing
 *   GET /api/episodes/<chronicle:folder>/files?path=<file>  one text file, whole
 *
 * The rules — containment, the room, the audience — are `lib/episode-files.ts`
 * and, beneath it, `@miadi/episode-vessel`. This file only says them in HTTP.
 * Every answer carries a `state`, so a page can tell "this host has no
 * chronicle" from "this episode is not on this host" from "this episode is for
 * the community" — three empty lists that mean three different things.
 *
 * There is no PUT. The wheel reads an episode; Miadi writes it.
 * Ref jgwill/medicine-wheel#153.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_OF_STATE: Record<string, number> = {
  open: 200,
  "no-root": 503,
  absent: 404,
  community: 403,
  "outside-the-room": 403,
};

const STATUS_OF_CODE: Record<string, number> = {
  ENOENT: 404,
  TOO_LARGE: 413,
  NO_ROOT: 503,
};

function answer(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

function decoded(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = decoded(rawId);
  const folder = episodeFolderOf(id);
  if (!folder) {
    return answer(
      { state: "not-an-episode", error: `Not an episode id: ${id}. Expected chronicle:<episode folder>.` },
      400,
    );
  }

  const file = new URL(request.url).searchParams.get("path");
  try {
    const body = file === null ? openEpisodeRoom(folder) : readEpisodeRoomText(folder, file);
    return answer(body, STATUS_OF_STATE[body.state] ?? 200);
  } catch (error) {
    if (error instanceof EpisodePathError) {
      return answer(
        { state: "refused", code: error.code, error: error.message },
        STATUS_OF_CODE[error.code] ?? 400,
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    return answer({ state: "error", error: message }, 500);
  }
}
