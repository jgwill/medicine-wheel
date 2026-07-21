/**
 * @medicine-wheel/github-ceremony
 *
 * Witness GitHub webhook events — issues, pull requests, merges, commits —
 * through a ceremonial lens, and record them as relational ceremony beads.
 * Framework-free: `build*` functions are pure; `process*` functions persist
 * through @medicine-wheel/storage-provider (jsonl and neon alike).
 *
 * Consensus workflows and the Upstash spiral remain local to Miadi; this
 * package ports the reusable, storage-neutral core.
 *
 * @example
 * ```ts
 * import { createProvider } from '@medicine-wheel/storage-provider';
 * import { processGitHubEvent } from '@medicine-wheel/github-ceremony';
 *
 * const store = await createProvider();
 * const record = await processGitHubEvent(
 *   { type: 'issues', payload: { action: 'opened', issue } },
 *   'jgwill/medicine-wheel',
 *   store,
 * );
 * ```
 */

export * from './types.js';
export * from './detect.js';
export * from './process.js';
