import { NextResponse } from 'next/server';
import { readLimit, readScope, wheelMemory } from '@/lib/memory';

export const dynamic = 'force-dynamic';

/**
 * Ask the wheel's memory a question within a scope.
 * Body: { question, prompt?, scope, peer?, reasoning_level?, limit? }.
 * `prompt` is what the memory provider is asked when the host wraps the
 * question in its own template; the records match keeps `question`
 * (jgwill/medicine-wheel#171).
 * The answer draws only on the ceremonies the scope reaches, and every source
 * names the wheel record it rests on. jgwill/medicine-wheel#149
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 });
  if (question.length > 10000) return NextResponse.json({ error: 'question holds at most 10000 characters' }, { status: 400 });
  if (body?.prompt !== undefined && typeof body.prompt !== 'string') return NextResponse.json({ error: 'prompt is a string' }, { status: 400 });
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (prompt.length > 20000) return NextResponse.json({ error: 'prompt holds at most 20000 characters' }, { status: 400 });
  const read = readScope(body?.scope);
  if ('error' in read) return NextResponse.json({ error: read.error }, { status: 400 });
  try {
    const answer = await wheelMemory().ask({
      question,
      ...(prompt ? { prompt } : {}),
      scope: read.scope,
      ...(typeof body.peer === 'string' && body.peer ? { peer: body.peer } : {}),
      ...(typeof body.reasoning_level === 'string' ? { reasoning_level: body.reasoning_level } : {}),
      limit: readLimit(body.limit),
    });
    return NextResponse.json(answer, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
