import { NextResponse } from "next/server";
import { parseLimit } from "@/lib/api-paging";
import { filterEvents, readEvents } from "@/lib/event-log";

/**
 * The wheel's event log, read (#164).
 *
 * `?type=cycle.opened` (or the namespaced `medicine-wheel.cycle.opened`; a
 * trailing dot, `cycle.`, takes the family), `?subject=<record id>`,
 * `?since=<ISO time>`, `?limit=<n>|all`. Newest first, so the moments a person
 * is looking for come before the history behind them. `total` counts every
 * match, so a caller holding a page knows it holds one.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    if (limit instanceof NextResponse) return limit;
    const since = url.searchParams.get("since") ?? undefined;
    if (since !== undefined && Number.isNaN(Date.parse(since))) {
      return NextResponse.json(
        { error: `Invalid since: ${since} — nothing was returned.`, hint: "since must be an ISO 8601 time." },
        { status: 400 },
      );
    }
    const matching = filterEvents(readEvents(), {
      type: url.searchParams.get("type") ?? undefined,
      subject: url.searchParams.get("subject") ?? undefined,
      since,
    }).reverse();
    const events = limit === null ? matching : matching.slice(0, limit);
    return NextResponse.json({ events, total: matching.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
