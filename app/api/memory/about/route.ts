import { NextResponse } from 'next/server';
import { readLimit, readScope, wheelMemory } from '@/lib/memory';

export const dynamic = 'force-dynamic';

/**
 * What the memory holds about one person, within a scope.
 * Body: { person (a wheel node id), scope, question?, limit? }. jgwill/medicine-wheel#149
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const person = typeof body?.person === 'string' ? body.person.trim() : '';
  if (!person) return NextResponse.json({ error: 'person is required (a wheel node id)' }, { status: 400 });
  const read = readScope(body?.scope);
  if ('error' in read) return NextResponse.json({ error: read.error }, { status: 400 });
  try {
    const answer = await wheelMemory().about({
      person,
      scope: read.scope,
      ...(typeof body.question === 'string' && body.question.trim() ? { question: body.question.trim() } : {}),
      limit: readLimit(body.limit),
    });
    return NextResponse.json(answer, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
