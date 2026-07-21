/**
 * Diary statistics and pattern detection.
 *
 * Pure computation over an entry array, plus store-backed convenience wrappers
 * that fetch a participant's entries first.
 */

import type { StorageProvider } from '@medicine-wheel/storage-provider';
import type {
  CeremonialPhase,
  DiaryEntry,
  DiaryEntryType,
  Participant,
} from './types.js';
import { CEREMONIAL_PHASES, DIARY_ENTRY_TYPES } from './types.js';

export interface DiaryStatistics {
  totalEntries: number;
  byPhase: Record<CeremonialPhase, number>;
  byEntryType: Record<DiaryEntryType, number>;
  dateRange: { earliest: string; latest: string };
}

export interface DiaryPatterns {
  mostActivePhase: CeremonialPhase;
  mostCommonEntryType: DiaryEntryType;
  preferredAgent?: string;
  averageEntriesPerDay: number;
}

function emptyPhaseCounts(): Record<CeremonialPhase, number> {
  return CEREMONIAL_PHASES.reduce(
    (acc, phase) => ({ ...acc, [phase]: 0 }),
    {} as Record<CeremonialPhase, number>,
  );
}

function emptyEntryTypeCounts(): Record<DiaryEntryType, number> {
  return DIARY_ENTRY_TYPES.reduce(
    (acc, entryType) => ({ ...acc, [entryType]: 0 }),
    {} as Record<DiaryEntryType, number>,
  );
}

/** Compute statistics over a (chronologically ordered) entry array. */
export function computeDiaryStatistics(entries: readonly DiaryEntry[]): DiaryStatistics {
  const byPhase = emptyPhaseCounts();
  const byEntryType = emptyEntryTypeCounts();

  for (const entry of entries) {
    byPhase[entry.phase]++;
    byEntryType[entry.entryType]++;
  }

  const now = new Date().toISOString();
  return {
    totalEntries: entries.length,
    byPhase,
    byEntryType,
    dateRange: {
      earliest: entries[0]?.timestamp ?? now,
      latest: entries[entries.length - 1]?.timestamp ?? now,
    },
  };
}

/** Detect patterns (most active phase, common type, preferred agent, cadence). */
export function computeDiaryPatterns(entries: readonly DiaryEntry[]): DiaryPatterns {
  const stats = computeDiaryStatistics(entries);

  const mostActivePhase = (Object.entries(stats.byPhase) as [CeremonialPhase, number][]).reduce(
    (a, b) => (b[1] > a[1] ? b : a),
  )[0];

  const mostCommonEntryType = (Object.entries(stats.byEntryType) as [DiaryEntryType, number][]).reduce(
    (a, b) => (b[1] > a[1] ? b : a),
  )[0];

  const agentCounts: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.agent) {
      agentCounts[entry.agent] = (agentCounts[entry.agent] ?? 0) + 1;
    }
  }
  const preferredAgent =
    Object.entries(agentCounts).reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0])[0] || undefined;

  const daysDiff =
    entries.length > 0
      ? (Date.parse(stats.dateRange.latest) - Date.parse(stats.dateRange.earliest)) /
        (1000 * 60 * 60 * 24)
      : 1;
  const averageEntriesPerDay = entries.length / Math.max(daysDiff, 1);

  return { mostActivePhase, mostCommonEntryType, preferredAgent, averageEntriesPerDay };
}

/** Fetch a participant's entries and compute statistics. */
export async function getDiaryStatistics(
  store: StorageProvider,
  participant: Participant,
): Promise<DiaryStatistics> {
  return computeDiaryStatistics(await store.listDiaryEntries({ participant }));
}

/** Fetch a participant's entries and detect patterns. */
export async function findDiaryPatterns(
  store: StorageProvider,
  participant: Participant,
): Promise<DiaryPatterns> {
  return computeDiaryPatterns(await store.listDiaryEntries({ participant }));
}
