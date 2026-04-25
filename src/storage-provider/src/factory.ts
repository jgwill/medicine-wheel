/**
 * Storage Provider Factory
 * 
 * Auto-detects available storage backend based on environment variables.
 */

import type { StorageProvider, ProviderType } from './interface.js';
import { JsonlProvider } from './jsonl.js';
import { NeonProvider } from './neon.js';

type ConcreteProviderType = Exclude<ProviderType, 'auto'>;

function normalizeProviderType(value: string): ConcreteProviderType | null {
  switch (value.toLowerCase()) {
    case 'jsonl':
    case 'local':
    case 'file':
      return 'jsonl';
    case 'neon':
    case 'postgres':
      return 'neon';
    case 'redis':
    case 'upstash':
      return 'redis';
    default:
      return null;
  }
}

function getConfiguredProvider(): ConcreteProviderType | null {
  const raw = process.env.MW_STORAGE_PROVIDER;
  if (!raw) return null;

  const normalized = normalizeProviderType(raw);
  if (!normalized) {
    throw new Error(
      `Unsupported MW_STORAGE_PROVIDER value: ${raw}. Expected jsonl, neon/postgres, or redis/upstash.`,
    );
  }

  return normalized;
}

function hasPostgresConfiguration(): boolean {
  return Boolean(
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.NEON_DATABASE_URL,
  );
}

function instantiateProvider(type: ConcreteProviderType): StorageProvider {
  switch (type) {
    case 'jsonl':
      return new JsonlProvider();
    case 'neon':
      return new NeonProvider();
    case 'redis':
      throw new Error('Redis provider not yet implemented. Use jsonl or neon.');
  }
}

/**
 * Create a storage provider instance.
 * 
 * @param type - 'jsonl', 'neon', 'redis', or 'auto' (default)
 * @returns Connected StorageProvider instance
 */
export async function createProvider(type: ProviderType = 'auto'): Promise<StorageProvider> {
  const providerType =
    type === 'auto'
      ? getConfiguredProvider() ?? (hasPostgresConfiguration() ? 'neon' : 'jsonl')
      : type;
  const provider = instantiateProvider(providerType);

  await provider.connect();
  return provider;
}

/**
 * Detect which provider is available without connecting.
 */
export function detectProvider(): ProviderType | null {
  return getConfiguredProvider() ?? (hasPostgresConfiguration() ? 'neon' : 'jsonl');
}
