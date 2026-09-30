import { NextResponse } from 'next/server';
import { readLimit, readScope, wheelMemory } from '@/lib/memory';

export const dynamic = 'force-dynamic';

/**
 * The records within a scope closest to a query, with no reasoning.
 * Body: { query, scope, limit? }. jgwill/medicine-wheel#149
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 });
  const read = readScope(body?.scope);
  if ('error' in read) return NextResponse.json({ error: read.error }, { status: 400 });
  try {
    return NextResponse.json(await wheelMemory().search({ query, scope: read.scope, limit: readLimit(body.limit) }), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
