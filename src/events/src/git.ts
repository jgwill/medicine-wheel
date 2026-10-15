/**
 * The log carried by git — a way for events to travel before a broker does.
 *
 * Not a publisher: nothing here sends one event and waits for its receipt.
 * The wheel commits `events.jsonl` — that file and nothing else — in the data
 * repository it already lives in, and pushes. A follower anywhere that can
 * clone the repository pulls, and acts on the events it has not seen yet,
 * holding its own cursor. The history of the file is the history of what
 * happened; `git log -- events.jsonl` says when each batch travelled.
 *
 * Both sides only append, and neither ever rewrites or force-pushes: a push
 * that is refused is reported and tried again later, never forced. The wheel
 * pushes only its own commits — when the branch also holds a commit that
 * touches anything but the log, someone's work is waiting to be pushed by
 * them, and the carriage says so and leaves the push to a person.
 *
 * Node only — import it as `@medicine-wheel/events/git`.
 */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { shortName, type WheelEvent } from './envelope';
import { readEventLog } from './log';
import { drainLog, type DrainResult, type Publisher, type StateOptions } from './publish';

const run = promisify(execFile);

async function git(repo: string, args: string[], timeoutMs = 60_000): Promise<string> {
  const { stdout } = await run('git', ['-C', repo, ...args], { timeout: timeoutMs, maxBuffer: 512 * 1024 * 1024 });
  return stdout.trim();
}

const message = (error: unknown) => {
  const e = error as { stderr?: string; message?: string };
  return (e?.stderr?.trim() || e?.message || String(error)).split('\n').slice(-3).join(' ');
};

// ── the wheel's side ────────────────────────────────────────────────────────

export interface CommitOptions {
  /** Push after committing, and push a commit an earlier pass could not. */
  push?: boolean;
  /** Named in the commit subject: the wheel these events came from. */
  instance?: string;
  timeoutMs?: number;
}

export interface CommitResult {
  repo?: string;
  file: string;
  /** A commit was made on this pass. */
  committed: boolean;
  commit?: string;
  /** Events the commit added. */
  events: number;
  /** The branch was pushed on this pass. */
  pushed: boolean;
  /** Commits on the branch the remote does not have yet, after this pass. */
  unpushed?: number;
  /** Why a push that was asked for did not happen, when it is not an error. */
  held?: string;
  error?: string;
}

/** `cycle.opened ×2, beat.recorded` — what a batch holds, for the commit subject. */
function summarise(events: WheelEvent[]): string {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(shortName(e.event_type), (counts.get(shortName(e.event_type)) ?? 0) + 1);
  const parts = [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name));
  return parts.length > 3 ? `${parts.slice(0, 3).join(', ')}, …` : parts.join(', ');
}

/**
 * Commit the log file — only it, whatever else is changed or staged in the
 * repository — and push when asked. Never throws: a failure is the result's
 * `error`, and the next pass tries again.
 */
export async function commitEventLog(logFile: string, options: CommitOptions = {}): Promise<CommitResult> {
  const result: CommitResult = { file: logFile, committed: false, events: 0, pushed: false };
  const timeout = options.timeoutMs ?? 60_000;
  try {
    const real = fs.realpathSync(logFile);
    const repo = await git(path.dirname(real), ['rev-parse', '--show-toplevel'], timeout);
    result.repo = repo;
    const rel = path.relative(repo, real);
    try {
      await git(repo, ['check-ignore', '-q', '--', rel], timeout);
      throw new Error(`${rel} is ignored by ${repo}; the carriage does not force it in`);
    } catch (error) {
      if ((error as { code?: number }).code !== 1) throw error; // 1: not ignored
    }

    if (await git(repo, ['status', '--porcelain', '--', rel], timeout)) {
      let before = 0;
      try {
        before = (await git(repo, ['show', `HEAD:${rel}`], timeout)).split('\n').filter((l) => l.trim()).length;
      } catch {
        before = 0; // not yet tracked
      }
      const all = readEventLog(real);
      const added = all.slice(Math.min(before, all.length));
      result.events = added.length;
      const subject = `events: ${added.length} from ${options.instance ?? 'the wheel'} — ${summarise(added) || 'log rewritten'}`;
      const body = [
        ...added.slice(0, 30).map((e) => `- ${e.observed_at} ${shortName(e.event_type)} ${e.subject.kind} ${e.subject.id}`),
        ...(added.length > 30 ? [`- … and ${added.length - 30} more`] : []),
        '',
        'Committed by @medicine-wheel/events: this file only. Refs jgwill/medicine-wheel#164',
      ].join('\n');
      await git(repo, ['add', '--', rel], timeout);
      // `--only`: whatever else is staged here is someone's work in progress, and stays staged.
      await git(repo, ['commit', '--only', '-m', subject, '-m', body, '--', rel], timeout);
      result.commit = await git(repo, ['rev-parse', 'HEAD'], timeout);
      result.committed = true;
    }

    let unpushed: number | undefined;
    try {
      unpushed = Number(await git(repo, ['rev-list', '--count', '@{upstream}..HEAD'], timeout));
    } catch {
      unpushed = undefined; // no upstream: nothing to push to
    }
    if (options.push && unpushed) {
      const ahead = (await git(repo, ['rev-list', '@{upstream}..HEAD'], timeout)).split('\n').filter(Boolean);
      let foreign = 0;
      for (const sha of ahead) {
        const touched = (await git(repo, ['diff-tree', '--no-commit-id', '--name-only', '-r', '--root', sha], timeout)).split('\n').filter(Boolean);
        if (touched.some((file) => file !== rel)) foreign++;
      }
      if (foreign) {
        result.held = `${foreign} unpushed commit(s) touch more than ${rel}; they are someone's to push`;
      } else {
        await git(repo, ['push', '--quiet'], Math.max(timeout, 120_000));
        result.pushed = true;
        unpushed = 0;
      }
    }
    if (unpushed !== undefined) result.unpushed = unpushed;
  } catch (error) {
    result.error = message(error);
  }
  return result;
}

// ── a follower's side ───────────────────────────────────────────────────────

export interface FollowOptions extends StateOptions {
  /** The clone to follow. */
  repo: string;
  /** The log inside it; found when absent (`events.jsonl`, or `*\/store/events.jsonl`). */
  file?: string;
  /** Names this follower's cursor, so two followers of one clone keep their own place. */
  name?: string;
  /** `git pull --ff-only` first. Default true. */
  pull?: boolean;
  /** Act on one event; resolve true when done with it, false to stop and try it again next time. */
  handle: (event: WheelEvent) => Promise<boolean>;
}

export interface FollowResult extends DrainResult {
  file: string;
  /** The pull failed; the events already in the clone were still read. */
  pullError?: string;
}

/** The log inside a clone: `events.jsonl` at its root, else the one `<dir>/store/events.jsonl`. */
export function findEventLog(repo: string): string | undefined {
  const root = path.join(repo, 'events.jsonl');
  if (fs.existsSync(root)) return root;
  for (const entry of fs.readdirSync(repo, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const candidate = path.join(repo, entry.name, 'store', 'events.jsonl');
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Pull, then hand each event this follower has not yet handled to `handle`,
 * oldest first. The cursor moves after each event handled; a `false` stops
 * the pass and the same event comes first next time.
 */
export async function followEventLog(options: FollowOptions): Promise<FollowResult> {
  let pullError: string | undefined;
  if (options.pull !== false) {
    try {
      await git(options.repo, ['pull', '--ff-only', '--quiet'], 120_000);
    } catch (error) {
      pullError = message(error);
    }
  }
  const file = options.file ? path.resolve(options.repo, options.file) : findEventLog(options.repo);
  if (!file) throw new Error(`No events.jsonl in ${options.repo} — pass the file inside it`);
  const follower: Publisher = {
    name: options.name ?? 'follow',
    publish: async (event) =>
      (await options.handle(event)) ? { outcome: 'arrived' } : { outcome: 'failed', error: 'the handler asked to stop' },
  };
  const result = await drainLog(file, follower, { stateDir: options.stateDir });
  return { ...result, file, ...(pullError ? { pullError } : {}) };
}
