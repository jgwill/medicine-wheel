import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createProvider,
  detectProvider,
  recordingRecordId,
  RECORDING_KINDS,
  RECORDING_ORIGINS,
  type RecordingFilters,
} from "@medicine-wheel/storage-provider";

/**
 * The recording registry's HTTP door: records + URIs only, never bytes. The
 * bytes stay behind the capture service (@miadi/recording and the gmtermux
 * edge); this route makes what was captured queryable for chronicle surfaces
 * such as forgewright episode views.
 */

/** The query params `GET /api/recordings` understands. Anything else is a 400. */
const RECORDING_FILTER_PARAMS = [
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
    (key) => !(RECORDING_FILTER_PARAMS as readonly string[]).includes(key),
  );
  if (unknown.length === 0) return null;

  return NextResponse.json(
    {
      error: `Unknown query parameter${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")} — nothing was filtered.`,
      accepted: [...RECORDING_FILTER_PARAMS],
    },
    { status: 400 },
  );
}

/**
 * Build filters from validated params. A value that cannot mean anything
 * (`?kind=holograph`, `?episode_number=abc`) is answered with a 400 naming the
 * accepted values, for the same honesty reason unknown params are.
 */
function recordingFiltersFromSearchParams(
  searchParams: URLSearchParams,
): { filters: RecordingFilters } | { rejection: NextResponse } {
  const filters: RecordingFilters = {};

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
    if (!(RECORDING_KINDS as readonly string[]).includes(kind)) {
      return {
        rejection: NextResponse.json(
          {
            error: `Unknown kind: ${kind} — nothing was filtered.`,
            accepted: [...RECORDING_KINDS],
          },
          { status: 400 },
        ),
      };
    }
    filters.kind = kind as RecordingFilters["kind"];
  }
  if (origin) {
    if (!(RECORDING_ORIGINS as readonly string[]).includes(origin)) {
      return {
        rejection: NextResponse.json(
          {
            error: `Unknown origin: ${origin} — nothing was filtered.`,
            accepted: [...RECORDING_ORIGINS],
          },
          { status: 400 },
        ),
      };
    }
    filters.origin = origin as RecordingFilters["origin"];
  }
  if (device) filters.device = device;
  if (filename) filters.filename = filename;

  return { filters };
}

const RecordingRegisterSchema = z
  .object({
    // Derived from filename (+ episode_path) via recordingRecordId when absent.
    id: z.string().trim().min(1).optional(),
    filename: z
      .string({ required_error: "filename is required" })
      .trim()
      .min(1, "cannot be empty"),
    kind: z.enum(RECORDING_KINDS),
    origin: z.enum(RECORDING_ORIGINS),
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
    // Associations.
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

    const built = recordingFiltersFromSearchParams(searchParams);
    if ("rejection" in built) return built.rejection;
    const { filters } = built;
    const filtering = Object.keys(filters).length > 0;

    const store = await createProvider();
    const recordings = await store.listRecordings(filters);

    return NextResponse.json({
      recordings,
      provider: detectProvider(),
      count: recordings.length,
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
    const parsed = RecordingRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid recording — nothing was registered.",
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
      id: data.id ?? recordingRecordId(data.filename, data.episode_path),
      registered_at: data.registered_at ?? new Date().toISOString(),
    };

    const store = await createProvider();
    const recording = await store.registerRecording(record);

    return NextResponse.json(
      { success: true, recording, provider: detectProvider() },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
