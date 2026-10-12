/**
 * Medicine Wheel Session Reader — the binding line
 *
 * One JSON line per session event, appended by the capture to
 * `<sessiondata>/data/terminal_bindings.jsonl` (all sessions) and to
 * `<sessiondata>/<session id>/_terminal_binding.jsonl` (one session). It says
 * which terminal held a session, under which name, for which team and
 * episode, and when. It is the only capture file whose lines carry a time.
 *
 * Until this module the line had no schema and eight readers, each folding it
 * its own way. The fold here is the one `@miadi/hooks-interpreter` arrived at
 * (newest line wins field by field, a late older line never rolls a value back,
 * a `declared` episode binds nothing), with one change: whether a session has
 * ended is decided by its last start or end line, so a later rename or
 * observation line does not reopen it.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

/** The events the capture writes. */
export type BindingEvent =
  | 'session.start'
  | 'session.end'
  | 'session.rename'
  | 'session.observed'
  | 'session.mission';

/** Where an episode on the line came from. `declared` is a shell-wide default and binds nothing. */
export type EpisodeSource = 'add-dir' | 'cwd' | 'declared';

export interface BindingName {
  name?: string;
  /** `user` for a /rename, `auto`, `last-known` at an end when the live record is gone… */
  source?: string;
  /** Epoch milliseconds since the name was given. */
  since?: number | null;
  former?: string[];
}

export interface BindingTmux {
  session?: string;
  window?: number;
  pane?: number;
  pane_id?: string;
  socket?: string;
}

export interface BindingLabel {
  id?: string;
  source?: string;
}

export interface BindingMission {
  id?: string;
  prompt?: string | null;
  name?: string | null;
  version?: number | null;
  sha256?: string | null;
  trace?: string | null;
  episode?: string | null;
  source?: string;
  note?: string;
}

/** One binding line, as the capture writes it. Every field but `session_id` and `at` can be missing. */
export interface BindingLine {
  /** ISO time the line was written. */
  at?: string;
  event?: BindingEvent | string;
  /** For a start: `startup`, `resume`, `clear`, `compact`. For an end: the end reason. */
  source?: string;
  /** The engine: `claude`, `hermes`, `gemini`, `codex`… */
  agent?: string;
  session_id?: string;
  cwd?: string;
  transcript_path?: string;
  host?: string;
  pid?: number | null;
  /** The command line that started the agent. `-p` or `--print` marks a headless run. */
  argv?: string[];
  launch_alias?: string;
  name?: BindingName | null;
  tmux?: BindingTmux | null;
  team?: BindingLabel | null;
  episode?: (BindingLabel & { source?: EpisodeSource | string }) | null;
  mission?: BindingMission | null;
  [key: string]: unknown;
}

/**
 * JSON Schema (2020-12) for one binding line. Open: the capture may add
 * fields, and a reader keeps what it does not know.
 */
export const BINDING_LINE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://medicine-wheel.dev/schemas/session-binding-line.schema.json',
  title: 'Session binding line',
  type: 'object',
  required: ['at', 'event', 'session_id'],
  properties: {
    at: { type: 'string', format: 'date-time' },
    event: { type: 'string', examples: ['session.start', 'session.end', 'session.rename', 'session.observed', 'session.mission'] },
    source: { type: 'string' },
    agent: { type: 'string' },
    session_id: { type: 'string', minLength: 1 },
    cwd: { type: 'string' },
    transcript_path: { type: 'string' },
    host: { type: 'string' },
    pid: { type: ['integer', 'null'] },
    argv: { type: 'array', items: { type: 'string' } },
    launch_alias: { type: 'string' },
    name: {
      type: ['object', 'null'],
      properties: {
        name: { type: 'string' },
        source: { type: 'string' },
        since: { type: ['number', 'null'] },
        former: { type: 'array', items: { type: 'string' } },
      },
    },
    tmux: {
      type: ['object', 'null'],
      properties: {
        session: { type: 'string' },
        window: { type: 'integer' },
        pane: { type: 'integer' },
        pane_id: { type: 'string' },
        socket: { type: 'string' },
      },
    },
    team: { type: ['object', 'null'], properties: { id: { type: 'string' }, source: { type: 'string' } } },
    episode: {
      type: ['object', 'null'],
      properties: { id: { type: 'string' }, source: { type: 'string', examples: ['add-dir', 'cwd', 'declared'] } },
    },
    mission: { type: ['object', 'null'] },
  },
  additionalProperties: true,
} as const;

/** What the binding lines say about one session, folded. */
export interface SessionIdentity {
  session_id: string;
  agent?: string;
  host?: string;
  /** The newest name. */
  name?: string;
  /** Every earlier name, oldest first. */
  former_names: string[];
  /** `session:window.pane` of the newest line that carried a pane. */
  tmux?: string;
  pane_id?: string;
  /** When that pane was recorded. */
  pane_at?: string;
  team?: { id: string; source?: string };
  /** The newest episode the session worked in. A `declared` episode never counts. */
  episode?: { id: string; source?: string };
  /** Every episode it worked in, in the order first seen. */
  episodes: string[];
  launch_alias?: string;
  mission?: BindingMission;
  cwd?: string;
  transcript_path?: string;
  /** Started with `-p` or `--print`: a headless run, not a seat someone talks to. */
  headless: boolean;
  first_seen: string;
  last_seen: string;
  last_event: string;
  /** Start lines: the first start, resumes, clears, compactions. */
  starts: number;
  /** Its last start or end line is an end. */
  ended: boolean;
  /** The time of that end, when ended. */
  ended_at?: string;
  events: number;
}

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Parse binding lines. A torn line, written while the capture appends, is skipped. */
export function parseBindingLines(jsonl: string): BindingLine[] {
  const out: BindingLine[] = [];
  for (const line of jsonl.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const value = JSON.parse(trimmed);
      if (value && typeof value === 'object' && !Array.isArray(value)) out.push(value as BindingLine);
    } catch { /* torn line */ }
  }
  return out;
}

/** `<root>/data/terminal_bindings.jsonl`, the lines of every session. */
export function bindingLinesPath(root: string): string {
  return path.join(root, 'data', 'terminal_bindings.jsonl');
}

/** Read every session's binding lines under `root`. Empty when the file is absent. */
export async function readBindingLines(root: string): Promise<BindingLine[]> {
  try { return parseBindingLines(await fs.readFile(bindingLinesPath(root), 'utf-8')); }
  catch { return []; }
}

function label(v: unknown): { id: string; source?: string } | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const r = v as Record<string, unknown>;
  const id = text(r.id);
  if (!id) return undefined;
  const source = text(r.source);
  return source ? { id, source } : { id };
}

function paneOf(v: unknown): { tmux?: string; pane_id?: string } {
  if (!v || typeof v !== 'object') return {};
  const r = v as Record<string, unknown>;
  const session = text(r.session);
  const window = typeof r.window === 'number' ? r.window : undefined;
  const pane = typeof r.pane === 'number' ? r.pane : undefined;
  return {
    ...(session ? { tmux: `${session}${window !== undefined ? `:${window}` : ''}${pane !== undefined ? `.${pane}` : ''}` } : {}),
    ...(text(r.pane_id) ? { pane_id: text(r.pane_id) } : {}),
  };
}

function isHeadless(argv: unknown): boolean {
  return Array.isArray(argv) && argv.some((a) => a === '-p' || a === '--print');
}

function fold(current: SessionIdentity | undefined, line: BindingLine, id: string, at: string, lastStartOrEnd: string | undefined): SessionIdentity {
  const event = text(line.event) ?? 'unknown';
  const newest = !current || at >= current.last_seen;
  const pick = <T>(incoming: T | undefined, held: T | undefined): T | undefined =>
    incoming === undefined ? held : held === undefined || newest ? incoming : held;

  const pane = paneOf(line.tmux);
  const takePane = (pane.tmux !== undefined || pane.pane_id !== undefined) && (!current?.pane_at || at >= current.pane_at);

  const ep = label(line.episode);
  const worked = ep && ep.source !== 'declared' ? ep : undefined;
  const episodes = current ? current.episodes : [];

  const lineName = line.name && typeof line.name === 'object' ? text(line.name.name) : undefined;
  const formerOnLine = line.name && typeof line.name === 'object' && Array.isArray(line.name.former)
    ? line.name.former.filter((n): n is string => typeof n === 'string' && !!n.trim())
    : [];
  const name = pick(lineName, current?.name);
  const former = [...(current?.former_names ?? [])];
  for (const n of [...formerOnLine, ...(current?.name && name !== current.name ? [current.name] : [])]) {
    if (n !== name && !former.includes(n)) former.push(n);
  }

  // Ended is decided by the newest start or end line only.
  let ended = current?.ended ?? false;
  let ended_at = current?.ended_at;
  if ((event === 'session.start' || event === 'session.end') && (!lastStartOrEnd || at >= lastStartOrEnd)) {
    ended = event === 'session.end';
    ended_at = ended ? at : undefined;
  }

  return {
    session_id: id,
    agent: pick(text(line.agent), current?.agent),
    host: pick(text(line.host), current?.host),
    name,
    former_names: former,
    tmux: takePane ? pane.tmux : current?.tmux,
    pane_id: takePane ? pane.pane_id : current?.pane_id,
    pane_at: takePane ? at : current?.pane_at,
    team: pick(label(line.team), current?.team),
    episode: pick(worked, current?.episode),
    episodes: worked && !episodes.includes(worked.id) ? [...episodes, worked.id] : episodes,
    launch_alias: pick(text(line.launch_alias), current?.launch_alias),
    mission: pick(line.mission && typeof line.mission === 'object' && text(line.mission.id) ? line.mission : undefined, current?.mission),
    cwd: pick(text(line.cwd), current?.cwd),
    transcript_path: pick(text(line.transcript_path), current?.transcript_path),
    headless: (current?.headless ?? false) || isHeadless(line.argv),
    first_seen: current && current.first_seen < at ? current.first_seen : at,
    last_seen: newest ? at : current!.last_seen,
    last_event: newest ? event : current!.last_event,
    starts: (current?.starts ?? 0) + (event === 'session.start' ? 1 : 0),
    ended,
    ended_at,
    events: (current?.events ?? 0) + 1,
  };
}

/**
 * Fold binding lines into one identity per session id. Lines without a
 * session id or a time are skipped. `keep` filters lines before folding.
 */
export function foldBindingLines(
  lines: readonly BindingLine[],
  keep: (line: BindingLine) => boolean = () => true,
): Map<string, SessionIdentity> {
  const byId = new Map<string, SessionIdentity>();
  const lastStartOrEnd = new Map<string, string>();
  for (const line of lines) {
    if (!keep(line)) continue;
    const id = text(line.session_id);
    const at = text(line.at);
    if (!id || !at) continue;
    const seen = lastStartOrEnd.get(id);
    byId.set(id, fold(byId.get(id), line, id, at, seen));
    if ((line.event === 'session.start' || line.event === 'session.end') && (!seen || at >= seen)) lastStartOrEnd.set(id, at);
  }
  return byId;
}

/** Every session's identity, oldest first sighting first. */
export function sessionIdentities(lines: readonly BindingLine[]): SessionIdentity[] {
  return [...foldBindingLines(lines).values()].sort((a, b) => (a.first_seen < b.first_seen ? -1 : a.first_seen > b.first_seen ? 1 : 0));
}

/** The sessions that worked in one episode folder. A `declared` episode never binds a session. */
export function sessionsOfEpisode(lines: readonly BindingLine[], episodeFolder: string): SessionIdentity[] {
  return sessionIdentities(lines).filter((s) => s.episodes.includes(episodeFolder));
}
