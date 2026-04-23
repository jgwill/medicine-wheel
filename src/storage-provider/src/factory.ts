/**
 * Storage Provider Factory
 * 
 * Auto-detects available storage backend based on environment variables.
 */

import type { StorageProvider, ProviderType } from './interface.js';
import { NeonProvider } from './neon.js';

/**
 * Create a storage provider instance.
 * 
 * @param type - 'neon', 'redis', or 'auto' (default)
 * @returns Connected StorageProvider instance
 */
export async function createProvider(type: ProviderType = 'auto'): Promise<StorageProvider> {
  let provider: StorageProvider;

  if (type === 'auto') {
    // Auto-detect based on available env vars
    if (process.env.DATABASE_URL) {
      provider = new NeonProvider();
    } else if (process.env.KV_REST_API_URL || process.env.REDIS_URL) {
      // TODO: Implement RedisProvider wrapping data-store
      throw new Error('Redis provider not yet implemented. Use Neon or set DATABASE_URL.');
    } else {
      throw new Error('No storage provider configured. Set DATABASE_URL (Neon) or KV_REST_API_URL (Redis).');
    }
  } else if (type === 'neon') {
    provider = new NeonProvider();
  } else if (type === 'redis') {
    throw new Error('Redis provider not yet implemented.');
  } else {
    throw new Error(`Unknown provider type: ${type}`);
  }

  await provider.connect();
  return provider;
}

/**
 * Detect which provider is available without connecting.
 */
export function detectProvider(): ProviderType | null {
  if (process.env.DATABASE_URL) return 'neon';
  if (process.env.KV_REST_API_URL || process.env.REDIS_URL) return 'redis';
  return null;
}
