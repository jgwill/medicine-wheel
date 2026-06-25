/**
 * @medicine-wheel/narrative-cluster
 *
 * The Narrative Cluster Processor: witnessed events → cinematic clusters →
 * narrative beats → a Film Edit Brief (EDL markers with narrative annotations).
 *
 * @example
 * ```ts
 * import { clusterEvents, clustersToBeats, generateEditBrief } from '@medicine-wheel/narrative-cluster';
 *
 * const clusters = clusterEvents(events.map((e) => ({ type: e.type, text: e.text, index: e.index, source: e.source })));
 * const beats = clustersToBeats(clusters);
 * const brief = generateEditBrief(clusters, { title: 'Episode 066 rushes' });
 * ```
 *
 * @packageDocumentation
 */
export type { ClusterKind, ClusterableEvent, NarrativeCluster } from './clusters.js';
export { clusterEvents, clustersToBeats } from './clusters.js';

export type { EditMarker, EditBrief, EditBriefOptions } from './edit-brief.js';
export { generateEditBrief } from './edit-brief.js';
