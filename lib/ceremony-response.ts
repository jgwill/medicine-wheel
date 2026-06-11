import type { CeremonyLog } from "@/lib/types";

interface CeremonyListResponse {
  ceremonies?: unknown;
}

export function extractCeremonyLogs(response: unknown): CeremonyLog[] {
  if (Array.isArray(response)) return response as CeremonyLog[];

  if (!response || typeof response !== "object") return [];

  const candidate = response as CeremonyListResponse;
  return Array.isArray(candidate.ceremonies)
    ? (candidate.ceremonies as CeremonyLog[])
    : [];
}
