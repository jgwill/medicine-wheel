/**
 * Film-production vertical slice — end-to-end on a REAL episode-066 transcript.
 *
 * Proves the chain witnesses actual belt-device material, not synthetic input.
 * On the Miadi host this uses the full Episode 066 transcript; elsewhere it falls
 * back to a committed excerpt from that transcript so CI/review can still run:
 *   transcript → perception ingest → narrative cluster → edit brief
 *             → storyteller gate → production ceremony closure
 *
 * Two relationship threads stay legible:
 *   Jerry  = runtime observability / storyteller quality gate / event accountability
 *   Renaud = Research is Ceremony / film as knowledge-generation / relational witnessing
 *
 * New packages are imported from their built `dist/` (self-contained — the type
 * imports inside them are erased, so no @medicine-wheel runtime resolution is
 * needed).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ProductionRelation } from '../src/ontology-core/dist/index.js';
import {
  registerParticipant,
  ingestTranscript,
  buildProductionGraph,
} from '../src/perception-layer/dist/index.js';
import {
  clusterEvents,
  clustersToBeats,
  generateEditBrief,
} from '../src/narrative-cluster/dist/index.js';
import { storytellerGate } from '../src/community-review/dist/storyteller.js';
import {
  RELATIONAL_PRODUCTION_PROTOCOL,
  openProductionSession,
  advanceProductionStage,
  closeProductionSession,
} from '../src/ceremony-protocol/dist/production.js';

const LOCAL_EPISODE_066_TRANSCRIPT_PATH =
  '/srv/miadi/episodes/miadi-chronicle/2026-06-19-episode-066-ears-and-eye-testing-and-cinema-indigenous/ilex-testing/260619131039.tr.EN.txt';
const FIXTURE_TRANSCRIPT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures/episode-066-transcript-excerpt.txt',
);
const TRANSCRIPT_PATH = existsSync(LOCAL_EPISODE_066_TRANSCRIPT_PATH)
  ? LOCAL_EPISODE_066_TRANSCRIPT_PATH
  : FIXTURE_TRANSCRIPT_PATH;

const MIETTE_SIGNATURE = {
  markers: ['🌸', 'Miette', 'narrative resonance', 'the story'],
  minMarkers: 1,
  label: 'storyteller perspective (🌸 Miette voice)',
};

describe('film-production vertical slice (real episode-066 transcript)', () => {
  const transcript = existsSync(TRANSCRIPT_PATH) ? readFileSync(TRANSCRIPT_PATH, 'utf8') : '';

  it('has the real transcript to witness', () => {
    expect(transcript.length).toBeGreaterThan(1000);
  });

  it('perception layer witnesses the transcript as typed events (eyes & ears)', () => {
    const mia = registerParticipant('Mia', 'witness', ['🧠', 'Mia']);
    const events = ingestTranscript(transcript, { source: TRANSCRIPT_PATH, participant: mia });

    expect(events.length).toBeGreaterThanOrEqual(10);
    // Every event was witnessed by the registered participant (relationship, not extraction).
    expect(events.every((e) => e.observedBy === mia.id)).toBe(true);

    const types = new Set(events.map((e) => e.type));
    expect(types.size).toBeGreaterThanOrEqual(2);

    // Renaud/Jerry thread: a real relational moment is recognized in the material.
    const relational = events.find((e) => e.type === 'relational-moment');
    expect(relational).toBeDefined();
    expect(relational!.text).toMatch(/jerry|nicolas|renau|relationship/i);
  });

  it('seeds an additive production graph (knowledge nodes + ProductionRelation edges)', () => {
    const mia = registerParticipant('Mia', 'witness', ['🧠', 'Mia']);
    const events = ingestTranscript(transcript, { source: TRANSCRIPT_PATH, participant: mia });
    const graph = buildProductionGraph(events, { participant: mia, recordingName: 'Episode 066 belt recording' });

    expect(graph.recording.type).toBe('knowledge');
    expect(graph.recording.metadata.kind).toBe('recording');
    expect(graph.segments.length).toBe(events.length);
    expect(graph.collaborators.length).toBe(1);

    // Film entities ride on `knowledge` nodes with a metadata.kind discriminator.
    const kinds = new Set(graph.segments.map((s) => s.metadata.kind as string));
    expect(kinds.size).toBeGreaterThanOrEqual(2);

    // Edges are ProductionRelations: rushes witnessed by a participant.
    const witnessed: ProductionRelation | undefined = graph.relations.find(
      (r) => r.relationship_type === 'witnessed-by',
    );
    expect(witnessed).toBeDefined();
    expect(graph.relations.some((r) => r.relationship_type === 'rush-of')).toBe(true);
  });

  it('clusters rushes into beats and a Film Edit Brief (EDL)', () => {
    const events = ingestTranscript(transcript, { source: TRANSCRIPT_PATH });
    const clusters = clusterEvents(
      events.map((e) => ({ type: e.type, text: e.text, index: e.index, source: e.source })),
    );

    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(clusters.some((c) => c.kind === 'relational-moment')).toBe(true);

    const beats = clustersToBeats(clusters);
    expect(beats.every((b) => ['east', 'south', 'west', 'north'].includes(b.direction))).toBe(true);

    const brief = generateEditBrief(clusters, { title: 'Episode 066 rushes' });
    expect(brief.markers.length).toBe(events.length);
    expect(brief.edl).toContain('TITLE: Episode 066 rushes');
    expect(brief.markers[0].timecode).toMatch(/^\d{2}:\d{2}:\d{2}:\d{2}$/);
  });

  it('storyteller gate rejects voiceless output and accepts the storyteller voice (Jerry thread)', () => {
    const voiceless = 'Here is the edit brief. Markers generated. Done.';
    const rejected = storytellerGate(voiceless, MIETTE_SIGNATURE);
    expect(rejected.passed).toBe(false);
    expect(rejected.missingSignature).toBe(true);
    expect(rejected.revisionReason).toBeDefined();
    expect(rejected.revisionReason).toMatch(/storyteller/i);

    const voiced =
      '🌸 The rushes become a river of meaning — the story blooms as belt-device whispers turn into a witnessed edit.';
    const accepted = storytellerGate(voiced, MIETTE_SIGNATURE);
    expect(accepted.passed).toBe(true);
    expect(accepted.matchedMarkers).toContain('🌸');
  });

  it('runs production as ceremony — closure cannot be skipped (Renaud thread)', () => {
    expect(RELATIONAL_PRODUCTION_PROTOCOL).toHaveLength(4);

    const session = openProductionSession(
      'Witness episode-066 rushes into an edit brief while honoring relationship',
      ['Mia', 'Guillaume', 'Jerry', 'Nicolas Renaud'],
    );
    expect(session.stage).toBe('pre-production');

    // Ceremony cannot be skipped.
    expect(() => closeProductionSession(session)).toThrow(/cannot be skipped/i);

    let s = session;
    s = advanceProductionStage(s); // on-set
    s = advanceProductionStage(s); // post-production
    s = advanceProductionStage(s); // closure
    expect(s.stagesHonored).toEqual(['pre-production', 'on-set', 'post-production', 'closure']);

    const closed = closeProductionSession(s, [
      'Knowledge came from relationship — Jerry (eyes & ears) and Nicolas (ceremony) both shaped the slice.',
    ]);
    expect(closed.closedAt).toBeDefined();
    expect(closed.reflections.length).toBeGreaterThanOrEqual(1);
  });
});
