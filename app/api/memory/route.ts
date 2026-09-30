import { NextResponse } from 'next/server';
import { wheelMemory } from '@/lib/memory';
import { honchoProjectionStatus } from '@/lib/honcho-projection';

export const dynamic = 'force-dynamic';

/**
 * The wheel's memory: which providers answer, whether each can keep its
 * reasoning inside a reach, and what the river still owes Honcho.
 * jgwill/medicine-wheel#149
 */
export async function GET() {
  const { providers } = await wheelMemory().status();
  return NextResponse.json({ providers, river: honchoProjectionStatus() }, { headers: { 'cache-control': 'no-store' } });
}
