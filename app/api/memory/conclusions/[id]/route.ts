import { NextResponse } from 'next/server';
import { MEMORY_PROJECTION_KIND } from '@medicine-wheel/honcho';
import { createProvider } from '@medicine-wheel/storage-provider';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ id: string }> };

const STATUSES = ['inferred', 'confirmed', 'rejected'];

/**
 * Confirm or reject a conclusion, recording who did it and when beside the
 * status: { status, by }. `by` names a person (a wheel node id or a name).
 * jgwill/medicine-wheel#149 (W8)
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!STATUSES.includes(body?.status)) return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}` }, { status: 400 });
  const by = typeof body?.by === 'string' ? body.by.trim() : '';
  if (!by) return NextResponse.json({ error: 'by is required: who confirms or rejects it' }, { status: 400 });
  try {
    const store = await createProvider();
    const node = await store.getNode(id);
    if (!node || node.metadata?.kind !== MEMORY_PROJECTION_KIND) {
      return NextResponse.json({ error: `No conclusion ${id} on this wheel` }, { status: 404 });
    }
    const updated = await store.updateNode(id, {
      metadata: { ...node.metadata, status: body.status, judged_by: by, judged_at: new Date().toISOString() },
    });
    return NextResponse.json({ node: updated }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
