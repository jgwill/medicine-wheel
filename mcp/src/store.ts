/**
 * MCP Store — Persistence Layer Router
 *
 * Selects the storage backend based on environment configuration:
 *
 * - MW_API_URL set → HttpStore (delegates to the server REST API)
 * - Default        → JsonlStore (local .mw/store/ JSONL files)
 *
 * The HttpStore opt-in enables the MCP tools to read/write the same
 * relational state the server holds, without direct file access.
 *
 * @see mcp/src/jsonl-store.ts — local JSONL persistence engine
 * @see mcp/src/http-store.ts  — HTTP-backed server adapter
 * @see https://github.com/jgwill/medicine-wheel/issues/26
 * @see https://github.com/jgwill/medicine-wheel/issues/69
 */

import { getJsonlStore } from './jsonl-store.js';
import { HttpStore } from './http-store.js';

function createStore() {
  const apiUrl = process.env.MW_API_URL;
  if (apiUrl) {
    console.error(`🌐 Medicine Wheel MCP: using HTTP store at ${apiUrl}`);
    return new HttpStore(apiUrl);
  }
  return getJsonlStore();
}

export const store = createStore();
