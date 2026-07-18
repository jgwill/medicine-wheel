import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

function getMmotsFile(): string {
  const dataDir = process.env.MW_DATA_DIR ?? path.join(process.cwd(), ".mw", "store");
  return path.join(dataDir, "mmots.jsonl");
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

function appendJsonl<T>(filePath: string, item: T): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(item) + "\n", "utf-8");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chartId = searchParams.get("chart_id");

    let mmots = readJsonl<{ chart_id?: string; [key: string]: unknown }>(getMmotsFile());

    if (chartId) {
      mmots = mmots.filter((m) => m.chart_id === chartId);
    }

    return NextResponse.json(mmots);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const mmot = {
      id: body.id || crypto.randomUUID(),
      chart_id: body.chart_id,
      timestamp: new Date().toISOString(),
      step1_expected: body.step1_expected,
      step1_actual: body.step1_actual,
      step2_analysis: body.step2_analysis,
      step3_adjustments: body.step3_adjustments ?? [],
      step4_feedback: body.step4_feedback,
    };

    appendJsonl(getMmotsFile(), mmot);
    return NextResponse.json({ success: true, mmot }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
