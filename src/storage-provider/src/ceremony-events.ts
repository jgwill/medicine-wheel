/**
 * Ceremony Event filter semantics shared by every provider.
 *
 * A ceremony event is a GitHub happening (issue, pull request, merge, commit)
 * witnessed through a ceremonial lens and recorded as a relational bead. The
 * detection and processing logic lives in @medicine-wheel/github-ceremony;
 * here we keep only the record shape's filter matching so jsonl and neon agree.
 */

import type { CeremonyEventFilters, CeremonyEventRecord } from './interface.js';

/** True when a ceremony-event record satisfies every provided filter. */
export function matchesCeremonyEventFilters(
  record: CeremonyEventRecord,
  filters: CeremonyEventFilters,
): boolean {
  if (filters.source !== undefined && record.source !== filters.source) {
    return false;
  }
  if (filters.kind !== undefined && record.kind !== filters.kind) {
    return false;
  }
  if (filters.phase !== undefined && record.phase !== filters.phase) {
    return false;
  }
  if (filters.direction !== undefined && record.direction !== filters.direction) {
    return false;
  }
  if (filters.repository !== undefined && record.repository !== filters.repository) {
    return false;
  }
  return true;
}
