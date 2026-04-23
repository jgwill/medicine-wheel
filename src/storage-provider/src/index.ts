/**
 * Medicine Wheel Storage Provider
 * 
 * Abstract storage layer supporting multiple backends:
 * - Neon (Postgres) - Primary, fully implemented
 * - Redis (Upstash) - Coming soon
 * 
 * @example
 * ```ts
 * import { createProvider } from 'medicine-wheel-storage-provider';
 * 
 * const store = await createProvider(); // Auto-detects Neon or Redis
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
export { NeonProvider } from './neon.js';
