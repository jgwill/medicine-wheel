/**
 * Timeline Builder — generates timeline data for visualization
 * of narrative beats along chronological, directional, or ceremonial axes.
 */
import type { NarrativeBeat, DirectionName } from 'medicine-wheel-ontology-core';
import { DIRECTION_COLORS } from 'medicine-wheel-ontology-core';
import type {
  TimelineAxis,
  TimelineEntry,
  TimelineData,
  TimelineGroup,
  TimelineOptions,
} from './types.js';

const DEFAULT_OPTIONS: Required<TimelineOptions> = {
  axis: 'chronological',
  filterDirection: undefined as unknown as DirectionName,
  filterAct: undefined as unknown as number,
  sortBy: 'timestamp',
};

/** Build timeline data from narrative beats */
export function buildTimeline(
  beats: NarrativeBeat[],
  options: TimelineOptions = {},
): TimelineData {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Filter
  let filtered = [...beats];
  if (opts.filterDirection) {
    filtered = filtered.filter(b => b.direction === opts.filterDirection);
  }
  if (opts.filterAct) {
    filtered = filtered.filter(b => b.act === opts.filterAct);
  }

  // Sort
  filtered.sort((a, b) => {
    switch (opts.sortBy) {
      case 'act':
        return a.act - b.act || a.timestamp.localeCompare(b.timestamp);
      case 'direction': {
        const dirOrder: DirectionName[] = ['east', 'south', 'west', 'north'];
        return dirOrder.indexOf(a.direction) - dirOrder.indexOf(b.direction) || a.timestamp.localeCompare(b.timestamp);
      }
      default:
        return a.timestamp.localeCompare(b.timestamp);
    }
  });

  // Build entries
  const span = computeSpan(filtered);
  const entries: TimelineEntry[] = filtered.map((beat, i) => ({
    beat,
    position: filtered.length <= 1 ? 0.5 : i / (filtered.length - 1),
    direction: beat.direction,
    act: beat.act,
    hasCeremony: beat.ceremonies.length > 0,
    group: groupKey(beat, opts.axis),
  }));

  // Build groups
  const groups = buildGroups(entries, opts.axis);

  return { axis: opts.axis, entries, groups, span };
}

/** Compute the time span of beats */
function computeSpan(beats: NarrativeBeat[]): { start: string; end: string } {
  if (beats.length === 0) {
    const now = new Date().toISOString();
    return { start: now, end: now };
  }
  const timestamps = beats.map(b => b.timestamp).sort();
  return { start: timestamps[0], end: timestamps[timestamps.length - 1] };
}

/** Determine the group key for a beat */
function groupKey(beat: NarrativeBeat, axis: TimelineAxis): string {
  switch (axis) {
    case 'directional':
      return beat.direction;
    case 'ceremonial':
      return beat.ceremonies.length > 0 ? 'with-ceremony' : 'without-ceremony';
    default:
      return `act-${beat.act}`;
  }
}

/** Build group metadata */
function buildGroups(entries: TimelineEntry[], axis: TimelineAxis): TimelineGroup[] {
  const groupMap = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const existing = groupMap.get(entry.group) ?? [];
    existing.push(entry);
    groupMap.set(entry.group, existing);
  }

  const groups: TimelineGroup[] = [];
  for (const [key, groupEntries] of groupMap) {
    groups.push({
      key,
      label: groupLabel(key, axis),
      color: groupColor(key, axis),
      entries: groupEntries,
    });
  }

  return groups;
}

/** Human-readable group label */
function groupLabel(key: string, axis: TimelineAxis): string {
  switch (axis) {
    case 'directional':
      return key.charAt(0).toUpperCase() + key.slice(1);
    case 'ceremonial':
      return key === 'with-ceremony' ? 'With Ceremony' : 'Without Ceremony';
    default:
      return `Act ${key.replace('act-', '')}`;
  }
}

/** Group color */
function groupColor(key: string, axis: TimelineAxis): string {
  switch (axis) {
    case 'directional':
      return DIRECTION_COLORS[key as DirectionName] ?? '#888';
    case 'ceremonial':
      return key === 'with-ceremony' ? '#DC143C' : '#666';
    default: {
      const actColors: Record<string, string> = {
        'act-1': DIRECTION_COLORS.east,
        'act-2': DIRECTION_COLORS.south,
        'act-3': DIRECTION_COLORS.west,
        'act-4': DIRECTION_COLORS.north,
      };
      return actColors[key] ?? '#888';
    }
  }
}

/** Get beats grouped into acts for a timeline strip view */
export function actStrip(beats: NarrativeBeat[]): Array<{
  act: number;
  direction: DirectionName;
  beats: NarrativeBeat[];
  hasCeremony: boolean;
}> {
  const dirOrder: DirectionName[] = ['east', 'south', 'west', 'north'];
  return dirOrder.map((dir, i) => {
    const actBeats = beats.filter(b => b.direction === dir);
    return {
      act: i + 1,
      direction: dir,
      beats: actBeats.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      hasCeremony: actBeats.some(b => b.ceremonies.length > 0),
    };
  });
}
