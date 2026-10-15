import { NextResponse } from "next/server";
import { eventPublisherReport, publishPending, replayEvents } from "@/lib/event-log";

const NO_PUBLISHER = {
  error: "No publisher is configured — the events wait in events.jsonl.",
  hint: "Set MW_EVENTS_PUBLISH_URL (and MW_EVENTS_PUBLISH_TOKEN) and restart the wheel.",
};

/**
 * The publisher's side of the log (#164) — episode 548's Send, Receipt,
 * Failure and Replay.
 *
 * GET: where the configured publisher stands (`pending`, the last event it is
 * done with, the last arrival, the last failure) and its latest receipts.
 * POST: send what waits now. `{ "replay_from": "<event id>" }` first moves the
 * cursor back so that event and every later one go out again, with the same
 * idempotency keys; `{ "replay_from": "all" }` replays the whole log.
 */
export async function GET() {
  const report = eventPublisherReport();
  if (!report) return NextResponse.json(NO_PUBLISHER, { status: 409 });
  return NextResponse.json(report);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { replay_from?: unknown };
  let replay: { pending: number } | null = null;
  if (body?.replay_from !== undefined) {
    if (typeof body.replay_from !== "string" || !body.replay_from) {
      return NextResponse.json({ error: 'replay_from must be an event id, or "all"' }, { status: 400 });
    }
    try {
      replay = replayEvents(body.replay_from === "all" ? undefined : body.replay_from);
    } catch (error: unknown) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 404 });
    }
    if (!replay) return NextResponse.json(NO_PUBLISHER, { status: 409 });
  }
  const result = await publishPending();
  if (!result) return NextResponse.json(NO_PUBLISHER, { status: 409 });
  return NextResponse.json({ ...(replay ? { replayed: replay.pending } : {}), ...result });
}
