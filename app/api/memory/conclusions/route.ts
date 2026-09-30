import { NextResponse } from 'next/server';
import { honchoIdFor, memoryProjectionNode, type MemoryProjectionKind, type MemoryProjectionStatus } from '@medicine-wheel/honcho';
import { createProvider } from '@medicine-wheel/storage-provider';

export const dynamic = 'force-dynamic';

const KINDS: MemoryProjectionKind[] = ['pattern', 'summary', 'open_question', 'preference'];
const STATUSES: MemoryProjectionStatus[] = ['inferred', 'confirmed', 'rejected'];

/**
 * Return a conclusion the memory derived to the wheel, as a `knowledge` node
 * with `metadata.kind: "memory_projection"`: the person it is about, what it
 * rests on, its status. A derived pattern is never stored as a bare fact.
 * Body: { about (a wheel node id), content, kind, status?, source_event_ids?, derived_by?, provider? }.
 * jgwill/medicine-wheel#149
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const about = typeof body?.about === 'string' ? body.about.trim() : '';
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!about) return NextResponse.json({ error: 'about is required (the wheel node id the conclusion is about)' }, { status: 400 });
  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });
  if (!KINDS.includes(body.kind)) return NextResponse.json({ error: `kind must be one of ${KINDS.join(', ')}` }, { status: 400 });
  const status: MemoryProjectionStatus = body.status === undefined ? 'inferred' : body.status;
  if (!STATUSES.includes(status)) return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}` }, { status: 400 });
  try {
    const node = memoryProjectionNode({
      source: typeof body.provider === 'string' && body.provider ? body.provider : 'honcho',
      peerId: honchoIdFor(about),
      content,
      kind: body.kind,
      status,
      sourceEventIds: Array.isArray(body.source_event_ids) ? body.source_event_ids.map(String) : [],
      generatedAt: new Date().toISOString(),
      ...(typeof body.derived_by === 'string' && body.derived_by ? { derivedBy: body.derived_by } : {}),
    });
    node.metadata.about = about;
    const store = await createProvider();
    await store.createNode(node as never);
    return NextResponse.json({ node }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
