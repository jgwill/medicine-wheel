/**
 * Zod schemas for every row a mapping folder holds.
 *
 * Strict objects, for the reason `@medicine-wheel/capabilities` gives: in rows
 * written by models, an unknown key is far more often a misspelling than a new
 * field. Endpoint kinds are checked per relation name, so a `realizes` that
 * starts from a repository fails on its own line, not later in a graph.
 *
 * Each shape lists the row's identity first and its attribution last. Parsing
 * returns keys in shape order, so a row read and written back comes out in the
 * same order every time, and rewriting one row leaves the others' lines as they were.
 */

import { z } from 'zod';
import {
  CapabilityNodeIdSchema,
  StatementSchema,
  StatementStatusSchema,
  TimestampSchema,
  attributionShape,
  refineAttribution,
  refineStatementPresence,
} from '@medicine-wheel/capabilities';
import { FEATURE_ID, OWNER_LOGIN, PROTOTYPE_ID, REPOSITORY_ID, RESEARCH_FIELD_ID, featureRepository } from './ids';
import { MAPPING_SCHEMA } from './types';

export const LifecycleSchema = z.enum(['unclassified', 'prototype', 'implementation', 'maintained', 'archived']);

export const LifecycleEventSchema = z.enum(['explore', 'implement', 'concretize', 'release', 'archive', 'reopen']);

export const OriginSchema = z.enum(['own', 'agent', 'community-fork']);

export const DeveloperEdgeNameSchema = z.enum([
  'forked-from',
  'grew-into',
  'provides',
  'realizes',
  'consumes',
  'field-aligns-with',
]);

export const RepositoryNodeIdSchema = z.string().regex(REPOSITORY_ID, 'a repository id is repository:<owner>/<name>');
export const FeatureNodeIdSchema = z
  .string()
  .regex(FEATURE_ID, 'a feature id is feature:<owner>/<name>#<kebab-case-slug>');
export const ResearchFieldNodeIdSchema = z
  .string()
  .regex(RESEARCH_FIELD_ID, 'a research field id is research-field:<kebab-case-slug>');
export const PrototypeNodeIdSchema = z.string().regex(PROTOTYPE_ID, 'a prototype id is prototype:<slug>');

export const ActivityReadingSchema = z
  .object({
    observedBy: z.string().min(1),
    observedAt: TimestampSchema,
    commits: z.number().int().nonnegative(),
    commitsLast90Days: z.number().int().nonnegative(),
    firstCommitAt: TimestampSchema.optional(),
    lastCommitAt: TimestampSchema.optional(),
    tags: z.number().int().nonnegative(),
    branch: z.string().min(1).optional(),
    head: z.string().min(1).optional(),
  })
  .strict();

export const RepositoryFacetSchema = z
  .object({
    nodeId: RepositoryNodeIdSchema,
    origin: OriginSchema,
    lifecycle: LifecycleSchema,
    purpose: StatementSchema.optional(),
    horizon: StatementSchema.optional(),
    status: StatementStatusSchema,
    fields: z.array(ResearchFieldNodeIdSchema),
    prototypes: z.array(PrototypeNodeIdSchema),
    holder: z.string().min(1).optional(),
    observed: ActivityReadingSchema.optional(),
    ...attributionShape,
  })
  .strict()
  .superRefine((row, ctx) => {
    refineAttribution(row, ctx);
    refineStatementPresence(row.status, row.purpose, 'purpose', ctx);
  });

export const FeatureFacetSchema = z
  .object({
    nodeId: FeatureNodeIdSchema,
    repository: RepositoryNodeIdSchema,
    name: z.string().min(1),
    statement: StatementSchema.optional(),
    status: StatementStatusSchema,
    realizes: CapabilityNodeIdSchema.optional(),
    ...attributionShape,
  })
  .strict()
  .superRefine((row, ctx) => {
    refineAttribution(row, ctx);
    refineStatementPresence(row.status, row.statement, 'statement', ctx);
    if (featureRepository(row.nodeId) !== row.repository) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nodeId'],
        message: `a feature id names its repository: ${row.nodeId} is not in ${row.repository}`,
      });
    }
  });

const isRepository = (id: string) => REPOSITORY_ID.test(id);
const isFeature = (id: string) => FEATURE_ID.test(id);
/** Prefixes this mapping gives a meaning to. A service node id is anything else that is namespaced. */
const MAPPING_PREFIXES = ['repository:', 'feature:', 'capability:', 'research-field:', 'prototype:'];
const isService = (id: string) => /^[^\s:]+:\S+$/.test(id) && !MAPPING_PREFIXES.some((p) => id.startsWith(p));

/** Which endpoints each relation name joins. */
const ENDPOINTS: Record<z.infer<typeof DeveloperEdgeNameSchema>, { from: (id: string) => boolean; to: (id: string) => boolean; reads: string }> = {
  'forked-from': { from: isRepository, to: isRepository, reads: 'repository → repository' },
  'grew-into': { from: isRepository, to: isRepository, reads: 'repository → repository' },
  consumes: { from: isRepository, to: isRepository, reads: 'repository → repository' },
  provides: {
    from: (id) => isRepository(id) || isService(id),
    to: (id) => CapabilityNodeIdSchema.safeParse(id).success,
    reads: 'repository or service → capability',
  },
  realizes: { from: isFeature, to: (id) => CapabilityNodeIdSchema.safeParse(id).success, reads: 'feature → capability' },
  'field-aligns-with': { from: isRepository, to: (id) => RESEARCH_FIELD_ID.test(id), reads: 'repository → research-field' },
};

export const RelationRowSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    type: DeveloperEdgeNameSchema,
    description: StatementSchema.optional(),
    ...attributionShape,
  })
  .strict()
  .superRefine((row, ctx) => {
    refineAttribution(row, ctx);
    const ends = ENDPOINTS[row.type];
    if (!ends.from(row.from) || !ends.to(row.to)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['type'], message: `${row.type} joins ${ends.reads}` });
    }
    if (row.from === row.to) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'a relation joins two different nodes' });
    }
  });

export const OwnerRegistrationSchema = z
  .object({
    owner: z.string().regex(OWNER_LOGIN, 'a GitHub login'),
    hub: z.string().min(3),
    source: z.string().min(1).optional(),
    holder: z.string().min(1).optional(),
    registeredBy: z.string().min(1),
    registeredAt: TimestampSchema,
  })
  .strict()
  .superRefine((row, ctx) => {
    if (row.hub !== `${row.owner}/${row.owner}`) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hub'], message: `an owner hub is <owner>/<owner>: ${row.owner}/${row.owner}` });
    }
  });

export const MappingManifestSchema = z
  .object({
    schema: z.literal(MAPPING_SCHEMA),
    version: z.literal(1),
    owner: z.string().regex(OWNER_LOGIN, 'a GitHub login'),
    hub: z.string().min(3),
    kind: z.enum(['owner', 'meta']),
    description: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((row, ctx) => {
    if (row.hub !== `${row.owner}/${row.owner}`) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hub'], message: `an owner hub is <owner>/<owner>: ${row.owner}/${row.owner}` });
    }
  });

export type ValidatedActivityReading = z.infer<typeof ActivityReadingSchema>;
export type ValidatedRepositoryFacet = z.infer<typeof RepositoryFacetSchema>;
export type ValidatedFeatureFacet = z.infer<typeof FeatureFacetSchema>;
export type ValidatedRelationRow = z.infer<typeof RelationRowSchema>;
export type ValidatedOwnerRegistration = z.infer<typeof OwnerRegistrationSchema>;
export type ValidatedMappingManifest = z.infer<typeof MappingManifestSchema>;
