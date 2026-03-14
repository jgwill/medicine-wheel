/**
 * Cross-Dimensional Analysis — mapping relationships between epistemic sources.
 *
 * Wilson's epistemology holds that Land, Dream, Code, and Vision each
 * teach differently. This module finds where those ways of knowing
 * converge, where they are in tension, and where coverage is lacking.
 */
import type {
  RelationalIndex,
  CrossDimensionalMap,
  Convergence,
  Tension,
  DimensionGap,
  EpistemicSource,
} from './types.js';

const ALL_SOURCES: EpistemicSource[] = ['land', 'dream', 'code', 'vision'];

/** Build the complete cross-dimensional map for the index */
export function mapAcrossDimensions(index: RelationalIndex): CrossDimensionalMap {
  return {
    convergences: findConvergences(index),
    tensions: detectTensions(index),
    gaps: coverageGaps(index),
  };
}

/** Find convergences — points where multiple epistemic dimensions agree */
export function findConvergences(index: RelationalIndex): Convergence[] {
  const tagMap = new Map<string, Map<EpistemicSource, string[]>>();

  for (const entry of index.entries.values()) {
    for (const tag of entry.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, new Map());
      const sourceMap = tagMap.get(tag)!;
      const ids = sourceMap.get(entry.source) ?? [];
      ids.push(entry.unitId);
      sourceMap.set(entry.source, ids);
    }
  }

  const convergences: Convergence[] = [];

  for (const [tag, sourceMap] of tagMap) {
    const dims = Array.from(sourceMap.keys());
    if (dims.length < 2) continue;

    const entryIds = Array.from(sourceMap.values()).flat();
    const strength = dims.length / ALL_SOURCES.length;

    convergences.push({
      dimensions: dims,
      entries: entryIds,
      strength,
      description: `Tag '${tag}' converges across ${dims.join(', ')}`,
    });
  }

  return convergences;
}

/** Detect tensions — points where dimensions conflict or diverge */
export function detectTensions(index: RelationalIndex): Tension[] {
  const tagMap = new Map<string, { source: EpistemicSource; unitId: string; weight: number }[]>();

  for (const entry of index.entries.values()) {
    for (const tag of entry.tags) {
      const list = tagMap.get(tag) ?? [];
      list.push({ source: entry.source, unitId: entry.unitId, weight: entry.epistemicWeight });
      tagMap.set(tag, list);
    }
  }

  const tensions: Tension[] = [];

  for (const [tag, grouped] of tagMap) {
    const sources = new Set(grouped.map(g => g.source));
    if (sources.size < 2) continue;

    const weights = grouped.map(g => g.weight);
    const range = Math.max(...weights) - Math.min(...weights);

    if (range > 0.5) {
      tensions.push({
        dimensions: [...sources],
        conflict: `Tag '${tag}' shows weight divergence (range: ${range.toFixed(2)}) across ${[...sources].join(', ')}`,
        entries: grouped.map(g => g.unitId),
      });
    }
  }

  return tensions;
}

/** Identify coverage gaps — epistemic dimensions that are underrepresented */
export function coverageGaps(index: RelationalIndex): DimensionGap[] {
  const totalEntries = index.entries.size;
  if (totalEntries === 0) {
    return ALL_SOURCES.map(source => ({
      source,
      severity: 1,
      description: `No entries in any dimension — '${source}' is unrepresented`,
    }));
  }

  const expected = totalEntries / ALL_SOURCES.length;
  const gaps: DimensionGap[] = [];

  for (const source of ALL_SOURCES) {
    const count = index.dimensions[source].entries.length;
    if (count < expected * 0.25) {
      const severity = count === 0 ? 1 : Math.min(1, 1 - count / expected);
      const label = count === 0 ? 'absent' : 'severely underrepresented';
      gaps.push({
        source,
        severity,
        description: `'${source}' dimension is ${label} (${count}/${totalEntries} entries, expected ~${Math.round(expected)})`,
      });
    }
  }

  return gaps;
}
