/**
 * Medicine Wheel Session Reader — Session File Operations
 *
 * Reads agent session event data from _sessiondata/ JSONL files.
 * Zero external dependencies — only uses node:fs and node:path.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SessionSummary, SessionEvent, SessionAnalytics, SessionFilters, SessionBinding } from './types.js';

/**
 * Resolve the `_sessiondata/` root.
 *
 * `SESSION_DATA_DIR` wins when set. Otherwise the reader looks for a
 * `_sessiondata/` directory beneath the current working directory — the
 * package is codebase-agnostic and must not carry any one machine's layout
 * as a default.
 */
export function getSessionDir(): string {
  const configured = process.env.SESSION_DATA_DIR;
  if (configured && configured.trim()) return path.resolve(configured);
  return path.resolve(process.cwd(), '_sessiondata');
}

function parseJsonlLines(content: string): Record<string, unknown>[] {
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); }
      catch { return null; }
    })
    .filter(Boolean) as Record<string, unknown>[];
}

async function safeRead(filePath: string): Promise<string> {
  try { return await fs.readFile(filePath, 'utf-8'); }
  catch { return ''; }
}

function extractAnalytics(events: SessionEvent[]): SessionAnalytics {
  const toolUsage: Record<string, number> = {};
  const filesEdited = new Set<string>();
  const eventsByType: Record<string, number> = {};
  let promptCount = 0;
  let toolCallCount = 0;
  let errorCount = 0;
  let subagentCount = 0;
  let feedbackCount = 0;
  let firstPrompt: string | undefined;

  // A tool call writes a PreToolUse line and then a PostToolUse (or
  // PostToolUseFailure) line. Count each call once: at its PreToolUse line, or
  // at its PostToolUse line when the capture holds no PreToolUse lines at all.
  const callEvent = events.some((e) => e.hook_event_name === 'PreToolUse') ? 'PreToolUse' : 'PostToolUse';

  for (const e of events) {
    const type = String(e.hook_event_name || 'unknown');
    eventsByType[type] = (eventsByType[type] || 0) + 1;

    switch (type) {
      case 'UserPromptSubmit':
        promptCount++;
        if (!firstPrompt && e.prompt) firstPrompt = String(e.prompt);
        break;
      case 'PreToolUse':
      case 'PostToolUse':
        if (type === callEvent) {
          toolCallCount++;
          if (e.tool_name) {
            const name = String(e.tool_name);
            toolUsage[name] = (toolUsage[name] || 0) + 1;
          }
        }
        if (e.file_path) filesEdited.add(String(e.file_path));
        break;
      case 'PostToolUseFailure':
        errorCount++;
        break;
      case 'SubagentStart':
        subagentCount++;
        break;
      case 'CorrectiveFeedback':
      case 'AcceptedRedirection':
        feedbackCount++;
        break;
    }
  }

  return {
    toolUsage,
    filesEdited: [...filesEdited],
    promptCount,
    toolCallCount,
    errorCount,
    subagentCount,
    feedbackCount,
    eventsByType,
    firstPrompt,
  };
}

export async function listSessions(filters?: SessionFilters): Promise<SessionSummary[]> {
  const sessionDataDir = getSessionDir();
  const entries = await fs.readdir(sessionDataDir, { withFileTypes: true });
  const sessions: SessionSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'data' || entry.name === '_' || entry.name.startsWith('.')) continue;

    try {
      const summary = await getSessionSummary(entry.name);
      if (!summary) continue;

      if (filters) {
        if (filters.model && summary.model !== filters.model) continue;
        if (filters.hasTranscript !== undefined && summary.hasTranscript !== filters.hasTranscript) continue;
        if (filters.minEvents && summary.eventCount < filters.minEvents) continue;
        if (filters.maxEvents && summary.eventCount > filters.maxEvents) continue;
        if (filters.since && summary.startedAt && new Date(summary.startedAt) < new Date(filters.since)) continue;
        if (filters.until && summary.startedAt && new Date(summary.startedAt) > new Date(filters.until)) continue;
      }

      sessions.push(summary);
    } catch {
      // Skip unreadable sessions
    }
  }

  sessions.sort((a, b) => {
    if (!a.startedAt || !b.startedAt) return 0;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  return sessions;
}

export async function getDistinctModels(): Promise<string[]> {
  const sessionDataDir = getSessionDir();
  const entries = await fs.readdir(sessionDataDir, { withFileTypes: true });
  const models = new Set<string>();

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'data' || entry.name === '_') continue;
    const startFile = path.join(sessionDataDir, entry.name, '_claude_session_starts.jsonl');
    const content = await safeRead(startFile);
    if (!content) continue;
    const lines = parseJsonlLines(content);
    if (lines[0]?.model) models.add(String(lines[0].model));
  }

  return [...models].sort();
}

/**
 * The binding lines of a session (`_terminal_binding.jsonl`), oldest first:
 * one per start, resume, rename and end, each with its time. Empty when the
 * session was captured without the session-observability binding.
 */
export async function getSessionBindings(sessionId: string): Promise<SessionBinding[]> {
  const content = await safeRead(path.join(getSessionDir(), sessionId, '_terminal_binding.jsonl'));
  if (!content) return [];
  return parseJsonlLines(content) as SessionBinding[];
}

function lineCount(content: string): number {
  return content.trim() ? content.trim().split('\n').filter(Boolean).length : 0;
}

export async function getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
  const sessionDir = path.join(getSessionDir(), sessionId);

  try { await fs.access(sessionDir); }
  catch { return null; }

  const files = await fs.readdir(sessionDir);
  const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

  let model: string | undefined;
  let cwd: string | undefined;
  let startedAt: string | undefined;
  let endedAt: string | undefined;
  let eventCount = 0;
  let firstPrompt: string | undefined;
  let name: string | undefined;

  // Hook lines carry no time of their own (none of 240 recent sessions on the
  // host this was measured on, 2026-10-12). The binding line does.
  const bindings = await getSessionBindings(sessionId);
  const binding = bindings[bindings.length - 1];

  const startContent = await safeRead(path.join(sessionDir, '_claude_session_starts.jsonl'));
  if (startContent) {
    const lines = parseJsonlLines(startContent);
    if (lines[0]) {
      model = lines[0].model as string;
      cwd = lines[0].cwd as string;
      startedAt = (lines[0].timestamp || lines[0].created_at) as string | undefined;
    }
  }
  const firstStart = bindings.find((b) => b.event === 'session.start');
  if (firstStart?.at) startedAt = firstStart.at;
  if (!cwd && binding?.cwd) cwd = binding.cwd;

  const inputContent = await safeRead(path.join(sessionDir, '_claude_user_inputs.jsonl'));
  if (inputContent) {
    const lines = parseJsonlLines(inputContent);
    if (lines[0]?.prompt) firstPrompt = String(lines[0].prompt).slice(0, 200);
  }

  const endContent = await safeRead(path.join(sessionDir, '_claude_SessionEnd.jsonl'));
  const startCount = lineCount(startContent);
  const endCount = lineCount(endContent);

  // Counting starts against ends does not decide whether a session is open: a
  // context compaction writes a start with no end, and a crash or reboot ends a
  // session without writing one. What was written last decides. The binding
  // lines are in order and carry a time; without them, the file written last.
  let isActive: boolean;
  const lastStartOrEnd = [...bindings].reverse().find((b) => b.event === 'session.start' || b.event === 'session.end');
  if (lastStartOrEnd) {
    isActive = lastStartOrEnd.event === 'session.start';
    if (!isActive && lastStartOrEnd.at) endedAt = lastStartOrEnd.at;
  } else if (endCount === 0) {
    isActive = startCount > 0;
  } else {
    const [startStat, endStat] = await Promise.all([
      fs.stat(path.join(sessionDir, '_claude_session_starts.jsonl')).catch(() => null),
      fs.stat(path.join(sessionDir, '_claude_SessionEnd.jsonl')).catch(() => null),
    ]);
    isActive = !!startStat && !!endStat && startStat.mtimeMs > endStat.mtimeMs;
    if (!isActive) {
      const lines = parseJsonlLines(endContent);
      const last = lines[lines.length - 1];
      endedAt = ((last?.timestamp || last?.created_at) as string | undefined) ?? endStat?.mtime.toISOString();
    }
  }

  // The latest binding line carries the current name, renames included.
  if (binding?.name?.name) name = binding.name.name;
  if (!name) {
    try {
      const title = JSON.parse(await safeRead(path.join(sessionDir, 'custom-title.json')) || '{}');
      if (typeof title.customTitle === 'string' && title.customTitle) name = title.customTitle;
    } catch { /* no title */ }
  }

  for (const f of jsonlFiles) {
    const content = await safeRead(path.join(sessionDir, f));
    if (content) eventCount += lineCount(content);
  }

  const hasTranscript = files.includes('_transcript_final.jsonl');

  return {
    id: sessionId,
    model,
    cwd,
    name,
    startedAt,
    endedAt,
    startCount,
    endCount,
    eventCount,
    hasTranscript,
    isActive,
    files: jsonlFiles,
    binding,
    firstPrompt,
  };
}

export async function getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
  const sessionDir = path.join(getSessionDir(), sessionId);
  const files = await fs.readdir(sessionDir);
  const events: SessionEvent[] = [];

  const eventFiles = files.filter((f) => f.startsWith('_claude_') && f.endsWith('.jsonl'));

  for (const file of eventFiles) {
    const content = await safeRead(path.join(sessionDir, file));
    if (!content) continue;
    const lines = content.trim().split('\n').filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      try {
        const parsed = JSON.parse(lines[i]);
        events.push({ ...parsed, line_number: i + 1, _source_file: file });
      } catch { /* skip malformed lines */ }
    }
  }

  events.sort((a, b) => {
    if (a.timestamp && b.timestamp) return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    return 0;
  });

  return events;
}

export async function getSessionDetail(sessionId: string) {
  const summary = await getSessionSummary(sessionId);
  if (!summary) return null;
  const events = await getSessionEvents(sessionId);
  const analytics = extractAnalytics(events);
  return { ...summary, analytics };
}

export async function searchSessions(query: string, limit = 50): Promise<SessionSummary[]> {
  const all = await listSessions();
  const results: SessionSummary[] = [];
  const lowerQuery = query.toLowerCase();

  for (const session of all) {
    if (results.length >= limit) break;

    if (session.id.includes(lowerQuery) ||
        session.model?.toLowerCase().includes(lowerQuery) ||
        session.cwd?.toLowerCase().includes(lowerQuery) ||
        session.name?.toLowerCase().includes(lowerQuery) ||
        session.firstPrompt?.toLowerCase().includes(lowerQuery)) {
      results.push(session);
    }
  }

  return results;
}

export async function readSessionFile(sessionId: string, fileName: string): Promise<unknown[]> {
  const filePath = path.join(getSessionDir(), sessionId, fileName);
  const content = await safeRead(filePath);
  if (!content) return [];
  return parseJsonlLines(content);
}

export async function getLatestEvents(sessionId: string, sinceLineCount = 0): Promise<SessionEvent[]> {
  const events = await getSessionEvents(sessionId);
  return events.slice(sinceLineCount);
}
