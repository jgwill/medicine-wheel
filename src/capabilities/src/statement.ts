/**
 * The word limit, as a function a writer can ask before it writes.
 *
 * A writer that cannot say what a thing is in 55 words stops there, records
 * the row as `needs-resolution` without a statement, and moves to the next
 * thing. The limit is what keeps a mapping of a hundred repositories readable
 * by a person, and what keeps a model from describing more than it read.
 */

import { STATEMENT_WORD_LIMIT } from './types';

/** A word is a whitespace-separated token holding at least one letter or digit. */
export function countWords(text: string): number {
  return text
    .split(/\s+/u)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export interface StatementCheck {
  words: number;
  limit: number;
  /** `true` when the statement has at least one word and no more than `limit`. */
  fits: boolean;
}

export function checkStatement(text: string, limit: number = STATEMENT_WORD_LIMIT): StatementCheck {
  const words = countWords(text);
  return { words, limit, fits: words > 0 && words <= limit };
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True for a kebab-case slug: 'publish-prototype-to-episode'. */
export function isSlug(value: string): boolean {
  return SLUG.test(value);
}

/** `capability:<slug>`. Throws on a slug that is not kebab-case. */
export function capabilityNodeId(slug: string): string {
  if (!isSlug(slug)) throw new Error(`not a kebab-case slug: ${JSON.stringify(slug)}`);
  return `capability:${slug}`;
}
