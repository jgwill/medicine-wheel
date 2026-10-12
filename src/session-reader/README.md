# @medicine-wheel/session-reader

Session event reader for the Medicine Wheel Developer Suite — JSONL parsing, session summaries, analytics extraction, and search across agent session data.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## Overview

This package reads agent session event data from `_sessiondata/` JSONL files. Zero external dependencies — only uses Node.js built-ins.

### What it provides

| Module | Description |
|--------|-------------|
| `sessions` | Session listing, detail retrieval, search, and utility functions |
| `types` | TypeScript type definitions and constants for session events |

## What the reader calls a session

A session is one agent conversation, identified by its session id. The id
survives a resume and a rename. A fork starts a new session with a new id.

The capture keeps one folder per session id under `_sessiondata/`:

| file | what it holds |
|------|---------------|
| `_claude_<HookEvent>.jsonl`, `_claude_session_starts.jsonl`, `_claude_user_inputs.jsonl` | one line per hook event. These lines carry no time of their own. |
| `_terminal_binding.jsonl` | one line per start, resume, rename and end: the time (`at`), the terminal that held the session, its name and former names, its team and its episode. Written by the session-observability capture. |
| `custom-title.json` | the name given with `/rename`, when there was one |

So the reader takes times from the binding lines. A session is **active** when
its last start or end line is a start. Counting starts against ends does not
decide this: a context compaction writes a start with no end, and a crash or a
reboot ends a session without writing one. Without binding lines, the reader
compares which of the start and end files was written last.

An ended session can be resumed and become active again. Whether a person
decided that a session's work is finished is not in the capture.

## Installation

```bash
npm install @medicine-wheel/session-reader
```

Or link locally:
```bash
npm link ../medicine-wheel/src/session-reader
```

## Usage

```typescript
import {
  // Session operations
  listSessions,
  getSessionDetail,
  getSessionSummary,
  getSessionEvents,
  searchSessions,
  readSessionFile,
  getLatestEvents,
  getDistinctModels,

  // Types
  type SessionEvent,
  type SessionAnalytics,
  type SessionSummary,
  type SessionFilters,

  // Constants
  EVENT_ICONS,
} from '@medicine-wheel/session-reader';
```

### Sub-path exports

```typescript
import type { SessionEvent, SessionFilters } from '@medicine-wheel/session-reader/types';
import { listSessions, searchSessions } from '@medicine-wheel/session-reader/sessions';
```

## Configuration

The reader locates the `_sessiondata/` root in this order:

| Source | Value |
|--------|-------|
| `SESSION_DATA_DIR` environment variable | Used as-is (resolved to an absolute path) when set |
| Default | `_sessiondata/` beneath the current working directory |

The package carries no machine-specific default. Call `getSessionDir()` to see
which directory a given process will read.

```bash
SESSION_DATA_DIR=/srv/agents/_sessiondata node my-report.js
```

## API Reference

### Session directory

**`getSessionDir()`** — The absolute `_sessiondata/` path the reader will use, after applying `SESSION_DATA_DIR`.

### Session listing

**`listSessions(filters?)`** — List sessions from `_sessiondata/` directories with optional filters.

```typescript
const sessions = await listSessions({ model: 'claude-sonnet-4-20250514' });
const recent = await listSessions({ since: '2025-01-01', minEvents: 5 });
```

### Session detail

**`getSessionDetail(sessionId)`** — Full session detail including events and analytics.

```typescript
const detail = await getSessionDetail(sessions[0].id);
console.log(detail.analytics.toolUsage);
```

**`getSessionSummary(sessionId)`** — Summary metadata for a single session: name, first start, last end, start and end line counts, whether it is active, and its latest binding line.

**`getSessionBindings(sessionId)`** — The session's binding lines, oldest first. Empty when the capture has none.

**`getSessionEvents(sessionId)`** — Raw event array for a session.

### Search

**`searchSessions(query, limit = 50)`** — Match the query against each session's id, name, model, working directory and first prompt.

```typescript
const results = await searchSessions('authentication');
```

### Utilities

**`readSessionFile(sessionId, fileName)`** — Parse one JSONL file of a session into its lines.

**`getLatestEvents(sessionId, sinceLineCount = 0)`** — The session's events after the first `sinceLineCount`, for polling one session.

**`getDistinctModels()`** — List all unique model identifiers found in session data.

### Types

```typescript
interface SessionEvent {
  session_id?: string;
  hook_event_name?: string;
  timestamp?: string;
  model?: string;
  tool_name?: string;
  prompt?: string;
  // ... extensible with [key: string]: unknown
}

interface SessionAnalytics {
  toolUsage: Record<string, number>;   // calls per tool, each call counted once
  filesEdited: string[];
  promptCount: number;
  toolCallCount: number;
  errorCount: number;
  // ...
}

interface SessionSummary {
  id: string;
  name?: string;          // latest binding name, else custom title
  model?: string;
  startedAt?: string;     // first start, from the binding line
  endedAt?: string;       // last end, when not active
  startCount: number;     // start lines: first start, resumes, compactions
  endCount: number;
  isActive: boolean;      // last start or end line is a start
  binding?: SessionBinding;
  eventCount: number;
  analytics?: SessionAnalytics;
  // ...
}

// A session whose start time is unknown is kept by the since/until filters.
interface SessionFilters {
  model?: string;
  hasTranscript?: boolean;
  minEvents?: number;
  maxEvents?: number;
  since?: string;
  until?: string;
}
```

### Constants

**`EVENT_ICONS`** — Emoji map for session event types (e.g., `SessionStart` → 🚀, `PreToolUse` → 🔧, `SessionEnd` → 🏁).

## License

MIT — IAIP Collaborative, Shawinigan, QC

