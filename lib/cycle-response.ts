import type { DirectionName, MedicineWheelCycle } from "./types";

interface CycleListResponse {
  cycles?: unknown;
}

export type ApiMedicineWheelCycle = MedicineWheelCycle & {
  archived?: boolean;
};

const DIRECTION_NAMES = new Set<DirectionName>(["east", "south", "west", "north"]);

function asNonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : 0;
}

function asUnitInterval(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0;
}

export function normalizeMedicineWheelCycle(value: unknown): ApiMedicineWheelCycle | null {
  if (!value || typeof value !== "object") return null;

  const cycle = value as Record<string, unknown>;
  if (typeof cycle.id !== "string" || typeof cycle.research_question !== "string") {
    return null;
  }

  return {
    id: cycle.id,
    research_question: cycle.research_question,
    start_date:
      typeof cycle.start_date === "string"
        ? cycle.start_date
        : new Date(0).toISOString(),
    current_direction:
      typeof cycle.current_direction === "string" &&
      DIRECTION_NAMES.has(cycle.current_direction as DirectionName)
        ? (cycle.current_direction as DirectionName)
        : "east",
    beats: Array.isArray(cycle.beats)
      ? cycle.beats.filter((beatId): beatId is string => typeof beatId === "string")
      : [],
    ceremonies_conducted: asNonNegativeInteger(cycle.ceremonies_conducted),
    relations_mapped: asNonNegativeInteger(cycle.relations_mapped),
    wilson_alignment: asUnitInterval(cycle.wilson_alignment),
    ocap_compliant: cycle.ocap_compliant === true,
    ...(cycle.archived === true ? { archived: true } : {}),
  };
}

export function extractCycles(response: unknown): ApiMedicineWheelCycle[] {
  const candidate = Array.isArray(response)
    ? response
    : response && typeof response === "object" && Array.isArray((response as CycleListResponse).cycles)
      ? ((response as CycleListResponse).cycles as unknown[])
      : [];

  return candidate
    .map(normalizeMedicineWheelCycle)
    .filter((cycle): cycle is ApiMedicineWheelCycle => cycle !== null);
}
