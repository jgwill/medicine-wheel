/**
 * Index Manager — create, mutate, and rebuild relational indices.
 *
 * Provides the foundational CRUD operations for the relational index.
 * All mutations return new index instances (immutable pattern).
 */
import type {
  RelationalIndex,
  IndexEntry,
  DimensionIndex,
  EpistemicSource,
  CrossDimensionalMap,
} from './types.js';

const ALL_SOURCES: EpistemicSource[] = ['land', 'dream', 'code', 'vision'];

/** Create an empty relational index with initialised dimension shells */
export function createIndex(): RelationalIndex {
  const dimensions = {} as Record<EpistemicSource, DimensionIndex>;
  for (const source of ALL_SOURCES) {
    dimensions[source] = { source, entries: [], depth: 0, weight: 0 };
  }

  return {
    entries: new Map(),
    dimensions,
    crossMap: { convergences: [], tensions: [], gaps: [] },
  };
}

/** Add an entry to the index, returning an updated index */
export function addEntry(index: RelationalIndex, entry: IndexEntry): RelationalIndex {
  const entries = new Map(index.entries);
  entries.set(entry.unitId, entry);

  const updated: RelationalIndex = { ...index, entries };
  return rebuildDimensions(updated);
}

/** Remove an entry by unitId, returning an updated index */
export function removeEntry(index: RelationalIndex, unitId: string): RelationalIndex {
  const entries = new Map(index.entries);
  entries.delete(unitId);

  const updated: RelationalIndex = { ...index, entries };
  return rebuildDimensions(updated);
}

/** Recompute dimension aggregates from the current entry set */
export function rebuildDimensions(index: RelationalIndex): RelationalIndex {
  const dimensions = {} as Record<EpistemicSource, DimensionIndex>;

  for (const source of ALL_SOURCES) {
    const dimEntries = Array.from(index.entries.values()).filter(e => e.source === source);
    const depth = dimEntries.length > 0
      ? dimEntries.reduce((sum, e) => sum + e.circleDepth, 0) / dimEntries.length
      : 0;
    const weight = dimEntries.length > 0
      ? dimEntries.reduce((sum, e) => sum + e.epistemicWeight, 0) / dimEntries.length
      : 0;

    dimensions[source] = { source, entries: dimEntries, depth, weight };
  }

  const crossMap = rebuildCrossMap(index.entries, dimensions);

  return { ...index, dimensions, crossMap };
}

// ── Internal ────────────────────────────────────────────────────

function rebuildCrossMap(
  entries: Map<string, IndexEntry>,
  dimensions: Record<EpistemicSource, DimensionIndex>,
): CrossDimensionalMap {
  const gaps = ALL_SOURCES
    .filter(s => dimensions[s].entries.length === 0)
    .map(s => ({
      source: s,
      severity: 1,
      description: `No entries in the '${s}' dimension`,
    }));

  // Detect convergences: entries sharing the same tags across different sources
  const tagMap = new Map<string, IndexEntry[]>();
  for (const entry of entries.values()) {
    for (const tag of entry.tags) {
      const list = tagMap.get(tag) ?? [];
      list.push(entry);
      tagMap.set(tag, list);
    }
  }

  const convergences = Array.from(tagMap.entries())
    .filter(([, grouped]) => {
      const sources = new Set(grouped.map(e => e.source));
      return sources.size > 1;
    })
    .map(([tag, grouped]) => {
      const dims = [...new Set(grouped.map(e => e.source))];
      return {
        dimensions: dims,
        entries: grouped.map(e => e.unitId),
        strength: Math.min(dims.length / ALL_SOURCES.length, 1),
        description: `Tag '${tag}' bridges ${dims.join(', ')} dimensions`,
      };
    });

  // Detect tensions: entries in different sources sharing a tag but with opposing weights
  const tensions = Array.from(tagMap.entries())
    .filter(([, grouped]) => {
      const sources = new Set(grouped.map(e => e.source));
      if (sources.size < 2) return false;
      const weights = grouped.map(e => e.epistemicWeight);
      const max = Math.max(...weights);
      const min = Math.min(...weights);
      return max - min > 0.5;
    })
    .map(([tag, grouped]) => ({
      dimensions: [...new Set(grouped.map(e => e.source))],
      conflict: `Tag '${tag}' has divergent epistemic weights across dimensions`,
      entries: grouped.map(e => e.unitId),
    }));

  return { convergences, tensions, gaps };
}
