/**
 * Medicine Wheel Session Reader
 *
 * Reads agent session event data from _sessiondata/ JSONL files.
 * Zero external dependencies — only uses Node.js built-ins.
 *
 * @example
 * ```ts
 * import { listSessions, getSessionDetail, searchSessions } from 'medicine-wheel-session-reader';
 *
 * const sessions = await listSessions({ model: 'claude-sonnet-4-20250514' });
 * const detail = await getSessionDetail(sessions[0].id);
 * console.log(detail.analytics.toolUsage);
 * ```
 */

// Types
export type {
  SessionEvent,
  SessionAnalytics,
  SessionSummary,
  SessionFilters,
} from './types.js';

export { EVENT_ICONS } from './types.js';

// Session operations
export {
  listSessions,
  getDistinctModels,
  getSessionSummary,
  getSessionEvents,
  getSessionDetail,
  searchSessions,
  readSessionFile,
  getLatestEvents,
} from './sessions.js';
