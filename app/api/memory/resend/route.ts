import { NextResponse } from 'next/server';
import { holdsRecord, honchoProjectionStatus, isPendingRef, markPending, PENDING_KINDS, retryPending } from '@/lib/honcho-projection';

export const dynamic = 'force-dynamic';

/**
 * Send one wheel record to the memory provider again: `{ kind, id }` with kind
 * `beat`, `ceremony` or `diary`. It joins the pending ledger and one delivery
 * pass runs before the answer. The same door as `/api/honcho/pending`, under a
 * name that does not depend on the provider. jgwill/medicine-wheel#149
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isPendingRef(body)) {
    return NextResponse.json({ error: 'Provide { kind, id }', kinds: PENDING_KINDS }, { status: 400 });
  }
  if (!honchoProjectionStatus().enabled) {
    return NextResponse.json({ error: 'No memory provider is configured on this wheel; nothing to send to' }, { status: 409 });
  }
  if (!(await holdsRecord(body))) return NextResponse.json({ error: `The wheel holds no ${body.kind} ${body.id}` }, { status: 404 });
  markPending({ kind: body.kind, id: body.id }, 'resent by hand');
  const result = await retryPending();
  return NextResponse.json({ resent: { kind: body.kind, id: body.id }, ...result }, { headers: { 'cache-control': 'no-store' } });
}
