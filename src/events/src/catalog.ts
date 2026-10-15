/**
 * The events a Medicine Wheel writes — one entry per kind of occurrence.
 *
 * This catalog is the contract. The TypeScript payload types, the JSON Schema
 * (`schema/wheel-events.schema.json`) and the AsyncAPI document
 * (`schema/asyncapi.json`) are all derived from it, so a consumer reading any
 * of the three reads the same thing.
 *
 * A payload carries references and labels — ids, a direction, a type. It never
 * carries a person's words: a cycle's question, a beat's prose, a diary
 * entry's text stay in the wheel, and a consumer with the authority to read
 * them reads the record back by the subject's id.
 */

/** Version of this catalog. It moves when an event or a payload field is added or changed. */
export const CATALOG_VERSION = '0.2.0';

export type WheelSubjectKind = 'cycle' | 'beat' | 'ceremony' | 'diary' | 'node' | 'relation';

export interface PayloadField {
  type: 'string' | 'number' | 'boolean' | 'string[]';
  required?: true;
  description: string;
}

export interface EventDefinition {
  subject: WheelSubjectKind;
  /** What happened, in one sentence. */
  summary: string;
  /** Which write produces it. */
  writtenBy: string;
  /** What `correlation_id` groups, when the event carries one. */
  correlation?: string;
  payload: Record<string, PayloadField>;
}

// ── shared fields ───────────────────────────────────────────────────────────

const changed = { type: 'string[]', required: true, description: 'The fields the write changed. Metadata keys appear as `metadata.<key>`.' } as const;

const beatFields = {
  direction: { type: 'string', required: true, description: 'The direction the beat stands in.' },
  act: { type: 'number', required: true, description: 'The act, derived from the direction.' },
  cycle_id: { type: 'string', description: 'The research cycle the beat belongs to.' },
  parent_beat_id: { type: 'string', description: 'The beat this one was telescoped out of.' },
  ceremonies: { type: 'string[]', description: 'Ceremonies the beat was spoken in.' },
  origin: { type: 'string', description: 'Who or what put the beat on the wheel (`hand`, `rest`, `session-reader`, …).' },
} as const;

const ceremonyFields = {
  type: { type: 'string', required: true, description: 'The ceremony type (`talking_circle`, `closing`, …).' },
  direction: { type: 'string', required: true, description: 'The direction the ceremony is held in.' },
  circle_id: { type: 'string', description: 'The circle node the ceremony is held in.' },
  subject_id: { type: 'string', description: 'The node the ceremony gathers around (a review, a knowledge node).' },
  episode_path: { type: 'string', description: 'The chronicle episode folder the ceremony belongs to.' },
  episode_number: { type: 'number', description: 'That episode\'s number.' },
} as const;

const diaryFields = {
  phase: { type: 'string', required: true, description: 'The ceremonial phase the entry was written in.' },
  entry_type: { type: 'string', required: true, description: '`intention`, `observation`, `reflection`, …' },
  ceremony_id: { type: 'string', description: 'The ceremony the entry belongs to.' },
  chronicle: { type: 'string', description: 'The chronicle episode node the entry writes into.' },
  agent: { type: 'string', description: 'The agent that facilitated the entry.' },
} as const;

const nodeFields = {
  type: { type: 'string', required: true, description: 'The node type (`human`, `circle`, `knowledge`, `agent`, …).' },
  kind: { type: 'string', description: 'The node\'s `metadata.kind`, when it carries one.' },
  direction: { type: 'string', description: 'The node\'s direction, when it has one.' },
} as const;

const nodeKey = { type: { ...nodeFields.type }, kind: { ...nodeFields.kind } } as const;

const about = { type: 'string', required: true, description: 'The node the conclusion is about.' } as const;

const relationFields = {
  from_id: { type: 'string', required: true, description: 'The node the relation starts from.' },
  to_id: { type: 'string', required: true, description: 'The node the relation reaches.' },
  relationship_type: { type: 'string', required: true, description: 'What kind of relation it is.' },
} as const;

// ── the catalog ─────────────────────────────────────────────────────────────

export const WHEEL_EVENT_CATALOG = {
  'cycle.opened': {
    subject: 'cycle',
    summary: 'A research cycle was opened.',
    writtenBy: 'POST /api/narrative/cycles with a new id; MCP create_research_cycle',
    correlation: 'the cycle',
    payload: { current_direction: { type: 'string', required: true, description: 'The direction the cycle starts in.' } },
  },
  'cycle.amended': {
    subject: 'cycle',
    summary: 'A research cycle changed: its question, its direction, its counts.',
    writtenBy: 'POST /api/narrative/cycles with a known id; MCP update_cycle_direction. A cycle\'s beats list follows from beat.recorded and is not an amendment.',
    correlation: 'the cycle',
    payload: { changed, current_direction: { type: 'string', required: true, description: 'The direction the cycle now stands in.' } },
  },
  'cycle.archived': {
    subject: 'cycle',
    summary: 'A research cycle was archived for the seven generations.',
    writtenBy: 'POST /api/narrative/cycles with `archived: true`; MCP archive_for_seven_generations',
    correlation: 'the cycle',
    payload: {},
  },
  'beat.recorded': {
    subject: 'beat',
    summary: 'A narrative beat was recorded — in a talking circle, a turn was spoken.',
    writtenBy: 'POST /api/narrative/beats with a new id; MCP create_narrative_beat, create_sub_beats',
    correlation: 'the beat\'s cycle, else its first ceremony',
    payload: { ...beatFields },
  },
  'beat.amended': {
    subject: 'beat',
    summary: 'A narrative beat was rewritten.',
    writtenBy: 'POST /api/narrative/beats with a known id',
    correlation: 'the beat\'s cycle, else its first ceremony',
    payload: { ...beatFields, changed },
  },
  'beat.witnessed': {
    subject: 'beat',
    summary: 'A beat gained a witness, or its speaker was named.',
    writtenBy: 'PATCH /api/narrative/beats/{id}',
    correlation: 'the beat\'s cycle, else its first ceremony',
    payload: {
      added_witnesses: { type: 'string[]', description: 'Witnesses added by this write.' },
      speaker: { type: 'string', description: 'The speaker this write named.' },
    },
  },
  'ceremony.opened': {
    subject: 'ceremony',
    summary: 'A ceremony was opened.',
    writtenBy: 'POST /api/ceremonies without `closes`; MCP log_ceremony, ceremony lifecycle tools',
    correlation: 'the ceremony',
    payload: { ...ceremonyFields },
  },
  'ceremony.closed': {
    subject: 'ceremony',
    summary: 'A ceremony was closed. The subject is the closing record; `closes` names the ceremony it closes.',
    writtenBy: 'POST /api/ceremonies with `closes`',
    correlation: 'the ceremony it closes',
    payload: { ...ceremonyFields, closes: { type: 'string', required: true, description: 'The ceremony this closing closes.' } },
  },
  'ceremony.amended': {
    subject: 'ceremony',
    summary: 'A ceremony record was written again under its id.',
    writtenBy: 'POST /api/ceremonies with a known id',
    correlation: 'the ceremony, or the one it closes',
    payload: { ...ceremonyFields, closes: { type: 'string', description: 'The ceremony this closing closes.' } },
  },
  'ceremony.removed': {
    subject: 'ceremony',
    summary: 'A ceremony record nobody entered was removed.',
    writtenBy: 'DELETE /api/ceremonies/{id}',
    correlation: 'the ceremony',
    payload: { type: { ...ceremonyFields.type }, direction: { ...ceremonyFields.direction } },
  },
  'diary.written': {
    subject: 'diary',
    summary: 'A participant wrote a diary entry.',
    writtenBy: 'POST /api/diary with a new id',
    correlation: 'the entry\'s ceremony',
    payload: { ...diaryFields },
  },
  'diary.amended': {
    subject: 'diary',
    summary: 'A diary entry was written again under its id.',
    writtenBy: 'POST /api/diary with a known id',
    correlation: 'the entry\'s ceremony',
    payload: { ...diaryFields },
  },
  'diary.removed': {
    subject: 'diary',
    summary: 'A diary entry was removed.',
    writtenBy: 'DELETE /api/diary/{id}',
    correlation: 'the entry\'s ceremony',
    payload: { phase: { ...diaryFields.phase }, entry_type: { ...diaryFields.entry_type } },
  },
  'circle.created': {
    subject: 'node',
    summary: 'A circle was created.',
    writtenBy: 'POST /api/nodes with `type: circle`',
    correlation: 'the circle',
    payload: { ...nodeFields },
  },
  'circle.amended': {
    subject: 'node',
    summary: 'A circle changed: its name, its description, its metadata.',
    writtenBy: 'PATCH /api/nodes/{id}; POST /api/nodes with a known id',
    correlation: 'the circle',
    payload: { ...nodeKey, changed },
  },
  'circle.removed': {
    subject: 'node',
    summary: 'A circle was removed.',
    writtenBy: 'DELETE /api/nodes/{id}',
    correlation: 'the circle',
    payload: { ...nodeKey },
  },
  'chronicle.episode.registered': {
    subject: 'node',
    summary: 'A chronicle episode was registered on the wheel.',
    writtenBy: 'POST /api/nodes with `metadata.kind: chronicle_episode` (mkepisode)',
    correlation: 'the episode node',
    payload: { ...nodeFields },
  },
  'chronicle.episode.amended': {
    subject: 'node',
    summary: 'A chronicle episode\'s card changed.',
    writtenBy: 'PATCH /api/nodes/{id}; POST /api/nodes with a known id',
    correlation: 'the episode node',
    payload: { ...nodeKey, changed },
  },
  'chronicle.episode.removed': {
    subject: 'node',
    summary: 'A chronicle episode\'s card was removed.',
    writtenBy: 'DELETE /api/nodes/{id}',
    correlation: 'the episode node',
    payload: { ...nodeKey },
  },
  'memory.conclusion.recorded': {
    subject: 'node',
    summary: 'The memory returned a conclusion about someone to the wheel.',
    writtenBy: 'POST /api/memory/conclusions',
    correlation: 'the node the conclusion is about',
    payload: {
      ...nodeKey,
      about,
      conclusion_kind: { type: 'string', description: '`pattern`, `summary`, `open_question`, `preference`.' },
      status: { type: 'string', description: '`inferred`, `confirmed`, `rejected`.' },
    },
  },
  'memory.conclusion.judged': {
    subject: 'node',
    summary: 'A person confirmed or rejected a conclusion.',
    writtenBy: 'PATCH /api/memory/conclusions/{id}',
    correlation: 'the node the conclusion is about',
    payload: {
      about,
      status: { type: 'string', required: true, description: '`inferred`, `confirmed`, `rejected`.' },
      judged_by: { type: 'string', required: true, description: 'Who judged it.' },
    },
  },
  'memory.conclusion.amended': {
    subject: 'node',
    summary: 'A conclusion\'s node changed by another door than judging.',
    writtenBy: 'PATCH /api/nodes/{id}',
    correlation: 'the node the conclusion is about',
    payload: { ...nodeKey, about: { ...about }, changed },
  },
  'memory.conclusion.removed': {
    subject: 'node',
    summary: 'A conclusion was removed.',
    writtenBy: 'DELETE /api/nodes/{id}',
    correlation: 'the node the conclusion is about',
    payload: { ...nodeKey, about: { ...about } },
  },
  'node.created': {
    subject: 'node',
    summary: 'A relational node was created — a person, a place, a teaching, an agent.',
    writtenBy: 'POST /api/nodes; MCP create_relational_node and the tools that make nodes',
    payload: { ...nodeFields },
  },
  'node.amended': {
    subject: 'node',
    summary: 'A relational node changed.',
    writtenBy: 'PATCH /api/nodes/{id}; POST /api/nodes with a known id',
    payload: { ...nodeKey, changed },
  },
  'node.removed': {
    subject: 'node',
    summary: 'A relational node was removed.',
    writtenBy: 'DELETE /api/nodes/{id}',
    payload: { ...nodeKey },
  },
  'relation.made': {
    subject: 'relation',
    summary: 'A relation was woven between two nodes.',
    writtenBy: 'POST /api/edges; MCP create_relational_edge',
    correlation: 'the node the relation starts from',
    payload: { ...relationFields },
  },
  'relation.amended': {
    subject: 'relation',
    summary: 'A relation changed: its strength, its obligations, the ceremony that honoured it.',
    writtenBy: 'PATCH /api/edges; POST /api/edges over an existing pair',
    correlation: 'the node the relation starts from',
    payload: { ...relationFields, changed },
  },
  'relation.removed': {
    subject: 'relation',
    summary: 'A relation was released.',
    writtenBy: 'DELETE /api/edges',
    correlation: 'the node the relation starts from',
    payload: { ...relationFields, relationship_type: { type: 'string', description: 'What kind of relation it was.' } },
  },
} as const satisfies Record<string, EventDefinition>;

export type WheelEventName = keyof typeof WHEEL_EVENT_CATALOG;

/** Every event name, in catalog order. */
export const WHEEL_EVENTS = Object.keys(WHEEL_EVENT_CATALOG) as WheelEventName[];

/** The family an event belongs to: `cycle`, `beat`, `chronicle.episode`, … */
export function familyOf(name: string): string {
  return name.slice(0, name.lastIndexOf('.'));
}

// ── payload types, derived ──────────────────────────────────────────────────

type TsOf<F> = F extends { type: 'string[]' } ? string[]
  : F extends { type: 'number' } ? number
  : F extends { type: 'boolean' } ? boolean
  : string;

type FieldsOf<N extends WheelEventName> = (typeof WHEEL_EVENT_CATALOG)[N]['payload'];

type Simplify<T> = { [K in keyof T]: T[K] };

/** The payload an event of this name carries. */
export type PayloadOf<N extends WheelEventName> = Simplify<
  { [K in keyof FieldsOf<N> as FieldsOf<N>[K] extends { required: true } ? K : never]: TsOf<FieldsOf<N>[K]> } &
  { [K in keyof FieldsOf<N> as FieldsOf<N>[K] extends { required: true } ? never : K]?: TsOf<FieldsOf<N>[K]> }
>;
