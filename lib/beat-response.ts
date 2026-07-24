import type { DirectionName, NarrativeBeat } from "./types";

interface BeatListResponse {
  beats?: unknown;
}

const DIRECTION_NAMES = new Set<DirectionName>(["east", "south", "west", "north"]);

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * Repair one stored beat into a shape the arc readers can render.
 *
 * Unlike the cycle normalizer this keeps every field it was handed instead of
 * rebuilding from a whitelist: beats carry additive provenance (origin,
 * sub_beats, parent_beat_id, act) and a whitelist would silently drop whatever
 * the narrative engine adds after this file was written. Only the fields a
 * reader indexes into are coerced — a beat recorded before `learnings` and
 * `relations_honored` existed takes down a page that reads `.length` on them,
 * and one with no `direction` is looked up as a colour key that does not exist.
 */
export function normalizeNarrativeBeat(value: unknown): NarrativeBeat | null {
  if (!value || typeof value !== "object") return null;

  const beat = value as Record<string, unknown>;
  if (typeof beat.id !== "string") return null;

  return {
    ...(beat as unknown as NarrativeBeat),
    id: beat.id,
    direction:
      typeof beat.direction === "string" &&
      DIRECTION_NAMES.has(beat.direction as DirectionName)
        ? (beat.direction as DirectionName)
        : "east",
    ceremonies: asStringArray(beat.ceremonies),
    learnings: asStringArray(beat.learnings),
    relations_honored: asStringArray(beat.relations_honored),
    timestamp:
      typeof beat.timestamp === "string" ? beat.timestamp : new Date(0).toISOString(),
  };
}

export function extractBeats(response: unknown): NarrativeBeat[] {
  const candidate = Array.isArray(response)
    ? response
    : response && typeof response === "object" && Array.isArray((response as BeatListResponse).beats)
      ? ((response as BeatListResponse).beats as unknown[])
      : [];

  return candidate
    .map(normalizeNarrativeBeat)
    .filter((beat): beat is NarrativeBeat => beat !== null);
}
