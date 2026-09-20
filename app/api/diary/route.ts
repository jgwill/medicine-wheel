import { NextResponse } from "next/server";
import { parseLimit } from "@/lib/api-paging";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";
import type { DiaryEntryFilters, DiaryEntryRecord } from "@medicine-wheel/storage-provider";
import { createDiaryEntry } from "@medicine-wheel/ceremonial-diary";
import { projectDiaryEntry } from "@medicine-wheel/honcho";
import { projectAfterWrite } from "@/lib/honcho-projection";

/**
 * The ceremonial diary door (0.14.0).
 *
 * The storage provider has carried diary records since 0.6 (`registerDiaryEntry`,
 * `listDiaryEntries`); no route exposed them, so every consumer that wanted a
 * diary kept its own jsonl beside the wheel. This door reads and writes the
 * same collection the MCP and the provider share.
 *
 * A diary entry is a participant's voice inside a ceremony. It may name the
 * ceremony it belongs to (`ceremony_id`, carried in metadata) and the chronicle
 * episode it writes into (`chronicle`, `chronicle:<episode-folder>`); both are
 * optional — the diary can speak whether or not it writes into an episode.
 */

const PHASES = ["miigwechiwendam", "nindokendaan", "ningwaab", "nindoodam", "migwech"] as const;
const ENTRY_TYPES = ["intention", "observation", "hypothesis", "data", "synthesis", "action", "reflection", "learning"] as const;

type Phase = DiaryEntryRecord["phase"];
type EntryType = DiaryEntryRecord["entryType"];

function ceremonyOf(entry: DiaryEntryRecord): string | undefined {
  const value = entry.metadata?.ceremony_id;
  return typeof value === "string" && value ? value : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    if (limit instanceof NextResponse) return limit;

    const participant = searchParams.get("participant") ?? undefined;
    const phase = searchParams.get("phase") ?? undefined;
    const entryType = searchParams.get("entryType") ?? searchParams.get("entry_type") ?? undefined;
    const chronicle = searchParams.get("chronicle") ?? undefined;
    const ceremonyId = searchParams.get("ceremony_id") ?? undefined;
    const tags = searchParams.getAll("tag");

    if (phase && !PHASES.includes(phase as Phase)) {
      return NextResponse.json({ error: `Invalid phase: ${phase}`, hint: PHASES.join(", ") }, { status: 400 });
    }
    if (entryType && !ENTRY_TYPES.includes(entryType as EntryType)) {
      return NextResponse.json({ error: `Invalid entryType: ${entryType}`, hint: ENTRY_TYPES.join(", ") }, { status: 400 });
    }

    const filters: DiaryEntryFilters = {
      ...(participant ? { participant } : {}),
      ...(phase ? { phase: phase as Phase } : {}),
      ...(entryType ? { entryType: entryType as EntryType } : {}),
      ...(tags.length ? { tags } : {}),
    };

    const store = await createProvider();
    const all = await store.listDiaryEntries(filters);
    let entries = all;
    if (chronicle) entries = entries.filter((e) => e.chronicle === chronicle);
    if (ceremonyId) entries = entries.filter((e) => ceremonyOf(e) === ceremonyId);
    const matched = entries.length;
    if (limit !== null && entries.length > limit) entries = entries.slice(0, limit);

    return NextResponse.json({
      entries,
      provider: detectProvider(),
      count: entries.length,
      total: all.length,
      ...(chronicle || ceremonyId ? { matched } : {}),
      truncated: entries.length < matched,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }
    const { participant, phase, entryType, content } = body;
    if (typeof participant !== "string" || !participant.trim()) {
      return NextResponse.json({ error: "participant is required" }, { status: 400 });
    }
    if (typeof phase !== "string" || !PHASES.includes(phase as Phase)) {
      return NextResponse.json({ error: `phase must be one of: ${PHASES.join(", ")}` }, { status: 400 });
    }
    if (typeof entryType !== "string" || !ENTRY_TYPES.includes(entryType as EntryType)) {
      return NextResponse.json({ error: `entryType must be one of: ${ENTRY_TYPES.join(", ")}` }, { status: 400 });
    }
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    const metadata: Record<string, unknown> =
      body.metadata && typeof body.metadata === "object" ? { ...(body.metadata as Record<string, unknown>) } : {};
    const store = await createProvider();
    if (typeof body.ceremony_id === "string" && body.ceremony_id) {
      if (!(await store.getCeremony(body.ceremony_id))) {
        return NextResponse.json(
          { error: `Cannot write into a ceremony that does not exist: ${body.ceremony_id}` },
          { status: 404 },
        );
      }
      metadata.ceremony_id = body.ceremony_id;
    }
    const entry = await createDiaryEntry(store, {
      ...(typeof body.id === "string" && body.id ? { id: body.id } : {}),
      ...(typeof body.timestamp === "string" && body.timestamp ? { timestamp: body.timestamp } : {}),
      participant: participant.trim(),
      phase: phase as Phase,
      entryType: entryType as EntryType,
      content,
      metadata,
      ...(typeof body.agent === "string" && body.agent ? { agent: body.agent } : {}),
      ...(typeof body.chronicle === "string" && body.chronicle ? { chronicle: body.chronicle } : {}),
    });
    // The river: the participant's voice leaves for Honcho in the background
    // when HONCHO_URL is set. Never awaited.
    projectAfterWrite(() => projectDiaryEntry(entry), `diary entry ${entry.id}`);
    return NextResponse.json({ success: true, entry, provider: detectProvider() }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
