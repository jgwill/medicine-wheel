import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createProvider,
  detectProvider,
  captureRecordId,
  CAPTURE_KINDS,
  CAPTURE_ORIGINS,
  type CaptureFilters,
} from "@medicine-wheel/storage-provider";

/**
 * The capture registry's HTTP door: records + URIs only, never bytes. The
 * bytes stay behind the capture service (@miadi/capture and the gmtermux
 * edge); this route makes what was captured queryable for chronicle surfaces
 * such as forgewright episode views.
 *
 * `/api/captures` is the CANONICAL path (capture-vocabulary.spec.md §8).
 * `/api/recordings` remains as a deprecated alias re-exporting these same
 * handlers — see app/api/recordings/route.ts for the removal condition.
 */

/** The query params `GET /api/captures` understands. Anything else is a 400. */
const CAPTURE_FILTER_PARAMS = [
  "episode_path",
  "episode_number",
  "composition",
  "kind",
  "origin",
  "device",
  "filename",
] as const;

/**
 * A silently-ignored filter is the failure this route refuses to repeat from
 * /api/nodes' history: a consumer that asks `?kinds=audio` and receives a
 * filtered-looking payload it never filtered has been lied to. An unknown
 * param is a 400 naming what is accepted, not a shrug.
 */
function rejectUnknownParams(searchParams: URLSearchParams) {
  const unknown = [...new Set(searchParams.keys())].filter(
    (key) => !(CAPTURE_FILTER_PARAMS as readonly string[]).includes(key),
  );
  if (unknown.length === 0) return null;

  return NextResponse.json(
    {
      error: `Unknown query parameter${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")} — nothing was filtered.`,
      accepted: [...CAPTURE_FILTER_PARAMS],
    },
    { status: 400 },
  );
}

/**
 * Build filters from validated params. A value that cannot mean anything
 * (`?kind=holograph`, `?episode_number=abc`) is answered with a 400 naming the
 * accepted values, for the same honesty reason unknown params are.
 */
function captureFiltersFromSearchParams(
  searchParams: URLSearchParams,
): { filters: CaptureFilters } | { rejection: NextResponse } {
  const filters: CaptureFilters = {};

  // An empty value means "no filter" — forms submit "" for an unchosen option.
  const episodePath = searchParams.get("episode_path");
  const episodeNumber = searchParams.get("episode_number");
  const composition = searchParams.get("composition");
  const kind = searchParams.get("kind");
  const origin = searchParams.get("origin");
  const device = searchParams.get("device");
  const filename = searchParams.get("filename");

  if (episodePath) filters.episode_path = episodePath;
  if (episodeNumber) {
    const parsed = Number(episodeNumber);
    if (!Number.isInteger(parsed)) {
      return {
        rejection: NextResponse.json(
          { error: `episode_number must be an integer, got: ${episodeNumber} — nothing was filtered.` },
          { status: 400 },
        ),
      };
    }
    filters.episode_number = parsed;
  }
  if (composition) filters.composition = composition;
  if (kind) {
    if (!(CAPTURE_KINDS as readonly string[]).includes(kind)) {
      return {
        rejection: NextResponse.json(
          {
            error: `Unknown kind: ${kind} — nothing was filtered.`,
            accepted: [...CAPTURE_KINDS],
          },
          { status: 400 },
        ),
      };
    }
    filters.kind = kind as CaptureFilters["kind"];
  }
  if (origin) {
    if (!(CAPTURE_ORIGINS as readonly string[]).includes(origin)) {
      return {
        rejection: NextResponse.json(
          {
            error: `Unknown origin: ${origin} — nothing was filtered.`,
            accepted: [...CAPTURE_ORIGINS],
          },
          { status: 400 },
        ),
      };
    }
    filters.origin = origin as CaptureFilters["origin"];
  }
  if (device) filters.device = device;
  if (filename) filters.filename = filename;

  return { filters };
}

const CaptureRegisterSchema = z
  .object({
    // Derived from filename (+ episode_path) via captureRecordId when absent.
    id: z.string().trim().min(1).optional(),
    filename: z
      .string({ required_error: "filename is required" })
      .trim()
      .min(1, "cannot be empty"),
    kind: z.enum(CAPTURE_KINDS),
    origin: z.enum(CAPTURE_ORIGINS),
    // Where the bytes live — the registry stores this pointer, never bytes.
    uri: z.string({ required_error: "uri is required" }).trim().min(1, "cannot be empty"),
    // Capture provenance — observed, not demanded. All optional.
    device: z.string().optional(),
    started_at: z.string().optional(),
    stopped_at: z.string().optional(),
    duration_seconds: z.number().nonnegative().optional(),
    bytes: z.number().int().nonnegative().optional(),
    sha256: z.string().optional(),
    mimetype: z.string().optional(),
    // Associations — 0, 1, or 2 belongings; at most declared, never demanded
    // (capture-vocabulary.spec.md §5). No xor, no refinement: a take with
    // neither belonging is an inbox take, whole and waiting for a choice.
    episode_path: z.string().optional(),
    episode_number: z.number().int().optional(),
    composition: z.string().optional(),
    source_artifact: z.string().optional(),
    registered_at: z.string().optional(),
    source: z.string().optional(),
  })
  // Future fields survive registration, as every sibling family preserves them.
  .passthrough();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const unknownRejection = rejectUnknownParams(searchParams);
    if (unknownRejection) return unknownRejection;

    const built = captureFiltersFromSearchParams(searchParams);
    if ("rejection" in built) return built.rejection;
    const { filters } = built;
    const filtering = Object.keys(filters).length > 0;

    const store = await createProvider();
    const captures = await store.listCaptures(filters);

    return NextResponse.json({
      captures,
      // DEPRECATED echo of the same array under the old key. forgewright's
      // fetchRecordingRecords reads `recordings` (or `records`) fail-closed —
      // a body that only said `captures` would land as silent empty enrichment.
      // Remove when forgewright's fetchRecordingRecords targets /api/captures
      // (coupling point, capture-vocabulary.spec.md).
      recordings: captures,
      provider: detectProvider(),
      count: captures.length,
      // Echoed only when asked for, so a caller can tell an empty result from
      // an unapplied filter — the same contract /api/nodes keeps.
      ...(filtering ? { filters } : {}),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = CaptureRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid capture — nothing was registered.",
          issues: parsed.error.issues.map(
            (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const record = {
      ...data,
      id: data.id ?? captureRecordId(data.filename, data.episode_path),
      registered_at: data.registered_at ?? new Date().toISOString(),
    };

    const store = await createProvider();
    const capture = await store.registerCapture(record);

    return NextResponse.json(
      { success: true, capture, provider: detectProvider() },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
