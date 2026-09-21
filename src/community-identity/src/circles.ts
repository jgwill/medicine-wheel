/**
 * A circle is a node on the wheel of type `circle`; membership is a relation.
 *
 * Copied in shape from STPB's `StoryCircle` (`lib/community/types.ts`:
 * facilitator, participants, invited, capacity, sacred-container config) and
 * mapped onto the wheel: the circle is a node, each member is an edge
 * `member_of` from the person to the circle, the facilitator is the edge whose
 * obligations name `facilitate`. Ceremonies held in the circle carry its id
 * in `circle_id` (ontology-core 0.14.0). A circle opened for a chronicle
 * episode carries the episode's folder name in `episode_path` (0.15.1), the
 * same typed binding a ceremony carries, so the episode can name the circles
 * gathered for it before any of them has held a ceremony.
 */

import type { DirectionName, RelationalEdge, RelationalNode } from '@medicine-wheel/ontology-core';
import { z } from 'zod';

export const CIRCLE_KIND = 'circle' as const;
export const MEMBER_OF = 'member_of' as const;

/** What protects the space. A subset of STPB's SacredContainerConfig, the part a wheel can honour. */
export interface CircleContainer {
  /** New ceremonies and beats in this circle are private to its members until shared. */
  private_by_default: boolean;
  /** Sharing outside the circle needs the speaker's explicit consent. */
  explicit_sharing_consent: boolean;
  /** No counts, no rankings shown to members. */
  hide_engagement_metrics: boolean;
}

export const DEFAULT_CONTAINER: CircleContainer = {
  private_by_default: true,
  explicit_sharing_consent: true,
  hide_engagement_metrics: true,
};

/** STPB's circle kinds: an ongoing circle, a seasonal one, one held once. */
export type CircleType = 'ongoing' | 'seasonal' | 'one_time';
export const CIRCLE_TYPES: readonly CircleType[] = ['ongoing', 'seasonal', 'one_time'] as const;

export interface Circle {
  /** The node id on the wheel. */
  id: string;
  name: string;
  intention: string;
  facilitator_id: string;
  direction?: DirectionName;
  capacity?: number;
  circle_type: CircleType;
  /** A public circle is visible to everyone on the wheel; a private one to its members and admins. */
  is_public: boolean;
  /** An inactive circle keeps its members and history; no ceremony is opened in it. */
  active: boolean;
  container: CircleContainer;
  /** The chronicle episode this circle was opened for (its folder name), when it was opened for one. */
  episode_path?: string;
  created_at: string;
  updated_at: string;
}

export const NewCircleSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  intention: z.string().trim().min(1),
  facilitator_id: z.string().trim().min(1),
  direction: z.enum(['east', 'south', 'west', 'north']).optional(),
  capacity: z.number().int().positive().optional(),
  circle_type: z.enum(['ongoing', 'seasonal', 'one_time']).optional(),
  is_public: z.boolean().optional(),
  container: z
    .object({
      private_by_default: z.boolean().optional(),
      explicit_sharing_consent: z.boolean().optional(),
      hide_engagement_metrics: z.boolean().optional(),
    })
    .optional(),
  episode_path: z.string().trim().min(1).optional(),
});

export type NewCircle = z.infer<typeof NewCircleSchema>;

export function circleNodeId(): string {
  return `circle:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function circleNode(input: NewCircle, now = new Date().toISOString()): RelationalNode {
  return {
    id: input.id ?? circleNodeId(),
    name: input.name,
    type: 'circle',
    ...(input.direction ? { direction: input.direction } : {}),
    metadata: {
      kind: CIRCLE_KIND,
      intention: input.intention,
      facilitator_id: input.facilitator_id,
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
      circle_type: input.circle_type ?? 'ongoing',
      is_public: input.is_public ?? false,
      active: true,
      container: { ...DEFAULT_CONTAINER, ...(input.container ?? {}) },
      ...(input.episode_path ? { episode_path: input.episode_path } : {}),
    },
    created_at: now,
    updated_at: now,
  };
}

export function circleFromNode(node: RelationalNode | null | undefined): Circle | null {
  if (!node || node.type !== 'circle') return null;
  const meta = node.metadata ?? {};
  if (typeof meta.facilitator_id !== 'string') return null;
  const container = (meta.container && typeof meta.container === 'object' ? meta.container : {}) as Partial<CircleContainer>;
  return {
    id: node.id,
    name: node.name,
    intention: typeof meta.intention === 'string' ? meta.intention : '',
    facilitator_id: meta.facilitator_id,
    ...(node.direction ? { direction: node.direction } : {}),
    ...(typeof meta.capacity === 'number' ? { capacity: meta.capacity } : {}),
    circle_type: (CIRCLE_TYPES as readonly string[]).includes(String(meta.circle_type)) ? (meta.circle_type as CircleType) : 'ongoing',
    is_public: meta.is_public === true,
    active: meta.active !== false,
    container: { ...DEFAULT_CONTAINER, ...container },
    ...(typeof meta.episode_path === 'string' && meta.episode_path ? { episode_path: meta.episode_path } : {}),
    created_at: node.created_at,
    updated_at: node.updated_at,
  };
}

export type CircleRole = 'member' | 'facilitator';

export interface Membership {
  person_id: string;
  circle_id: string;
  role: CircleRole;
  since: string;
}

/** The edge to weave on the wheel when a person joins a circle. */
export function membershipEdge(person_id: string, circle_id: string, role: CircleRole = 'member', now = new Date().toISOString()): Omit<RelationalEdge, 'id'> {
  return {
    from_id: person_id,
    to_id: circle_id,
    relationship_type: MEMBER_OF,
    strength: 1,
    ceremony_honored: false,
    obligations: role === 'facilitator' ? ['facilitate', 'hold the space'] : ['show up', 'listen'],
    created_at: now,
  };
}

export function membershipFromEdge(edge: RelationalEdge | Omit<RelationalEdge, 'id'>): Membership | null {
  if (edge.relationship_type !== MEMBER_OF) return null;
  return {
    person_id: edge.from_id,
    circle_id: edge.to_id,
    role: edge.obligations?.includes('facilitate') ? 'facilitator' : 'member',
    since: edge.created_at,
  };
}

/** Members of one circle, from the edges that point at it. */
export function membersOf(circle_id: string, edges: readonly (RelationalEdge | Omit<RelationalEdge, 'id'>)[]): Membership[] {
  return edges
    .filter((e) => e.to_id === circle_id)
    .map(membershipFromEdge)
    .filter((m): m is Membership => m !== null);
}

/** Circles one person belongs to, from the edges that leave them. */
export function circlesOf(person_id: string, edges: readonly (RelationalEdge | Omit<RelationalEdge, 'id'>)[]): Membership[] {
  return edges
    .filter((e) => e.from_id === person_id)
    .map(membershipFromEdge)
    .filter((m): m is Membership => m !== null);
}

export const CirclePatchSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    intention: z.string().trim().min(1).optional(),
    facilitator_id: z.string().trim().min(1).optional(),
    direction: z.enum(['east', 'south', 'west', 'north']).nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    circle_type: z.enum(['ongoing', 'seasonal', 'one_time']).optional(),
    is_public: z.boolean().optional(),
    active: z.boolean().optional(),
    container: z
      .object({
        private_by_default: z.boolean().optional(),
        explicit_sharing_consent: z.boolean().optional(),
        hide_engagement_metrics: z.boolean().optional(),
      })
      .optional(),
    /** Bind the circle to an episode, or `null` to release it from one. */
    episode_path: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

export type CirclePatch = z.infer<typeof CirclePatchSchema>;

/** The node patch (name, direction, metadata) that applies a circle change to the existing node. */
export function circleNodePatch(node: RelationalNode, patch: CirclePatch): { name?: string; direction?: DirectionName | null; metadata: Record<string, unknown> } {
  const meta = { ...(node.metadata ?? {}) } as Record<string, unknown>;
  if (patch.intention !== undefined) meta.intention = patch.intention;
  if (patch.facilitator_id !== undefined) meta.facilitator_id = patch.facilitator_id;
  if (patch.capacity !== undefined) {
    if (patch.capacity === null) delete meta.capacity;
    else meta.capacity = patch.capacity;
  }
  if (patch.circle_type !== undefined) meta.circle_type = patch.circle_type;
  if (patch.episode_path !== undefined) {
    if (patch.episode_path === null) delete meta.episode_path;
    else meta.episode_path = patch.episode_path;
  }
  if (patch.is_public !== undefined) meta.is_public = patch.is_public;
  if (patch.active !== undefined) {
    meta.active = patch.active;
    if (!patch.active) meta.deactivated_at = new Date().toISOString();
    else delete meta.deactivated_at;
  }
  if (patch.container) {
    const current = (meta.container && typeof meta.container === 'object' ? meta.container : {}) as Partial<CircleContainer>;
    meta.container = { ...DEFAULT_CONTAINER, ...current, ...patch.container };
  }
  return {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.direction !== undefined ? { direction: patch.direction } : {}),
    metadata: meta,
  };
}
