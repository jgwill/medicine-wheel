/**
 * Diary entry retrieval. Filtering, ordering, and limiting are performed by the
 * provider (shared jsonl/neon semantics), so these helpers stay thin.
 */

import type { StorageProvider } from '@medicine-wheel/storage-provider';
import type {
  CeremonialPhase,
  DiaryEntry,
  DiaryQuery,
  Participant,
} from './types.js';

/** Retrieve entries matching the query (oldest → newest, optional limit). */
export async function queryDiaryEntries(
  store: StorageProvider,
  query: DiaryQuery = {},
): Promise<DiaryEntry[]> {
  return store.listDiaryEntries(query);
}

/** Retrieve the most recent entry for a participant, or null. */
export async function getLastDiaryEntry(
  store: StorageProvider,
  participant: Participant,
): Promise<DiaryEntry | null> {
  const entries = await store.listDiaryEntries({ participant });
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

/** Retrieve entries for a participant in a given ceremonial phase. */
export async function getEntriesByPhase(
  store: StorageProvider,
  participant: Participant,
  phase: CeremonialPhase,
): Promise<DiaryEntry[]> {
  return store.listDiaryEntries({ participant, phase });
}

/** Retrieve a participant's entries within an inclusive date range. */
export async function getEntriesByDateRange(
  store: StorageProvider,
  participant: Participant,
  startDate: string,
  endDate: string,
): Promise<DiaryEntry[]> {
  return store.listDiaryEntries({
    participant,
    dateRange: { start: startDate, end: endDate },
  });
}
