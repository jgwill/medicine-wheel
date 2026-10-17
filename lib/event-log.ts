/**
 * The wheel's event log — what happened, kept beside the store (#164).
 *
 * The store keeps each record's latest state: a cycle amended twice is one
 * line in `cycles.jsonl`, and the moment it was opened exists nowhere once it
 * has passed. This log keeps those moments. Each write a route commits leaves
 * one line in `events.jsonl` beside the store (`MW_EVENTS_FILE` overrides).
 * What an event is, and which event a write is, lives in
 * `@medicine-wheel/events` — the routes hand it before and after and record
 * what it decides, and the MCP server's local store does the same.
 *
 * `source.instance` names this wheel as configured (`MW_INSTANCE`, e.g.
 * `ilex:8040`). The address a request reached is not a name: behind
 * `0.0.0.0` every wheel looks alike, and two browsers name the same wheel two
 * ways.
 *
 * Publishing (episode 548's Send, #165): each configured destination is a
 * publisher with its own cursor and receipts beside the log, sent to after
 * every recorded event and every `MW_EVENTS_PUBLISH_INTERVAL_MS` (default one
 * minute). One destination down never holds another back. Unset, nothing
 * leaves the machine. The destinations:
 *
 * - `MW_EVENTS_PUBLISH_URL` (`_TOKEN`, `_NAME`, `_FORMAT` = envelope |
 *   cloudevents | cloudevents-binary): any HTTP receiver.
 * - `MW_EVENTS_HOOKDECK_SOURCE_URL` (`_FORMAT`): a Hookdeck source.
 * - `MW_EVENTS_CF_ACCOUNT_ID` + `MW_EVENTS_CF_QUEUE_ID` + `MW_EVENTS_CF_API_TOKEN`
 *   (`MW_EVENTS_CF_FORMAT` = envelope | cloudevents; `MW_EVENTS_CF_API_BASE`
 *   for a proxy): a Cloudflare queue.
 *
 * Carried by git, before any broker: with `MW_EVENTS_GIT_SYNC=push` (or
 * `commit`), the wheel commits `events.jsonl` — that file only — in the data
 * repository it lives in, about half a minute after events are recorded
 * (`MW_EVENTS_GIT_DELAY_MS`), on start, and every ten minutes
 * (`MW_EVENTS_GIT_INTERVAL_MS`), then pushes. A follower elsewhere pulls a
 * clone and acts on what it has not seen (`mw-events follow`).
 *
 * Never the caller's error: a line that cannot be written is reported once on
 * stderr with the record's id, and a publisher or a remote that cannot be
 * reached is a receipt or a status, not a failed write.
 */

import { buildEvent, filterEvents, type EventFilter, type WheelEvent, type WheelEventInput } from '@medicine-wheel/events';
import { appendEvent, eventLogPath, readEventLog } from '@medicine-wheel/events/log';
import {
  cloudflareQueuesPublisher,
  drainLog,
  hookdeckPublisher,
  httpPublisher,
  publisherStatus,
  readReceipts,
  rewind,
  type AdapterGuarantees,
  type DrainResult,
  type Publisher,
  type WireFormat,
  type PublisherStatus,
  type Receipt,
} from '@medicine-wheel/events/publish';
import { commitEventLog, type CommitResult } from '@medicine-wheel/events/git';
import { resolveProjectDataDir } from '@/lib/jsonl-store';

/** Where the log lives: `MW_EVENTS_FILE`, else beside the wheel's JSONL store. */
export function eventLogFile(): string {
  return eventLogPath(resolveProjectDataDir());
}

/** This wheel's name in `source.instance`, when one is configured. */
export function eventInstance(): string | undefined {
  return process.env.MW_INSTANCE?.trim() || undefined;
}

/**
 * Record what a decider returned (`null`: the write changed nothing, so
 * nothing to record). Returns the event, or `undefined` when there was none or
 * its line could not be written.
 */
export function recordEvent(input: WheelEventInput | null): WheelEvent | undefined {
  if (!input) return undefined;
  const file = eventLogFile();
  let event: WheelEvent;
  try {
    event = buildEvent(input, { instance: eventInstance() });
    appendEvent(file, event);
  } catch (error) {
    console.error(
      `[events] medicine-wheel.${input.name} for ${input.subject.kind} ${input.subject.id} was not written to ${file}: ${(error as Error)?.message ?? String(error)}`,
    );
    return undefined;
  }
  kickPublisher();
  kickGitSync();
  return event;
}

/** Every event, oldest first. */
export function readEvents(): WheelEvent[] {
  return readEventLog(eventLogFile());
}

export { filterEvents, type EventFilter };

// ── publishing ──────────────────────────────────────────────────────────────

const env = (key: string) => process.env[key]?.trim() || undefined;

function formatOf(key: string, allowed: readonly WireFormat[]): WireFormat {
  const value = env(key);
  if (!value) return 'envelope';
  if ((allowed as readonly string[]).includes(value)) return value as WireFormat;
  console.error(`[events] ${key}=${value} is not one of ${allowed.join(', ')}; sending the envelope`);
  return 'envelope';
}

/** Every destination the environment names, each a publisher with its own cursor. None: nothing leaves the machine. */
export function publishersFromEnv(): Publisher[] {
  const publishers: Publisher[] = [];
  const url = env('MW_EVENTS_PUBLISH_URL');
  if (url) {
    publishers.push(httpPublisher({
      url,
      token: env('MW_EVENTS_PUBLISH_TOKEN'),
      name: env('MW_EVENTS_PUBLISH_NAME') || 'http',
      format: formatOf('MW_EVENTS_PUBLISH_FORMAT', ['envelope', 'cloudevents', 'cloudevents-binary']),
    }));
  }
  const hookdeck = env('MW_EVENTS_HOOKDECK_SOURCE_URL');
  if (hookdeck) {
    publishers.push(hookdeckPublisher({ sourceUrl: hookdeck, format: formatOf('MW_EVENTS_HOOKDECK_FORMAT', ['envelope', 'cloudevents', 'cloudevents-binary']) }));
  }
  const [accountId, queueId, token] = [env('MW_EVENTS_CF_ACCOUNT_ID'), env('MW_EVENTS_CF_QUEUE_ID'), env('MW_EVENTS_CF_API_TOKEN')];
  if (accountId && queueId && token) {
    publishers.push(cloudflareQueuesPublisher({
      accountId,
      queueId,
      token,
      format: formatOf('MW_EVENTS_CF_FORMAT', ['envelope', 'cloudevents']) as 'envelope' | 'cloudevents',
      apiBase: env('MW_EVENTS_CF_API_BASE'),
    }));
  } else if (accountId || queueId || token) {
    console.error('[events] Cloudflare Queues needs MW_EVENTS_CF_ACCOUNT_ID, MW_EVENTS_CF_QUEUE_ID and MW_EVENTS_CF_API_TOKEN together; it is off');
  }
  // Two publishers under one name would share a cursor and each skip what the other sent.
  const seen = new Set<string>();
  return publishers.filter((p) => {
    if (!seen.has(p.name)) return seen.add(p.name), true;
    console.error(`[events] two publishers are named ${p.name}; the second is off`);
    return false;
  });
}

const publishingConfigured = () =>
  Boolean(env('MW_EVENTS_PUBLISH_URL') || env('MW_EVENTS_HOOKDECK_SOURCE_URL') || env('MW_EVENTS_CF_ACCOUNT_ID'));

// One pass at a time across every copy of this module: Next compiles
// `instrumentation.ts` and the routes into separate bundles, and two passes
// over the same cursor would send the same event twice.
const STATE = Symbol.for('@medicine-wheel/app.event-publisher');
type PublishState = { running?: Promise<DrainResult[] | null>; again?: boolean; timer?: ReturnType<typeof setInterval>; down?: Set<string> };
const state: PublishState = ((globalThis as Record<symbol, PublishState>)[STATE] ??= {});

async function pass(): Promise<DrainResult[] | null> {
  const publishers = publishersFromEnv();
  if (!publishers.length) return null;
  const down = (state.down ??= new Set());
  const results: DrainResult[] = [];
  for (const publisher of publishers) {
    try {
      const result = await drainLog(eventLogFile(), publisher);
      // A destination that stays down is one line when it goes, one when it returns.
      if (result.stopped && !down.has(publisher.name)) {
        console.error(`[events] publishing to ${publisher.name} stopped: ${result.error} — ${result.pending} event(s) waiting`);
        down.add(publisher.name);
      } else if (!result.stopped && down.has(publisher.name)) {
        console.log(`[events] publishing to ${publisher.name} resumed; ${result.arrived} event(s) arrived`);
        down.delete(publisher.name);
      }
      results.push(result);
    } catch (error) {
      console.error(`[events] publishing to ${publisher.name} failed: ${(error as Error)?.message ?? String(error)}`);
    }
  }
  return results;
}

/** Send what waits, to every destination. A pass already running is joined, and runs once more after it for what arrived meanwhile. */
export function publishPending(): Promise<DrainResult[] | null> {
  if (state.running) {
    state.again = true;
    return state.running;
  }
  const run = pass().then(async (results) => {
    while (state.again) {
      state.again = false;
      results = (await pass()) ?? results;
    }
    return results;
  }).finally(() => {
    if (state.running === run) state.running = undefined;
  });
  state.running = run;
  return run;
}

/** After a recorded event: send it soon, in the background. Nothing when no destination is set. */
export function kickPublisher(): void {
  if (!publishingConfigured()) return;
  void publishPending();
}

/**
 * Start the publishing clock: one pass now, then one every
 * `MW_EVENTS_PUBLISH_INTERVAL_MS` (default one minute). Called once from
 * `instrumentation.ts`; a second call is a no-op, and without a destination
 * there is nothing to send.
 */
export function startEventPublishing(intervalMs = Number(process.env.MW_EVENTS_PUBLISH_INTERVAL_MS) || 60_000): void {
  if (state.timer || !publishersFromEnv().length) return;
  state.timer = setInterval(() => { void publishPending(); }, intervalMs);
  state.timer.unref?.();
  void publishPending();
}

/**
 * Replay: the named publisher's next pass sends `fromEventId` and everything
 * after it again (the whole log without one). With one destination the name
 * may be left out. `null`: no destination is configured.
 */
export function replayEvents(fromEventId?: string, publisherName?: string): { publisher: string; pending: number } | null {
  const publishers = publishersFromEnv();
  if (!publishers.length) return null;
  const publisher = publisherName ? publishers.find((p) => p.name === publisherName) : publishers.length === 1 ? publishers[0] : undefined;
  if (!publisher) {
    throw new Error(publisherName
      ? `No publisher named ${publisherName}; configured: ${publishers.map((p) => p.name).join(', ')}`
      : `Name the publisher to replay: ${publishers.map((p) => p.name).join(', ')}`);
  }
  return { publisher: publisher.name, ...rewind(eventLogFile(), publisher.name, fromEventId) };
}

export interface PublisherReport {
  status: PublisherStatus;
  guarantees?: AdapterGuarantees;
  receipts: Receipt[];
}

/** Where each destination stands, what it promises, and its latest receipts. `null`: none is configured. */
export function eventPublisherReport(limit = 20): PublisherReport[] | null {
  const publishers = publishersFromEnv();
  if (!publishers.length) return null;
  const file = eventLogFile();
  return publishers.map((p) => ({
    status: publisherStatus(file, p.name),
    ...(p.guarantees ? { guarantees: p.guarantees } : {}),
    receipts: readReceipts(file, p.name).slice(-limit).reverse(),
  }));
}

// ── carried by git ──────────────────────────────────────────────────────────

export type GitSyncMode = 'off' | 'commit' | 'push';

/** `MW_EVENTS_GIT_SYNC`: `push` (or `1`, `true`), `commit`, else off. */
export function gitSyncMode(): GitSyncMode {
  const value = process.env.MW_EVENTS_GIT_SYNC?.trim().toLowerCase();
  if (value === 'push' || value === '1' || value === 'true') return 'push';
  if (value === 'commit') return 'commit';
  return 'off';
}

const GIT = Symbol.for('@medicine-wheel/app.event-git');
type GitState = {
  running?: Promise<CommitResult | null>;
  again?: boolean;
  timer?: ReturnType<typeof setTimeout>;
  interval?: ReturnType<typeof setInterval>;
  failing?: boolean;
  last?: CommitResult & { at: string };
};
const gitState: GitState = ((globalThis as Record<symbol, GitState>)[GIT] ??= {});

async function gitPass(): Promise<CommitResult | null> {
  const mode = gitSyncMode();
  if (mode === 'off') return null;
  const result = await commitEventLog(eventLogFile(), { push: mode === 'push', instance: eventInstance() });
  gitState.last = { ...result, at: new Date().toISOString() };
  if (result.error && !gitState.failing) {
    console.error(`[events] git carriage stopped: ${result.error} — the log keeps growing and the next pass tries again`);
  } else if (!result.error && gitState.failing) {
    console.log('[events] git carriage resumed');
  }
  if (result.committed) {
    console.log(`[events] committed ${result.events} event(s) in ${result.commit?.slice(0, 8)}${result.pushed ? ', pushed' : ''}`);
  }
  gitState.failing = Boolean(result.error);
  return result;
}

/** Commit (and push) the log now. A pass already running is joined, and runs once more after it. */
export function syncEventsToGit(): Promise<CommitResult | null> {
  if (gitState.running) {
    gitState.again = true;
    return gitState.running;
  }
  const run = gitPass().then(async (result) => {
    while (gitState.again) {
      gitState.again = false;
      result = (await gitPass()) ?? result;
    }
    return result;
  }).finally(() => {
    if (gitState.running === run) gitState.running = undefined;
  });
  gitState.running = run;
  return run;
}

/** After a recorded event: commit soon, so a burst of writes travels as one commit. */
export function kickGitSync(): void {
  if (gitSyncMode() === 'off' || gitState.timer) return;
  gitState.timer = setTimeout(() => {
    gitState.timer = undefined;
    void syncEventsToGit();
  }, Number(process.env.MW_EVENTS_GIT_DELAY_MS) || 30_000);
  gitState.timer.unref?.();
}

/** Start the carriage clock from `instrumentation.ts`: a pass now, then every ten minutes. */
export function startEventGitSync(intervalMs = Number(process.env.MW_EVENTS_GIT_INTERVAL_MS) || 10 * 60_000): void {
  if (gitSyncMode() === 'off' || gitState.interval) return;
  gitState.interval = setInterval(() => { void syncEventsToGit(); }, intervalMs);
  gitState.interval.unref?.();
  void syncEventsToGit();
}

/** The carriage's mode and its last pass. */
export function eventGitStatus(): { mode: GitSyncMode; last?: GitState['last'] } {
  return { mode: gitSyncMode(), ...(gitState.last ? { last: gitState.last } : {}) };
}

/** What `/api/health` reports: how many events, the last one, what each destination owes, how the git carriage stands. */
export function eventLogStatus(): { count: number; last_at?: string; publishers?: PublisherStatus[]; git?: ReturnType<typeof eventGitStatus> } | { error: string } {
  try {
    const events = readEvents();
    const last = events[events.length - 1];
    const publishers = publishersFromEnv();
    return {
      count: events.length,
      ...(last ? { last_at: last.observed_at } : {}),
      ...(publishers.length ? { publishers: publishers.map((p) => publisherStatus(eventLogFile(), p.name)) } : {}),
      ...(gitSyncMode() !== 'off' ? { git: eventGitStatus() } : {}),
    };
  } catch (error) {
    return { error: (error as Error)?.message ?? String(error) };
  }
}
