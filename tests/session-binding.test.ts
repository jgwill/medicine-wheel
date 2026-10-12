import { describe, expect, it } from "vitest";
import {
  BINDING_LINE_SCHEMA,
  foldBindingLines,
  parseBindingLines,
  sessionIdentities,
  sessionsOfEpisode,
  type BindingLine,
} from "../src/session-reader/src/index";

const EP = "2026-10-12-episode-554-the-session-inventory-closes-its-first-cycle";
const DECLARED = "2026-06-28-episode-103-film-preprod-report-phase-2";

const lines: BindingLine[] = [
  { at: "2026-10-12T08:00:00.000Z", event: "session.start", source: "startup", agent: "claude", session_id: "s1",
    name: { name: "auto-1" }, tmux: { session: "work", window: 0, pane: 0, pane_id: "%7" },
    team: { id: "T3", source: "name" }, episode: { id: DECLARED, source: "declared" }, argv: ["claude"] },
  { at: "2026-10-12T08:05:00.000Z", event: "session.rename", session_id: "s1",
    name: { name: "inventory", source: "user", former: ["auto-1"] }, episode: { id: EP, source: "add-dir" } },
  { at: "2026-10-12T09:00:00.000Z", event: "session.end", source: "prompt_input_exit", session_id: "s1", name: { name: "inventory" } },
  // Written after the end: an observation does not reopen the session.
  { at: "2026-10-12T09:01:00.000Z", event: "session.observed", session_id: "s1", tmux: { session: "work", window: 0, pane: 1, pane_id: "%8" } },
  // An older line arriving late does not roll the name back.
  { at: "2026-10-12T07:59:00.000Z", event: "session.rename", session_id: "s1", name: { name: "stale" } },
  // A headless run, resumed after it ended.
  { at: "2026-10-12T10:00:00.000Z", event: "session.start", session_id: "s2", argv: ["claude", "-p", "hi"], episode: { id: DECLARED, source: "declared" } },
  { at: "2026-10-12T10:01:00.000Z", event: "session.end", session_id: "s2" },
  { at: "2026-10-12T10:02:00.000Z", event: "session.start", source: "resume", session_id: "s2" },
  // No time: skipped.
  { event: "session.start", session_id: "s3" },
];

describe("binding line: one fold for every reader", () => {
  it("parses lines and skips a torn one", () => {
    const parsed = parseBindingLines(`${JSON.stringify(lines[0])}\n{"at":"2026-10-12T08:0\n\n${JSON.stringify(lines[2])}\n`);
    expect(parsed.map((l) => l.event)).toEqual(["session.start", "session.end"]);
  });

  it("takes the newest value field by field, and keeps former names", () => {
    const s1 = foldBindingLines(lines).get("s1")!;
    expect(s1.name).toBe("inventory");
    expect(s1.former_names).toEqual(["auto-1"]);
    expect(s1.team).toEqual({ id: "T3", source: "name" });
    expect(s1.tmux).toBe("work:0.1");
    expect(s1.pane_id).toBe("%8");
    expect(s1.first_seen).toBe("2026-10-12T07:59:00.000Z");
    expect(s1.events).toBe(5);
  });

  it("decides ended by the last start or end line, not by the last line", () => {
    const s1 = foldBindingLines(lines).get("s1")!;
    expect(s1.ended).toBe(true);
    expect(s1.ended_at).toBe("2026-10-12T09:00:00.000Z");
    expect(s1.last_event).toBe("session.observed");
    const s2 = foldBindingLines(lines).get("s2")!;
    expect(s2.ended).toBe(false);
    expect(s2.starts).toBe(2);
  });

  it("never binds a session to a declared episode", () => {
    const s1 = foldBindingLines(lines).get("s1")!;
    expect(s1.episode).toEqual({ id: EP, source: "add-dir" });
    expect(s1.episodes).toEqual([EP]);
    expect(foldBindingLines(lines).get("s2")!.episodes).toEqual([]);
    expect(sessionsOfEpisode(lines, EP).map((s) => s.session_id)).toEqual(["s1"]);
    expect(sessionsOfEpisode(lines, DECLARED)).toEqual([]);
  });

  it("marks a headless run and skips lines without a time", () => {
    const all = sessionIdentities(lines);
    expect(all.map((s) => s.session_id)).toEqual(["s1", "s2"]);
    expect(all.find((s) => s.session_id === "s2")!.headless).toBe(true);
    expect(all.find((s) => s.session_id === "s1")!.headless).toBe(false);
  });

  it("publishes a schema that requires the three fields every reader keys on", () => {
    expect(BINDING_LINE_SCHEMA.required).toEqual(["at", "event", "session_id"]);
    expect(BINDING_LINE_SCHEMA.additionalProperties).toBe(true);
  });
});
