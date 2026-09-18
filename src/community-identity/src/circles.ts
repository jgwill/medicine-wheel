/**
 * A circle is a node on the wheel of type `circle`; membership is a relation.
 *
 * Copied in shape from STPB's `StoryCircle` (`lib/community/types.ts`:
 * facilitator, participants, invited, capacity, sacred-container config) and
 * mapped onto the wheel: the circle is a node, each member is an edge
 * `member_of` from the person to the circle, the facilitator is the edge whose
 * obligations name `facilitate`. Ceremonies held in the circle carry its id
 * in `circle_id` (ontology-core 0.14.0).
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

export interface Circle {
  /** The node id on the wheel. */
  id: string;
  name: string;
  intention: string;
  facilitator_id: string;
  direction?: DirectionName;
  capacity?: number;
  container: CircleContainer;
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
  container: z
    .object({
      private_by_default: z.boolean().optional(),
      explicit_sharing_consent: z.boolean().optional(),
      hide_engagement_metrics: z.boolean().optional(),
    })
    .optional(),
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
      container: { ...DEFAULT_CONTAINER, ...(input.container ?? {}) },
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
    container: { ...DEFAULT_CONTAINER, ...container },
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
