import { NextResponse } from "next/server";
import { fileResponse } from "@medicine-wheel/episode-vessel/http";
import { ANONYMOUS_CAPABILITIES } from "@medicine-wheel/episode-vessel/permissions";
import { episodeFolderOf, openEpisodeGate } from "@/lib/episode-files";

/**
 * One file of an episode's room, by kind, read-only.
 *
 *   GET /api/episodes/<chronicle:folder>/files/<file>
 *
 * This is the address `@medicine-wheel/episode-ui` reads a file from: text as
 * JSON with its revision, an image inline, media whole or by byte range, a
 * document as an attachment. The serving is `@medicine-wheel/episode-vessel/http`'s,
 * the same door Miadi's room uses. The wheel only decides who is asking: a
 * visitor, because it has no sign-in, so `ceremonies/` and `captures/` stay
 * outside the room and an episode for the community stays closed.
 *
 * There is no PUT. The wheel reads an episode; Miadi writes it.
 * Ref jgwill/medicine-wheel#166.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_OF_STATE: Record<string, number> = {
  "no-root": 503,
  absent: 404,
  community: 403,
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
  { params }: { params: Promise<{ id: string; path: string[] }> },
) {
  const { id: rawId, path: segments } = await params;
  const id = decoded(rawId);
  const folder = episodeFolderOf(id);
  if (!folder) {
    return answer(
      { state: "not-an-episode", error: `Not an episode id: ${id}. Expected chronicle:<episode folder>.` },
      400,
    );
  }

  const gate = openEpisodeGate(folder);
  if (gate.state !== "open") return answer(gate, STATUS_OF_STATE[gate.state] ?? 400);

  const file = (segments ?? []).map(decoded).join("/");
  return fileResponse(request, folder, file, {
    root: gate.root,
    capabilities: ANONYMOUS_CAPABILITIES,
    mayReadOutsideRoom: false,
  });
}
