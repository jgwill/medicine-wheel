/**
 * Diary Entry filter + ordering semantics shared by every provider.
 *
 * The ceremonial diary is a participant's voice — intention, observation,
 * reflection — written across the Five-Phase ceremonial methodology. The
 * record schema lives with the providers so both the jsonl and neon backends
 * read and write the same shape; the diary domain package
 * (@medicine-wheel/ceremonial-diary) owns creation helpers, pattern detection,
 * and markdown export.
 */

import type { DiaryEntryFilters, DiaryEntryRecord } from './interface.js';

/** True when a record satisfies every provided filter (limit is applied separately). */
export function matchesDiaryEntryFilters(
  record: DiaryEntryRecord,
  filters: DiaryEntryFilters,
): boolean {
  if (filters.participant !== undefined && record.participant !== filters.participant) {
    return false;
  }
  if (filters.phase !== undefined && record.phase !== filters.phase) {
    return false;
  }
  if (filters.entryType !== undefined && record.entryType !== filters.entryType) {
    return false;
  }
  if (filters.dateRange !== undefined) {
    const entryTime = Date.parse(record.timestamp);
    const startTime = Date.parse(filters.dateRange.start);
    const endTime = Date.parse(filters.dateRange.end);
    if (entryTime < startTime || entryTime > endTime) {
      return false;
    }
  }
  if (filters.tags !== undefined && filters.tags.length > 0) {
    const entryTags = record.metadata?.tags ?? [];
    const hasTag = filters.tags.some((tag) => entryTags.includes(tag));
    if (!hasTag) {
      return false;
    }
  }
  return true;
}

/**
 * Filter, order (oldest → newest, mirroring the ceremonial journey), and apply
 * the optional limit. Providers call this after loading their raw records so
 * jsonl and neon return identical result sets.
 */
export function filterAndOrderDiaryEntries(
  records: readonly DiaryEntryRecord[],
  filters: DiaryEntryFilters = {},
): DiaryEntryRecord[] {
  const filtered = records
    .filter((record) => matchesDiaryEntryFilters(record, filters))
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));

  if (typeof filters.limit === 'number' && filters.limit >= 0) {
    return filtered.slice(0, filters.limit);
  }
  return filtered;
}
