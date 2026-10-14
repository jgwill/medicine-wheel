/**
 * The wheel's event log — what happened, kept beside the store (#164).
 *
 * The store keeps each record's latest state: a cycle amended twice is one
 * line in `cycles.jsonl`, and the moment it was opened exists nowhere once it
 * has passed. This log keeps those moments. Each write a route commits leaves
 * one line in `events.jsonl` beside the store (`MW_EVENTS_FILE` overrides), in
 * the shape of jgwill/Miadi's `MiadiEventEnvelope` (rispecs/events/
 * 00-miadi-event-spine.rispec.md, 0.1.0), so that the broker Episode 548 is
 * choosing can carry them without renaming anything.
 *
 * Nothing leaves the machine. Every line is an event that has been named and
 * not yet sent; a publisher with its own cursor is a later step, and the log
 * stays the same when it arrives.
 *
 * What the log promises:
 * - **Fixed at write time.** `id` and `idempotency_key` are set when the line
 *   is written; a resend reads the same line back.
 * - **References, not words.** A payload names records and carries labels —
 *   direction, type, ids. A cycle's question, a beat's title and prose, a
 *   diary entry's text stay in the wheel; a consumer with the authority to
 *   read them reads the record back, as the Honcho river does.
 * - **Append only.** Never rewritten, never emptied. Delivery state will live
 *   beside it, one cursor per consumer, not inside it.
 * - **Never the caller's error.** A line that cannot be written is reported
 *   once on stderr with the record's id; the write it describes stands.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import { resolveProjectDataDir } from '@/lib/jsonl-store';

export const EVENT_SCHEMA_VERSION = '0.1.0';
export const EVENT_NAMESPACE = 'medicine-wheel';

export const WHEEL_EVENTS = [
  'cycle.opened',
  'cycle.amended',
  'cycle.archived',
  'beat.recorded',
  'beat.amended',
  'beat.witnessed',
  'ceremony.opened',
  'ceremony.closed',
  'ceremony.amended',
  'diary.written',
  'diary.amended',
] as const;

export type WheelEventName = (typeof WHEEL_EVENTS)[number];

export type WheelSubjectKind = 'cycle' | 'beat' | 'ceremony' | 'diary';

/** One line of the log: a `MiadiEventEnvelope` whose source is this wheel. */
export interface WheelEvent {
  id: string;
  schema_version: string;
  /** Namespaced: `medicine-wheel.cycle.opened`. */
  event_type: string;
  source: { kind: 'miadi'; system: typeof EVENT_NAMESPACE; instance?: string };
  subject: { kind: WheelSubjectKind; id: string };
  /** The wheel commits what it reports, so the two times are the same moment. */
  occurred_at: string;
  observed_at: string;
  actor?: { kind: string; id?: string };
  correlation_id?: string;
  idempotency_key: string;
  privacy: { classification: string; content_included: boolean };
  payload: Record<string, unknown>;
}

export interface WheelEventInput {
  name: WheelEventName;
  subject: { kind: WheelSubjectKind; id: string };
  payload?: Record<string, unknown>;
  actor?: { kind: string; id?: string };
  correlation_id?: string;
  /** The wheel that observed it — the host the request reached. */
  instance?: string;
}

/** Where the log lives: `MW_EVENTS_FILE`, else beside the wheel's JSONL store. */
export function eventLogFile(): string {
  return process.env.MW_EVENTS_FILE || path.join(resolveProjectDataDir(), 'events.jsonl');
}

/** The host a request reached, named as the event's `source.instance`. */
export function instanceOf(request: Request): string | undefined {
  try {
    return new URL(request.url).host || undefined;
  } catch {
    return undefined;
  }
}

/** Drops keys whose value is undefined, so a payload says only what is known. */
function defined(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
}

/** The envelope for one occurrence. Pure: the same input and moment give the same line, bar the id. */
export function buildEvent(input: WheelEventInput, now: Date = new Date()): WheelEvent {
  const at = now.toISOString();
  const id = `mwev:${now.getTime()}:${randomBytes(4).toString('hex')}`;
  return {
    id,
    schema_version: EVENT_SCHEMA_VERSION,
    event_type: `${EVENT_NAMESPACE}.${input.name}`,
    source: { kind: 'miadi', system: EVENT_NAMESPACE, ...(input.instance ? { instance: input.instance } : {}) },
    subject: input.subject,
    occurred_at: at,
    observed_at: at,
    ...(input.actor?.id ? { actor: input.actor } : {}),
    ...(input.correlation_id ? { correlation_id: input.correlation_id } : {}),
    idempotency_key: id,
    privacy: { classification: 'internal', content_included: false },
    payload: defined(input.payload ?? {}),
  };
}

/**
 * Append one event. Returns it, or `undefined` when the line could not be
 * written — reported on stderr, never thrown: the record it describes is
 * already stored, and the caller's answer does not depend on the log.
 */
export function recordEvent(input: WheelEventInput): WheelEvent | undefined {
  const event = buildEvent(input);
  const file = eventLogFile();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // A line torn by a crash must not swallow the next one: start on a fresh
    // line when the file does not end with one.
    let lead = '';
    try {
      const fd = fs.openSync(file, 'r');
      try {
        const { size } = fs.fstatSync(fd);
        if (size > 0) {
          const last = Buffer.alloc(1);
          fs.readSync(fd, last, 0, 1, size - 1);
          if (last[0] !== 0x0a) lead = '\n';
        }
      } finally {
        fs.closeSync(fd);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    fs.appendFileSync(file, `${lead}${JSON.stringify(event)}\n`);
    return event;
  } catch (error) {
    console.error(
      `[events] ${event.event_type} for ${input.subject.kind} ${input.subject.id} was not written to ${file}: ${(error as Error)?.message ?? String(error)}`,
    );
    return undefined;
  }
}

function isWheelEvent(value: unknown): value is WheelEvent {
  const v = value as Partial<WheelEvent> | null;
  return !!v && typeof v === 'object'
    && typeof v.id === 'string' && typeof v.event_type === 'string' && typeof v.observed_at === 'string'
    && !!v.subject && typeof v.subject.id === 'string';
}

/** Every event, oldest first. A torn or foreign line is skipped, not fatal. */
export function readEvents(): WheelEvent[] {
  let text: string;
  try {
    text = fs.readFileSync(eventLogFile(), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const events: WheelEvent[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (isWheelEvent(parsed)) events.push(parsed);
    } catch {
      // torn line
    }
  }
  return events;
}

export interface EventFilter {
  /** `cycle.opened` or `medicine-wheel.cycle.opened`; a trailing dot (`cycle.`) matches the family. */
  type?: string;
  /** The subject's id. */
  subject?: string;
  /** Only events observed after this ISO time. */
  since?: string;
}

function typeMatches(eventType: string, wanted: string): boolean {
  const full = wanted.startsWith(`${EVENT_NAMESPACE}.`) ? wanted : `${EVENT_NAMESPACE}.${wanted}`;
  return full.endsWith('.') ? eventType.startsWith(full) : eventType === full;
}

/** Events matching the filter, oldest first. */
export function filterEvents(events: WheelEvent[], filter: EventFilter): WheelEvent[] {
  const since = filter.since ? Date.parse(filter.since) : NaN;
  return events.filter((e) =>
    (!filter.type || typeMatches(e.event_type, filter.type))
    && (!filter.subject || e.subject.id === filter.subject)
    && (Number.isNaN(since) || Date.parse(e.observed_at) > since));
}

/** What `/api/health` reports: how many events the log holds and when the last was written. */
export function eventLogStatus(): { count: number; last_at?: string } | { error: string } {
  try {
    const events = readEvents();
    const last = events[events.length - 1];
    return { count: events.length, ...(last ? { last_at: last.observed_at } : {}) };
  } catch (error) {
    return { error: (error as Error)?.message ?? String(error) };
  }
}

/**
 * The fields a write changed, among those it named. Compared as JSON, so an
 * array rewritten with the same members in the same order is no change.
 */
export function changedFields(before: object, after: object, keys: Iterable<string>): string[] {
  const was = before as Record<string, unknown>;
  const is = after as Record<string, unknown>;
  const changed: string[] = [];
  for (const key of new Set(keys)) {
    if (key === 'id') continue;
    if (JSON.stringify(was[key]) !== JSON.stringify(is[key])) changed.push(key);
  }
  return changed;
}

// ── shaping the domain's records ────────────────────────────────────────────

/** What a beat's author can change; `timestamp` and `act` follow from the write, not the author. */
export const BEAT_CONTENT_FIELDS = [
  'direction', 'title', 'description', 'prose', 'ceremonies', 'learnings', 'relations_honored',
  'cycle_id', 'parent_beat_id', 'sub_beats', 'speaker', 'witnesses',
] as const;

interface BeatLike {
  id: string;
  direction: string;
  act: number;
  ceremonies?: string[];
  cycle_id?: string;
  parent_beat_id?: string;
  speaker?: string;
  origin?: { producer?: string };
}

/**
 * Subject, correlation, actor and payload for a beat's event. A beat belongs
 * to its cycle, or, as a turn in a talking circle, to its ceremony. The title,
 * description, prose and learnings are the speaker's words and stay home.
 */
export function beatEventFields(beat: BeatLike): Pick<WheelEventInput, 'subject' | 'correlation_id' | 'actor'> & { payload: Record<string, unknown> } {
  const ceremonies = beat.ceremonies ?? [];
  return {
    subject: { kind: 'beat', id: beat.id },
    correlation_id: beat.cycle_id ?? ceremonies[0],
    ...(beat.speaker ? { actor: { kind: 'speaker', id: beat.speaker } } : {}),
    payload: {
      direction: beat.direction,
      act: beat.act,
      cycle_id: beat.cycle_id,
      parent_beat_id: beat.parent_beat_id,
      ceremonies: ceremonies.length ? ceremonies : undefined,
      origin: beat.origin?.producer,
    },
  };
}
