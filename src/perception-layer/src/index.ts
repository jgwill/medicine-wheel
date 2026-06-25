/**
 * @medicine-wheel/perception-layer
 *
 * The eyes & ears of agent-supported film production. Witness a belt-device
 * recording as typed perceptual events and seed a production knowledge graph —
 * relationship, not extraction.
 *
 * @example
 * ```ts
 * import { registerParticipant, ingestTranscript, buildProductionGraph } from '@medicine-wheel/perception-layer';
 *
 * const mia = registerParticipant('Mia', 'witness', ['🧠']);
 * const events = ingestTranscript(transcript, { source: 'belt-device', participant: mia });
 * const graph = buildProductionGraph(events, { participant: mia });
 * ```
 *
 * @packageDocumentation
 */
export type {
  PerceptualSense,
  PerceptualEventType,
  PerceptualEvent,
  AgentParticipant,
  IngestOptions,
  BuildGraphOptions,
  ProductionGraphSeed,
} from './types.js';

export type { PerceptualObserver, Classification } from './observers.js';
export {
  OBSERVERS,
  classify,
  relationalWitnessingObserver,
  directorIntentObserver,
  shotCompositionObserver,
  ambientSoundObserver,
} from './observers.js';

export {
  segmentTranscript,
  registerParticipant,
  ingestTranscript,
  buildProductionGraph,
} from './ingest.js';
