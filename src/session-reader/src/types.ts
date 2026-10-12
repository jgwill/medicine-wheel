/**
 * Medicine Wheel Session Reader — Types
 *
 * Shared types for agent session event data from _sessiondata/ JSONL files.
 */

export interface SessionEvent {
  session_id?: string;
  hook_event_name?: string;
  timestamp?: string;
  line_number: number;
  _source_file?: string;
  // SessionStart
  cwd?: string;
  model?: string;
  source?: string;
  transcript_path?: string;
  permission_mode?: string;
  // UserPromptSubmit
  prompt?: string;
  // Tool use
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: string;
  file_path?: string;
  old_string?: string;
  new_string?: string;
  // SessionEnd
  reason?: string;
  // SubagentStart
  agent_id?: string;
  agent_transcript_path?: string;
  // Stop
  stop_hook_active?: boolean;
  // CorrectiveFeedback
  is_error?: boolean;
  feedback?: string;
  tool_use_id?: string;
  // PermissionRequest
  permission_suggestions?: unknown[];
  // Generic extensibility
  [key: string]: unknown;
}

export interface SessionAnalytics {
  /** Calls per tool. A call is counted once, at its PreToolUse line (or its PostToolUse line when no PreToolUse was captured). */
  toolUsage: Record<string, number>;
  filesEdited: string[];
  promptCount: number;
  toolCallCount: number;
  errorCount: number;
  subagentCount: number;
  feedbackCount: number;
  eventsByType: Record<string, number>;
  firstPrompt?: string;
}

/**
 * One line of a session's binding, from `_terminal_binding.jsonl`. The
 * session-observability capture writes a line at every start, resume, rename
 * and end: which terminal held the session, under which name, for which team
 * and episode, and when. It is the only capture file whose lines carry a time
 * (`at`); the hook files do not.
 */
export interface SessionBinding {
  /** ISO time the line was written. */
  at?: string;
  /** `session.start`, `session.rename` or `session.end`. */
  event?: string;
  /** For a start: `startup`, `resume`, `clear`… */
  source?: string;
  /** The engine: `claude`, `hermes`, `gemini`, `codex`… */
  agent?: string;
  host?: string;
  cwd?: string;
  /** The session's current name and the names it had before. */
  name?: { name?: string; source?: string; since?: number; former?: string[] };
  /** The terminal that held the session at that moment. */
  tmux?: { session?: string; window?: number; pane?: number; pane_id?: string; socket?: string };
  team?: { id?: string; source?: string };
  /** `source: 'declared'` is a shell-wide default, not evidence the session worked in that episode. */
  episode?: { id?: string; source?: string };
  [key: string]: unknown;
}

/**
 * What the reader knows about one session.
 *
 * A session is identified by its session id. The id survives a resume and a
 * rename; a fork is a new session. `isActive` and `endedAt` describe the
 * capture: a session that ended can be resumed later and become active again.
 * Whether a person decided the session is finished is not in the capture.
 */
export interface SessionSummary {
  id: string;
  model?: string;
  cwd?: string;
  /** The session's name: the name on its latest binding line, else its custom title. */
  name?: string;
  /** First start, from the binding line; else a legacy `timestamp`/`created_at` on the start line. */
  startedAt?: string;
  /** When it last ended, when it is not active. */
  endedAt?: string;
  /** Start lines captured: the first start, each resume, each compaction or clear. */
  startCount: number;
  /** End lines captured. A crash or a reboot ends a session without one. */
  endCount: number;
  eventCount: number;
  hasTranscript: boolean;
  /** Open in the capture: its last start or end line is a start (binding order, else file times). */
  isActive: boolean;
  files: string[];
  /** The latest binding line, when the capture has one. */
  binding?: SessionBinding;
  analytics?: SessionAnalytics;
  firstPrompt?: string;
}

export interface SessionFilters {
  model?: string;
  hasTranscript?: boolean;
  minEvents?: number;
  maxEvents?: number;
  since?: string;
  until?: string;
}

export const EVENT_ICONS: Record<string, string> = {
  SessionStart: '🚀',
  UserPromptSubmit: '💬',
  PreToolUse: '🔧',
  PostToolUse: '✅',
  PostToolUseFailure: '❌',
  SessionEnd: '🏁',
  Notification: '🔔',
  SubagentStart: '🤖',
  SubagentStop: '⏹️',
  Stop: '🛑',
  CorrectiveFeedback: '📝',
  AcceptedRedirection: '↩️',
  PermissionRequest: '🔐',
};
