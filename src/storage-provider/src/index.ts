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
 * import { createProvider } from '@medicine-wheel/storage-provider';
 * 
 * const store = await createProvider(); // Defaults to JSONL unless MW_STORAGE_PROVIDER explicitly selects another backend
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
  WeaveRecord,
  WeaveSyncState,
  InquiryWeaveFilters,
  PlanPerspectiveRecord,
  PlanPerspectiveEpisode,
  PlanPerspectiveFilters,
  CeremonialPhase,
  DiaryEntryType,
  DiaryEntryLocation,
  DiaryEntryMetadata,
  DiaryEntryRecord,
  DiaryEntryFilters,
  CeremonyEventKind,
  CeremonyEventParticipant,
  CeremonyEventRecord,
  CeremonyEventFilters,
  ProviderType,
  NodePatch,
  EdgePatch,
} from './interface.js';

// Typed errors (thrown by update/delete operations)
export {
  NodeNotFoundError,
  EdgeNotFoundError,
  NodeHasRelationsError,
} from './interface.js';

// Plan Perspective merge/filter semantics (shared across providers)
export {
  mergePlanPerspectiveRecords,
  unionPlanPerspectiveEpisodes,
  matchesPlanPerspectiveFilters,
} from './plan-perspectives.js';

// Ceremonial Diary filter/ordering semantics (shared across providers)
export {
  matchesDiaryEntryFilters,
  filterAndOrderDiaryEntries,
} from './diary-records.js';

// Ceremony Event filter semantics (shared across providers)
export { matchesCeremonyEventFilters } from './ceremony-events.js';

// Factory
export { createProvider, detectProvider } from './factory.js';

// Providers (for direct instantiation)
export { JsonlProvider } from './jsonl.js';
export { NeonProvider } from './neon.js';
