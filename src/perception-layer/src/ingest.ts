/**
 * @medicine-wheel/perception-layer — Ingest
 *
 * Parse a belt-device transcript into typed perceptual events and seed a
 * production knowledge graph. Film entities ride on `knowledge` nodes carrying
 * `metadata.kind`; edges are `ProductionRelation`s. Nothing in the ontology's
 * NodeType union changes.
 */
import type {
  RelationalNode,
  ProductionRelation,
  ProductionEntityKind,
} from '@medicine-wheel/ontology-core';
import type {
  PerceptualEvent,
  AgentParticipant,
  IngestOptions,
  BuildGraphOptions,
  ProductionGraphSeed,
} from './types.js';
import { classify } from './observers.js';

let _seq = 0;
function uid(prefix: string): string {
  _seq += 1;
  return `${prefix}:${Date.now()}:${_seq}`;
}

/** Split a transcript into sentence-ish segments. */
export function segmentTranscript(text: string, minSegmentLength = 24): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minSegmentLength);
}

/** Register a production participant with a persistent persona signature. */
export function registerParticipant(
  name: string,
  role: AgentParticipant['role'],
  signature: string[],
): AgentParticipant {
  return { id: uid('participant'), name, role, signature };
}

/** Witness a transcript as a stream of perceptual events. */
export function ingestTranscript(text: string, opts: IngestOptions = {}): PerceptualEvent[] {
  const source = opts.source ?? 'belt-device';
  const minSegmentLength = opts.minSegmentLength ?? 24;
  const observedBy = opts.participant?.id;
  const now = new Date().toISOString();

  return segmentTranscript(text, minSegmentLength).map((seg, index) => {
    const { sense, type } = classify(seg);
    return {
      id: uid('pevent'),
      sense,
      type,
      text: seg,
      source,
      index,
      observedBy,
      timestamp: now,
    } satisfies PerceptualEvent;
  });
}

const KIND_BY_TYPE: Record<PerceptualEvent['type'], ProductionEntityKind> = {
  'shot-composition': 'shot',
  'transcript-segment': 'rush',
  'director-intent': 'rush',
  'ambient-sound': 'rush',
  'relational-moment': 'scene',
};

function makeProductionRelation(
  fromId: string,
  toId: string,
  relationshipType: ProductionRelation['relationship_type'],
  productionId: string,
  timecode?: string,
): ProductionRelation {
  const now = new Date().toISOString();
  return {
    id: uid('rel'),
    from_id: fromId,
    to_id: toId,
    relationship_type: relationshipType,
    strength: 1,
    obligations: [],
    ocap: {
      ownership: 'creator',
      control: 'creator',
      access: 'community',
      possession: 'on-premise',
      compliant: true,
    },
    accountability: {
      respect: 1,
      reciprocity: 1,
      responsibility: 1,
      wilson_alignment: 1,
      relations_honored: [],
    },
    metadata: {},
    production_id: productionId,
    timecode,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Seed a production graph from perceptual events. Each segment is `rush-of` the
 * recording; the participant is recorded as `witnessed-by` — relationship over
 * extraction.
 */
export function buildProductionGraph(
  events: PerceptualEvent[],
  opts: BuildGraphOptions = {},
): ProductionGraphSeed {
  const now = new Date().toISOString();
  const productionId = opts.productionId ?? uid('production');
  const recordingName = opts.recordingName ?? 'Belt-device recording';

  const recording: RelationalNode = {
    id: uid('node'),
    name: recordingName,
    type: 'knowledge',
    direction: 'east',
    metadata: {
      kind: 'recording' as ProductionEntityKind,
      production_id: productionId,
      event_count: events.length,
    },
    created_at: now,
    updated_at: now,
  };

  const segments: RelationalNode[] = [];
  const collaborators: RelationalNode[] = [];
  const relations: ProductionRelation[] = [];

  if (opts.participant) {
    const witness: RelationalNode = {
      id: uid('node'),
      name: opts.participant.name,
      type: 'human',
      metadata: {
        kind: 'collaborator' as ProductionEntityKind,
        role: opts.participant.role,
        signature: opts.participant.signature,
      },
      created_at: now,
      updated_at: now,
    };
    collaborators.push(witness);
    relations.push(makeProductionRelation(recording.id, witness.id, 'witnessed-by', productionId));
  }

  for (const ev of events) {
    const node: RelationalNode = {
      id: uid('node'),
      name: ev.text.slice(0, 60),
      type: 'knowledge',
      metadata: {
        kind: KIND_BY_TYPE[ev.type],
        event_type: ev.type,
        sense: ev.sense,
        index: ev.index,
        source: ev.source,
      },
      created_at: now,
      updated_at: now,
    };
    segments.push(node);
    relations.push(
      makeProductionRelation(node.id, recording.id, 'rush-of', productionId, String(ev.index)),
    );
  }

  return { recording, segments, collaborators, relations };
}
