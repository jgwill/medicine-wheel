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
 * Publishing (episode 548's Send): with `MW_EVENTS_PUBLISH_URL` set, the log is
 * sent there after every recorded event and every
 * `MW_EVENTS_PUBLISH_INTERVAL_MS` (default one minute), from this wheel's
 * cursor, with receipts beside the log. Unset, nothing leaves the machine.
 *
 * Never the caller's error: a line that cannot be written is reported once on
 * stderr with the record's id, and a publisher that cannot be reached is a
 * receipt, not a failed write.
 */

import { buildEvent, filterEvents, type EventFilter, type WheelEvent, type WheelEventInput } from '@medicine-wheel/events';
import { appendEvent, eventLogPath, readEventLog } from '@medicine-wheel/events/log';
import {
  drainLog,
  httpPublisher,
  publisherStatus,
  readReceipts,
  rewind,
  type DrainResult,
  type Publisher,
  type PublisherStatus,
  type Receipt,
} from '@medicine-wheel/events/publish';
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
  return event;
}

/** Every event, oldest first. */
export function readEvents(): WheelEvent[] {
  return readEventLog(eventLogFile());
}

export { filterEvents, type EventFilter };

// ── publishing ──────────────────────────────────────────────────────────────

/** The publisher `MW_EVENTS_PUBLISH_URL` names, or `null`: nothing leaves the machine. */
export function publisherFromEnv(): Publisher | null {
  const url = process.env.MW_EVENTS_PUBLISH_URL?.trim();
  if (!url) return null;
  return httpPublisher({
    url,
    token: process.env.MW_EVENTS_PUBLISH_TOKEN?.trim() || undefined,
    name: process.env.MW_EVENTS_PUBLISH_NAME?.trim() || 'http',
  });
}

// One pass at a time across every copy of this module: Next compiles
// `instrumentation.ts` and the routes into separate bundles, and two passes
// over the same cursor would send the same event twice.
const STATE = Symbol.for('@medicine-wheel/app.event-publisher');
type PublishState = { running?: Promise<DrainResult | null>; again?: boolean; timer?: ReturnType<typeof setInterval>; down?: boolean };
const state: PublishState = ((globalThis as Record<symbol, PublishState>)[STATE] ??= {});

async function pass(): Promise<DrainResult | null> {
  const publisher = publisherFromEnv();
  if (!publisher) return null;
  try {
    const result = await drainLog(eventLogFile(), publisher);
    // A destination that stays down is one line when it goes, one when it returns.
    if (result.stopped && !state.down) {
      console.error(`[events] publishing to ${publisher.name} stopped: ${result.error} — ${result.pending} event(s) waiting`);
    } else if (!result.stopped && state.down) {
      console.log(`[events] publishing to ${publisher.name} resumed; ${result.arrived} event(s) arrived`);
    }
    state.down = result.stopped;
    return result;
  } catch (error) {
    console.error(`[events] publishing pass failed: ${(error as Error)?.message ?? String(error)}`);
    return null;
  }
}

/** Send what waits. A pass already running is joined, and runs once more after it for what arrived meanwhile. */
export function publishPending(): Promise<DrainResult | null> {
  if (state.running) {
    state.again = true;
    return state.running;
  }
  const run = pass().then(async (result) => {
    while (state.again) {
      state.again = false;
      result = (await pass()) ?? result;
    }
    return result;
  }).finally(() => {
    if (state.running === run) state.running = undefined;
  });
  state.running = run;
  return run;
}

/** After a recorded event: send it soon, in the background. Nothing when no publisher is set. */
export function kickPublisher(): void {
  if (!process.env.MW_EVENTS_PUBLISH_URL?.trim()) return;
  void publishPending();
}

/**
 * Start the publishing clock: one pass now, then one every
 * `MW_EVENTS_PUBLISH_INTERVAL_MS` (default one minute). Called once from
 * `instrumentation.ts`; a second call is a no-op, and without a publisher
 * there is nothing to send.
 */
export function startEventPublishing(intervalMs = Number(process.env.MW_EVENTS_PUBLISH_INTERVAL_MS) || 60_000): void {
  if (state.timer || !publisherFromEnv()) return;
  state.timer = setInterval(() => { void publishPending(); }, intervalMs);
  state.timer.unref?.();
  void publishPending();
}

/** Replay: the next pass sends `fromEventId` and everything after it again (the whole log without one). */
export function replayEvents(fromEventId?: string): { pending: number } | null {
  const publisher = publisherFromEnv();
  if (!publisher) return null;
  return rewind(eventLogFile(), publisher.name, fromEventId);
}

/** Where the configured publisher stands, and its latest receipts. */
export function eventPublisherReport(limit = 20): { publisher: PublisherStatus; receipts: Receipt[] } | null {
  const publisher = publisherFromEnv();
  if (!publisher) return null;
  const file = eventLogFile();
  return { publisher: publisherStatus(file, publisher.name), receipts: readReceipts(file, publisher.name).slice(-limit).reverse() };
}

/** What `/api/health` reports: how many events, the last one, and what the publisher still owes. */
export function eventLogStatus(): { count: number; last_at?: string; publisher?: PublisherStatus } | { error: string } {
  try {
    const events = readEvents();
    const last = events[events.length - 1];
    const publisher = publisherFromEnv();
    return {
      count: events.length,
      ...(last ? { last_at: last.observed_at } : {}),
      ...(publisher ? { publisher: publisherStatus(eventLogFile(), publisher.name) } : {}),
    };
  } catch (error) {
    return { error: (error as Error)?.message ?? String(error) };
  }
}
