import { NextResponse } from "next/server";
import {
  createProvider,
  detectProvider,
  type PlanPerspectiveFilters,
  type PlanPerspectiveRecord,
} from "@medicine-wheel/storage-provider";

const PERSPECTIVE_ID_PREFIX = "plan-perspective:";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = planPerspectiveFiltersFromSearchParams(searchParams);

    if (
      filters.episode_path === undefined &&
      filters.session_id === undefined &&
      filters.id === undefined
    ) {
      return NextResponse.json(
        { error: "Plan Perspective queries require episode_path, session_id, or id" },
        { status: 400 },
      );
    }

    const store = await createProvider();
    const planPerspectives = await store.listPlanPerspectives(filters);

    return NextResponse.json({
      plan_perspectives: planPerspectives,
      provider: detectProvider(),
      count: planPerspectives.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let record: PlanPerspectiveRecord;
  try {
    record = (await request.json()) as PlanPerspectiveRecord;
  } catch {
    return NextResponse.json(
      { error: "Plan Perspective registration requires a JSON body" },
      { status: 400 },
    );
  }

  const validationError = validatePerspectiveRecord(record);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const store = await createProvider();
    const merged = await store.registerPlanPerspective(record);

    return NextResponse.json(
      {
        success: true,
        record: merged,
        provider: detectProvider(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function planPerspectiveFiltersFromSearchParams(
  searchParams: URLSearchParams,
): PlanPerspectiveFilters {
  const filters: PlanPerspectiveFilters = {};
  const episodePath = searchParams.get("episode_path");
  const sessionId = searchParams.get("session_id");
  const id = searchParams.get("id");

  if (episodePath) filters.episode_path = episodePath;
  if (sessionId) filters.session_id = sessionId;
  if (id) filters.id = id;

  return filters;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates the PerspectiveRecord spine; unknown fields pass through untouched. */
function validatePerspectiveRecord(record: unknown): string | null {
  if (!isPlainObject(record)) {
    return "Plan Perspective registration requires a PerspectiveRecord object";
  }
  if (!isNonEmptyString(record.id) || !record.id.startsWith(PERSPECTIVE_ID_PREFIX)) {
    return `Plan Perspective id must be a non-empty string starting with '${PERSPECTIVE_ID_PREFIX}'`;
  }
  if (record.perspective !== 1) {
    return "Plan Perspective record requires perspective: 1";
  }
  if (
    !isPlainObject(record.plan) ||
    !isNonEmptyString(record.plan.session_id) ||
    !isNonEmptyString(record.plan.plan_filename) ||
    !isNonEmptyString(record.plan.plan_sha256)
  ) {
    return "Plan Perspective record requires plan.session_id, plan.plan_filename, and plan.plan_sha256";
  }
  if (
    !isPlainObject(record.narrative) ||
    !isNonEmptyString(record.narrative.title) ||
    typeof record.narrative.body_markdown !== "string"
  ) {
    return "Plan Perspective record requires narrative.title and narrative.body_markdown";
  }
  if (
    !Array.isArray(record.episodes) ||
    record.episodes.some((episode) => !isPlainObject(episode) || !isNonEmptyString(episode.path))
  ) {
    return "Plan Perspective episodes must be an array of { path } relations (may be empty)";
  }
  if (
    !isPlainObject(record.source) ||
    !isNonEmptyString(record.source.registered_at) ||
    !isNonEmptyString(record.source.updated_at)
  ) {
    return "Plan Perspective record requires source.registered_at and source.updated_at";
  }
  return null;
}
