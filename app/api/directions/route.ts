import { NextResponse } from "next/server";
import { DIRECTIONS } from "@/lib/types";

export async function GET() {
  return NextResponse.json(DIRECTIONS);
}
