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

export interface SessionSummary {
  id: string;
  model?: string;
  cwd?: string;
  startedAt?: string;
  endedAt?: string;
  eventCount: number;
  hasTranscript: boolean;
  isActive: boolean;
  files: string[];
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
