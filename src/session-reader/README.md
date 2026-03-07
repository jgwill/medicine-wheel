# medicine-wheel-session-reader

Session event reader for the Medicine Wheel Developer Suite — JSONL parsing, session summaries, analytics extraction, and search across agent session data.

## Overview

This package reads agent session event data from `_sessiondata/` JSONL files. Zero external dependencies — only uses Node.js built-ins.

### What it provides

| Module | Description |
|--------|-------------|
| `sessions` | Session listing, detail retrieval, search, and utility functions |
| `types` | TypeScript type definitions and constants for session events |

## Installation

```bash
npm install medicine-wheel-session-reader
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
} from 'medicine-wheel-session-reader';
```

### Sub-path exports

```typescript
import type { SessionEvent, SessionFilters } from 'medicine-wheel-session-reader/types';
import { listSessions, searchSessions } from 'medicine-wheel-session-reader/sessions';
```

## API Reference

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

**`getSessionSummary(sessionId)`** — Summary metadata for a single session.

**`getSessionEvents(sessionId)`** — Raw event array for a session.

### Search

**`searchSessions(query)`** — Full-text search across session data.

```typescript
const results = await searchSessions('authentication');
```

### Utilities

**`readSessionFile(filePath)`** — Parse a single JSONL session file into events.

**`getLatestEvents(count?)`** — Retrieve the most recent events across all sessions.

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
  toolUsage: Record<string, number>;
  filesEdited: string[];
  promptCount: number;
  toolCallCount: number;
  errorCount: number;
  // ...
}

interface SessionSummary {
  id: string;
  model?: string;
  startedAt?: string;
  endedAt?: string;
  eventCount: number;
  analytics?: SessionAnalytics;
  // ...
}

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
