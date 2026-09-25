/**
 * Automatic projection — the wheel pushes to Honcho on write.
 *
 * `@medicine-wheel/honcho` is the door; this is the river. Every write route
 * that lands a beat, a ceremony or a diary entry calls {@link projectAfterWrite}
 * once the record is stored. With `HONCHO_URL` set the record leaves for Honcho
 * in the background; unset, nothing happens and nothing is logged. Either way
 * the wheel's own answer to its caller is unchanged: a projection never delays
 * a response and never turns a stored record into an error.
 *
 * A failure is reported once on stderr with the record's id, because a silent
 * memory is worse than a noisy one. `awaitProjections()` exists for tests and
 * for anything that must know the river has run dry before it exits.
 *
 * A record Honcho could not receive is not lost (#147). Until then a Honcho
 * that was offline left a hole in its memory of every talking circle held
 * while it was away — the wheel kept the turns, and nothing ever sent them.
 * Now the record's reference, `{ kind, id }`, waits in a pending ledger beside
 * the wheel's store (`honcho-pending.jsonl`, or `HONCHO_PENDING_FILE`), and
 * {@link retryPending} sends it again: when the server starts, every few
 * minutes, and right after any projection that gets through. Only the
 * reference waits. The words stay in the wheel, which remains canonical and is
 * read again when the record finally leaves.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createHonchoClient,
  honchoFromEnv,
  project,
  projectBeat,
  projectCeremony,
  projectDiaryEntry,
  type HonchoClient,
  type HonchoConfig,
  type Projection,
} from '@medicine-wheel/honcho';
import { resolveProjectDataDir } from '@/lib/jsonl-store';

const inFlight = new Set<Promise<unknown>>();

let cached: { key: string; client: HonchoClient } | null = null;

function clientFor(cfg: HonchoConfig): HonchoClient {
  const key = `${cfg.baseUrl}|${cfg.workspace}|${cfg.apiKey ?? ''}`;
  if (cached?.key !== key) cached = { key, client: createHonchoClient(cfg) };
  return cached.client;
}

function track(run: Promise<unknown>): void {
  inFlight.add(run);
  run.finally(() => { inFlight.delete(run); }).catch(() => {});
}

// ── what can wait ───────────────────────────────────────────────────────────

export const PENDING_KINDS = ['beat', 'ceremony', 'diary'] as const;
export type PendingKind = (typeof PENDING_KINDS)[number];

/** A record the river owes Honcho, by reference. */
export interface PendingRef {
  kind: PendingKind;
  id: string;
}

export interface PendingEntry extends PendingRef {
  /** When the record first failed to arrive. */
  since: string;
  /** The failure that put it here. */
  error?: string;
}

const KIND_LABEL: Record<PendingKind, string> = { beat: 'beat', ceremony: 'ceremony', diary: 'diary entry' };

const labelOf = (ref: PendingRef) => `${KIND_LABEL[ref.kind]} ${ref.id}`;
const same = (a: PendingRef, b: PendingRef) => a.kind === b.kind && a.id === b.id;

export function isPendingRef(value: unknown): value is PendingRef {
  const v = value as Partial<PendingRef> | null;
  return !!v && typeof v === 'object'
    && typeof v.kind === 'string' && (PENDING_KINDS as readonly string[]).includes(v.kind)
    && typeof v.id === 'string' && v.id.length > 0;
}

// ── the pending ledger ──────────────────────────────────────────────────────
//
// Every read and write below is synchronous on purpose. Next compiles
// `instrumentation.ts` and the routes into separate bundles, each with its own
// copy of this module; the file is what they share. A synchronous
// read-modify-write cannot interleave with another inside one Node process, so
// a record queued by a route while the timer's pass is sending another is
// never overwritten away.

/** Where the ledger lives: `HONCHO_PENDING_FILE`, else beside the wheel's JSONL store. */
export function pendingFile(): string {
  return process.env.HONCHO_PENDING_FILE || path.join(resolveProjectDataDir(), 'honcho-pending.jsonl');
}

function readLedger(): PendingEntry[] {
  let text: string;
  try {
    text = fs.readFileSync(pendingFile(), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const entries: PendingEntry[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (isPendingRef(entry) && !entries.some((e) => same(e, entry))) entries.push(entry as PendingEntry);
    } catch {
      // A torn line is skipped, not fatal: the rest of the ledger still sends.
    }
  }
  return entries;
}

/** An empty ledger is no file, so a data repository shows it only while something waits. */
function writeLedger(entries: PendingEntry[]): void {
  const file = pendingFile();
  if (!entries.length) {
    fs.rmSync(file, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  fs.renameSync(tmp, file);
}

/** What waits, oldest first. */
export function listPending(): PendingEntry[] {
  return readLedger();
}

/** Put a record on the ledger (once — a reference already waiting keeps its place). Returns how many wait. */
export function markPending(ref: PendingRef, error?: string): number {
  const entries = readLedger();
  if (!entries.some((e) => same(e, ref))) {
    entries.push({ kind: ref.kind, id: ref.id, since: new Date().toISOString(), ...(error ? { error } : {}) });
    writeLedger(entries);
  }
  return entries.length;
}

function clearPending(ref: PendingRef): void {
  const entries = readLedger();
  const rest = entries.filter((e) => !same(e, ref));
  if (rest.length !== entries.length) writeLedger(rest);
}

// ── reading a record back ───────────────────────────────────────────────────

/**
 * The record a reference names, shaped for Honcho — read from the wheel now,
 * so what leaves is what the wheel holds, including any witness added since.
 * `null` when the wheel no longer holds it. Throws when the store cannot be
 * read, which is a reason to wait, not to forget.
 */
async function shaperFor(ref: PendingRef): Promise<(() => Projection) | null> {
  if (ref.kind === 'beat') {
    const { getBeat } = await import('@/lib/store');
    const beat = getBeat(ref.id);
    return beat ? () => projectBeat(beat) : null;
  }
  const { createProvider } = await import('@medicine-wheel/storage-provider');
  const store = await createProvider();
  if (ref.kind === 'ceremony') {
    const ceremony = await store.getCeremony(ref.id);
    return ceremony ? () => projectCeremony(ceremony) : null;
  }
  const entry = await store.getDiaryEntry(ref.id);
  return entry ? () => projectDiaryEntry(entry) : null;
}

/** Whether the wheel holds the record a reference names. */
export async function holdsRecord(ref: PendingRef): Promise<boolean> {
  return (await shaperFor(ref)) !== null;
}

// ── failures ────────────────────────────────────────────────────────────────

/**
 * Whether sending again can change the outcome: Honcho unreachable or timed
 * out (the client reports 502), failing on its own side (5xx), or asking us
 * to slow down. A 4xx refusal is Honcho's answer to this record as shaped;
 * it would give the same answer every five minutes, forever.
 */
function mayArriveLater(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status;
  return typeof status !== 'number' || status >= 500 || status === 408 || status === 429;
}

function report(cfg: HonchoConfig, label: string, error: unknown, tail = ''): void {
  const err = error as { message?: string; body?: string };
  console.error(
    `[honcho] projection of ${label} into ${cfg.workspace}@${cfg.baseUrl} failed: ${err?.message ?? String(error)}` +
      (err?.body ? ` — ${err.body}` : '') +
      tail,
  );
}

/** What `/api/health` reports: whether the river runs, where to, and how much waits for it. */
export function honchoProjectionStatus(): { enabled: boolean; url?: string; workspace?: string; pending?: number } {
  const cfg = honchoFromEnv();
  if (!cfg) return { enabled: false };
  let pending: number | undefined;
  try {
    pending = readLedger().length;
  } catch {
    pending = undefined;
  }
  return { enabled: true, url: cfg.baseUrl, workspace: cfg.workspace, ...(pending !== undefined ? { pending } : {}) };
}

// ── the river ───────────────────────────────────────────────────────────────

/**
 * Fire-and-forget. Returns immediately; the projection runs in the background.
 * `ref` names the record — in the one line written when Honcho refuses or is
 * unreachable, and on the ledger when it may arrive later.
 *
 * The projection is built by `shape`, called *inside* the error boundary. It
 * used to be built by the caller, in the route's own expression — so a record
 * the projection could not shape (a `learnings` that arrived as a string, say)
 * threw synchronously and turned an already-stored write into a 500 for the
 * writer. The wheel's answer to its caller must not depend on the river, and
 * that includes the part that reads the record. A record that cannot be
 * shaped is reported and not queued: shaping it again fails the same way.
 */
export function projectAfterWrite(ref: PendingRef, shape: () => Projection): void {
  const cfg = honchoFromEnv();
  if (!cfg) return;
  const label = labelOf(ref);
  track(
    Promise.resolve().then(async () => {
      let projection: Projection;
      try {
        projection = shape();
      } catch (error) {
        report(cfg, label, error);
        return;
      }
      try {
        await project(clientFor(cfg), projection);
      } catch (error) {
        if (!mayArriveLater(error)) {
          report(cfg, label, error);
          return;
        }
        let tail: string;
        try {
          tail = ` — waiting to be sent again (${markPending(ref, (error as Error)?.message)} pending)`;
        } catch (ledgerError) {
          tail = ` — and could not be kept for later: ${(ledgerError as Error)?.message ?? String(ledgerError)}`;
        }
        report(cfg, label, error, tail);
        return;
      }
      // Honcho answered, so whatever waited behind it can go now.
      try {
        if (readLedger().length) void retryPending();
      } catch {
        // The ledger is the timer's to reach; this was only a head start.
      }
    }),
  );
}

export interface RetryResult {
  /** Delivered on this pass and cleared from the ledger. */
  sent: number;
  /** Cleared without delivery: the wheel no longer holds it, or Honcho refused it. */
  dropped: number;
  /** Still waiting after this pass. */
  pending: number;
}

// One pass at a time across every copy of this module (see the ledger note):
// two passes over the same ledger would send the same record twice.
const RETRY_STATE = Symbol.for('@medicine-wheel/app.honcho-retry');
type RetryState = { running?: Promise<RetryResult>; timer?: ReturnType<typeof setInterval> };
const retryState: RetryState = ((globalThis as Record<symbol, RetryState>)[RETRY_STATE] ??= {});

async function drain(): Promise<RetryResult> {
  const result: RetryResult = { sent: 0, dropped: 0, pending: 0 };
  const cfg = honchoFromEnv();
  try {
    if (cfg) {
      for (const entry of readLedger()) {
        const label = labelOf(entry);
        // A store that cannot be read ends the pass with everything still waiting.
        const shape = await shaperFor(entry);
        if (!shape) {
          console.error(`[honcho] ${label} was waiting for Honcho and the wheel no longer holds it; dropped from the ledger`);
          clearPending(entry);
          result.dropped++;
          continue;
        }
        let projection: Projection;
        try {
          projection = shape();
        } catch (error) {
          report(cfg, label, error, ' — dropped from the ledger');
          clearPending(entry);
          result.dropped++;
          continue;
        }
        try {
          await project(clientFor(cfg), projection);
        } catch (error) {
          // Still away: this record and every one behind it keep waiting,
          // and a Honcho that is down is not asked once per record.
          if (mayArriveLater(error)) break;
          report(cfg, label, error, ' — dropped from the ledger');
          clearPending(entry);
          result.dropped++;
          continue;
        }
        clearPending(entry);
        result.sent++;
      }
    }
    result.pending = readLedger().length;
  } catch (error) {
    console.error(`[honcho] retrying the pending ledger (${pendingFile()}) failed: ${(error as Error)?.message ?? String(error)}`);
  }
  if (result.sent) {
    console.log(`[honcho] ${result.sent} waiting projection(s) delivered; ${result.pending} still pending`);
  }
  return result;
}

/**
 * Send what waits, oldest first, and clear each record Honcho takes. Stops at
 * the first sign Honcho is still away. Never rejects. A pass already running
 * is joined, not repeated.
 */
export function retryPending(): Promise<RetryResult> {
  if (retryState.running) return retryState.running;
  const run = drain().finally(() => {
    if (retryState.running === run) retryState.running = undefined;
  });
  retryState.running = run;
  track(run);
  return run;
}

/**
 * Start the retry clock: one pass now, then one every `intervalMs`
 * (`HONCHO_RETRY_INTERVAL_MS`, default five minutes). Called once from
 * `instrumentation.ts` when the server starts; a second call is a no-op, and
 * with `HONCHO_URL` unset there is no river to wait for.
 */
export function startPendingRetries(
  intervalMs = Number(process.env.HONCHO_RETRY_INTERVAL_MS) || 5 * 60_000,
): void {
  if (retryState.timer || !honchoFromEnv()) return;
  retryState.timer = setInterval(() => { void retryPending(); }, intervalMs);
  retryState.timer.unref?.();
  void retryPending();
}

/** Resolves once every projection and retry pass started so far has settled. */
export async function awaitProjections(): Promise<void> {
  while (inFlight.size) await Promise.allSettled([...inFlight]);
}
