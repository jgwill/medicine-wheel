/**
 * @medicine-wheel/narrative-cluster — Clusters
 *
 * The Narrative Cluster Processor as a reusable method: group witnessed events
 * into cinematic clusters and turn them into direction-aligned NarrativeBeats.
 * Input is the minimal `ClusterableEvent` shape, so any source (transcript,
 * rushes, notes) flows through without a hard dependency on perception-layer.
 */
import type { NarrativeBeat, DirectionName } from '@medicine-wheel/ontology-core';

export type ClusterKind = 'shot-sequence' | 'sound-environment' | 'relational-moment';

/** The minimal input shape — decoupled from any specific producer. */
export interface ClusterableEvent {
  /** Event type label (e.g. a PerceptualEventType string). */
  type: string;
  text: string;
  index: number;
  source?: string;
}

export interface NarrativeCluster {
  id: string;
  kind: ClusterKind;
  theme: string;
  direction: DirectionName;
  events: ClusterableEvent[];
}

const KIND_FOR_EVENT: Record<string, ClusterKind> = {
  'shot-composition': 'shot-sequence',
  'ambient-sound': 'sound-environment',
  'relational-moment': 'relational-moment',
  'director-intent': 'relational-moment',
  'transcript-segment': 'relational-moment',
};

const DIRECTION_FOR_KIND: Record<ClusterKind, DirectionName> = {
  'shot-sequence': 'east', // vision — what is seen
  'sound-environment': 'south', // embodied — what is heard
  'relational-moment': 'west', // reflection — relationship
};

const THEME_FOR_KIND: Record<ClusterKind, string> = {
  'shot-sequence': 'Visual composition — what the eye witnesses',
  'sound-environment': 'Sound environment — what the ear witnesses',
  'relational-moment': 'Relational moments — knowledge from relationship',
};

const CLUSTER_ORDER: ClusterKind[] = ['shot-sequence', 'sound-environment', 'relational-moment'];

const ACT_FOR_DIRECTION: Record<DirectionName, number> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4,
};

/** Group events into cinematic clusters, preserving stream order within each. */
export function clusterEvents(events: ClusterableEvent[]): NarrativeCluster[] {
  const buckets = new Map<ClusterKind, ClusterableEvent[]>();
  for (const ev of events) {
    const kind = KIND_FOR_EVENT[ev.type] ?? 'relational-moment';
    const arr = buckets.get(kind) ?? [];
    arr.push(ev);
    buckets.set(kind, arr);
  }

  const clusters: NarrativeCluster[] = [];
  for (const kind of CLUSTER_ORDER) {
    const evs = buckets.get(kind);
    if (!evs || evs.length === 0) continue;
    clusters.push({
      id: `cluster:${kind}:${evs[0].index}`,
      kind,
      theme: THEME_FOR_KIND[kind],
      direction: DIRECTION_FOR_KIND[kind],
      events: evs,
    });
  }
  return clusters;
}

/** One direction-aligned NarrativeBeat per cluster. */
export function clustersToBeats(clusters: NarrativeCluster[]): NarrativeBeat[] {
  const now = new Date().toISOString();
  return clusters.map((c) => ({
    id: `beat:${c.id}`,
    direction: c.direction,
    title: c.theme,
    description: `${c.events.length} ${c.kind} event(s) witnessed`,
    prose: c.events
      .slice(0, 3)
      .map((e) => e.text)
      .join(' '),
    ceremonies: [],
    learnings: [],
    timestamp: now,
    act: ACT_FOR_DIRECTION[c.direction],
    relations_honored: [],
  }));
}
