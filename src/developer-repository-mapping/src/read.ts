/**
 * Read a mapping folder through any reader: the file system, GitHub, a test.
 * The reader returns a file's text, or `undefined` when the file is absent.
 * Only `manifest.json` is required; an absent JSONL file is an empty one.
 */

import type { z } from 'zod';
import { CapabilityFacetSchema } from '@medicine-wheel/capabilities';
import { parseJsonDocument, parseJsonl } from './jsonl';
import {
  FeatureFacetSchema,
  MappingManifestSchema,
  OwnerRegistrationSchema,
  RelationRowSchema,
  RepositoryFacetSchema,
} from './schemas';
import { MAPPING_FILES, type MappingIssue, type RepositoryMapping } from './types';

export type MappingReader = (file: string) => Promise<string | undefined>;

export interface MappingRead {
  mapping?: RepositoryMapping;
  issues: MappingIssue[];
}

export async function readMapping(read: MappingReader, label?: string): Promise<MappingRead> {
  const where = (file: string) => (label ? `${label}/${file}` : file);
  const manifestText = await read(MAPPING_FILES.manifest);
  if (manifestText === undefined) {
    return { issues: [{ severity: 'error', file: where(MAPPING_FILES.manifest), message: 'no manifest.json: not a mapping folder (mw-repomap init makes one)' }] };
  }
  const manifest = parseJsonDocument(manifestText, MappingManifestSchema, where(MAPPING_FILES.manifest));
  if (!manifest.value) return { issues: manifest.issues };

  const issues: MappingIssue[] = [];
  const rows = async <T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T[]> => {
    const parsed = parseJsonl(await read(file) ?? '', schema, where(file));
    issues.push(...parsed.issues);
    return parsed.rows;
  };

  const mapping: RepositoryMapping = {
    manifest: manifest.value,
    repositories: await rows(MAPPING_FILES.repositories, RepositoryFacetSchema),
    features: await rows(MAPPING_FILES.features, FeatureFacetSchema),
    capabilities: await rows(MAPPING_FILES.capabilities, CapabilityFacetSchema),
    relations: await rows(MAPPING_FILES.relations, RelationRowSchema),
    owners: await rows(MAPPING_FILES.owners, OwnerRegistrationSchema),
  };
  return { mapping, issues };
}
