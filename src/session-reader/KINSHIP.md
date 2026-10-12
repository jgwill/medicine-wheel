# KINSHIP — @medicine-wheel/session-reader

## 1. Identity and Purpose
- **Name**: @medicine-wheel/session-reader
- **Package**: `@medicine-wheel/session-reader`
- **Location**: `/workspace/repos/jgwill/medicine-wheel/src/session-reader/`
- **Role**: Session event data reader for agent sessions stored as JSONL in `_sessiondata/`
- **What this place tends**: The observability of agent sessions — what happened, what tools were used, what feedback was given, how long sessions lasted
- **What this place offers**: A zero-dependency package for reading, summarizing, and searching agent session events without coupling to Redis or any specific UI framework

## 2. Lineage and Relations
- **Ancestors**:
  - `/src/ceremony-session-observer/lib/sessions.ts` — the original session reading code from which this was extracted
  - `/src/ceremony-session-observer/lib/types.ts` — session event types extracted from here
- **Siblings**: `ontology-core`, `data-store`, `ceremony-protocol`, `narrative-engine`, `relational-query`, `graph-viz`, `ui-components`, `prompt-decomposition`
- **Future consumers** (who should adopt this package):
  - `/src/ceremony-session-observer/` — replace `lib/sessions.ts` and session types from `lib/types.ts` with imports from this package
  - Any future session analytics, monitoring, or reporting tools

## 3. Exports
- `types` — SessionEvent, SessionAnalytics, SessionSummary, SessionFilters, SessionBinding, EVENT_ICONS
- `sessions` — listSessions, getSessionSummary, getSessionBindings, getSessionEvents, getSessionDetail, searchSessions, readSessionFile, getLatestEvents, getDistinctModels

## 4. Responsibilities and Boundaries
- **Responsibilities**: Read JSONL session event files; extract analytics; provide search/filtering
- **Boundaries**: Read-only to filesystem. Does NOT write session data. Does NOT interact with Redis — ceremony linking belongs in `data-store`. Does NOT render UI — that belongs in consumer applications.
- **Zero dependencies**: Only uses `node:fs` and `node:path`. No external packages required.

## 5. Accountability and Change Log
- **Steward**: Guillaume
- **Review trigger**: When new Claude hook event types are added, or when `_sessiondata/` file format changes
- [2026-03-01] [Copilot CLI agent] — Initial creation. Extracted from ceremony-session-observer lib/sessions.ts and lib/types.ts.
- [2026-10-12] [Mino seat, Claude Opus 5.5, fork mino-261012a-fork1-mw-sessions] — Measured against the capture on gaia: hook lines carry no time (0 of 240 recent sessions), so `startedAt`, `endedAt`, sorting and date filters did nothing. Times now come from `_terminal_binding.jsonl`. A tool call was counted twice (PreToolUse and PostToolUse); it is counted once. `isActive` read a resumed session as ended; it now follows the last start or end line. Added `name`, `startCount`, `endCount`, `binding`, `getSessionBindings`. README signatures of `getLatestEvents` and `readSessionFile` now match the code. Multi-engine reading stays with jgwill/medicine-wheel#51. Grounded in Episode 554 (miadi-chronicle://554), the first session inventory.
- [2026-10-12] [Mino seat, Claude Opus 5.5, fork2-of-mino-261012a-fork1-mw-sessions] — The binding line gets a schema and one fold (`binding.ts`): `BINDING_LINE_SCHEMA`, `readBindingLines`, `foldBindingLines`, `sessionIdentities`, `sessionsOfEpisode`. Eight readers across Miadi, the orchestration kit and tide each folded the line their own way. The fold is the one `@miadi/hooks-interpreter` arrived at, and on gaia's 1110 lines it agrees with it on all 363 sessions. It is the first step of moving session reading upstream: Miadi and the kit consume it next.
