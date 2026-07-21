/**
 * Ceremonial Diary — domain types and phase vocabulary.
 *
 * The record shapes (DiaryEntryRecord, filters, phase/entry unions) are owned by
 * @medicine-wheel/storage-provider so both jsonl and neon persist the same
 * shape. This module re-exports them under diary-domain names and adds the
 * phase descriptions and Four-Directions bridge that belong to the domain
 * rather than the storage layer.
 */

import type { DirectionName } from '@medicine-wheel/ontology-core';
import type {
  CeremonialPhase,
  DiaryEntryType,
  DiaryEntryLocation,
  DiaryEntryMetadata,
  DiaryEntryRecord,
  DiaryEntryFilters,
} from '@medicine-wheel/storage-provider';

export type {
  CeremonialPhase,
  DiaryEntryType,
  DiaryEntryLocation,
  DiaryEntryMetadata,
  DiaryEntryRecord,
  DiaryEntryFilters,
};

/** A diary entry — the participant's voice, persisted as a record. */
export type DiaryEntry = DiaryEntryRecord;

/** Query shape for retrieving entries. */
export type DiaryQuery = DiaryEntryFilters;

/** Legacy participant alias — an author identity (free-form string). */
export type Participant = string;

export const PHASE_DESCRIPTIONS: Record<
  CeremonialPhase,
  { name: string; description: string }
> = {
  miigwechiwendam: {
    name: 'Sacred Space Creation',
    description:
      'Establishing intention and ceremonial container. Setting the sacred space for the work ahead.',
  },
  nindokendaan: {
    name: 'Two-Eyed Research Gathering',
    description:
      'Research using Indigenous-Western balance. Gathering knowledge with both eyes.',
  },
  ningwaab: {
    name: 'Knowledge Integration',
    description:
      'Synthesizing research into coherent understanding. Weaving together what has been learned.',
  },
  nindoodam: {
    name: 'Creative Expression',
    description:
      'Transforming knowledge into accessible formats. Manifesting understanding into form.',
  },
  migwech: {
    name: 'Ceremonial Closing',
    description:
      'Honoring work and capturing learning. Giving thanks and reflecting on the journey.',
  },
};

export const CEREMONIAL_PHASES: readonly CeremonialPhase[] = [
  'miigwechiwendam',
  'nindokendaan',
  'ningwaab',
  'nindoodam',
  'migwech',
] as const;

export const DIARY_ENTRY_TYPES: readonly DiaryEntryType[] = [
  'intention',
  'observation',
  'hypothesis',
  'data',
  'synthesis',
  'action',
  'reflection',
  'learning',
] as const;

/**
 * Bridge each ceremonial phase onto the Four Directions, reusing ontology-core's
 * DirectionName. Best-effort mapping by function: opening → east, gathering →
 * south, integration/expression → west (the doing), closing → north.
 */
export const PHASE_TO_DIRECTION: Record<CeremonialPhase, DirectionName> = {
  miigwechiwendam: 'east',
  nindokendaan: 'south',
  ningwaab: 'west',
  nindoodam: 'west',
  migwech: 'north',
};
