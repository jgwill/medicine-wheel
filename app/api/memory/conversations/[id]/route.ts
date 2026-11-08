import { NextResponse } from 'next/server';
import { conversationRefusal, wheelConversations } from '@/lib/memory';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/**
 * One conversation with the wheel's memory (jgwill/medicine-wheel#174).
 *
 * GET     the conversation with every turn.
 * PATCH   { title?, shared_in? (a ceremony id, or null to share it nowhere), metadata? }
 * DELETE  removes it from the store. Nothing of it was ever in the memory provider.
 */
export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    const c = await (await wheelConversations()).get(decodeURIComponent(id));
    if (!c) return NextResponse.json({ error: `No conversation ${id}` }, { status: 404 });
    return NextResponse.json(c, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'A JSON body is required' }, { status: 400 });
  if (body.title !== undefined && typeof body.title !== 'string') return NextResponse.json({ error: 'title is a string' }, { status: 400 });
  if (body.shared_in !== undefined && body.shared_in !== null && typeof body.shared_in !== 'string') return NextResponse.json({ error: 'shared_in is a ceremony id or null' }, { status: 400 });
  if (body.metadata !== undefined && (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata))) return NextResponse.json({ error: 'metadata is an object' }, { status: 400 });
  try {
    const c = await (await wheelConversations()).update(decodeURIComponent(id), {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.shared_in !== undefined ? { shared_in: body.shared_in } : {}),
      ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
    });
    return NextResponse.json(c, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const refused = conversationRefusal(error);
    if (refused) return NextResponse.json({ error: refused.error }, { status: refused.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    await (await wheelConversations()).delete(decodeURIComponent(id));
    return NextResponse.json({ deleted: decodeURIComponent(id) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const refused = conversationRefusal(error);
    if (refused) return NextResponse.json({ error: refused.error }, { status: refused.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
