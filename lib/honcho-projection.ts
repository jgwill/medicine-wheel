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
 */

import {
  createHonchoClient,
  honchoFromEnv,
  project,
  type HonchoClient,
  type HonchoConfig,
  type Projection,
} from '@medicine-wheel/honcho';

const inFlight = new Set<Promise<unknown>>();

let cached: { key: string; client: HonchoClient } | null = null;

function clientFor(cfg: HonchoConfig): HonchoClient {
  const key = `${cfg.baseUrl}|${cfg.workspace}|${cfg.apiKey ?? ''}`;
  if (cached?.key !== key) cached = { key, client: createHonchoClient(cfg) };
  return cached.client;
}

/** What `/api/health` reports: whether the river runs, and where to. */
export function honchoProjectionStatus(): { enabled: boolean; url?: string; workspace?: string } {
  const cfg = honchoFromEnv();
  return cfg ? { enabled: true, url: cfg.baseUrl, workspace: cfg.workspace } : { enabled: false };
}

/**
 * Fire-and-forget. Returns immediately; the projection runs in the background.
 * `label` names the record in the one line written when Honcho refuses or is
 * unreachable.
 */
export function projectAfterWrite(projection: Projection, label: string): void {
  const cfg = honchoFromEnv();
  if (!cfg) return;
  const run = project(clientFor(cfg), projection)
    .catch((error: unknown) => {
      const err = error as { message?: string; status?: number; body?: string };
      console.error(
        `[honcho] projection of ${label} into ${cfg.workspace}@${cfg.baseUrl} failed: ${err?.message ?? String(error)}` +
          (err?.body ? ` — ${err.body}` : ''),
      );
    })
    .finally(() => { inFlight.delete(run); });
  inFlight.add(run);
}

/** Resolves once every projection started so far has settled. */
export async function awaitProjections(): Promise<void> {
  while (inFlight.size) await Promise.allSettled([...inFlight]);
}
