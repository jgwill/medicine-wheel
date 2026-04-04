/**
 * MCP Store — JSONL-Backed Persistence
 *
 * Replaces the previous in-memory-only store with the shared JSONL
 * persistence layer. Data created in the Web UI is now visible here,
 * and data created via MCP tools is visible in the Web UI.
 *
 * Delegates all operations to JsonlStore from ./jsonl-store.ts.
 * The exported `store` singleton has the same API as the old InMemoryStore.
 *
 * @see mcp/src/jsonl-store.ts — the underlying JSONL persistence engine
 * @see https://github.com/jgwill/medicine-wheel/issues/26
 */

import { getJsonlStore } from './jsonl-store.js';

export const store = getJsonlStore();
