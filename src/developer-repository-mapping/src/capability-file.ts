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
  type CapabilityFacet,
} from '@medicine-wheel/capabilities';
import { parseJsonl } from './jsonl';
import type { MappingIssue } from './types';
import { CAPABILITY_KINDS, capabilityAddress, capabilityId, type Artefact, type CapabilityKind } from './capability-scan';

/** Where a repository keeps it, relative to its root. */
export const CAPABILITY_FILE = '.miadi/capabilities.jsonl';
export const CAPABILITY_FILE_SCHEMA = 'medicine-wheel/repository-capabilities';
/** `statedBy` of a row the scan wrote. Any other name is a person's, and a rescan keeps its words. */
export const SCAN_AUTHOR = 'mw-repomap scan';

export const CapabilityFileHeaderSchema = z
  .object({
    schema: z.literal(CAPABILITY_FILE_SCHEMA),
    version: z.literal(1),
    /** `owner/name`, as the repository was known when the file was written. */
    repository: z.string().min(1),
  })
  .strict();
export type CapabilityFileHeader = z.infer<typeof CapabilityFileHeaderSchema>;

export const CapabilityFileRowSchema = z
  .object({
    kind: z.enum(CAPABILITY_KINDS as unknown as [CapabilityKind, ...CapabilityKind[]]),
    name: z.string().min(1),
    /** `miadi-capability://<owner>/<repo>/<kind>/<name>` */
    address: z.string().min(1),
    statement: StatementSchema.optional(),
    status: StatementStatusSchema,
    /** For a CLI: the package that ships it. */
    package: z.string().min(1).optional(),
    /** `grounding` here is the files that say so, relative to the repository. */
    ...attributionShape,
  })
  .strict()
  .superRefine((row, ctx) => refineAttribution(row, ctx));
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

/** Read the file. Never throws: a bad line is an issue, and the good lines around it are still read. */
export function parseCapabilityFile(text: string): ParsedCapabilityFile {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const end = firstLineEnd(clean);
  const issues: MappingIssue[] = [];
  let header: CapabilityFileHeader | undefined;
  try {
    const parsed = CapabilityFileHeaderSchema.safeParse(JSON.parse(clean.slice(0, end)));
    if (parsed.success) header = parsed.data;
    else issues.push({ severity: 'error', file: CAPABILITY_FILE, line: 1, message: `the first line is not this file's header: ${parsed.error.issues[0]?.message}` });
  } catch (error) {
    issues.push({ severity: 'error', file: CAPABILITY_FILE, line: 1, message: `not JSON: ${(error as Error).message}` });
  }
  const rest = parseJsonl(clean.slice(end + 1), CapabilityFileRowSchema, CAPABILITY_FILE);
  return {
    ...(header ? { header } : {}),
    rows: rest.rows,
    issues: [...issues, ...rest.issues.map((i) => ({ ...i, ...(i.line ? { line: i.line + 1 } : {}) }))],
  };
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
    const fits = a.description ? checkStatement(a.description).fits : false;
    rows.set(key, {
      kind: a.kind,
      name: a.name,
      address: capabilityAddress(ctx.repository, a.kind, a.name),
      ...(fits ? { statement: a.description } : {}),
      status: fits ? 'clear' : 'needs-resolution',
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
  /** Rows a person wrote that this scan does not find: kept, and said. */
  keptByPerson: string[];
}

/**
 * What the file should hold after a scan.
 *
 * A row a person wrote (any `statedBy` but {@link SCAN_AUTHOR}) keeps its
 * words and its attribution. A statement added by hand to a row the scan could
 * not state is kept the same way. A row the scan wrote takes the scan's
 * statement, and goes back to pending only when the statement changed. The
 * files and the shipping package are always the scan's. The same rule serves
 * a reader, which merges a committed file with what the commit holds.
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
    const keepWords = byPerson || (!scan.statement && Boolean(row.statement));
    let next: CapabilityFileRow;
    if (keepWords) {
      next = {
        ...row,
        address: scan.address,
        status: row.status === 'unclear' ? 'unclear' : row.statement ? 'clear' : row.status,
        grounding: scan.grounding,
        ...(scan.package ? { package: scan.package } : {}),
      };
    } else if (row.statement === scan.statement) {
      next = { ...row, address: scan.address, status: scan.status, grounding: scan.grounding, ...(scan.package ? { package: scan.package } : {}) };
    } else {
      next = scan;
    }
    if (JSON.stringify(rowForCompare(next)) !== JSON.stringify(rowForCompare(row))) changed.push(key);
    rows.push(next);
  }
  const removed: string[] = [];
  const keptByPerson: string[] = [];
  for (const row of existing) {
    const key = rowKey(row);
    if (seen.has(key)) continue;
    if (row.statedBy === SCAN_AUTHOR) {
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
}

/** A person states or affirms one row. An `error` says why not: no such row, or words that do not fit. */
export function stateCapabilityRow(rows: readonly CapabilityFileRow[], input: CapabilityStatementInput): { rows: CapabilityFileRow[] } | { error: string } {
  const key = rowKey(input);
  const row = rows.find((r) => rowKey(r) === key);
  if (!row) return { error: `the file holds no ${key}: run capabilities scan --write first` };
  if (input.statement !== undefined) {
    const check = checkStatement(input.statement);
    if (!check.fits) return { error: check.words === 0 ? 'a statement needs at least one word' : `${check.words} words, the limit is ${check.limit}` };
  } else if (!row.statement) {
    return { error: `${key} has no statement to affirm: give it one` };
  }
  const next: CapabilityFileRow =
    input.statement !== undefined
      ? { ...row, statement: input.statement, status: 'clear', statedBy: input.by, statedAt: input.at, revision: 'revised', revisedBy: input.by, revisedAt: input.at }
      : { ...row, revision: 'affirmed', revisedBy: input.by, revisedAt: input.at };
  return { rows: rows.map((r) => (rowKey(r) === key ? next : r)) };
}
