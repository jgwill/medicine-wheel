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

/** One line of a session's binding. The full shape and its schema are in `./binding.ts`. */
export type { BindingLine as SessionBinding } from './binding.js';
import type { BindingLine } from './binding.js';

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
  binding?: BindingLine;
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
