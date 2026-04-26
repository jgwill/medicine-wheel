import { NextResponse } from 'next/server';
import { createProvider, detectProvider } from 'medicine-wheel-storage-provider';

export async function GET() {
  const providerType = detectProvider();
  
  try {
    const store = await createProvider();
    
    // Test basic connectivity
    const nodes = await store.getAllNodes();
    const ceremonies = await store.getAllCeremonies();
    
    return NextResponse.json({
      status: 'healthy',
      provider: providerType,
      counts: {
        nodes: nodes.length,
        ceremonies: ceremonies.length,
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
