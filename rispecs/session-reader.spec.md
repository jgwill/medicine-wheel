# session-reader — RISE Specification

> Zero-dependency JSONL session event parser — list, filter, analyze, and search across agent session data stored in `_sessiondata/` directories.

**Version:** 0.1.1  
**Package:** `medicine-wheel-session-reader`  
**Document ID:** rispec-session-reader-v1  
**Last Updated:** 2026-03-06  

---

## Desired Outcome

Users create **session-aware tools and dashboards** where:
- JSONL session files are parsed into typed event streams
- Sessions can be listed with filters (model, date range, tags)
- Individual sessions expose analytics (tool usage, event counts, duration)
- Full-text search runs across session content without external dependencies
- No runtime dependencies — Node.js built-ins only (`node:fs`, `node:path`, `node:readline`)

---

## Creative Intent

**What this enables:** Any tool in the Medicine Wheel ecosystem (or beyond) can read and analyze agent session data. Session histories become queryable knowledge — which tools were used, how long sessions lasted, what patterns emerge across conversations.

**Structural Tension:** Between opaque JSONL blobs (unstructured, hard to query) and structured session intelligence (filterable, searchable, analytics-ready). The session-reader resolves this by parsing JSONL events into typed structures with computed analytics.

---

## Types

### Sub-path: `medicine-wheel-session-reader/types`

```typescript
interface SessionEvent {
  type: string;                // e.g., "user_message", "tool_call", "assistant_response"
  timestamp: string;           // ISO 8601
  content?: string;
  metadata?: Record<string, unknown>;
}

interface SessionSummary {
  id: string;
  path: string;
  model?: string;
  startTime: string;
  endTime?: string;
  eventCount: number;
  tags?: string[];
}

interface SessionDetail extends SessionSummary {
  events: SessionEvent[];
  analytics: SessionAnalytics;
}

interface SessionAnalytics {
  duration: number;            // Milliseconds
  toolUsage: Record<string, number>;   // Tool name → call count
  eventCounts: Record<string, number>; // Event type → count
  messageCount: number;
  avgResponseTime?: number;    // Milliseconds between user message and response
}

interface SessionFilter {
  model?: string;
  dateFrom?: string;           // ISO 8601
  dateTo?: string;             // ISO 8601
  tags?: string[];
  minEvents?: number;
}

interface SearchResult {
  sessionId: string;
  matches: SearchMatch[];
}

interface SearchMatch {
  eventIndex: number;
  eventType: string;
  snippet: string;             // Context around the match
  timestamp: string;
}
```

---

## Sessions API

### Sub-path: `medicine-wheel-session-reader/sessions`

#### Listing

```typescript
listSessions(dataDir: string, filter?: SessionFilter): Promise<SessionSummary[]>
```

Scans `_sessiondata/` directories for JSONL files, parses headers for summary metadata, and applies filters. Returns summaries sorted by start time (newest first).

#### Detail

```typescript
getSession(dataDir: string, sessionId: string): Promise<SessionDetail>
```

Parses the full JSONL file, computes analytics (tool usage counts, event type counts, duration, average response time), and returns the complete session detail.

#### Search

```typescript
searchSessions(dataDir: string, query: string, filter?: SessionFilter): Promise<SearchResult[]>
```

Scans session content for matching text, returning snippets with surrounding context. Applies session-level filters before content search for efficiency.

#### Parsing

```typescript
parseSessionFile(filePath: string): Promise<SessionEvent[]>
```

Low-level JSONL line-by-line parser using `node:readline` for memory-efficient streaming of large session files.

---

## Dependencies

- **Runtime:** None — zero external dependencies
- **Node.js built-ins:** `node:fs`, `node:path`, `node:readline`
- **Peer dependencies:** None
- **Types consumed:** Self-contained; does not depend on ontology-core

---

## Advancing Patterns

- **Zero-dependency design** — Installable anywhere without dependency conflicts
- **Streaming parser** — Handles large session files without loading entire contents into memory
- **Analytics-ready** — Tool usage and event counts computed on read, no separate aggregation step
- **Filter-then-search** — Session filters narrow the search space before content scanning

---

## Quality Criteria

- ✅ Creative Orientation: Session data becomes queryable intelligence, not opaque logs
- ✅ Structural Dynamics: Filters and analytics surface patterns across session histories
- ✅ Implementation Sufficient: Complete types, API, and parsing strategy documented
- ✅ Codebase Agnostic: Reads standard JSONL files from any `_sessiondata/` directory
