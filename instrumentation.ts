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
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startPendingRetries } = await import("@/lib/honcho-projection");
  startPendingRetries();
  const { startEventPublishing } = await import("@/lib/event-log");
  startEventPublishing();
}
