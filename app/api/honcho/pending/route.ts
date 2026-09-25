import { NextResponse } from "next/server";
import {
  holdsRecord,
  honchoProjectionStatus,
  isPendingRef,
  listPending,
  markPending,
  PENDING_KINDS,
  retryPending,
  type PendingRef,
} from "@/lib/honcho-projection";

/**
 * The river's pending ledger (#147): records the wheel holds and Honcho has
 * not received yet.
 *
 * GET  — what waits, oldest first, with the river's status.
 * POST — put records on the ledger by reference: `{ kind, id }`, or
 *        `{ refs: [{ kind, id }, …] }`. For records lost before the ledger
 *        existed, whose ids the server log still names. Each must be a record
 *        the wheel holds. A retry pass starts at once and the answer does not
 *        wait for it; `{ refs: [] }` only starts the pass.
 */

export async function GET() {
  try {
    return NextResponse.json({ honcho: honchoProjectionStatus(), pending: listPending() });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const status = honchoProjectionStatus();
    if (!status.enabled) {
      return NextResponse.json(
        { error: "The river is off (HONCHO_URL is unset); nothing would carry these records." },
        { status: 409 },
      );
    }
    const body = await request.json().catch(() => null);
    const raw: unknown[] | null = Array.isArray(body?.refs) ? body.refs : isPendingRef(body) ? [body] : null;
    if (!raw) {
      return NextResponse.json(
        { error: "Provide { kind, id } or { refs: [{ kind, id }, …] }", kinds: PENDING_KINDS },
        { status: 400 },
      );
    }
    const refs: PendingRef[] = [];
    for (const r of raw) {
      if (!isPendingRef(r)) {
        return NextResponse.json({ error: `Not a record reference: ${JSON.stringify(r)}`, kinds: PENDING_KINDS }, { status: 400 });
      }
      if (!(await holdsRecord(r))) {
        return NextResponse.json({ error: `The wheel holds no ${r.kind} ${r.id}` }, { status: 404 });
      }
      refs.push({ kind: r.kind, id: r.id });
    }
    let pending = listPending().length;
    for (const ref of refs) pending = markPending(ref, "queued by hand");
    void retryPending();
    return NextResponse.json({ queued: refs.length, pending }, { status: 202 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
