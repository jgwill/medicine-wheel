/**
 * A mapping folder on disk.
 *
 * Rows are written sorted (repositories, features and capabilities by node
 * id, relations by `from type to`), one per line, so a second writer produces
 * a reviewable diff instead of a reshuffled file. `owners.jsonl` keeps the
 * order it was written in: that order is the order hubs are read in, and the
 * first hub to define a capability speaks for it.
 *
 * Nothing is written that would not read back: every row is checked against
 * its schema first, and each file is written beside itself and renamed into
 * place, so a crash leaves the old file or the new one, never half of one.
 */

import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { z } from 'zod';
import { CapabilityFacetSchema } from '@medicine-wheel/capabilities';
import { relationKey } from '../check';
import { readMapping, type MappingRead } from '../read';
import { toJsonl } from '../jsonl';
import {
  FeatureFacetSchema,
  MappingManifestSchema,
  OwnerRegistrationSchema,
  RelationRowSchema,
  RepositoryFacetSchema,
} from '../schemas';
import { MAPPING_DIR, MAPPING_FILES, MAPPING_SCHEMA, type MappingManifest, type RepositoryMapping } from '../types';

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/** True when the file is a repository-mapping manifest, not some other `manifest.json`. */
async function isMappingManifest(file: string): Promise<boolean> {
  try {
    const value = JSON.parse((await readFile(file, 'utf8')).replace(/^﻿/, '')) as { schema?: unknown };
    return value?.schema === MAPPING_SCHEMA;
  } catch {
    return false;
  }
}

/**
 * The mapping folder of a hub clone (`start/.miadi/repository-mapping`), or
 * `start` itself when it holds a repository-mapping manifest, or `undefined`.
 * The nested folder wins: a hub clone's own `manifest.json` (a web app's, an
 * extension's) is not a mapping.
 */
export async function findMappingDir(start: string): Promise<string | undefined> {
  const dir = path.resolve(start);
  const nested = path.join(dir, MAPPING_DIR);
  if (await exists(path.join(nested, MAPPING_FILES.manifest))) return nested;
  if (await isMappingManifest(path.join(dir, MAPPING_FILES.manifest))) return dir;
  return undefined;
}

export async function readMappingDir(dir: string, label?: string): Promise<MappingRead> {
  return readMapping(async (file) => {
    try {
      return await readFile(path.join(dir, file), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }, label);
}

const byId = (a: { nodeId: string }, b: { nodeId: string }) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0);
const byRelation = (a: Parameters<typeof relationKey>[0], b: Parameters<typeof relationKey>[0]) =>
  relationKey(a) < relationKey(b) ? -1 : relationKey(a) > relationKey(b) ? 1 : 0;

/**
 * Every row as its schema returns it (keys in schema order), and every
 * failure as a `file: id: message` line.
 */
function normalize(mapping: RepositoryMapping): { mapping: RepositoryMapping; failures: string[] } {
  const failures: string[] = [];
  const parse = <T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, rows: readonly T[], id: (row: T) => string): T[] =>
    rows.map((row) => {
      const parsed = schema.safeParse(row);
      if (parsed.success) return parsed.data;
      failures.push(...parsed.error.issues.map((i) => `${file}: ${id(row)}: ${i.path.join('.')}${i.path.length ? ': ' : ''}${i.message}`));
      return row;
    });
  const normalized: RepositoryMapping = {
    manifest: parse(MAPPING_FILES.manifest, MappingManifestSchema, [mapping.manifest], (m) => m.hub)[0],
    repositories: parse(MAPPING_FILES.repositories, RepositoryFacetSchema, mapping.repositories, (r) => r.nodeId),
    features: parse(MAPPING_FILES.features, FeatureFacetSchema, mapping.features, (r) => r.nodeId),
    capabilities: parse(MAPPING_FILES.capabilities, CapabilityFacetSchema, mapping.capabilities, (r) => r.nodeId),
    relations: parse(MAPPING_FILES.relations, RelationRowSchema, mapping.relations, relationKey),
    owners: parse(MAPPING_FILES.owners, OwnerRegistrationSchema, mapping.owners, (o) => o.hub),
  };
  return { mapping: normalized, failures };
}

async function writeAtomically(file: string, text: string): Promise<void> {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, text);
  await rename(temporary, file);
}

/** Write a mapping folder. Refuses, writing nothing, when any row would not read back. */
export async function writeMappingDir(dir: string, given: RepositoryMapping): Promise<void> {
  const { mapping, failures } = normalize(given);
  if (failures.length) {
    throw new Error(`nothing written; these rows would not read back:\n  ${failures.join('\n  ')}`);
  }
  await mkdir(dir, { recursive: true });
  await writeAtomically(path.join(dir, MAPPING_FILES.manifest), JSON.stringify(mapping.manifest, null, 2) + '\n');
  await writeAtomically(path.join(dir, MAPPING_FILES.repositories), toJsonl([...mapping.repositories].sort(byId)));
  await writeAtomically(path.join(dir, MAPPING_FILES.features), toJsonl([...mapping.features].sort(byId)));
  await writeAtomically(path.join(dir, MAPPING_FILES.capabilities), toJsonl([...mapping.capabilities].sort(byId)));
  await writeAtomically(path.join(dir, MAPPING_FILES.relations), toJsonl([...mapping.relations].sort(byRelation)));
  if (mapping.manifest.kind === 'meta' || mapping.owners.length) {
    await writeAtomically(path.join(dir, MAPPING_FILES.owners), toJsonl(mapping.owners));
  }
}

/** Make an empty mapping folder. Refuses a folder that already holds any mapping file. */
export async function initMappingDir(dir: string, manifest: MappingManifest): Promise<void> {
  for (const file of Object.values(MAPPING_FILES)) {
    if (await exists(path.join(dir, file))) {
      throw new Error(`${dir} already holds ${file}; init writes only into a folder with no mapping file`);
    }
  }
  await writeMappingDir(dir, { manifest, repositories: [], features: [], capabilities: [], relations: [], owners: [] });
}
