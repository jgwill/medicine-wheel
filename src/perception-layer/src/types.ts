/**
 * @medicine-wheel/perception-layer — Types
 *
 * The eyes & ears of agent-supported film production. A production participant
 * (human or agent) witnesses a recording as a stream of typed perceptual events
 * and seeds a production knowledge graph. The agent is recorded as the WITNESS
 * (`observedBy`) of each event — relationship, not extraction.
 */
import type { RelationalNode, ProductionRelation } from '@medicine-wheel/ontology-core';

/** Through which organ the event is sensed. */
export type PerceptualSense = 'ear' | 'eye';

export type PerceptualEventType =
  | 'transcript-segment' // ear — raw spoken material
  | 'director-intent' // ear — stated creative intent
  | 'ambient-sound' // ear — recording / environment
  | 'shot-composition' // eye — what is seen / framed
  | 'relational-moment'; // eye — a witnessed relationship

export interface PerceptualEvent {
  id: string;
  sense: PerceptualSense;
  type: PerceptualEventType;
  text: string;
  /** File path or device id the event was witnessed from. */
  source: string;
  /** Order of the event within the stream. */
  index: number;
  /** AgentParticipant id — the witness, not the owner. */
  observedBy?: string;
  timestamp: string;
}

/**
 * A production participant. An agent registers with a persistent persona
 * signature carried across sessions, making it part of the production rather
 * than an external tool.
 */
export interface AgentParticipant {
  id: string;
  name: string;
  role: 'witness' | 'observer' | 'storyteller';
  /** Persona markers (names, glyphs, phrases) carried across sessions. */
  signature: string[];
}

export interface IngestOptions {
  /** File path or device id; defaults to 'belt-device'. */
  source?: string;
  /** Participant recorded as witness on every event. */
  participant?: AgentParticipant;
  /** Minimum characters for a segment to be kept (default: 24). */
  minSegmentLength?: number;
}

export interface BuildGraphOptions {
  productionId?: string;
  participant?: AgentParticipant;
  recordingName?: string;
}

/** The seeded production graph — additive over ontology-core. */
export interface ProductionGraphSeed {
  /** Parent recording node (kind: 'recording'). */
  recording: RelationalNode;
  /** Per-segment knowledge nodes (kind: 'shot' | 'rush' | 'scene'). */
  segments: RelationalNode[];
  /** Witness/collaborator nodes (kind: 'collaborator'). */
  collaborators: RelationalNode[];
  /** ProductionRelation edges (rush-of / witnessed-by). */
  relations: ProductionRelation[];
}
