"use client";

import { useEffect, useState } from "react";
import { shortName, type WheelEvent } from "@medicine-wheel/events";
import { relativeTime, absoluteTime } from "@/lib/format-time";

/**
 * A cycle's moments, newest first: when it was opened, amended, archived, and
 * each beat recorded or witnessed in it (#164). Read from `/api/events` by the
 * cycle's id as correlation. The events carry ids, not words, so a beat's title
 * is read from the beats the wheel holds.
 */

/** `chronicle.episode.registered` → "Chronicle episode registered". */
export function eventLabel(eventType: string): string {
  const words = shortName(eventType).split(".").join(" ").replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** What one line adds beside its label: the beat's title, the fields that moved, the witnesses added. */
export function eventDetail(event: WheelEvent, beatTitles: Record<string, string>): string {
  const payload = event.payload as Record<string, unknown>;
  const parts: string[] = [];
  if (event.subject.kind === "beat" && beatTitles[event.subject.id]) parts.push(`“${beatTitles[event.subject.id]}”`);
  if (Array.isArray(payload.changed) && payload.changed.length) parts.push(`changed ${payload.changed.join(", ")}`);
  if (Array.isArray(payload.added_witnesses) && payload.added_witnesses.length) {
    parts.push(`${payload.added_witnesses.length} witness${payload.added_witnesses.length === 1 ? "" : "es"} added`);
  }
  if (typeof payload.speaker === "string" && event.event_type.endsWith("witnessed")) parts.push(`speaker ${payload.speaker}`);
  if (typeof payload.current_direction === "string" && event.event_type.endsWith("cycle.opened")) parts.push(`in the ${payload.current_direction}`);
  return parts.join(" · ");
}

export function CycleEvents({ cycleId }: { cycleId: string }) {
  const [events, setEvents] = useState<WheelEvent[] | null>(null);
  const [total, setTotal] = useState(0);
  const [beatTitles, setBeatTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    fetch(`/api/events?correlation=${encodeURIComponent(cycleId)}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        setEvents(Array.isArray(d.events) ? d.events : []);
        setTotal(typeof d.total === "number" ? d.total : 0);
      })
      .catch(() => live && setEvents([]));
    fetch("/api/narrative/beats")
      .then((r) => r.json())
      .then((d) => {
        if (!live || !Array.isArray(d)) return;
        setBeatTitles(Object.fromEntries(d.map((b: { id: string; title: string }) => [b.id, b.title])));
      })
      .catch(() => {});
    return () => { live = false; };
  }, [cycleId]);

  return (
    <div className="mt-4" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Moments {events && total > events.length ? `(${events.length} of ${total})` : ""}
      </p>
      {events === null && <p className="text-xs text-muted-foreground">Reading the event log…</p>}
      {events?.length === 0 && (
        <p className="text-xs text-muted-foreground">No events yet. This wheel records them from the moment the event log was installed; earlier moments were not kept.</p>
      )}
      {!!events?.length && (
        <ol className="space-y-1.5 border-l pl-3">
          {events.map((event) => (
            <li key={event.id} className="text-xs">
              <span className="text-muted-foreground" title={absoluteTime(event.observed_at)}>{relativeTime(event.observed_at)}</span>
              {" · "}
              <span className="font-medium">{eventLabel(event.event_type)}</span>
              {eventDetail(event, beatTitles) && <span className="text-muted-foreground"> · {eventDetail(event, beatTitles)}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
