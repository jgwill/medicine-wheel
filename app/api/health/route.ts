import { NextResponse } from 'next/server';
import { createProvider, detectProvider } from '@medicine-wheel/storage-provider';

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
