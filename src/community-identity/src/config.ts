/**
 * Community configuration: what an admin sets for the whole platform.
 *
 * STPB keeps `platform_config` (key, value, updated_by) behind its Config tab:
 * open registration, ceremony registration, limits. Here the fields a wheel
 * community needs, one JSON file kept by the consumer, plus the one thing STPB
 * cannot do: grant a role a permission it does not carry by default (so a
 * community may decide that its participants witness).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEFAULT_OUTPUT_LANGUAGE, DEFAULT_OUTPUT_LANGUAGES, MAX_OUTPUT_LANGUAGES, normalizeLanguageList, normalizeLanguageTag } from './language.js';
import { hasPermission, isRole, PERMISSIONS, ROLE_PERMISSIONS, type Permission, type Role } from './roles.js';

export type RegistrationMode = 'invite_only' | 'open' | 'closed';

export interface CommunityConfig {
  /** `invite_only`: a code from a circle is needed (default). `open`: anyone may register, unseated. `closed`: nobody. */
  registration: RegistrationMode;
  /** The role a newcomer receives. */
  default_role: Role;
  /** Whether a newcomer may issue their own tokens from the start. Default off: an admin enables API access per person. */
  default_api_access: boolean;
  /** Permissions granted beyond the role's default map, per role. */
  role_grants: Partial<Record<Role, Permission[]>>;
  /** Shown to everyone signed in, when set. */
  site_notice?: string;
  /** The languages answers may be written in, canonical BCP 47 tags (#175). Default `en`, `fr`. */
  output_languages: string[];
  /** The language answers are written in when the person names none; always one of `output_languages`. */
  default_output_language: string;
  updated_at?: string;
  updated_by?: string;
}

export const DEFAULT_CONFIG: CommunityConfig = {
  registration: 'invite_only',
  default_role: 'participant',
  default_api_access: false,
  role_grants: {},
  output_languages: [...DEFAULT_OUTPUT_LANGUAGES],
  default_output_language: DEFAULT_OUTPUT_LANGUAGE,
};

/** A fresh copy of the defaults, sharing no list with DEFAULT_CONFIG. */
function defaultConfig(): CommunityConfig {
  return { ...DEFAULT_CONFIG, role_grants: {}, output_languages: [...DEFAULT_CONFIG.output_languages] };
}

export function isRegistrationMode(v: unknown): v is RegistrationMode {
  return v === 'invite_only' || v === 'open' || v === 'closed';
}

/** Validate a partial config from the outside; returns the fields that are valid and the reasons for the rest. */
export function validateConfigPatch(input: unknown): { patch: Partial<CommunityConfig>; errors: string[] } {
  const errors: string[] = [];
  const patch: Partial<CommunityConfig> = {};
  if (!input || typeof input !== 'object') return { patch, errors: ['config must be an object'] };
  const o = input as Record<string, unknown>;
  if (o.registration !== undefined) {
    if (isRegistrationMode(o.registration)) patch.registration = o.registration;
    else errors.push('registration must be invite_only, open or closed');
  }
  if (o.default_role !== undefined) {
    if (isRole(o.default_role)) patch.default_role = o.default_role;
    else errors.push('default_role is not a role');
  }
  if (o.default_api_access !== undefined) {
    if (typeof o.default_api_access === 'boolean') patch.default_api_access = o.default_api_access;
    else errors.push('default_api_access must be true or false');
  }
  if (o.role_grants !== undefined) {
    if (!o.role_grants || typeof o.role_grants !== 'object') errors.push('role_grants must be an object');
    else {
      const grants: Partial<Record<Role, Permission[]>> = {};
      for (const [role, perms] of Object.entries(o.role_grants as Record<string, unknown>)) {
        if (!isRole(role)) { errors.push(`role_grants: ${role} is not a role`); continue; }
        if (!Array.isArray(perms) || !perms.every((p) => (PERMISSIONS as readonly string[]).includes(String(p)))) { errors.push(`role_grants.${role}: unknown permission`); continue; }
        grants[role] = perms as Permission[];
      }
      patch.role_grants = grants;
    }
  }
  if (o.site_notice !== undefined) {
    if (o.site_notice === null || o.site_notice === '') patch.site_notice = undefined;
    else if (typeof o.site_notice === 'string') patch.site_notice = o.site_notice.slice(0, 500);
    else errors.push('site_notice must be text');
  }
  if (o.output_languages !== undefined) {
    const list = Array.isArray(o.output_languages) ? normalizeLanguageList(o.output_languages) : null;
    if (!list) errors.push('output_languages must be a list of language tags (en, fr, fr-CA)');
    else if (list.length === 0) errors.push('output_languages names at least one language');
    else if (list.length > MAX_OUTPUT_LANGUAGES) errors.push(`output_languages names at most ${MAX_OUTPUT_LANGUAGES} languages`);
    else patch.output_languages = list;
  }
  if (o.default_output_language !== undefined) {
    const tag = normalizeLanguageTag(o.default_output_language);
    if (!tag) errors.push('default_output_language is not a language tag');
    else if (patch.output_languages && !patch.output_languages.includes(tag)) errors.push('default_output_language must be one of output_languages');
    else patch.default_output_language = tag;
  }
  return { patch, errors };
}

/**
 * The languages of a config made coherent after a change: a default named on
 * its own joins the languages offered, and a list that leaves the default out
 * gives its first language as the default.
 */
export function coherentLanguages(config: CommunityConfig, patch: Partial<CommunityConfig> = {}): Pick<CommunityConfig, 'output_languages' | 'default_output_language'> {
  const languages = config.output_languages?.length ? [...config.output_languages] : [...DEFAULT_OUTPUT_LANGUAGES];
  let fallback = config.default_output_language;
  if (!languages.includes(fallback)) {
    if (patch.default_output_language !== undefined && patch.output_languages === undefined) languages.unshift(fallback);
    else fallback = languages[0];
  }
  return { output_languages: languages, default_output_language: fallback };
}

/** The role's permissions with the community's grants applied. */
export function permissionsFor(role: Role, config: Pick<CommunityConfig, 'role_grants'> = DEFAULT_CONFIG): readonly (Permission | '*')[] {
  const base = ROLE_PERMISSIONS[role];
  if (base.includes('*')) return base;
  const extra = config.role_grants?.[role] ?? [];
  return [...new Set([...base, ...extra])];
}

export function mayDo(role: Role, permission: Permission, config: Pick<CommunityConfig, 'role_grants'> = DEFAULT_CONFIG): boolean {
  return hasPermission(role, permission) || (config.role_grants?.[role] ?? []).includes(permission);
}

export interface ConfigStore {
  get(): Promise<CommunityConfig>;
  set(patch: Partial<CommunityConfig>, updated_by: string): Promise<CommunityConfig>;
}

/** One JSON file, whole config, rewritten on change. */
export class JsonConfigStore implements ConfigStore {
  constructor(private readonly file: string) {}

  async get(): Promise<CommunityConfig> {
    if (!existsSync(this.file)) return defaultConfig();
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<CommunityConfig>;
      const { patch } = validateConfigPatch(parsed);
      const merged: CommunityConfig = { ...DEFAULT_CONFIG, ...patch };
      return { ...merged, ...coherentLanguages(merged), ...(parsed.updated_at ? { updated_at: parsed.updated_at } : {}), ...(parsed.updated_by ? { updated_by: parsed.updated_by } : {}) };
    } catch {
      return defaultConfig();
    }
  }

  async set(patch: Partial<CommunityConfig>, updated_by: string): Promise<CommunityConfig> {
    const current = await this.get();
    const merged: CommunityConfig = { ...current, ...patch };
    const next: CommunityConfig = { ...merged, ...coherentLanguages(merged, patch), updated_at: new Date().toISOString(), updated_by };
    if (patch.site_notice === undefined && 'site_notice' in patch) delete next.site_notice;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(next, null, 2) + '\n');
    return next;
  }
}
