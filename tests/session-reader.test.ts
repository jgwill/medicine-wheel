import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getSessionDetail,
  getSessionSummary,
  getSessionBindings,
  listSessions,
  searchSessions,
} from "../src/session-reader/src/index";

// Fixtures in the shape the capture writes today: hook lines without a time,
// and a binding line per start, rename and end that carries `at`.

let root: string;
const saved = process.env.SESSION_DATA_DIR;

function write(session: string, file: string, lines: unknown[] | string) {
  const dir = path.join(root, session);
  fs.mkdirSync(dir, { recursive: true });
  const body = typeof lines === "string" ? lines : lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  fs.writeFileSync(path.join(dir, file), body);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "session-reader-"));
  process.env.SESSION_DATA_DIR = root;

  // A: started, ended, resumed. Two tool calls, each with a Pre and a Post line.
  write("aaaa", "_claude_session_starts.jsonl", [
    { hook_event_name: "SessionStart", session_id: "aaaa", model: "claude-opus-5-5", cwd: "/work/a", source: "startup" },
    { hook_event_name: "SessionStart", session_id: "aaaa", model: "claude-opus-5-5", cwd: "/work/a", source: "resume" },
  ]);
  write("aaaa", "_claude_SessionEnd.jsonl", [{ hook_event_name: "SessionEnd", session_id: "aaaa", reason: "prompt_input_exit" }]);
  write("aaaa", "_claude_PreToolUse.jsonl", [
    { hook_event_name: "PreToolUse", tool_name: "Bash" },
    { hook_event_name: "PreToolUse", tool_name: "Edit", file_path: "/work/a/x.ts" },
  ]);
  write("aaaa", "_claude_PostToolUse.jsonl", [
    { hook_event_name: "PostToolUse", tool_name: "Bash" },
    { hook_event_name: "PostToolUse", tool_name: "Edit", file_path: "/work/a/x.ts" },
  ]);
  write("aaaa", "_terminal_binding.jsonl", [
    { at: "2026-10-10T08:00:00.000Z", event: "session.start", source: "startup", name: { name: "a-first" } },
    { at: "2026-10-10T09:00:00.000Z", event: "session.end", name: { name: "a-first" } },
    { at: "2026-10-12T06:59:00.000Z", event: "session.rename", name: { name: "a-renamed", former: ["a-first"] } },
    { at: "2026-10-12T07:00:00.000Z", event: "session.start", source: "resume", name: { name: "a-renamed" }, tmux: { session: "a-pane" } },
  ]);
  write("aaaa", "custom-title.json", '{"customTitle":"a-renamed"}');

  // B: started and ended once. No title file, so the name comes from the binding.
  write("bbbb", "_claude_session_starts.jsonl", [{ hook_event_name: "SessionStart", session_id: "bbbb", model: "claude-haiku-5-5", cwd: "/work/b" }]);
  write("bbbb", "_claude_SessionEnd.jsonl", [{ hook_event_name: "SessionEnd", session_id: "bbbb" }]);
  write("bbbb", "_terminal_binding.jsonl", [
    { at: "2026-10-11T10:00:00.000Z", event: "session.start", name: { name: "b-name" } },
    { at: "2026-10-11T10:30:00.000Z", event: "session.end", name: { name: "b-name" } },
  ]);

  // C: a capture with PostToolUse lines only.
  write("cccc", "_claude_session_starts.jsonl", [{ hook_event_name: "SessionStart", session_id: "cccc", timestamp: "2026-01-01T00:00:00.000Z" }]);
  write("cccc", "_claude_PostToolUse.jsonl", [
    { hook_event_name: "PostToolUse", tool_name: "Read" },
    { hook_event_name: "PostToolUse", tool_name: "Read" },
    { hook_event_name: "PostToolUse", tool_name: "Write" },
  ]);
  write("cccc", "custom-title.json", '{"customTitle":"c-title"}');

  // D: no binding. Started, then ended later: the end file was written last.
  write("dddd", "_claude_session_starts.jsonl", [{ hook_event_name: "SessionStart", session_id: "dddd" }]);
  write("dddd", "_claude_SessionEnd.jsonl", [{ hook_event_name: "SessionEnd", session_id: "dddd" }]);
  fs.utimesSync(path.join(root, "dddd", "_claude_session_starts.jsonl"), new Date("2026-10-01T00:00:00Z"), new Date("2026-10-01T00:00:00Z"));
  fs.utimesSync(path.join(root, "dddd", "_claude_SessionEnd.jsonl"), new Date("2026-10-02T00:00:00Z"), new Date("2026-10-02T00:00:00Z"));

  // E: compacted, then ended. Two start lines and one end line, and the session is over.
  write("eeee", "_claude_session_starts.jsonl", [
    { hook_event_name: "SessionStart", session_id: "eeee", source: "startup" },
    { hook_event_name: "SessionStart", session_id: "eeee", source: "compact" },
  ]);
  write("eeee", "_claude_SessionEnd.jsonl", [{ hook_event_name: "SessionEnd", session_id: "eeee" }]);
  write("eeee", "_terminal_binding.jsonl", [
    { at: "2026-09-01T10:00:00.000Z", event: "session.start", source: "startup", name: { name: "e" } },
    { at: "2026-09-01T12:00:00.000Z", event: "session.start", source: "compact", name: { name: "e" } },
    { at: "2026-09-01T13:00:00.000Z", event: "session.end", name: { name: "e" } },
  ]);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  if (saved === undefined) delete process.env.SESSION_DATA_DIR;
  else process.env.SESSION_DATA_DIR = saved;
});

describe("session-reader: a session is its id, across resumes and renames", () => {
  it("reads a resumed session as active, with its first start from the binding line", async () => {
    const a = await getSessionSummary("aaaa");
    expect(a?.startCount).toBe(2);
    expect(a?.endCount).toBe(1);
    expect(a?.isActive).toBe(true);
    expect(a?.endedAt).toBeUndefined();
    expect(a?.startedAt).toBe("2026-10-10T08:00:00.000Z");
  });

  it("reads an ended session's end time from its binding line", async () => {
    const b = await getSessionSummary("bbbb");
    expect(b?.isActive).toBe(false);
    expect(b?.endedAt).toBe("2026-10-11T10:30:00.000Z");
  });

  it("names a session by its latest binding line, else by its custom title", async () => {
    expect((await getSessionSummary("aaaa"))?.name).toBe("a-renamed");
    expect((await getSessionSummary("bbbb"))?.name).toBe("b-name");
    expect((await getSessionSummary("cccc"))?.name).toBe("c-title");
    expect((await getSessionSummary("aaaa"))?.binding?.tmux?.session).toBe("a-pane");
  });

  it("reads a compacted session that then ended as ended, though it has more starts than ends", async () => {
    const e = await getSessionSummary("eeee");
    expect([e?.startCount, e?.endCount]).toEqual([2, 1]);
    expect(e?.isActive).toBe(false);
    expect(e?.endedAt).toBe("2026-09-01T13:00:00.000Z");
  });

  it("without a binding, decides from which file was written last", async () => {
    const d = await getSessionSummary("dddd");
    expect(d?.isActive).toBe(false);
    expect(d?.endedAt).toBe("2026-10-02T00:00:00.000Z");
  });

  it("keeps a legacy timestamp on the start line when there is no binding", async () => {
    expect((await getSessionSummary("cccc"))?.startedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns the binding lines oldest first", async () => {
    const lines = await getSessionBindings("aaaa");
    expect(lines.map((l) => l.event)).toEqual(["session.start", "session.end", "session.rename", "session.start"]);
    expect(await getSessionBindings("cccc")).toEqual([]);
  });
});

describe("session-reader: a tool call is counted once", () => {
  it("counts PreToolUse lines when they exist", async () => {
    const a = await getSessionDetail("aaaa");
    expect(a?.analytics.toolCallCount).toBe(2);
    expect(a?.analytics.toolUsage).toEqual({ Bash: 1, Edit: 1 });
    expect(a?.analytics.filesEdited).toEqual(["/work/a/x.ts"]);
  });

  it("counts PostToolUse lines when no PreToolUse was captured", async () => {
    const c = await getSessionDetail("cccc");
    expect(c?.analytics.toolCallCount).toBe(3);
    expect(c?.analytics.toolUsage).toEqual({ Read: 2, Write: 1 });
  });
});

describe("session-reader: listing uses the binding times", () => {
  it("sorts by first start, newest first, and filters by date", async () => {
    const all = await listSessions();
    expect(all.filter((s) => s.startedAt).map((s) => s.id)).toEqual(["bbbb", "aaaa", "eeee", "cccc"]);
    const recent = await listSessions({ since: "2026-10-11T00:00:00.000Z" });
    // A session whose start is unknown (no binding, no legacy timestamp) is kept by date filters.
    expect(recent.map((s) => s.id).sort()).toEqual(["bbbb", "dddd"]);
  });

  it("finds a session by its name", async () => {
    expect((await searchSessions("a-renamed")).map((s) => s.id)).toEqual(["aaaa"]);
  });
});
