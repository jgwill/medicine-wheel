/**
 * A person is a node on the wheel of type `human` whose metadata says so.
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

export interface Person {
  /** The node id on the wheel. */
  id: string;
  name: string;
  role: Role;
  /** A deactivated person keeps their node and history but cannot sign in. Default `active`. */
  status: PersonStatus;
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
});

export type NewPerson = z.infer<typeof NewPersonSchema>;

export function personNodeId(): string {
  return `node:human:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

/** The node to create on the wheel for a new person. */
export function personNode(input: NewPerson, now = new Date().toISOString()): RelationalNode {
  return {
    id: input.id ?? personNodeId(),
    name: input.name,
    type: 'human',
    ...(input.direction ? { direction: input.direction } : {}),
    metadata: {
      kind: PERSON_KIND,
      role: input.role,
      ...(input.email ? { email: input.email } : {}),
    },
    created_at: now,
    updated_at: now,
  };
}

/** Read a person back from a node; null when the node is a human that this package does not govern. */
export function personFromNode(node: RelationalNode | null | undefined): Person | null {
  if (!node || node.type !== 'human') return null;
  const meta = node.metadata ?? {};
  if (meta.kind !== PERSON_KIND || !isRole(meta.role)) return null;
  return {
    id: node.id,
    name: node.name,
    role: meta.role,
    status: meta.status === 'deactivated' ? 'deactivated' : 'active',
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
