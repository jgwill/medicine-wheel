/** Observations about packages that do not change the declared dependency graph. */

import { z } from 'zod';
import { holdsUnsafeCharacter } from './capability-scan';
import { parseJsonl, type ParsedRows } from './jsonl';

const text = z.string().min(1).max(2048).refine((value) => value.trim() === value && !holdsUnsafeCharacter(value), 'expected printable text');
const name = text.pipe(z.string().max(214).regex(/^(?:@[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_][A-Za-z0-9_.+-]*$/));
const timestamp = z.string().datetime({ offset: true });

const npmConsumer = z.object({
  repository: text.pipe(z.string().regex(/^repository:[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/)),
  path: text,
  name,
  commit: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/),
}).strict();

const observation = {
  ecosystem: z.enum(['npm', 'deb']),
  name,
  source: text,
};

export const PackageEvidenceSchema = z.discriminatedUnion('kind', [
  z.object({
    ...observation,
    kind: z.literal('declared'),
    ecosystem: z.literal('npm'),
    consumer: npmConsumer,
    range: text,
  }).strict(),
  z.object({
    ...observation,
    kind: z.literal('locked'),
    ecosystem: z.literal('npm'),
    consumer: npmConsumer,
    version: text,
    lockPath: text,
    resolved: text.optional(),
    integrity: text.optional(),
  }).strict(),
  z.object({
    ...observation,
    kind: z.literal('published'),
    version: text,
    architecture: text.optional(),
    integrity: text.optional(),
    observedAt: timestamp.optional(),
  }).strict(),
  z.object({
    ...observation,
    kind: z.literal('installed'),
    version: text,
    architecture: text.optional(),
    host: text,
    observedAt: timestamp,
  }).strict(),
]);

export type PackageEvidence = z.infer<typeof PackageEvidenceSchema>;

/** Read evidence supplied by an operator. Parsing does not check the source's authority. */
export function parsePackageEvidence(text: string, file?: string): ParsedRows<PackageEvidence> {
  const parsed = parseJsonl(text, PackageEvidenceSchema, file);
  const unique = new Map(parsed.rows.map((row) => [JSON.stringify(row), row]));
  return { rows: [...unique.values()], issues: parsed.issues };
}
