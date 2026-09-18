/**
 * Roles and what each may do.
 *
 * Copied from STPB (`jgwill/StorytellingPlatformBlueprint2510`, `lib/types/roles.ts`)
 * on 2026-09-18 and renamed where the name was a brand: `lighthouse_admin` is
 * `admin`, `eva_ai` is `companion_ai`. The progression is the same one:
 *
 *   participant → emerging_guide → ceremony_facilitator → firekeeper → admin
 *                                                        ↘ story_keeper (parallel)
 */

export const ROLES = [
  'participant',
  'emerging_guide',
  'ceremony_facilitator',
  'firekeeper',
  'story_keeper',
  'admin',
  'companion_ai',
  'integration_ai',
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'create_beats',
  'join_circles',
  'witness',
  'view_own_arc',
  'create_circles',
  'invite_members',
  'facilitate_ceremony',
  'moderate',
  'view_community_patterns',
  'view_historical_arcs',
  'create_wisdom',
  'propose_themes',
  'read_personal_data',
  'analyze_narrative',
  'read_public_api',
  'manage_people',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Story keeper is parallel to firekeeper, not above it. */
export const ROLE_HIERARCHY: Record<Role, number> = {
  participant: 0,
  emerging_guide: 1,
  ceremony_facilitator: 2,
  firekeeper: 3,
  story_keeper: 3,
  admin: 4,
  companion_ai: 0,
  integration_ai: 0,
};

export const ROLE_LABELS: Record<Role, string> = {
  participant: 'Participant',
  emerging_guide: 'Emerging Guide',
  ceremony_facilitator: 'Ceremony Facilitator',
  firekeeper: 'Firekeeper',
  story_keeper: 'Story Keeper',
  admin: 'Admin',
  companion_ai: 'Companion AI',
  integration_ai: 'Integration AI',
};

const BASE: Permission[] = ['create_beats', 'join_circles'];
const GUIDE: Permission[] = [...BASE, 'witness', 'view_own_arc'];

export const ROLE_PERMISSIONS: Record<Role, readonly (Permission | '*')[]> = {
  participant: BASE,
  emerging_guide: GUIDE,
  ceremony_facilitator: [...GUIDE, 'create_circles', 'invite_members', 'facilitate_ceremony'],
  firekeeper: [...GUIDE, 'create_circles', 'invite_members', 'moderate', 'view_community_patterns'],
  story_keeper: [...GUIDE, 'view_community_patterns', 'view_historical_arcs', 'create_wisdom', 'propose_themes'],
  admin: ['*'],
  companion_ai: ['read_personal_data', 'analyze_narrative'],
  integration_ai: ['read_public_api'],
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes('*') || perms.includes(permission);
}

export function hasRoleLevel(role: Role, required: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[required];
}

export function rolesAtOrAbove(role: Role): Role[] {
  const level = ROLE_HIERARCHY[role];
  return ROLES.filter((r) => ROLE_HIERARCHY[r] >= level);
}
