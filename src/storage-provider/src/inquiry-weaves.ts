/**
 * Inquiry Weave filter semantics — shared across providers.
 *
 * Both the JSONL and Postgres providers answer the same questions about a
 * weave; keeping the predicate in one place stops the two from drifting apart
 * on what a filter means.
 */

import type { InquiryWeaveFilters, WeaveRecord } from './interface.js';

export function matchesInquiryWeaveFilters(
  record: WeaveRecord,
  filters: InquiryWeaveFilters,
): boolean {
  if (filters.episode_path !== undefined && record.episode?.path !== filters.episode_path) {
    return false;
  }
  if (filters.episode_number !== undefined && record.episode?.number !== filters.episode_number) {
    return false;
  }
  if (filters.issue !== undefined && record.issue !== filters.issue) {
    return false;
  }
  if (filters.artefact !== undefined && record.artefact?.id !== filters.artefact) {
    return false;
  }
  return true;
}

/**
 * Filter a batch of weave rows, dropping anything that did not survive the read.
 *
 * A Postgres payload that fails to parse arrives here as null, and every
 * sibling record collection drops those before filtering. Without the guard a
 * single unreadable row throws while reading `record.episode`, and the whole
 * listing answers with an error instead of the weaves that are intact.
 */
export function filterInquiryWeaves(
  records: readonly (WeaveRecord | null | undefined)[],
  filters: InquiryWeaveFilters = {},
): WeaveRecord[] {
  return records.filter(
    (record): record is WeaveRecord =>
      record !== null &&
      record !== undefined &&
      typeof record === 'object' &&
      matchesInquiryWeaveFilters(record, filters),
  );
}
