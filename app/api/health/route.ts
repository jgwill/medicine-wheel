import { NextResponse } from 'next/server';
import { createProvider, detectProvider } from '@medicine-wheel/storage-provider';
import { honchoProjectionStatus } from '@/lib/honcho-projection';

export async function GET() {
  const providerType = detectProvider();
  
  try {
    const store = await createProvider();
    
    // Test basic connectivity — and answer about the whole store, not a page of
    // it. `getAllNodes()` / `getAllCeremonies()` default to 100, the same
    // default `app/api/nodes/route.ts` keeps on purpose for an unfiltered read;
    // measuring their result reported `min(actual, 100)` under the name
    // `counts`. That made health agree with any truncated collection response a
    // caller was using it to check, which is the one thing this endpoint exists
    // to contradict.
    const [nodes, ceremonies] = await Promise.all([
      store.countNodes(),
      store.countCeremonies(),
    ]);

    return NextResponse.json({
      status: 'healthy',
      provider: providerType,
      counts: {
        nodes,
        ceremonies,
      },
      // The river to Honcho: enabled when HONCHO_URL is set. A wheel that
      // reports enabled projects every stored beat, ceremony and diary entry;
      // `pending` counts those still waiting for Honcho to take them (#147).
      honcho: honchoProjectionStatus(),
      env: {
        MW_STORAGE_PROVIDER: process.env.MW_STORAGE_PROVIDER || 'not set',
        DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured',
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      provider: providerType,
      error: String(error),
      env: {
        MW_STORAGE_PROVIDER: process.env.MW_STORAGE_PROVIDER || 'not set',
        DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured',
      },
    }, { status: 500 });
  }
}
