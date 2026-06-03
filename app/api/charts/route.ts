import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

function getChartsFile(): string {
  const dataDir = process.env.MW_DATA_DIR ?? path.join(process.cwd(), ".mw", "store");
  return path.join(dataDir, "charts.jsonl");
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
    const direction = searchParams.get("direction");

    let charts = readJsonl<any>(getChartsFile());

    if (direction) {
      charts = charts.filter((c) => c.direction === direction);
    }

    charts.sort(
      (a: any, b: any) =>
        Date.parse(b.updated_at ?? b.created_at) -
        Date.parse(a.updated_at ?? a.created_at)
    );

    return NextResponse.json(charts);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const chart = {
      id: body.id || crypto.randomUUID(),
      desired_outcome: body.desired_outcome,
      current_reality: body.current_reality,
      direction: body.direction || "east",
      action_steps: body.action_steps ?? [],
      due_date: body.due_date,
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      phase: body.phase || "current_reality",
      ceremonies_linked: body.ceremonies_linked ?? [],
      wilson_alignment: body.wilson_alignment,
      cycle_id: body.cycle_id,
    };

    appendJsonl(getChartsFile(), chart);
    return NextResponse.json({ success: true, chart }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
