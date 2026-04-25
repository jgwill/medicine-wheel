/**
 * Medicine Wheel Storage Provider
 * 
 * Abstract storage layer supporting multiple backends:
 * - JSONL - Current default/local backend
 * - Neon (Postgres) - First production backend path
 * - Redis (Upstash) - Coming soon
 * 
 * @example
 * ```ts
 * import { createProvider } from 'medicine-wheel-storage-provider';
 * 
 * const store = await createProvider(); // Auto-detects JSONL locally, Neon in configured environments
 * await store.createNode({ id: 'elder-1', type: 'human', ... });
 * const node = await store.getNode('elder-1');
 * ```
 */

// Interface & Types
export type {
  StorageProvider,
  RelationalNode,
  RelationalEdge,
  CeremonyLog,
  ProviderType,
} from './interface.js';

// Factory
export { createProvider, detectProvider } from './factory.js';

// Providers (for direct instantiation)
export { JsonlProvider } from './jsonl.js';
export { NeonProvider } from './neon.js';
