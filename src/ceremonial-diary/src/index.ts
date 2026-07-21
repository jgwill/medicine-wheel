/**
 * @medicine-wheel/ceremonial-diary
 *
 * The ceremonial diary — a participant's voice across the Five-Phase ceremonial
 * methodology. Create intention / observation / reflection entries, retrieve and
 * filter them, detect patterns, export to Markdown, and optionally project a
 * relation into the chronicle wheel. Persistence flows through
 * @medicine-wheel/storage-provider, so jsonl and neon are first-class equals.
 *
 * @example
 * ```ts
 * import { createProvider } from '@medicine-wheel/storage-provider';
 * import { createIntentionEntry, queryDiaryEntries } from '@medicine-wheel/ceremonial-diary';
 *
 * const store = await createProvider(); // jsonl by default
 * await createIntentionEntry(store, {
 *   intention: 'Hold space for the film-production ceremony',
 *   participant: 'mia',
 *   chronicle: 'chronicle:2026-07-20-episode-074-medicine-wheel',
 * });
 * const entries = await queryDiaryEntries(store, { participant: 'mia' });
 * ```
 */

export * from './types.js';
export * from './create.js';
export * from './query.js';
export * from './stats.js';
export * from './markdown.js';
export * from './relate.js';
