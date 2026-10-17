import { NextResponse } from "next/server";
import { eventPublisherReport, publishPending, replayEvents } from "@/lib/event-log";

const NO_PUBLISHER = {
  error: "No destination is configured — the events wait in events.jsonl.",
  hint: "Set MW_EVENTS_PUBLISH_URL, MW_EVENTS_HOOKDECK_SOURCE_URL, or MW_EVENTS_CF_ACCOUNT_ID + MW_EVENTS_CF_QUEUE_ID + MW_EVENTS_CF_API_TOKEN, and restart the wheel.",
};

/**
 * The destinations' side of the log (#164, #165) — episode 548's Send,
 * Receipt, Failure and Replay.
 *
 * GET: for each destination, where it stands (`pending`, the last event it
 * is done with, the last arrival, the last failure), what it promises, and
 * its latest receipts.
 * POST: send what waits now, to every destination. `{ "replay_from": "<event
 * id>" | "all", "publisher": "<name>" }` first moves that destination's
 * cursor back, so the same lines go out again with the same idempotency keys;
 * the name may be left out when only one destination is configured.
 */
export async function GET() {
  const publishers = eventPublisherReport();
  if (!publishers) return NextResponse.json(NO_PUBLISHER, { status: 409 });
  return NextResponse.json({ publishers });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { replay_from?: unknown; publisher?: unknown };
  let replay: { publisher: string; pending: number } | null = null;
  if (body?.replay_from !== undefined) {
    if (typeof body.replay_from !== "string" || !body.replay_from) {
      return NextResponse.json({ error: 'replay_from must be an event id, or "all"' }, { status: 400 });
    }
    try {
      replay = replayEvents(body.replay_from === "all" ? undefined : body.replay_from, typeof body.publisher === "string" ? body.publisher : undefined);
    } catch (error: unknown) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 404 });
    }
    if (!replay) return NextResponse.json(NO_PUBLISHER, { status: 409 });
  }
  const results = await publishPending();
  if (!results) return NextResponse.json(NO_PUBLISHER, { status: 409 });
  return NextResponse.json({ ...(replay ? { replayed: replay } : {}), results });
}
