/**
 * @medicine-wheel/ontology-core — Direction vocabularies
 *
 * The suite describes the four directions in more than one way, and the
 * descriptions disagree: the life-cycle teachings place reflection in the
 * west, the RSIS focus labels place it in the north (jgwill/medicine-wheel#113).
 * Both may be right in their own framing. So no vocabulary here is a default:
 * each is named, says who uses it, and carries its provenance. A consumer
 * names the vocabulary it means instead of writing its own strings.
 *
 * Wilson (2008, p. 70) names the risk this guards against: people divide the
 * circle into four quadrants and say what the east stands for, which is
 * okay, but arguing that only one's own understanding of the medicine wheel
 * is the "right" one undermines those who use the circle as a paradigm.
 * Lewis Cardinal (p. 92): the circle is a foundation many peoples share, a
 * canvas, and the colours on it are each culture, "That's why the Blackfeet
 * and the Cree are not the same." And the directions belong to a land: a
 * newcomer to a territory is first told "That is East" (Betty, p. 88). A
 * vocabulary's provenance can name the territory it was taught in.
 *
 * Provenance is `unattributed` for every entry: no source, tradition or
 * steward is recorded for any of them in this repository. Changing that is a
 * knowledge holder's decision, not an engineering one (#113, #125).
 */

import type { CeremonyPhase, DirectionName } from './types';
import { DIRECTIONS, DIRECTION_INFO, CEREMONY_PHASES, CEREMONY_PHASE_DESCRIPTIONS } from './constants';

export type DirectionVocabularyId =
  | 'life-cycle-teachings'
  | 'rsis-focus'
  | 'ceremony-phases'
  | 'narrative-cadence'
  | 'decomposition';

export interface DirectionVocabularyProvenance {
  /** The teaching, publication or person this vocabulary comes from. `null` until recorded. */
  source: string | null;
  /** Who may revise it. `null` until a steward is named. */
  steward: string | null;
  status: 'unattributed' | 'attributed' | 'reviewed';
  note: string;
}

export interface DirectionVocabulary {
  id: DirectionVocabularyId;
  title: string;
  /** What each direction means in this vocabulary. */
  meanings: Readonly<Record<DirectionName, string>>;
  /** For a vocabulary that is a sequence of phases: the phase name each direction holds. */
  phases?: Readonly<Record<DirectionName, string>>;
  /** Where the suite uses it (package paths and documents). */
  usedBy: readonly string[];
  provenance: DirectionVocabularyProvenance;
}

const UNATTRIBUTED =
  'No source, tradition or steward is recorded in this repository. See jgwill/medicine-wheel#113 and #125.';

const byDirection = <T>(f: (d: DirectionName) => T): Record<DirectionName, T> => ({
  east: f('east'),
  south: f('south'),
  west: f('west'),
  north: f('north'),
});

const teachingOf = (d: DirectionName) => {
  const entry = DIRECTIONS.find((x) => x.name === d);
  return entry ? `${entry.season}: ${entry.teachings.join(', ')}` : '';
};

const CEREMONY_PHASE_OF: Record<DirectionName, CeremonyPhase> = {
  east: CEREMONY_PHASES[0],
  south: CEREMONY_PHASES[1],
  west: CEREMONY_PHASES[2],
  north: CEREMONY_PHASES[3],
};

export const DIRECTION_VOCABULARIES: Readonly<Record<DirectionVocabularyId, DirectionVocabulary>> = {
  'life-cycle-teachings': {
    id: 'life-cycle-teachings',
    title: 'Life-cycle teachings: seasons, life stages, teachings, medicines',
    meanings: byDirection(teachingOf),
    usedBy: [
      'src/ontology-core DIRECTIONS (with OJIBWE_NAMES, DIRECTION_SEASONS)',
      'rispecs/CYCLES.md',
      'mcp/src/tools east, south, west, north',
    ],
    provenance: {
      source: null,
      steward: null,
      status: 'unattributed',
      note: `${UNATTRIBUTED} Carries Ojibwe direction names, whose spellings and source are an open question (miadisabelle/forgewright#13).`,
    },
  },
  'rsis-focus': {
    id: 'rsis-focus',
    title: 'RSIS focus labels: what a direction asks of working sessions',
    meanings: byDirection((d) => DIRECTION_INFO[d].focus),
    usedBy: [
      'src/ontology-core DIRECTION_INFO',
      'src/ontology-core INFRA_ENTITY_BINDING and ACADEMIC_ENTITY_BINDING rationales',
    ],
    provenance: { source: null, steward: null, status: 'unattributed', note: UNATTRIBUTED },
  },
  'ceremony-phases': {
    id: 'ceremony-phases',
    title: 'RSIS ceremony phases: opening, council, integration, closure',
    meanings: byDirection((d) => CEREMONY_PHASE_DESCRIPTIONS[CEREMONY_PHASE_OF[d]]),
    phases: CEREMONY_PHASE_OF,
    usedBy: ['src/ceremony-protocol', 'rispecs/ceremony-protocol.spec.md'],
    provenance: { source: null, steward: null, status: 'unattributed', note: UNATTRIBUTED },
  },
  'narrative-cadence': {
    id: 'narrative-cadence',
    title: 'Narrative cadence: opening, deepening, integrating, closing',
    meanings: {
      east: 'Opening: the beat that begins a cycle',
      south: 'Deepening',
      west: 'Integrating',
      north: 'Closing',
    },
    phases: { east: 'opening', south: 'deepening', west: 'integrating', north: 'closing' },
    usedBy: ['src/narrative-engine cadence.ts (directionToPhase, phaseToDirection)', 'rispecs/narrative-engine.spec.md'],
    provenance: {
      source: null,
      steward: null,
      status: 'unattributed',
      note: `${UNATTRIBUTED} Places integrating in the west, where rsis-focus places integration in the north (#113).`,
    },
  },
  decomposition: {
    id: 'decomposition',
    title: 'Prompt decomposition: vision, analysis, validation, action',
    meanings: { east: 'Vision', south: 'Analysis', west: 'Validation', north: 'Action' },
    usedBy: ['src/prompt-decomposition storage.ts', 'cli/skills.ts', 'rispecs/prompt-decomposition.spec.md'],
    provenance: { source: null, steward: null, status: 'unattributed', note: UNATTRIBUTED },
  },
};

export const DIRECTION_VOCABULARY_IDS = Object.keys(DIRECTION_VOCABULARIES) as DirectionVocabularyId[];

/** What `direction` means in the named vocabulary. There is no default vocabulary. */
export function directionMeaning(vocabulary: DirectionVocabularyId, direction: DirectionName): string {
  return DIRECTION_VOCABULARIES[vocabulary].meanings[direction];
}
