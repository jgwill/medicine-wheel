/**
 * Storage Provider Factory
 *
 * Defaults to JSONL unless the backend is explicitly selected.
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
    // Truncate raw value to avoid leaking arbitrarily long env content into logs.
    const displayValue = raw.length > 40 ? `${raw.slice(0, 40)}…` : raw;
    throw new Error(
      `Unsupported MW_STORAGE_PROVIDER value: "${displayValue}". Expected jsonl, neon/postgres, or redis/upstash.`,
    );
  }

  return normalized;
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
  const providerType = type === 'auto' ? getConfiguredProvider() ?? 'jsonl' : type;
  const provider = instantiateProvider(providerType);

  await provider.connect();
  return provider;
}

/**
 * Detect which provider is available without connecting.
 * Always returns a concrete non-null provider type; falls back to 'jsonl'.
 */
export function detectProvider(): ProviderType {
  return getConfiguredProvider() ?? 'jsonl';
}
