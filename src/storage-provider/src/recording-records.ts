/**
 * Recording Record semantics shared by every provider.
 *
 * The registry holds records and URIs — where a take lives — never the bytes
 * themselves, which stay behind the capture service that made them. Capture is
 * owned by @miadi/recording and the gmtermux edge; here we keep only the id
 * convention, filter predicate, ordering, and upsert-merge rule so the jsonl
 * and neon backends agree on what a recording means.
 */

import type { RecordingFilters, RecordingRecord } from './interface.js';

/**
 * Compose the upsert key for a recording, mirroring @miadi/inquiry-weave's
 * weaveRecordId composition: `recording:<episode_path>:<filename>` when the
 * recording is episode-bound, `recording:<filename>` otherwise.
 */
export function recordingRecordId(filename: string, episodePath?: string): string {
  return episodePath ? `recording:${episodePath}:${filename}` : `recording:${filename}`;
}

/** True when a recording record satisfies every provided filter. */
export function matchesRecordingFilters(
  record: RecordingRecord,
  filters: RecordingFilters,
): boolean {
  if (filters.episode_path !== undefined && record.episode_path !== filters.episode_path) {
    return false;
  }
  if (filters.episode_number !== undefined && record.episode_number !== filters.episode_number) {
    return false;
  }
  if (filters.composition !== undefined && record.composition !== filters.composition) {
    return false;
  }
  if (filters.kind !== undefined && record.kind !== filters.kind) {
    return false;
  }
  if (filters.origin !== undefined && record.origin !== filters.origin) {
    return false;
  }
  if (filters.device !== undefined && record.device !== filters.device) {
    return false;
  }
  if (filters.filename !== undefined && record.filename !== filters.filename) {
    return false;
  }
  return true;
}

/**
 * Filter a batch of recording rows, dropping anything that did not survive the
 * read (a Postgres payload that fails to parse arrives here as null), then
 * order newest registration first.
 */
export function filterAndOrderRecordings(
  records: readonly (RecordingRecord | null | undefined)[],
  filters: RecordingFilters = {},
): RecordingRecord[] {
  return records
    .filter(
      (record): record is RecordingRecord =>
        record !== null &&
        record !== undefined &&
        typeof record === 'object' &&
        matchesRecordingFilters(record, filters),
    )
    .sort((left, right) => Date.parse(right.registered_at) - Date.parse(left.registered_at));
}

/**
 * Upsert merge: the incoming record wins wherever it speaks, the existing
 * record fills wherever it stays silent. Provenance is observed, not demanded
 * — so a later registration that learned less (no device, no sha256) must not
 * erase what an earlier one knew. The first registration timestamp survives,
 * matching the plan-perspective merge contract.
 */
export function mergeRecordingRecords(
  existing: RecordingRecord,
  incoming: RecordingRecord,
): RecordingRecord {
  const merged: RecordingRecord = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== undefined) merged[key] = value;
  }
  merged.registered_at = existing.registered_at;
  return merged;
}
