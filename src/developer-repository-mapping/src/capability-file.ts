/**
 * A repository's own capability file, `.miadi/capabilities.jsonl`, pure.
 *
 * The file travels with the repository: whoever clones it knows what it
 * provides, with no Factory and no registry. The first line says what the file
 * is and which repository wrote it; each other line is one capability: its
 * kind, its name, its address, what its files say it is, and the files that
 * say so. Versions and dependency ranges are not here, because every release
 * would make them stale: a reader takes them from each package.json at the
 * commit it reads. The commit is not here either, because a committed file
 * cannot name its own commit: a reader adds the one it read.
 *
 * `mw-repomap capabilities scan --write` writes it. A rescan keeps what a
 * person wrote, and a row the scan wrote stays as it is while its statement
 * stays the same, so a file only changes when the repository did.
 */

import { z } from 'zod';
import {
  StatementSchema,
  StatementStatusSchema,
  attributionShape,
  checkStatement,
  refineAttribution,
  refineStatementPresence,
  type CapabilityFacet,
} from '@medicine-wheel/capabilities';
import type { MappingIssue } from './types';
import {
  CAPABILITY_KINDS,
  STATEMENT_MAX_CHARACTERS,
  capabilityAddress,
  capabilityId,
  codePoints,
  holdsUnsafeCharacter,
  statementFromFiles,
  type Artefact,
  type CapabilityKind,
} from './capability-scan';

/** Where a repository keeps it, relative to its root. */
export const CAPABILITY_FILE = '.miadi/capabilities.jsonl';
export const CAPABILITY_FILE_SCHEMA = 'medicine-wheel/repository-capabilities';
/** `statedBy` of a row the scan wrote. Any other name is a person's, and a rescan keeps its words. */
export const SCAN_AUTHOR = 'mw-repomap scan';

/** The format version this package writes. A reader takes a newer one and reads what it knows. */
export const CAPABILITY_FILE_VERSION = 1;

/**
 * `owner/name` as the reference grammar reads it in an address
 * (`miadi-capability://<owner>/<repo>/…`): letters, digits, `.`, `_` and `-`,
 * starting with a letter or a digit, the name not ending in `.git`.
 */
export const REPOSITORY_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\/(?![^/]*\.git$)[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/** Text from a file someone else committed: printable, at most `max` characters counted as code points. */
const printableText = (max: number, what: string) =>
  z
    .string()
    .min(1, `${what} is empty`)
    .refine((t) => codePoints(t) <= max, `${what} is at most ${max} characters`)
    .refine((t) => !holdsUnsafeCharacter(t), `${what} holds no control character`);

/** An ISO 8601 time with its offset and its seconds, as RFC 3339 and JSON Schema's date-time read it. */
const FileTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .refine((t) => /T\d{2}:\d{2}:\d{2}/.test(t), 'a time carries its seconds');

export const CapabilityFileHeaderSchema = z
  .object({
    schema: z.literal(CAPABILITY_FILE_SCHEMA),
    version: z.number().int().min(1),
    /** `owner/name`, as the repository was known when the file was written. */
    repository: z.string().regex(REPOSITORY_NAME, 'the repository is owner/name, as an address names it'),
  })
  .strict();
export type CapabilityFileHeader = z.infer<typeof CapabilityFileHeaderSchema>;

/** A name the registry can give an id to: printable, at most 214 characters, with a letter or a digit. */
export const CapabilityNameSchema = printableText(214, 'a name').refine((t) => /[a-z0-9]/i.test(t), 'a name needs a letter or a digit');

/** A platform capability, `capability:<kebab-case-slug>`: what the platform can do for someone. */
const PLATFORM_CAPABILITY = /^capability:[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CapabilityFileRowObject = z
  .object({
    kind: z.enum(CAPABILITY_KINDS as unknown as [CapabilityKind, ...CapabilityKind[]]),
    name: CapabilityNameSchema,
    /** `miadi-capability://<owner>/<repo>/<kind>/<name>` */
    address: printableText(600, 'an address'),
    statement: StatementSchema.and(printableText(STATEMENT_MAX_CHARACTERS, 'a statement')).optional(),
    status: StatementStatusSchema,
    /** For a CLI: the package that ships it. */
    package: printableText(214, 'a package name').optional(),
    /**
     * The platform capabilities this one serves (`capability:<slug>`, capabilities.spec.md):
     * said by a person or an agent, never by the scan, and kept by every rescan.
     */
    realizes: z
      .array(
        z
          .object({
            capability: z.string().regex(PLATFORM_CAPABILITY, 'a platform capability is capability:<kebab-case-slug>'),
            statedBy: printableText(200, 'a name').refine((t) => t !== SCAN_AUTHOR, 'a person or an agent says what a capability realizes'),
            statedAt: FileTimestampSchema,
          })
          .strict(),
      )
      .min(1)
      .max(32)
      .optional(),
    /** `grounding` here is the files that say so, relative to the repository. */
    ...attributionShape,
    // The attribution a file holds is text someone else committed: printable, with its times in full.
    statedBy: printableText(200, 'a name'),
    statedAt: FileTimestampSchema,
    grounding: z.array(printableText(1024, 'a path')).min(1),
    revisedBy: printableText(200, 'a name').optional(),
    revisedAt: FileTimestampSchema.optional(),
  })
  .strict();

/** The keys a row of this version holds. */
export const CAPABILITY_FILE_ROW_KEYS: readonly string[] = Object.keys(CapabilityFileRowObject.shape);

export const CapabilityFileRowSchema = CapabilityFileRowObject.superRefine((row, ctx) => {
  refineAttribution(row, ctx);
  refineStatementPresence(row.status, row.statement, 'statement', ctx);
});
export type CapabilityFileRow = z.infer<typeof CapabilityFileRowSchema>;

export interface ParsedCapabilityFile {
  header?: CapabilityFileHeader;
  rows: CapabilityFileRow[];
  issues: MappingIssue[];
}

const rowKey = (row: Pick<CapabilityFileRow, 'kind' | 'name'>) => `${row.kind}/${row.name}`;

function firstLineEnd(text: string): number {
  const i = text.indexOf('\n');
  return i < 0 ? text.length : i;
}

export interface ParseCapabilityFileOptions {
  /**
   * `read` (the default): what a newer version of the format adds (a key, a
   * kind, a header field, a higher version) is skipped and said as a warning,
   * and everything this version knows is read. `write`: the same things are
   * errors, because a rewrite by this version would lose them.
   */
  mode?: 'read' | 'write';
}

const KNOWN_KINDS = new Set<string>(CAPABILITY_KINDS);
const HEADER_KEYS = new Set(Object.keys(CapabilityFileHeaderSchema.shape));
const ROW_KEYS = new Set(CAPABILITY_FILE_ROW_KEYS);
const describeZod = (issue: z.ZodIssue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message);

/** Read the file. Never throws: a bad line is an issue, and the good lines around it are still read. */
export function parseCapabilityFile(text: string, options: ParseCapabilityFileOptions = {}): ParsedCapabilityFile {
  const newer: MappingIssue['severity'] = options.mode === 'write' ? 'error' : 'warning';
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = clean.split(/\r?\n/);
  const issues: MappingIssue[] = [];
  let header: CapabilityFileHeader | undefined;
  try {
    const raw = JSON.parse(lines[0] ?? '') as Record<string, unknown>;
    const extra = raw && typeof raw === 'object' ? Object.keys(raw).filter((k) => !HEADER_KEYS.has(k)) : [];
    const known = raw && typeof raw === 'object' ? Object.fromEntries(Object.entries(raw).filter(([k]) => HEADER_KEYS.has(k))) : raw;
    const parsed = CapabilityFileHeaderSchema.safeParse(known);
    if (!parsed.success) {
      issues.push({ severity: 'error', file: CAPABILITY_FILE, line: 1, message: `the first line is not this file's header: ${describeZod(parsed.error.issues[0]!)}` });
    } else {
      header = parsed.data;
      if (extra.length) issues.push({ severity: newer, file: CAPABILITY_FILE, line: 1, message: `header keys ${extra.join(', ')} are not known to format version ${CAPABILITY_FILE_VERSION}` });
      if (header.version > CAPABILITY_FILE_VERSION) issues.push({ severity: newer, file: CAPABILITY_FILE, line: 1, message: `written in format version ${header.version}; this version reads version ${CAPABILITY_FILE_VERSION} and what it knows of the rest` });
    }
  } catch (error) {
    issues.push({ severity: 'error', file: CAPABILITY_FILE, line: 1, message: `not JSON: ${(error as Error).message}` });
  }
  // One row per capability: a second row for the same kind and name is reported, and the first one read.
  const seen = new Set<string>();
  const rows: CapabilityFileRow[] = [];
  lines.slice(1).forEach((rawLine, index) => {
    const line = index + 2;
    if (!rawLine.trim()) return;
    let value: unknown;
    try {
      value = JSON.parse(rawLine);
    } catch (error) {
      issues.push({ severity: 'error', file: CAPABILITY_FILE, line, message: `not JSON: ${(error as Error).message}` });
      return;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      issues.push({ severity: 'error', file: CAPABILITY_FILE, line, message: 'a row is a JSON object' });
      return;
    }
    const object = value as Record<string, unknown>;
    if (typeof object.kind === 'string' && !KNOWN_KINDS.has(object.kind)) {
      issues.push({ severity: newer, file: CAPABILITY_FILE, line, message: `kind ${JSON.stringify(object.kind)} is not known to format version ${CAPABILITY_FILE_VERSION}; the row is not read` });
      return;
    }
    const extra = Object.keys(object).filter((k) => !ROW_KEYS.has(k));
    if (extra.length) issues.push({ severity: newer, file: CAPABILITY_FILE, line, message: `keys ${extra.join(', ')} are not known to format version ${CAPABILITY_FILE_VERSION} and are not read` });
    const parsed = CapabilityFileRowSchema.safeParse(Object.fromEntries(Object.entries(object).filter(([k]) => ROW_KEYS.has(k))));
    if (!parsed.success) {
      issues.push({ severity: 'error', file: CAPABILITY_FILE, line, message: parsed.error.issues.map(describeZod).join('; ') });
      return;
    }
    const row = parsed.data;
    const key = rowKey(row);
    if (seen.has(key)) {
      issues.push({ severity: 'error', file: CAPABILITY_FILE, line, message: `${key} appears more than once; the first row is read` });
      return;
    }
    seen.add(key);
    // The address is the header's repository, the kind and the name; a row that says otherwise is read as it should be.
    if (header) {
      const expected = capabilityAddress(header.repository, row.kind, row.name);
      if (row.address !== expected) {
        issues.push({ severity: 'warning', file: CAPABILITY_FILE, line, message: `address ${row.address} is not this row's; read as ${expected}` });
        row.address = expected;
      }
    }
    rows.push(row);
  });
  return { ...(header ? { header } : {}), rows, issues };
}

const KIND_ORDER = new Map<string, number>(CAPABILITY_KINDS.map((k, i) => [k, i]));
const byKindThenName = (a: CapabilityFileRow, b: CapabilityFileRow) =>
  (KIND_ORDER.get(a.kind) ?? 9) - (KIND_ORDER.get(b.kind) ?? 9) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/** The file's text: the header, then one row per line in a fixed order, so a diff shows only what changed. */
export function renderCapabilityFile(repository: string, rows: readonly CapabilityFileRow[]): string {
  const header: CapabilityFileHeader = { schema: CAPABILITY_FILE_SCHEMA, version: 1, repository: repository.replace(/^repository:/, '') };
  const lines = [...rows].sort(byKindThenName).map((r) =>
    JSON.stringify({
      kind: r.kind,
      name: r.name,
      address: r.address,
      ...(r.statement ? { statement: r.statement } : {}),
      status: r.status,
      ...(r.package ? { package: r.package } : {}),
      ...(r.realizes?.length ? { realizes: r.realizes } : {}),
      statedBy: r.statedBy,
      statedAt: r.statedAt,
      grounding: r.grounding,
      revision: r.revision,
      ...(r.revisedBy ? { revisedBy: r.revisedBy } : {}),
      ...(r.revisedAt ? { revisedAt: r.revisedAt } : {}),
    }),
  );
  return [JSON.stringify(header), ...lines].join('\n') + '\n';
}

/** The rows a scan's artefacts make: one per capability, the files that say so as grounding. */
export function capabilityFileRows(artefacts: readonly Artefact[], ctx: { repository: string; statedAt: string }): CapabilityFileRow[] {
  const rows = new Map<string, CapabilityFileRow>();
  for (const a of artefacts) {
    const key = rowKey(a);
    const existing = rows.get(key);
    if (existing) {
      if (!existing.grounding.includes(a.path)) existing.grounding.push(a.path);
      continue;
    }
    const statement = statementFromFiles(a.description);
    rows.set(key, {
      kind: a.kind,
      name: a.name,
      address: capabilityAddress(ctx.repository, a.kind, a.name),
      ...(statement ? { statement } : {}),
      status: statement ? 'clear' : 'needs-resolution',
      ...(a.package ? { package: a.package } : {}),
      statedBy: SCAN_AUTHOR,
      statedAt: ctx.statedAt,
      grounding: [a.path],
      revision: 'pending',
    });
  }
  return [...rows.values()].sort(byKindThenName);
}

export interface CapabilityFileMerge {
  rows: CapabilityFileRow[];
  /** Keys (`kind/name`) the scan found that the file did not hold. */
  added: string[];
  /** Rows the scan wrote and no longer finds. */
  removed: string[];
  /** Rows whose text or files changed. */
  changed: string[];
  /** Rows a person wrote, or that carry what a person said they realize, that this scan does not find: kept, and said. */
  keptByPerson: string[];
}

/**
 * What the file should hold after a scan.
 *
 * A row a person wrote (any `statedBy` but {@link SCAN_AUTHOR}) keeps its
 * words, its status and its attribution: `capabilities state` writes one, and
 * so does a hand edit that puts the person's name in `statedBy`. A row the
 * scan wrote takes the scan's statement, and goes back to pending when the
 * statement changed or the files stopped making one. The files and the
 * shipping package are always the scan's. The same rule serves a reader,
 * which merges a committed file with what the commit holds.
 */
export function mergeCapabilityFile(existing: readonly CapabilityFileRow[], scanned: readonly CapabilityFileRow[]): CapabilityFileMerge {
  const held = new Map(existing.map((r) => [rowKey(r), r]));
  const seen = new Set<string>();
  const rows: CapabilityFileRow[] = [];
  const added: string[] = [];
  const changed: string[] = [];
  for (const scan of scanned) {
    const key = rowKey(scan);
    seen.add(key);
    const row = held.get(key);
    if (!row) {
      rows.push(scan);
      added.push(key);
      continue;
    }
    const byPerson = row.statedBy !== SCAN_AUTHOR;
    let next: CapabilityFileRow;
    if (byPerson) {
      next = { ...row, address: scan.address, grounding: scan.grounding, ...(scan.package ? { package: scan.package } : {}) };
    } else if (row.statement === scan.statement) {
      next = { ...row, address: scan.address, status: scan.status, grounding: scan.grounding, ...(scan.package ? { package: scan.package } : {}) };
    } else {
      next = scan;
    }
    // What a capability realizes is never the scan's to say: it stays through every rescan.
    if (row.realizes?.length) next = { ...next, realizes: row.realizes };
    if (JSON.stringify(rowForCompare(next)) !== JSON.stringify(rowForCompare(row))) changed.push(key);
    rows.push(next);
  }
  const removed: string[] = [];
  const keptByPerson: string[] = [];
  for (const row of existing) {
    const key = rowKey(row);
    if (seen.has(key)) continue;
    // A row the scan wrote goes with its files, unless a person said what it realizes: those words are a person's.
    if (row.statedBy === SCAN_AUTHOR && !row.realizes?.length) {
      removed.push(key);
    } else {
      rows.push(row);
      keptByPerson.push(key);
    }
  }
  return { rows: rows.sort(byKindThenName), added, removed, changed, keptByPerson };
}

function rowForCompare(row: CapabilityFileRow) {
  return { ...row, grounding: [...row.grounding].sort() };
}

/**
 * The file's rows as capability facets of one repository at one commit: the
 * files become `owner/name@commit:path`, the grounding every registry row carries.
 */
export function capabilityFileFacets(rows: readonly CapabilityFileRow[], ctx: { repository: string; commit: string }): CapabilityFacet[] {
  const where = `${ctx.repository.replace(/^repository:/, '')}@${ctx.commit.slice(0, 12)}`;
  return rows.map((r) => ({
    nodeId: capabilityId(r.kind, r.name),
    name: r.name,
    ...(r.statement ? { statement: r.statement } : {}),
    status: r.status,
    providedBy: [ctx.repository],
    statedBy: r.statedBy,
    statedAt: r.statedAt,
    grounding: r.grounding.map((p) => `${where}:${p}`),
    revision: r.revision,
    ...(r.revisedBy ? { revisedBy: r.revisedBy } : {}),
    ...(r.revisedAt ? { revisedAt: r.revisedAt } : {}),
  }));
}

export interface CapabilityStatementInput {
  kind: CapabilityKind;
  name: string;
  by: string;
  at: string;
  /** With words, the person states it; without, the person affirms what is there. */
  statement?: string;
  /** The platform capabilities it serves, `capability:<slug>`; each one not yet held is added, said by `by` at `at`. */
  realizes?: string[];
}

/** What a person gave `capabilities state` cannot be written: no such row, or words or names the file does not hold. */
export class CapabilityInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapabilityInputError';
  }
}

/**
 * A person states or affirms one row. An `error` says why not: no such row,
 * or words that do not fit. The row it answers is held to the row schema, so
 * nothing it writes is refused by the next reader.
 */
export function stateCapabilityRow(rows: readonly CapabilityFileRow[], input: CapabilityStatementInput): { rows: CapabilityFileRow[] } | { error: string } {
  if (input.by.trim() === SCAN_AUTHOR) return { error: `"${SCAN_AUTHOR}" is the scan's name: a statement is said by a person` };
  if (holdsUnsafeCharacter(input.by)) return { error: 'a name holds no control character' };
  if (input.statement !== undefined && (holdsUnsafeCharacter(input.statement) || codePoints(input.statement) > STATEMENT_MAX_CHARACTERS)) return { error: `a statement is at most ${STATEMENT_MAX_CHARACTERS} printable characters` };
  const key = rowKey(input);
  const row = rows.find((r) => rowKey(r) === key);
  if (!row) return { error: `the file holds no ${key}: run capabilities scan --write first` };
  if (input.statement !== undefined) {
    const check = checkStatement(input.statement);
    if (!check.fits) return { error: check.words === 0 ? 'a statement needs at least one word' : `${check.words} words, the limit is ${check.limit}` };
  } else if (!row.statement && !input.realizes) {
    return { error: `${key} has no statement to affirm: give it one` };
  }
  const bad = input.realizes?.find((id) => !PLATFORM_CAPABILITY.test(id));
  if (bad !== undefined) return { error: `${bad} is not a platform capability: capability:<kebab-case-slug>` };
  let next: CapabilityFileRow =
    input.statement !== undefined
      ? { ...row, statement: input.statement, status: 'clear', statedBy: input.by, statedAt: input.at, revision: 'revised', revisedBy: input.by, revisedAt: input.at }
      : input.realizes
        ? // what a row realizes carries its own attribution; the row's statement and its revision stay as they are
          { ...row }
        : { ...row, revision: 'affirmed', revisedBy: input.by, revisedAt: input.at };
  if (input.realizes) {
    const held = row.realizes ?? [];
    const added = [...new Set(input.realizes)].filter((c) => !held.some((h) => h.capability === c)).map((capability) => ({ capability, statedBy: input.by, statedAt: input.at }));
    next = { ...next, realizes: [...held, ...added] };
  }
  const checked = CapabilityFileRowSchema.safeParse(next);
  if (!checked.success) return { error: checked.error.issues.map(describeZod).join('; ') };
  return { rows: rows.map((r) => (rowKey(r) === key ? next : r)) };
}
