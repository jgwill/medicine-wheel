/**
 * format-time — human-readable, recency-aware timestamps shared across views.
 *
 * relativeTime() gives a glanceable sense of recency ("3 hours ago"), falling
 * back to an absolute short date once an entry is older than a month.
 * absoluteTime() gives the exact moment — used as the `title` tooltip so the
 * precise timestamp is always one hover away.
 */

export function relativeTime(iso: string | number | Date): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diff = Date.now() - then; // positive = past
  const future = diff < 0;
  const abs = Math.abs(diff);

  const sec = Math.round(abs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  const suffix = future ? "from now" : "ago";
  const unit = (n: number, u: string) => `${n} ${u}${n !== 1 ? "s" : ""} ${suffix}`;

  if (sec < 45) return "just now";
  if (min < 60) return unit(min, "minute");
  if (hr < 24) return unit(hr, "hour");
  if (day < 30) return unit(day, "day");

  // Older than ~a month: an absolute short date reads cleaner than "47 days ago".
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function absoluteTime(iso: string | number | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
