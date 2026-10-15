/**
 * Runs once when the server starts (Next.js instrumentation hook).
 *
 * Starts the Honcho river's retry clock (#147): records Honcho could not
 * receive while it was away wait on the pending ledger, and are sent again on
 * start and every few minutes after. With `HONCHO_URL` unset this does nothing.
 *
 * Starts the event publisher's clock (#164): events in `events.jsonl` that the
 * configured publisher has not taken are sent on start and every minute after.
 * With `MW_EVENTS_PUBLISH_URL` unset this does nothing.
 *
 * Starts the event log's git carriage (#164): with `MW_EVENTS_GIT_SYNC` set,
 * `events.jsonl` is committed in its data repository (and pushed) on start
 * and every ten minutes, besides soon after each recorded event.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startPendingRetries } = await import("@/lib/honcho-projection");
  startPendingRetries();
  const { startEventPublishing, startEventGitSync } = await import("@/lib/event-log");
  startEventPublishing();
  startEventGitSync();
}
