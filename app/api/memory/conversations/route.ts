import { NextResponse } from 'next/server';
import { conversationRefusal, readLimit, readScope, wheelConversations } from '@/lib/memory';

export const dynamic = 'force-dynamic';

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const meta = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);

/**
 * Conversations with the wheel's memory (jgwill/medicine-wheel#174).
 *
 * GET  ?held_by=&shared_in=&opened_from=&q=&limit=  the conversations that match, most
 *      recently continued first, without their turns. `held_by` or `shared_in` is
 *      required: the door never lists the whole collection, since it trusts its caller.
 * POST { question, scope, asked_by, asked_by_name?, prompt?, conversation?, retry_of?,
 *        held_by?, held_by_name?, opened_from?, shared_in?, title?, metadata?, turn_metadata?,
 *        peer?, reasoning_level?, limit? }
 *      asks the memory within `scope`. Without `conversation` a new one starts, held by
 *      `held_by` (default `asked_by`); with it, the question is a reply asked with the
 *      earlier turns. `retry_of` (the latest turn's id) asks that question again and keeps
 *      both answers. Answers { conversation, turn, answer }.
 *
 * The host decides who may reach what and who may read a conversation; the wheel refuses
 * a reply from anyone but the holder to a conversation shared nowhere.
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  if (!p.get('held_by') && !p.get('shared_in')) {
    return NextResponse.json({ error: 'Name held_by (who holds them) or shared_in (the ceremony they are shared in)' }, { status: 400 });
  }
  try {
    const list = await (await wheelConversations()).list({
      ...(p.get('held_by') ? { held_by: p.get('held_by')! } : {}),
      ...(p.get('opened_from') ? { opened_from: p.get('opened_from')! } : {}),
      ...(p.get('shared_in') ? { shared_in: p.get('shared_in')! } : {}),
      ...(p.get('q') ? { q: p.get('q')! } : {}),
      ...(readLimit(Number(p.get('limit')), 500) ? { limit: readLimit(Number(p.get('limit')), 500) } : {}),
    });
    return NextResponse.json({ conversations: list }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'A JSON body is required' }, { status: 400 });
  const question = str(body.question);
  if (!question && !str(body.retry_of)) return NextResponse.json({ error: 'question is required' }, { status: 400 });
  if (question && question.length > 10000) return NextResponse.json({ error: 'question holds at most 10000 characters' }, { status: 400 });
  if (body.prompt !== undefined && typeof body.prompt !== 'string') return NextResponse.json({ error: 'prompt is a string' }, { status: 400 });
  if (typeof body.prompt === 'string' && body.prompt.length > 20000) return NextResponse.json({ error: 'prompt holds at most 20000 characters' }, { status: 400 });
  const asked_by = str(body.asked_by);
  if (!asked_by) return NextResponse.json({ error: 'asked_by is required: who asks, by wheel id' }, { status: 400 });
  const read = readScope(body.scope);
  if ('error' in read) return NextResponse.json({ error: read.error }, { status: 400 });
  for (const key of ['opened_from', 'shared_in'] as const) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== 'string') return NextResponse.json({ error: `${key} is a wheel id or null` }, { status: 400 });
  }
  try {
    const out = await (await wheelConversations()).converse({
      ...(question ? { question } : {}),
      ...(str(body.prompt) ? { prompt: str(body.prompt) } : {}),
      scope: read.scope,
      asked_by,
      ...(str(body.asked_by_name) ? { asked_by_name: str(body.asked_by_name) } : {}),
      ...(str(body.conversation) ? { conversation: str(body.conversation) } : {}),
      ...(str(body.retry_of) ? { retry_of: str(body.retry_of) } : {}),
      ...(str(body.held_by) ? { held_by: str(body.held_by) } : {}),
      ...(str(body.held_by_name) ? { held_by_name: str(body.held_by_name) } : {}),
      ...(body.opened_from !== undefined ? { opened_from: str(body.opened_from) ?? null } : {}),
      ...(body.shared_in !== undefined ? { shared_in: str(body.shared_in) ?? null } : {}),
      ...(str(body.title) ? { title: str(body.title) } : {}),
      ...(meta(body.metadata) ? { metadata: meta(body.metadata) } : {}),
      ...(meta(body.turn_metadata) ? { turn_metadata: meta(body.turn_metadata) } : {}),
      ...(str(body.peer) ? { peer: str(body.peer) } : {}),
      ...(str(body.reasoning_level) ? { reasoning_level: str(body.reasoning_level) } : {}),
      ...(readLimit(body.limit) ? { limit: readLimit(body.limit) } : {}),
    });
    return NextResponse.json(out, { status: str(body.conversation) ? 200 : 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const refused = conversationRefusal(error);
    if (refused) return NextResponse.json({ error: refused.error }, { status: refused.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
