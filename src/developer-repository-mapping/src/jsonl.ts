/**
 * JSONL in and out. Parsing never throws: a bad line becomes an issue with
 * its line number, and the good lines around it are still read.
 */

import type { z } from 'zod';
import type { MappingIssue } from './types';

export interface ParsedRows<T> {
  rows: T[];
  issues: MappingIssue[];
}

/** A file saved with a UTF-8 byte-order mark reads as the same text without it. */
function withoutBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function describe(issue: z.ZodIssue): string {
  return issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message;
}

export function parseJsonl<T>(text: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, file?: string): ParsedRows<T> {
  const rows: T[] = [];
  const issues: MappingIssue[] = [];
  const lines = withoutBom(text).split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      issues.push({ severity: 'error', file, line, message: `not JSON: ${(error as Error).message}` });
      return;
    }
    const parsed = schema.safeParse(value);
    if (parsed.success) {
      rows.push(parsed.data);
      return;
    }
    const nodeId = typeof (value as { nodeId?: unknown })?.nodeId === 'string' ? (value as { nodeId: string }).nodeId : undefined;
    for (const issue of parsed.error.issues) {
      issues.push({ severity: 'error', file, line, ...(nodeId ? { nodeId } : {}), message: describe(issue) });
    }
  });
  return { rows, issues };
}

/** Parse one JSON document (a manifest). */
export function parseJsonDocument<T>(
  text: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  file?: string,
): { value?: T; issues: MappingIssue[] } {
  let value: unknown;
  try {
    value = JSON.parse(withoutBom(text));
  } catch (error) {
    return { issues: [{ severity: 'error', file, message: `not JSON: ${(error as Error).message}` }] };
  }
  const parsed = schema.safeParse(value);
  if (parsed.success) return { value: parsed.data, issues: [] };
  return { issues: parsed.error.issues.map((issue) => ({ severity: 'error' as const, file, message: describe(issue) })) };
}

/** One row per line, newline-terminated. The caller decides the order. */
export function toJsonl(rows: readonly object[]): string {
  return rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
}
