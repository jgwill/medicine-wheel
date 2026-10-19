/**
 * Zod schemas for capability rows and for the attribution every row carries.
 *
 * These exist for the boundary where a model's reading of a repository becomes
 * a row someone else will trust. The parse is where an over-long statement, a
 * row with no evidence, or an `affirmed` row that names no person gets caught.
 * Objects are strict: in a dataset written by models, an unknown key is far
 * more often a misspelling than a new field.
 */

import { z } from 'zod';
import { MetisHoldSchema } from '@medicine-wheel/infra';
import { checkStatement } from './statement';
import { STATEMENT_WORD_LIMIT } from './types';

export const StatementStatusSchema = z.enum(['clear', 'unclear', 'undefinable', 'needs-resolution']);

export const RevisionStateSchema = z.enum(['pending', 'revised', 'affirmed']);

/** ISO 8601 with a zone: '2026-10-18T21:56:00Z', or git's '2026-10-14T22:28:46-04:00'. */
export const TimestampSchema = z.string().datetime({ offset: true });

/** A statement of at least one word and at most {@link STATEMENT_WORD_LIMIT}. */
export const StatementSchema = z.string().superRefine((text, ctx) => {
  const { words, fits } = checkStatement(text);
  if (fits) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message:
      words === 0
        ? 'a statement needs at least one word'
        : `${words} words, the limit is ${STATEMENT_WORD_LIMIT}: record the row as needs-resolution without a statement and move to the next one`,
  });
});

/** The attribution fields, as a shape other row schemas spread into their own. */
export const attributionShape = {
  statedBy: z.string().min(1),
  statedAt: TimestampSchema,
  grounding: z.array(z.string().min(1)).min(1),
  revision: RevisionStateSchema,
  revisedBy: z.string().min(1).optional(),
  revisedAt: TimestampSchema.optional(),
};

/** A `revised` or `affirmed` row names who revised it and when. */
export function refineAttribution(
  row: { revision: string; revisedBy?: string; revisedAt?: string },
  ctx: z.RefinementCtx,
): void {
  if (row.revision === 'pending') return;
  if (!row.revisedBy) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['revisedBy'], message: `a ${row.revision} row names who revised it` });
  }
  if (!row.revisedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['revisedAt'], message: `a ${row.revision} row says when it was revised` });
  }
}

/** A `clear` or `unclear` row carries its statement; the other two may not have one. */
export function refineStatementPresence(
  status: string,
  statement: string | undefined,
  field: string,
  ctx: z.RefinementCtx,
): void {
  if ((status === 'clear' || status === 'unclear') && !statement) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `a ${status} row carries its ${field}` });
  }
}

export const CapabilityNodeIdSchema = z
  .string()
  .regex(/^capability:[a-z0-9]+(?:-[a-z0-9]+)*$/, 'a capability id is capability:<kebab-case-slug>');

export const CapabilityFacetSchema = z
  .object({
    nodeId: CapabilityNodeIdSchema,
    name: z.string().min(1),
    statement: StatementSchema.optional(),
    status: StatementStatusSchema,
    providedBy: z.array(z.string().min(1)),
    metis: MetisHoldSchema.optional(),
    ...attributionShape,
  })
  .strict()
  .superRefine((row, ctx) => {
    refineAttribution(row, ctx);
    refineStatementPresence(row.status, row.statement, 'statement', ctx);
  });

// Named `Validated*` to match the convention infra and consent-lifecycle use.
export type ValidatedCapabilityFacet = z.infer<typeof CapabilityFacetSchema>;
