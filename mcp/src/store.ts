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

export function createStore(): HttpStore | ReturnType<typeof getJsonlStore> {
  const apiUrl = process.env.MW_API_URL?.trim();
  if (!apiUrl) {
    return getJsonlStore();
  }

  // A typo'd MW_API_URL is worse than an absent one: every write leaves for an
  // address that cannot answer while the tools keep reporting success. Refuse
  // the ambiguity at startup, where a human is still watching.
  let parsed: URL;
  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new Error(
      `MW_API_URL is not a valid absolute URL: ${JSON.stringify(apiUrl)} — ` +
      `expected something like http://127.0.0.1:8040 (unset it to use the local JSONL store)`
    );
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `MW_API_URL must be http: or https:, got ${parsed.protocol} in ${JSON.stringify(apiUrl)}`
    );
  }

  console.error(`🌐 Medicine Wheel MCP: using HTTP store at ${apiUrl}`);
  return new HttpStore(apiUrl);
}

export const store = createStore();
