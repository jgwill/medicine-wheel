import { NextResponse } from "next/server";
import {
  createProvider,
  detectProvider,
  type InquiryWeaveFilters,
  type WeaveRecord,
} from "@medicine-wheel/storage-provider";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = inquiryWeaveFiltersFromSearchParams(searchParams);
    const store = await createProvider();
    const inquiryWeaves = await store.listInquiryWeaves(filters);

    return NextResponse.json({
      inquiry_weaves: inquiryWeaves,
      provider: detectProvider(),
      count: inquiryWeaves.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const store = await createProvider();
    const record = (await request.json()) as WeaveRecord;

    if (!record || typeof record.id !== "string" || record.id.length === 0) {
      return NextResponse.json(
        { error: "Inquiry Weave registration requires a non-empty id" },
        { status: 400 },
      );
    }

    await store.registerInquiryWeave(record);

    return NextResponse.json(
      {
        success: true,
        inquiry_weave: record,
        provider: detectProvider(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function inquiryWeaveFiltersFromSearchParams(searchParams: URLSearchParams): InquiryWeaveFilters {
  const filters: InquiryWeaveFilters = {};
  const episodePath = searchParams.get("episode_path");
  const episodeNumber = searchParams.get("episode_number");
  const issue = searchParams.get("issue");
  const artefact = searchParams.get("artefact");

  if (episodePath) filters.episode_path = episodePath;
  if (episodeNumber) {
    const parsed = Number(episodeNumber);
    if (Number.isInteger(parsed)) filters.episode_number = parsed;
  }
  if (issue) filters.issue = issue;
  if (artefact) filters.artefact = artefact;

  return filters;
}
