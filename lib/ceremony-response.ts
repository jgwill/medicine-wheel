import type { CeremonyLog, CeremonyType, DirectionName } from "@/lib/types";

interface CeremonyListResponse {
  ceremonies?: unknown;
}

const DIRECTION_NAMES = new Set<DirectionName>(["east", "south", "west", "north"]);

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * Repair one stored ceremony into a shape the timeline can render.
 *
 * Returns null only when the record carries no identity — a ceremony with no
 * id or type cannot be opened, filtered, or spoken about. Everything else is
 * filled in: the timeline reads `.length` on participants, medicines, and
 * intentions, and sorts on `timestamp`, so a ceremony logged before any of
 * those fields existed takes the whole page down rather than rendering thin.
 */
export function normalizeCeremonyLog(value: unknown): CeremonyLog | null {
  if (!value || typeof value !== "object") return null;

  const ceremony = value as Record<string, unknown>;
  if (typeof ceremony.id !== "string" || typeof ceremony.type !== "string") {
    return null;
  }

  return {
    id: ceremony.id,
    type: ceremony.type as CeremonyType,
    direction:
      typeof ceremony.direction === "string" &&
      DIRECTION_NAMES.has(ceremony.direction as DirectionName)
        ? (ceremony.direction as DirectionName)
        : "east",
    participants: asStringArray(ceremony.participants),
    medicines_used: asStringArray(ceremony.medicines_used),
    intentions: asStringArray(ceremony.intentions),
    timestamp:
      typeof ceremony.timestamp === "string"
        ? ceremony.timestamp
        : new Date(0).toISOString(),
    ...(typeof ceremony.research_context === "string"
      ? { research_context: ceremony.research_context }
      : {}),
  };
}

export function extractCeremonyLogs(response: unknown): CeremonyLog[] {
  const candidate = Array.isArray(response)
    ? response
    : response && typeof response === "object" && Array.isArray((response as CeremonyListResponse).ceremonies)
      ? ((response as CeremonyListResponse).ceremonies as unknown[])
      : [];

  return candidate
    .map(normalizeCeremonyLog)
    .filter((ceremony): ceremony is CeremonyLog => ceremony !== null);
}
