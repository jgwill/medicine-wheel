/**
 * Query — retrieve entries from the relational index by various criteria.
 *
 * All query functions are pure: they read from the index without mutation.
 */
import type { DirectionName } from 'medicine-wheel-ontology-core';
import type { RelationalIndex, IndexEntry, EpistemicSource } from './types.js';

/** Retrieve all entries from one epistemic source */
export function queryBySource(index: RelationalIndex, source: EpistemicSource): IndexEntry[] {
  return index.dimensions[source].entries;
}

/** Retrieve all entries aligned with a given Medicine Wheel direction */
export function queryByDirection(index: RelationalIndex, direction: DirectionName): IndexEntry[] {
  return Array.from(index.entries.values()).filter(e => e.direction === direction);
}

/** Retrieve entries whose epistemic weight meets or exceeds a threshold */
export function queryByWeight(index: RelationalIndex, minWeight: number): IndexEntry[] {
  return Array.from(index.entries.values()).filter(e => e.epistemicWeight >= minWeight);
}

/** Retrieve entries whose circle depth meets or exceeds a threshold */
export function queryByDepth(index: RelationalIndex, minDepth: number): IndexEntry[] {
  return Array.from(index.entries.values()).filter(e => e.circleDepth >= minDepth);
}

/**
 * Retrieve entries that bridge multiple epistemic sources.
 * Returns entries whose tags overlap with entries from each of the requested sources.
 */
export function queryCrossDimensional(
  index: RelationalIndex,
  sources: EpistemicSource[],
): IndexEntry[] {
  if (sources.length < 2) {
    return sources.length === 1 ? queryBySource(index, sources[0]) : [];
  }

  // Build tag→source mapping
  const tagSources = new Map<string, Set<EpistemicSource>>();
  for (const entry of index.entries.values()) {
    for (const tag of entry.tags) {
      const set = tagSources.get(tag) ?? new Set();
      set.add(entry.source);
      tagSources.set(tag, set);
    }
  }

  // Find tags that span all requested sources
  const bridgeTags = new Set<string>();
  for (const [tag, srcs] of tagSources) {
    if (sources.every(s => srcs.has(s))) {
      bridgeTags.add(tag);
    }
  }

  // Return entries with at least one bridge tag
  const seen = new Set<string>();
  const result: IndexEntry[] = [];
  for (const entry of index.entries.values()) {
    if (!seen.has(entry.unitId) && entry.tags.some(t => bridgeTags.has(t))) {
      seen.add(entry.unitId);
      result.push(entry);
    }
  }

  return result;
}
