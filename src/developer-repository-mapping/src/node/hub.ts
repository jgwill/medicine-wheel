/**
 * Read a hub: its own folder, and when it is a meta hub, every owner hub it
 * registers, from a local path or over https. Each hub is checked on its
 * own, then merged. A hub that cannot be read is reported and the others are
 * still read.
 */

import * as path from 'node:path';
import { checkMapping } from '../check';
import { mergeMappings, type HubReading, type MergedMapping } from '../merge';
import { readMapping, type MappingRead } from '../read';
import { MAPPING_DIR, type MappingIssue, type RepositoryMapping } from '../types';
import { findMappingDir, readMappingDir } from './fs';

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** How long one file of a remote hub may take before that hub is reported unread. */
export const HUB_FETCH_TIMEOUT_MS = 15_000;

/** Where GitHub serves a hub's mapping folder from its default branch. */
export function defaultHubSource(hub: string): string {
  return `https://raw.githubusercontent.com/${hub}/HEAD/${MAPPING_DIR}/`;
}

/** Read a mapping folder from a local path (relative to `base`) or an https URL. */
export async function readMappingSource(
  source: string,
  base: string,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
  label?: string,
): Promise<MappingRead> {
  try {
    if (/^https?:\/\//.test(source)) {
      const folder = source.endsWith('/') ? source : `${source}/`;
      return await readMapping(async (file) => {
        const res = await fetchImpl(new URL(file, folder).toString(), { signal: AbortSignal.timeout(HUB_FETCH_TIMEOUT_MS) });
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`${res.status} from ${folder}${file}`);
        return res.text();
      }, label ?? source);
    }
    const resolved = path.resolve(base, source);
    const dir = (await findMappingDir(resolved)) ?? resolved;
    return await readMappingDir(dir, label ?? source);
  } catch (error) {
    return { issues: [{ severity: 'error', file: label ?? source, message: (error as Error).message }] };
  }
}

export interface HubStatus {
  hub: string;
  source: string;
  read: boolean;
  repositories: number;
  issues: MappingIssue[];
}

export interface HubRead {
  /** The folder's own rows. */
  local?: RepositoryMapping;
  /** The folder's own rows merged with every hub it registers (just its own for an owner hub). */
  merged?: MergedMapping;
  hubs: HubStatus[];
  /** Every issue: each hub's reading and check, then the merge's. */
  issues: MappingIssue[];
}

export interface ReadHubOptions {
  /** Read only the folder's own rows, even for a meta hub. */
  local?: boolean;
  fetch?: FetchLike;
}

export async function readHub(dir: string, options: ReadHubOptions = {}): Promise<HubRead> {
  const own = await readMappingDir(dir);
  if (!own.mapping) return { hubs: [], issues: own.issues };
  const local = own.mapping;
  const selfHub = local.manifest.hub;
  const selfIssues = [...own.issues, ...checkMapping(local)];
  const hubs: HubStatus[] = [
    { hub: selfHub, source: dir, read: true, repositories: local.repositories.length, issues: selfIssues },
  ];
  const readings: HubReading[] = [{ hub: selfHub, mapping: local }];

  if (local.manifest.kind === 'meta' && !options.local) {
    for (const owner of local.owners) {
      if (owner.hub === selfHub) continue;
      const source = owner.source ?? defaultHubSource(owner.hub);
      const read = await readMappingSource(source, dir, options.fetch, owner.hub);
      const issues = [...read.issues];
      let ok = Boolean(read.mapping);
      if (read.mapping && read.mapping.manifest.hub !== owner.hub) {
        issues.push({ severity: 'error', file: owner.hub, message: `${source} holds ${read.mapping.manifest.hub}'s mapping, not ${owner.hub}'s` });
        ok = false;
      }
      if (read.mapping && ok) {
        issues.push(...checkMapping(read.mapping).map((i) => ({ ...i, file: `${owner.hub}/${i.file ?? ''}` })));
        readings.push({ hub: owner.hub, mapping: read.mapping });
      }
      hubs.push({ hub: owner.hub, source, read: ok, repositories: read.mapping?.repositories.length ?? 0, issues });
    }
  }

  const merged = mergeMappings(readings);
  return { local, merged, hubs, issues: [...hubs.flatMap((h) => h.issues), ...merged.issues] };
}
