/**
 * Plan Perspective merge and filter semantics shared by every provider.
 *
 * Medicine-wheel stores relational projections of Miette perspectives; the
 * session file remains authoritative. Nothing here generates or rewrites
 * narrative prose — records pass through untouched apart from the episode
 * union and source timestamps pinned by @miadi/plan-insight's
 * mergePerspectiveRecords contract.
 */

import type {
  PlanPerspectiveEpisode,
  PlanPerspectiveFilters,
  PlanPerspectiveRecord,
} from './interface.js';

/** Union episode relations by exact path; a known number backfills an entry missing one. */
export function unionPlanPerspectiveEpisodes(
  episodes: readonly PlanPerspectiveEpisode[],
): PlanPerspectiveEpisode[] {
  const byPath = new Map<string, PlanPerspectiveEpisode>();
  for (const episode of episodes) {
    if (typeof episode?.path !== 'string' || episode.path.length === 0) continue;
    const existing = byPath.get(episode.path);
    if (!existing) {
      byPath.set(episode.path, { ...episode });
    } else if (existing.number === undefined && typeof episode.number === 'number') {
      existing.number = episode.number;
    }
  }
  return [...byPath.values()];
}

/**
 * Upsert merge: the incoming projection wins, episodes union by path, and the
 * original registration timestamp survives while updated_at refreshes.
 */
export function mergePlanPerspectiveRecords(
  existing: PlanPerspectiveRecord,
  incoming: PlanPerspectiveRecord,
): PlanPerspectiveRecord {
  return {
    ...incoming,
    episodes: unionPlanPerspectiveEpisodes([...existing.episodes, ...incoming.episodes]),
    source: {
      ...incoming.source,
      registered_at: existing.source.registered_at,
      updated_at: incoming.source.updated_at,
    },
  };
}

export function matchesPlanPerspectiveFilters(
  record: PlanPerspectiveRecord,
  filters: PlanPerspectiveFilters,
): boolean {
  if (filters.id !== undefined && record.id !== filters.id) {
    return false;
  }
  if (filters.session_id !== undefined && record.plan?.session_id !== filters.session_id) {
    return false;
  }
  if (
    filters.episode_path !== undefined &&
    !record.episodes?.some((episode) => episode?.path === filters.episode_path)
  ) {
    return false;
  }
  return true;
}
