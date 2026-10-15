/**
 * Which event a write is — decided once, for every writer.
 *
 * The server's routes and the MCP server's local store both commit writes.
 * Each hands these functions what the record was before and what it is after,
 * and gets back the event to record, or `null` when the write changed nothing
 * worth an event. One decision, so the same act leaves the same line whichever
 * door it came through.
 *
 * Inputs are structural: any record with the named fields will do, so the
 * package depends on no other wheel package.
 */

import type { WheelEventInput } from './envelope';
import type { WheelEventName } from './catalog';

type Rec = Record<string, unknown>;

/**
 * The fields a write changed, among the keys given. Compared as JSON, so an
 * array rewritten with the same members in the same order is no change.
 */
export function changedFields(before: object, after: object, keys: Iterable<string>): string[] {
  const was = before as Rec;
  const is = after as Rec;
  const changed: string[] = [];
  for (const key of new Set(keys)) {
    if (key === 'id') continue;
    if (JSON.stringify(was[key]) !== JSON.stringify(is[key])) changed.push(key);
  }
  return changed;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const strs = (v: unknown): string[] | undefined =>
  Array.isArray(v) && v.length ? v.filter((x): x is string => typeof x === 'string') : undefined;

// ── cycles ──────────────────────────────────────────────────────────────────

export interface CycleLike { id: string; current_direction?: string; archived?: boolean }

/**
 * A cycle's `beats` list is bound by recording a beat in it; `beat.recorded`
 * already says so, with the cycle as its correlation. Rewriting that list is
 * not an amendment of the cycle.
 */
const CYCLE_BOUND_FIELDS = new Set(['beats']);

export function cycleWritten(before: CycleLike | undefined | null, after: CycleLike, keys: Iterable<string>): WheelEventInput | null {
  const subject = { kind: 'cycle' as const, id: after.id };
  if (!before) {
    return { name: 'cycle.opened', subject, correlation_id: after.id, payload: { current_direction: str(after.current_direction) ?? 'east' } };
  }
  if (!before.archived && after.archived === true) {
    return { name: 'cycle.archived', subject, correlation_id: after.id };
  }
  const changed = changedFields(before, after, [...keys].filter((k) => !CYCLE_BOUND_FIELDS.has(k)));
  if (!changed.length) return null;
  return { name: 'cycle.amended', subject, correlation_id: after.id, payload: { changed, current_direction: str(after.current_direction) ?? 'east' } };
}

// ── beats ───────────────────────────────────────────────────────────────────

export interface BeatLike {
  id: string;
  direction: string;
  act: number;
  ceremonies?: string[];
  cycle_id?: string;
  parent_beat_id?: string;
  speaker?: string;
  witnesses?: string[];
  origin?: { producer?: string };
}

/**
 * What a beat's author changes. `timestamp` and `act` follow from the write;
 * `sub_beats` is bound by recording the child, which `beat.recorded` already
 * says. `witnesses` and `speaker` move through `beat.witnessed`.
 */
export const BEAT_CONTENT_FIELDS = [
  'direction', 'title', 'description', 'prose', 'ceremonies', 'learnings', 'relations_honored',
  'cycle_id', 'parent_beat_id', 'speaker', 'witnesses',
] as const;

/** A beat belongs to its cycle, or, as a turn in a talking circle, to its first ceremony. */
function beatFrame(beat: BeatLike) {
  const ceremonies = strs(beat.ceremonies);
  return {
    subject: { kind: 'beat' as const, id: beat.id },
    correlation_id: str(beat.cycle_id) ?? ceremonies?.[0],
    ...(str(beat.speaker) ? { actor: { kind: 'speaker', id: beat.speaker } } : {}),
    payload: {
      direction: beat.direction,
      act: beat.act,
      cycle_id: str(beat.cycle_id),
      parent_beat_id: str(beat.parent_beat_id),
      ceremonies,
      origin: str(beat.origin?.producer),
    },
  };
}

export function beatWritten(before: BeatLike | undefined | null, after: BeatLike): WheelEventInput | null {
  const frame = beatFrame(after);
  if (!before) return { name: 'beat.recorded', ...frame };
  const changed = changedFields(before, after, BEAT_CONTENT_FIELDS);
  if (!changed.length) return null;
  return { name: 'beat.amended', ...frame, payload: { ...frame.payload, changed } };
}

/** A witness added or a speaker named. A name already witnessing, or the speaker restated, is nothing. */
export function beatWitnessed(before: BeatLike | undefined | null, after: BeatLike): WheelEventInput | null {
  const had = new Set(before?.witnesses ?? []);
  const added = (after.witnesses ?? []).filter((w) => !had.has(w));
  const speaker = after.speaker !== before?.speaker ? str(after.speaker) : undefined;
  if (!added.length && !speaker) return null;
  const frame = beatFrame(after);
  return { name: 'beat.witnessed', ...frame, payload: { added_witnesses: added.length ? added : undefined, speaker } };
}

// ── ceremonies ──────────────────────────────────────────────────────────────

export interface CeremonyLike {
  id: string;
  type: string;
  direction: string;
  closes?: string;
  circle_id?: string;
  subject_id?: string;
  episode_path?: string;
  episode_number?: number;
  source?: string;
}

function ceremonyPayload(c: CeremonyLike) {
  return {
    type: c.type,
    direction: c.direction,
    circle_id: str(c.circle_id),
    subject_id: str(c.subject_id),
    episode_path: str(c.episode_path),
    episode_number: num(c.episode_number),
  };
}

/** A closing names the ceremony it closes, and both share that ceremony's id as their correlation. */
export function ceremonyWritten(existed: boolean, c: CeremonyLike): WheelEventInput {
  const closes = str(c.closes);
  return {
    name: existed ? 'ceremony.amended' : closes ? 'ceremony.closed' : 'ceremony.opened',
    subject: { kind: 'ceremony', id: c.id },
    correlation_id: closes ?? c.id,
    ...(str(c.source) ? { actor: { kind: 'source', id: c.source } } : {}),
    payload: { ...ceremonyPayload(c), closes },
  };
}

export function ceremonyRemoved(c: CeremonyLike): WheelEventInput {
  return {
    name: 'ceremony.removed',
    subject: { kind: 'ceremony', id: c.id },
    correlation_id: str(c.closes) ?? c.id,
    payload: { type: c.type, direction: c.direction },
  };
}

// ── diary ───────────────────────────────────────────────────────────────────

export interface DiaryLike {
  id: string;
  participant?: string;
  phase: string;
  entryType: string;
  metadata?: Rec;
  chronicle?: string;
  agent?: string;
}

/** Who wrote, in which phase and ceremony — never what they wrote. */
export function diaryWritten(existed: boolean, entry: DiaryLike): WheelEventInput {
  const ceremonyId = str(entry.metadata?.ceremony_id);
  return {
    name: existed ? 'diary.amended' : 'diary.written',
    subject: { kind: 'diary', id: entry.id },
    correlation_id: ceremonyId,
    ...(str(entry.participant) ? { actor: { kind: 'participant', id: entry.participant } } : {}),
    payload: {
      phase: entry.phase,
      entry_type: entry.entryType,
      ceremony_id: ceremonyId,
      chronicle: str(entry.chronicle),
      agent: str(entry.agent),
    },
  };
}

export function diaryRemoved(entry: DiaryLike): WheelEventInput {
  return {
    name: 'diary.removed',
    subject: { kind: 'diary', id: entry.id },
    correlation_id: str(entry.metadata?.ceremony_id),
    payload: { phase: entry.phase, entry_type: entry.entryType },
  };
}

// ── nodes ───────────────────────────────────────────────────────────────────

export interface NodeLike {
  id: string;
  type: string;
  name?: string;
  description?: string;
  direction?: string;
  metadata?: Rec;
}

export type NodeFamily = 'circle' | 'chronicle.episode' | 'memory.conclusion' | 'node';

/** Circles, chronicle episodes and memory conclusions have their own events; every other node is a `node`. */
export function nodeFamily(node: NodeLike): NodeFamily {
  if (node.type === 'circle') return 'circle';
  const kind = node.metadata?.kind;
  if (kind === 'chronicle_episode') return 'chronicle.episode';
  if (kind === 'memory_projection') return 'memory.conclusion';
  return 'node';
}

const CREATED: Record<NodeFamily, WheelEventName> = {
  circle: 'circle.created',
  'chronicle.episode': 'chronicle.episode.registered',
  'memory.conclusion': 'memory.conclusion.recorded',
  node: 'node.created',
};

const NODE_FIELDS = ['name', 'type', 'description', 'direction'] as const;

/** Top-level fields that moved, then `metadata.<key>` for each metadata key that moved. */
export function nodeChanges(before: NodeLike, after: NodeLike): string[] {
  const changed = changedFields(before, after, NODE_FIELDS);
  const was = before.metadata ?? {};
  const is = after.metadata ?? {};
  for (const key of new Set([...Object.keys(was), ...Object.keys(is)])) {
    if (JSON.stringify(was[key]) !== JSON.stringify(is[key])) changed.push(`metadata.${key}`);
  }
  return changed;
}

function nodeFrame(node: NodeLike, family: NodeFamily) {
  const about = str(node.metadata?.about);
  return {
    subject: { kind: 'node' as const, id: node.id },
    correlation_id: family === 'node' ? undefined : family === 'memory.conclusion' ? about : node.id,
    key: { type: node.type, kind: str(node.metadata?.kind) },
    about,
  };
}

export function nodeWritten(before: NodeLike | undefined | null, after: NodeLike): WheelEventInput | null {
  const family = nodeFamily(after);
  const { subject, correlation_id, key, about } = nodeFrame(after, family);
  if (!before) {
    if (family === 'memory.conclusion') {
      return {
        name: 'memory.conclusion.recorded', subject, correlation_id,
        ...(str(after.metadata?.source) ? { actor: { kind: 'source', id: str(after.metadata?.source) } } : {}),
        payload: { ...key, about, conclusion_kind: str(after.metadata?.projection_kind), status: str(after.metadata?.status) },
      };
    }
    return { name: CREATED[family], subject, correlation_id, payload: { ...key, direction: str(after.direction) } };
  }
  const changed = nodeChanges(before, after);
  if (!changed.length) return null;
  return {
    name: `${family}.amended` as WheelEventName, subject, correlation_id,
    payload: { ...key, ...(family === 'memory.conclusion' ? { about } : {}), changed },
  };
}

export function nodeRemoved(node: NodeLike): WheelEventInput {
  const family = nodeFamily(node);
  const { subject, correlation_id, key, about } = nodeFrame(node, family);
  return {
    name: `${family}.removed` as WheelEventName, subject, correlation_id,
    payload: { ...key, ...(family === 'memory.conclusion' ? { about } : {}) },
  };
}

/** A person confirmed or rejected a conclusion. Restating the status it already had, by the same person, is nothing. */
export function conclusionJudged(before: NodeLike, after: NodeLike): WheelEventInput | null {
  const status = str(after.metadata?.status);
  const by = str(after.metadata?.judged_by);
  if (!status || !by) return null;
  if (status === str(before.metadata?.status) && by === str(before.metadata?.judged_by)) return null;
  const { subject, correlation_id, about } = nodeFrame(after, 'memory.conclusion');
  return {
    name: 'memory.conclusion.judged', subject, correlation_id,
    actor: { kind: 'judge', id: by },
    payload: { about, status, judged_by: by },
  };
}

// ── relations ───────────────────────────────────────────────────────────────

export interface RelationLike {
  from_id: string;
  to_id: string;
  relationship_type?: string;
  strength?: number;
  ceremony_honored?: boolean;
  ceremony_id?: string;
  obligations?: string[];
  description?: string;
}

const RELATION_FIELDS = ['relationship_type', 'strength', 'ceremony_honored', 'ceremony_id', 'obligations', 'description'] as const;

/** The nodes at either end of a relation, when the writer holds them. */
export interface RelationEnds {
  from?: NodeLike | null;
  to?: NodeLike | null;
}

/** A relation between two chronicle episodes is lineage: one continues from, or relates to, the other. */
export function isLineage(ends?: RelationEnds): boolean {
  return !!ends?.from && !!ends?.to
    && nodeFamily(ends.from) === 'chronicle.episode' && nodeFamily(ends.to) === 'chronicle.episode';
}

/** A relation is named by its two ends. */
export function relationId(r: { from_id: string; to_id: string }): string {
  return `${r.from_id}->${r.to_id}`;
}

/**
 * A relation's words (`description`) stay in the wheel — except between two
 * chronicle episodes, where they are the lineage sentence the episode
 * manifest already carries in the chronicle, and the event repeats them.
 */
function relationFrame(r: RelationLike, lineage: boolean) {
  return {
    subject: { kind: 'relation' as const, id: relationId(r) },
    correlation_id: r.from_id,
    payload: {
      from_id: r.from_id,
      to_id: r.to_id,
      relationship_type: str(r.relationship_type),
      ...(lineage ? { relation: str(r.description) } : {}),
    },
  };
}

export function relationWritten(before: RelationLike | undefined | null, after: RelationLike, ends?: RelationEnds): WheelEventInput | null {
  const lineage = isLineage(ends);
  const frame = relationFrame(after, lineage);
  if (!before) return { name: lineage ? 'chronicle.lineage.made' : 'relation.made', ...frame };
  const changed = changedFields(before, after, RELATION_FIELDS);
  if (!changed.length) return null;
  return { name: lineage ? 'chronicle.lineage.amended' : 'relation.amended', ...frame, payload: { ...frame.payload, changed } };
}

export function relationRemoved(r: RelationLike, ends?: RelationEnds): WheelEventInput {
  const lineage = isLineage(ends);
  return { name: lineage ? 'chronicle.lineage.removed' : 'relation.removed', ...relationFrame(r, lineage) };
}
