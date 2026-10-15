import { NextResponse } from "next/server";
import { eventGitStatus, gitSyncMode, syncEventsToGit } from "@/lib/event-log";

const OFF = {
  error: "The git carriage is off — events.jsonl is not committed by the wheel.",
  hint: "Set MW_EVENTS_GIT_SYNC=push (or commit) and restart the wheel.",
};

/**
 * The event log carried by git (#164). GET: the mode and the last pass —
 * what was committed, whether it was pushed, how many commits the remote
 * still lacks, the last error. POST: commit (and push) now.
 */
export async function GET() {
  if (gitSyncMode() === "off") return NextResponse.json(OFF, { status: 409 });
  return NextResponse.json(eventGitStatus());
}

export async function POST() {
  if (gitSyncMode() === "off") return NextResponse.json(OFF, { status: 409 });
  const result = await syncEventsToGit();
  return NextResponse.json(result, { status: result?.error ? 502 : 200 });
}
