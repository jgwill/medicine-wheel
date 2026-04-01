import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/packages";

export async function GET() {
  try {
    const analysis = getAnalysis();
    return NextResponse.json(analysis);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
