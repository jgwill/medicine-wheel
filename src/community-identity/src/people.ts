/**
 * A person is a seat-holder: a node on the wheel of type `human`, or of type
 * `agent` when software holds the seat (ontology revision 0.17.0,
 * jgwill/medicine-wheel#152), whose metadata says so. "Person" names the seat,
 * not what holds it: `being` says that, and the role says only what the seat
 * may do.
 *
 * The wheel had `human` nodes long before this package (participants in
 * ceremonies were written as `node:human:<ts>:<rand>`); what it could not do
 * was tell two of them apart or say what either may do. `metadata.kind =
 * 'person'` and `metadata.role` are the two facts this package adds. The
 * secret that proves a person is who they say (a token) never goes on the
 * wheel; see `credentials.ts`.
 */

import type { DirectionName, RelationalNode } from '@medicine-wheel/ontology-core';
import { z } from 'zod';
import { isRole, type Role } from './roles.js';

export const PERSON_KIND = 'person' as const;

export type PersonStatus = 'active' | 'deactivated';

/** What holds a seat: a human being, or an agent (software speaking in ceremony). */
export type Being = 'human' | 'agent';

/** Roles that only an AI account holds. An agent recorded as `human` before 0.17.0 is still recognised by them. */
export const AI_ROLES: readonly Role[] = ['companion_ai', 'integration_ai'];

export interface Person {
  /** The node id on the wheel. */
  id: string;
  name: string;
  role: Role;
  /** What holds the seat, read from the node type. */
  being: Being;
  /** A deactivated person keeps their node and history but cannot sign in. Default `active`. */
  status: PersonStatus;
  /** May this person issue their own tokens? An admin turns it on (STPB's `api_access_enabled`). Default off. */
  api_access: boolean;
  email?: string;
  direction?: DirectionName;
  created_at: string;
  updated_at: string;
}

export const NewPersonSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  role: z.string().refine(isRole, 'unknown role'),
  email: z.string().trim().email().optional(),
  direction: z.enum(['east', 'south', 'west', 'north']).optional(),
  api_access: z.boolean().optional(),
  /** Software holds this seat: the node is created as an `agent`. */
  agent: z.boolean().optional(),
});

export type NewPerson = z.infer<typeof NewPersonSchema>;

export function personNodeId(being: Being = 'human'): string {
  return `node:${being}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

/** The node to create on the wheel for a new person. */
export function personNode(input: NewPerson, now = new Date().toISOString()): RelationalNode {
  return {
    id: input.id ?? personNodeId(input.agent ? 'agent' : 'human'),
    name: input.name,
    type: input.agent ? 'agent' : 'human',
    ...(input.direction ? { direction: input.direction } : {}),
    metadata: {
      kind: PERSON_KIND,
      role: input.role,
      api_access: input.api_access === true,
      ...(input.email ? { email: input.email } : {}),
    },
    created_at: now,
    updated_at: now,
  };
}

/** Read a person back from a node; null when the node is a human that this package does not govern. */
export function personFromNode(node: RelationalNode | null | undefined): Person | null {
  if (!node || (node.type !== 'human' && node.type !== 'agent')) return null;
  const meta = node.metadata ?? {};
  if (meta.kind !== PERSON_KIND || !isRole(meta.role)) return null;
  return {
    id: node.id,
    name: node.name,
    role: meta.role,
    being: node.type === 'agent' ? 'agent' : 'human',
    status: meta.status === 'deactivated' ? 'deactivated' : 'active',
    api_access: meta.api_access === true,
    ...(typeof meta.email === 'string' ? { email: meta.email } : {}),
    ...(node.direction ? { direction: node.direction } : {}),
    created_at: node.created_at,
    updated_at: node.updated_at,
  };
}

/** The metadata patch that grants (or changes) a person's role. */
export function roleGrant(role: Role, current: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...current, kind: PERSON_KIND, role };
}

/** The metadata patch that deactivates a person: they stay on the wheel, they cannot sign in. */
export function deactivatePatch(current: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...current, status: 'deactivated', deactivated_at: new Date().toISOString() };
}

/** The metadata patch that lets a deactivated person back in. */
export function reactivatePatch(current: Record<string, unknown> = {}): Record<string, unknown> {
  const { deactivated_at: _gone, ...rest } = current;
  return { ...rest, status: 'active' };
}

/** The metadata patch that grants or withdraws API access (the right to issue one's own tokens). */
export function apiAccessPatch(enabled: boolean, current: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...current, api_access: enabled };
}

/**
 * Whose words these are, from the node that spoke them: `agent` for an agent
 * node, or for a `human` node holding an AI role (recorded before 0.17.0);
 * `person` for any other `human` node; undefined for anything else.
 */
export function speakerKindOf(node: RelationalNode | null | undefined): 'person' | 'agent' | undefined {
  if (!node) return undefined;
  if (node.type === 'agent') return 'agent';
  if (node.type !== 'human') return undefined;
  const role = node.metadata?.role;
  return typeof role === 'string' && (AI_ROLES as readonly string[]).includes(role) ? 'agent' : 'person';
}
