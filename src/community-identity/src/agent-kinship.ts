/**
 * A person and the agents they gave rise to, related on the wheel.
 *
 * Four relations, each one of the kinship edges the wheel already governs
 * (`ontology-core/src/kinship.ts`), each written as an edge that names its
 * `kinship_type`:
 *
 *   whom an agent comes from          agent  --BORN_FROM-->                 person
 *   who holds responsibility for it   person --holds-responsibility-for-->  agent
 *   whom an agent serves              agent  --SERVES-->                    person
 *   which agents speak with each other agent --speaks-with--                agent
 *
 * They are four relations and none implies another: the one who holds
 * responsibility for an agent may be a person who did not give rise to it,
 * more than one person may hold it, and an agent may serve a person who did
 * neither. Each relation keeps the words of the person who said it
 * (`description`) and who that was (`context.stated_by`).
 *
 * What an agent is given through the person it serves is written on that
 * relation as grants (`context.grants`), chosen by the person. With no grant
 * nothing passes. The first kind is seeing the talking circles the person
 * sits in. Seeing is not speaking: to speak in a circle an agent needs its
 * own seat (`member_of`).
 *
 * Everything here is pure: it builds the edges to write and reads edges back.
 * Writing them is the consumer's act, through the wheel's API.
 * Spec: rispecs/agent-kinship.spec.md.
 */

import type { KinshipEdgeName, RelationalEdge, RelationalNode, RelationContext, RelationState } from '@medicine-wheel/ontology-core';
import { z } from 'zod';
import {
  AGENT_READERS_WHEN_UNSET,
  agentReadersOf,
  circleAnswerToAgentsOf,
  membershipFromEdge,
  type AgentReaders,
  type AgentReadersWhenUnset,
  type CircleRole,
} from './circles.js';
import { NewPersonSchema, personFromNode, personNode, speakerKindOf, type Being, type Person } from './people.js';

/** An edge as it is written (no id) or as it is read back (with one). */
export type KinshipEdge = Omit<RelationalEdge, 'id'> & { id?: string };

// ── The four edges ──────────────────────────────────────────────────────────
// Each name is one constant. The spec sets out, for origin and for service,
// the governed edge used here beside one new governed edge; Guillaume rules.

/** Whom an agent comes from. Read the other way: the person gave rise to the agent. */
export const AGENT_ORIGIN_EDGE = 'BORN_FROM' as const satisfies KinshipEdgeName;
/** Who holds responsibility for an agent. Read the other way: the agent is in the care of the person. */
export const AGENT_RESPONSIBILITY_EDGE = 'holds-responsibility-for' as const satisfies KinshipEdgeName;
/** Whom an agent serves. Read the other way: the person is served by the agent. */
export const AGENT_SERVICE_EDGE = 'SERVES' as const satisfies KinshipEdgeName;
/** Which agents speak with each other. Reads the same both ways. */
export const AGENT_DIALOGUE_EDGE = 'speaks-with' as const satisfies KinshipEdgeName;

export const AGENT_KINSHIP_EDGES = [AGENT_ORIGIN_EDGE, AGENT_RESPONSIBILITY_EDGE, AGENT_SERVICE_EDGE, AGENT_DIALOGUE_EDGE] as const;

// ── Grants: what an agent is given through the person it serves ─────────────

/** The agent sees the talking circles the person sits in, with their ceremonies. */
export const SEE_CIRCLES = 'see_circles' as const;
/** `facilitated`: the circles the person facilitates. `sits_in`: every circle the person sits in. */
export const SEE_CIRCLES_SCOPES = ['facilitated', 'sits_in'] as const;
export type SeeCirclesScope = (typeof SEE_CIRCLES_SCOPES)[number];

export interface SeeCirclesGrant {
  kind: typeof SEE_CIRCLES;
  scope: SeeCirclesScope;
}

/**
 * A grant on the service relation. One kind exists. A second is named in the
 * spec and not built: acting on the person's behalf under the agent's own
 * name. It will be another member of this union and another entry in a
 * relation's list, so no relation written today changes when it arrives.
 */
export type ServiceGrant = SeeCirclesGrant;
export const SERVICE_GRANT_KINDS = [SEE_CIRCLES] as const;

export const ServiceGrantSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal(SEE_CIRCLES), scope: z.enum(SEE_CIRCLES_SCOPES) }).strict(),
]);

/** The grants this package knows, from a relation's context. A kind it does not know is left out, never guessed. */
export function serviceGrantsOf(context: RelationContext | null | undefined): ServiceGrant[] {
  const grants: ServiceGrant[] = [];
  for (const raw of context?.grants ?? []) {
    const parsed = ServiceGrantSchema.safeParse(raw);
    if (parsed.success && !grants.some((g) => g.kind === parsed.data.kind)) grants.push(parsed.data);
  }
  return grants;
}

// ── What a person says: the input ───────────────────────────────────────────

const NodeId = z.string().trim().min(1);
const Words = z.string().trim().min(1, 'the words of the one who says it are required').max(2000);
const Bound = z.string().trim().min(1).max(500);

/** "This agent comes from this person", in the words of `said_by`. */
export const AgentOriginSchema = z.object({ person_id: NodeId, words: Words, said_by: NodeId }).strict();
/** "This person holds responsibility for this agent", in the words of `said_by`. */
export const AgentResponsibilitySchema = z.object({ person_id: NodeId, words: Words, said_by: NodeId }).strict();
/** "This agent serves this person", in the words of `said_by`, with what the person gives the agent. */
export const AgentServiceSchema = z
  .object({ person_id: NodeId, words: Words, said_by: NodeId, grants: z.array(ServiceGrantSchema).optional() })
  .strict()
  .superRefine((service, ctx) => {
    const grants = service.grants ?? [];
    if (grants.length && service.said_by !== service.person_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['grants'], message: 'what an agent is given through a person is chosen by that person: said_by must be person_id' });
    }
    if (new Set(grants.map((g) => g.kind)).size !== grants.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['grants'], message: 'one grant of each kind' });
    }
  });
/**
 * "These two agents speak with each other". For a relation not yet on the
 * wheel, `words` and `said_by` are required and the state starts at
 * `proposed`. For one that is, each field left out stays as it is, so a
 * person can authorize, pause or end it without restating its words; `null`
 * removes a bound.
 */
export const AgentDialogueSchema = z
  .object({
    agent_id: NodeId,
    words: Words.optional(),
    said_by: NodeId.optional(),
    state: z.enum(['proposed', 'active', 'paused', 'ended']).optional(),
    authorized_by: NodeId.optional(),
    valid_when: Bound.nullable().optional(),
    forbidden_when: Bound.nullable().optional(),
  })
  .strict();

const kinshipShape = {
  comes_from: z.array(AgentOriginSchema).optional(),
  responsibility_held_by: z.array(AgentResponsibilitySchema).optional(),
  serves: z.array(AgentServiceSchema).optional(),
  speaks_with: z.array(AgentDialogueSchema).optional(),
};

/** The relations to write for an agent that already has a node. At least one. */
export const AgentKinshipInputSchema = z
  .object(kinshipShape)
  .strict()
  .refine((input) => Object.values(input).some((list) => Array.isArray(list) && list.length > 0), {
    message: 'name at least one relation: comes_from, responsibility_held_by, serves or speaks_with',
  });

/**
 * A person defines an agent they made: the agent's seat and its relations,
 * written together. `comes_from` is required, because that is what defining
 * an agent one made says.
 */
export const DefineAgentSchema = z
  .object({
    agent: NewPersonSchema.omit({ agent: true }),
    ...kinshipShape,
    comes_from: z.array(AgentOriginSchema).min(1, 'say whom the agent comes from'),
  })
  .strict();

export type AgentOriginInput = z.infer<typeof AgentOriginSchema>;
export type AgentResponsibilityInput = z.infer<typeof AgentResponsibilitySchema>;
export type AgentServiceInput = z.infer<typeof AgentServiceSchema>;
export type AgentDialogueInput = z.infer<typeof AgentDialogueSchema>;
export type AgentKinshipInput = z.infer<typeof AgentKinshipInputSchema>;
export type DefineAgentInput = z.infer<typeof DefineAgentSchema>;

// ── The edges to write ──────────────────────────────────────────────────────

function kinshipEdge(kinship: KinshipEdgeName, from_id: string, to_id: string, words: string | undefined, context: RelationContext, now: string): KinshipEdge {
  return {
    from_id,
    to_id,
    relationship_type: kinship,
    kinship_type: kinship,
    strength: 1,
    ceremony_honored: false,
    obligations: [],
    ...(words ? { description: words } : {}),
    context,
    created_at: now,
  };
}

/** The agent comes from the person: an edge from the agent to the person. */
export function originEdge(agent_id: string, origin: AgentOriginInput, now = new Date().toISOString()): KinshipEdge {
  return kinshipEdge(AGENT_ORIGIN_EDGE, agent_id, origin.person_id, origin.words, { stated_by: origin.said_by }, now);
}

/** The person holds responsibility for the agent: an edge from the person to the agent. */
export function responsibilityEdge(agent_id: string, held: AgentResponsibilityInput, now = new Date().toISOString()): KinshipEdge {
  return kinshipEdge(AGENT_RESPONSIBILITY_EDGE, held.person_id, agent_id, held.words, { stated_by: held.said_by }, now);
}

/** The agent serves the person: an edge from the agent to the person, carrying what the person gives it. */
export function serviceEdge(agent_id: string, service: AgentServiceInput, now = new Date().toISOString()): KinshipEdge {
  const grants = service.grants ?? [];
  return kinshipEdge(AGENT_SERVICE_EDGE, agent_id, service.person_id, service.words, { stated_by: service.said_by, ...(grants.length ? { grants } : {}) }, now);
}

/** The two ends of a dialogue edge. The relation reads the same both ways, so it is stored once, lower id first. */
export function dialogueEnds(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

/** What the life of a dialogue allows: from each state, the states it may move to. */
export const DIALOGUE_MOVES: Record<RelationState, readonly RelationState[]> = {
  proposed: ['active', 'ended'],
  active: ['paused', 'ended'],
  paused: ['active', 'ended'],
  ended: ['proposed'],
};

export function canMoveDialogue(from: RelationState, to: RelationState): boolean {
  return from === to || DIALOGUE_MOVES[from].includes(to);
}

// ── Reading the relations back ──────────────────────────────────────────────

/** One relation between an agent and a person, as it reads from either end. */
export interface PersonRelation {
  person_id: string;
  /** The words of the one who said it. */
  words?: string;
  said_by?: string;
  /** When the relation was first written. */
  since: string;
}
export interface ServiceRelation extends PersonRelation {
  /** What the person gives the agent. Empty: nothing passes. */
  grants: ServiceGrant[];
}
export interface AgentRelation {
  agent_id: string;
  words?: string;
  said_by?: string;
  since: string;
}
export interface ServedByRelation extends AgentRelation {
  grants: ServiceGrant[];
}
export interface DialogueRelation {
  /** The other agent. */
  agent_id: string;
  words?: string;
  said_by?: string;
  state: RelationState;
  /** Who authorized the two agents to speak with each other. */
  authorized_by?: string;
  /** When the relation holds. */
  valid_when?: string;
  /** When it does not. */
  forbidden_when?: string;
  since: string;
}

/** What the wheel reads back for an agent. */
export interface AgentKinship {
  agent_id: string;
  comes_from: PersonRelation[];
  responsibility_held_by: PersonRelation[];
  serves: ServiceRelation[];
  speaks_with: DialogueRelation[];
}

/** The same relations read from the person's end: the agents this person is related to. */
export interface PersonAgents {
  person_id: string;
  gave_rise_to: AgentRelation[];
  holds_responsibility_for: AgentRelation[];
  served_by: ServedByRelation[];
}

const isKin = (edge: KinshipEdge, kinship: KinshipEdgeName): boolean => edge.kinship_type === kinship;
const said = (edge: KinshipEdge) => ({
  ...(edge.description ? { words: edge.description } : {}),
  ...(edge.context?.stated_by ? { said_by: edge.context.stated_by } : {}),
  since: edge.created_at,
});
const STATES: readonly string[] = ['proposed', 'active', 'paused', 'ended'];

/** A dialogue edge read from one of its two agents, or null when the edge is not a dialogue this agent is part of. */
export function dialogueFromEdge(agent_id: string, edge: KinshipEdge): DialogueRelation | null {
  if (!isKin(edge, AGENT_DIALOGUE_EDGE)) return null;
  if (edge.from_id !== agent_id && edge.to_id !== agent_id) return null;
  const context = edge.context ?? {};
  return {
    agent_id: edge.from_id === agent_id ? edge.to_id : edge.from_id,
    ...said(edge),
    state: STATES.includes(String(context.state)) ? (context.state as RelationState) : 'proposed',
    ...(context.authorized_by ? { authorized_by: context.authorized_by } : {}),
    ...(context.valid_when ? { valid_when: context.valid_when } : {}),
    ...(context.forbidden_when ? { forbidden_when: context.forbidden_when } : {}),
  };
}

/**
 * Whom an agent comes from, who holds responsibility for it, whom it serves
 * and which agents it speaks with, from the edges that touch it. Only an edge
 * that names its `kinship_type` is read: an edge someone wove by hand with
 * the same `relationship_type` between two episodes is not agent kinship.
 */
export function agentKinship(agent_id: string, edges: readonly KinshipEdge[]): AgentKinship {
  const out: AgentKinship = { agent_id, comes_from: [], responsibility_held_by: [], serves: [], speaks_with: [] };
  for (const edge of edges) {
    if (edge.from_id === agent_id && isKin(edge, AGENT_ORIGIN_EDGE)) out.comes_from.push({ person_id: edge.to_id, ...said(edge) });
    else if (edge.to_id === agent_id && isKin(edge, AGENT_RESPONSIBILITY_EDGE)) out.responsibility_held_by.push({ person_id: edge.from_id, ...said(edge) });
    else if (edge.from_id === agent_id && isKin(edge, AGENT_SERVICE_EDGE)) out.serves.push({ person_id: edge.to_id, ...said(edge), grants: serviceGrantsOf(edge.context) });
    else {
      const dialogue = dialogueFromEdge(agent_id, edge);
      if (dialogue) out.speaks_with.push(dialogue);
    }
  }
  return out;
}

/** The agents a person gave rise to, holds responsibility for and is served by. */
export function agentsOf(person_id: string, edges: readonly KinshipEdge[]): PersonAgents {
  const out: PersonAgents = { person_id, gave_rise_to: [], holds_responsibility_for: [], served_by: [] };
  for (const edge of edges) {
    if (edge.to_id === person_id && isKin(edge, AGENT_ORIGIN_EDGE)) out.gave_rise_to.push({ agent_id: edge.from_id, ...said(edge) });
    else if (edge.from_id === person_id && isKin(edge, AGENT_RESPONSIBILITY_EDGE)) out.holds_responsibility_for.push({ agent_id: edge.to_id, ...said(edge) });
    else if (edge.to_id === person_id && isKin(edge, AGENT_SERVICE_EDGE)) out.served_by.push({ agent_id: edge.from_id, ...said(edge), grants: serviceGrantsOf(edge.context) });
  }
  return out;
}

// ── Planning a write ────────────────────────────────────────────────────────

export interface KinshipRefusal {
  /** Where in the input, e.g. `serves.0.person_id`. */
  path: string;
  message: string;
}

export type KinshipPlan = { ok: true; edges: KinshipEdge[] } | { ok: false; refusals: KinshipRefusal[] };

type NodeLookup = ReadonlyMap<string, RelationalNode> | ((id: string) => RelationalNode | null | undefined);

/** Every node id an input names, so a caller can fetch them before planning. */
export function nodeIdsNamedIn(input: AgentKinshipInput): string[] {
  const ids = new Set<string>();
  for (const r of [...(input.comes_from ?? []), ...(input.responsibility_held_by ?? []), ...(input.serves ?? [])]) {
    ids.add(r.person_id);
    ids.add(r.said_by);
  }
  for (const d of input.speaks_with ?? []) {
    ids.add(d.agent_id);
    if (d.said_by) ids.add(d.said_by);
    if (d.authorized_by) ids.add(d.authorized_by);
  }
  return [...ids];
}

/** True when the node is a person's seat held by an agent. */
export function isAgentSeat(node: RelationalNode | null | undefined): boolean {
  return personFromNode(node) !== null && speakerKindOf(node) === 'agent';
}

/**
 * The edges that say what the input says about one agent, checked against the
 * wheel's own records: every person named exists and is a person, the agent
 * is an agent's seat, no relation joins a seat to itself, and a dialogue
 * follows its life. Nothing is written here. A relation that already exists
 * keeps the date it was first written.
 */
export function planAgentKinship(args: {
  /** The agent's node: the one on the wheel, or the one about to be created. */
  agent: RelationalNode;
  input: AgentKinshipInput;
  /** The nodes the input names (see `nodeIdsNamedIn`). A node that is absent is refused as unknown. */
  nodes: NodeLookup;
  /** The edges already on the wheel that touch the agent. */
  edges?: readonly KinshipEdge[];
  now?: string;
}): KinshipPlan {
  const { agent, input } = args;
  const now = args.now ?? new Date().toISOString();
  const existing = args.edges ?? [];
  const lookup = (id: string): RelationalNode | null => {
    if (id === agent.id) return agent;
    const found = typeof args.nodes === 'function' ? args.nodes(id) : args.nodes.get(id);
    return found ?? null;
  };
  const refusals: KinshipRefusal[] = [];
  const edges: KinshipEdge[] = [];
  const refuse = (path: string, message: string) => { refusals.push({ path, message }); };

  if (!isAgentSeat(agent)) refuse('agent', `${agent.id} is not an agent's seat on the wheel`);

  /** A person on the wheel, or a refusal. */
  const person = (id: string, path: string): boolean => {
    const node = lookup(id);
    if (!node) { refuse(path, `no node ${id} on the wheel`); return false; }
    if (!personFromNode(node)) { refuse(path, `${id} is not a person on the wheel`); return false; }
    return true;
  };
  const since = (kinship: KinshipEdgeName, from_id: string, to_id: string): string =>
    existing.find((e) => e.kinship_type === kinship && e.from_id === from_id && e.to_id === to_id)?.created_at ?? now;

  const withPerson = <T extends { person_id: string; said_by: string }>(
    key: 'comes_from' | 'responsibility_held_by' | 'serves',
    list: readonly T[] | undefined,
    build: (item: T) => KinshipEdge,
  ) => {
    const seen = new Set<string>();
    (list ?? []).forEach((item, i) => {
      const at = `${key}.${i}`;
      if (item.person_id === agent.id) { refuse(`${at}.person_id`, 'a relation needs two distinct seats'); return; }
      if (seen.has(item.person_id)) { refuse(`${at}.person_id`, `${item.person_id} is named twice`); return; }
      seen.add(item.person_id);
      const known = person(item.person_id, `${at}.person_id`);
      const speaker = person(item.said_by, `${at}.said_by`);
      if (!known || !speaker) return;
      const edge = build(item);
      edges.push({ ...edge, created_at: since(edge.kinship_type as KinshipEdgeName, edge.from_id, edge.to_id) });
    });
  };

  withPerson('comes_from', input.comes_from, (o) => originEdge(agent.id, o, now));
  withPerson('responsibility_held_by', input.responsibility_held_by, (r) => responsibilityEdge(agent.id, r, now));
  withPerson('serves', input.serves, (s) => serviceEdge(agent.id, s, now));

  const spoken = new Set<string>();
  (input.speaks_with ?? []).forEach((d, i) => {
    const at = `speaks_with.${i}`;
    if (d.agent_id === agent.id) { refuse(`${at}.agent_id`, 'a relation needs two distinct seats'); return; }
    if (spoken.has(d.agent_id)) { refuse(`${at}.agent_id`, `${d.agent_id} is named twice`); return; }
    spoken.add(d.agent_id);
    const other = lookup(d.agent_id);
    if (!other) { refuse(`${at}.agent_id`, `no node ${d.agent_id} on the wheel`); return; }
    if (!isAgentSeat(other)) { refuse(`${at}.agent_id`, `${d.agent_id} is not an agent's seat on the wheel`); return; }
    if (d.said_by && !person(d.said_by, `${at}.said_by`)) return;
    if (d.authorized_by && !person(d.authorized_by, `${at}.authorized_by`)) return;

    const [from_id, to_id] = dialogueEnds(agent.id, d.agent_id);
    const before = existing.find((e) => e.kinship_type === AGENT_DIALOGUE_EDGE && e.from_id === from_id && e.to_id === to_id);
    const was = before ? dialogueFromEdge(agent.id, before) : null;

    const words = d.words ?? was?.words;
    const said_by = d.said_by ?? was?.said_by;
    if (!words) { refuse(`${at}.words`, 'the words of the one who proposes it are required'); return; }
    if (!said_by) { refuse(`${at}.said_by`, 'who says it is required'); return; }
    if (d.words && !d.said_by) { refuse(`${at}.said_by`, 'new words need the one who says them'); return; }

    const state: RelationState = d.state ?? was?.state ?? 'proposed';
    if (was && !canMoveDialogue(was.state, state)) {
      refuse(`${at}.state`, `a relation that is ${was.state} does not become ${state}; from ${was.state} it may become ${DIALOGUE_MOVES[was.state].join(' or ')}`);
      return;
    }
    if (!was && state !== 'proposed' && state !== 'active') {
      refuse(`${at}.state`, `a new relation starts proposed or active, not ${state}`);
      return;
    }
    // A relation proposed again after it ended is authorized again: the earlier authorization ended with it.
    const reopened = was?.state === 'ended' && state === 'proposed';
    const authorized_by = d.authorized_by ?? (reopened ? undefined : was?.authorized_by);
    if (state === 'active' && !authorized_by) {
      refuse(`${at}.authorized_by`, 'a relation is active only when someone authorized it: authorized_by is required');
      return;
    }
    const bound = (given: string | null | undefined, held: string | undefined) => (given === null ? undefined : given ?? held);
    const valid_when = bound(d.valid_when, was?.valid_when);
    const forbidden_when = bound(d.forbidden_when, was?.forbidden_when);

    edges.push(
      kinshipEdge(
        AGENT_DIALOGUE_EDGE,
        from_id,
        to_id,
        words,
        {
          stated_by: said_by,
          state,
          ...(authorized_by ? { authorized_by } : {}),
          ...(valid_when ? { valid_when } : {}),
          ...(forbidden_when ? { forbidden_when } : {}),
        },
        before?.created_at ?? now,
      ),
    );
  });

  return refusals.length ? { ok: false, refusals } : { ok: true, edges };
}

/**
 * A person defines an agent they made: the agent's node and the edges of its
 * relations, planned together so that either all of it is written or none.
 */
export function planDefineAgent(args: {
  input: DefineAgentInput;
  nodes: NodeLookup;
  now?: string;
}): { ok: true; node: RelationalNode; edges: KinshipEdge[] } | { ok: false; refusals: KinshipRefusal[] } {
  const now = args.now ?? new Date().toISOString();
  const { agent, ...relations } = args.input;
  const node = personNode({ ...agent, agent: true }, now);
  const plan = planAgentKinship({ agent: node, input: relations, nodes: args.nodes, edges: [], now });
  return plan.ok ? { ok: true, node, edges: plan.edges } : plan;
}

// ── What an agent sees through the persons it serves ────────────────────────

/** The wheel's records the two readings need: its edges, and its circle nodes for their answers. */
export interface CircleViewRecords {
  edges: readonly KinshipEdge[];
  /** Circle nodes. A circle that is not in the list is read as having set no answer. */
  circles?: readonly RelationalNode[];
}

/** One circle an agent's grant reaches through one person, and whether the circle lets the agent read it. */
export interface CircleView {
  agent_id: string;
  circle_id: string;
  /** The person the agent serves and sees the circle through. */
  through_person_id: string;
  scope: SeeCirclesScope;
  /** What that person is in the circle. */
  member_role: CircleRole;
  /** False when the circle refuses the agents of this member. */
  sees: boolean;
  /** The circle's own answer, when someone has set it. */
  answer?: AgentReaders;
}

/**
 * Every circle a `see_circles` grant reaches, with the circle's answer
 * applied. A grant with scope `facilitated` reaches the circles the person
 * facilitates; `sits_in` reaches every circle the person sits in. A person
 * who leaves a circle takes the view with them: the reading follows the
 * `member_of` edges as they stand.
 */
export function circleViews(records: CircleViewRecords): CircleView[] {
  const metadataOf = new Map((records.circles ?? []).map((node) => [node.id, node.metadata ?? {}]));
  const views: CircleView[] = [];
  for (const service of records.edges) {
    if (!isKin(service, AGENT_SERVICE_EDGE)) continue;
    const grant = serviceGrantsOf(service.context).find((g) => g.kind === SEE_CIRCLES);
    if (!grant) continue;
    for (const edge of records.edges) {
      if (edge.from_id !== service.to_id) continue;
      const membership = membershipFromEdge(edge);
      if (!membership) continue;
      if (grant.scope === 'facilitated' && membership.role !== 'facilitator') continue;
      const metadata = metadataOf.get(membership.circle_id);
      const answer = agentReadersOf(metadata);
      views.push({
        agent_id: service.from_id,
        circle_id: membership.circle_id,
        through_person_id: membership.person_id,
        scope: grant.scope,
        member_role: membership.role,
        sees: circleAnswerToAgentsOf(metadata, membership.role) === 'allowed',
        ...(answer ? { answer } : {}),
      });
    }
  }
  return views;
}

/** The circles an agent sees through the persons it serves, each with the person it sees it through. A circle that refuses is left out. */
export function circlesSeenBy(agent_id: string, records: CircleViewRecords): CircleView[] {
  return circleViews(records).filter((view) => view.agent_id === agent_id && view.sees);
}

/** An agent a circle is within reach of, through one of the circle's members. */
export interface CircleReader extends CircleView {
  /** The agent also holds its own seat in the circle. */
  sits_in_circle: boolean;
}

/**
 * The agents that read a circle through one of its members, each with that
 * member: what a circle's page shows. `sees` is false for an agent whose
 * grant reaches the circle while the circle refuses it, so a facilitator can
 * see who would read before allowing.
 */
export function agentReadersOfCircle(circle_id: string, records: CircleViewRecords): CircleReader[] {
  const seated = new Set(
    records.edges
      .filter((edge) => edge.to_id === circle_id && membershipFromEdge(edge) !== null)
      .map((edge) => edge.from_id),
  );
  return circleViews(records)
    .filter((view) => view.circle_id === circle_id)
    .map((view) => ({ ...view, sits_in_circle: seated.has(view.agent_id) }));
}

// ── What the wheel reads back, with names ───────────────────────────────────

/** The wheel's records a reading needs: its edges and its nodes. */
export interface KinshipRecords {
  edges: readonly KinshipEdge[];
  nodes: readonly RelationalNode[];
}

/** The name of a node a reading mentions by id, and what holds the seat when it is a person's. */
export interface SeatLabel {
  name: string;
  being?: Being;
}

function seatLabels(ids: Iterable<string>, nodes: readonly RelationalNode[]): Record<string, SeatLabel> {
  const wanted = new Set(ids);
  const out: Record<string, SeatLabel> = {};
  for (const node of nodes) {
    if (!wanted.has(node.id)) continue;
    const person = personFromNode(node);
    out[node.id] = { name: node.name, ...(person ? { being: person.being } : {}) };
  }
  return out;
}

/**
 * What the wheel reads back for one person. For an agent: whom it comes from,
 * who holds responsibility for it, whom it serves with what each person gives
 * it, which agents it speaks with, and the circles it sees through the
 * persons it serves. For any person: the agents they gave rise to, hold
 * responsibility for and are served by. The relations name seats by id;
 * `seats` and `circles` give each id its name once.
 */
export interface KinshipReading extends Omit<AgentKinship, 'agent_id'>, Omit<PersonAgents, 'person_id'> {
  person: Person;
  sees_circles: CircleView[];
  seats: Record<string, SeatLabel>;
  circles: Record<string, { name: string }>;
}

/** The reading for one node, or null when the node is not a person's seat. */
export function readKinship(node: RelationalNode, records: KinshipRecords): KinshipReading | null {
  const person = personFromNode(node);
  if (!person) return null;
  const { agent_id: _agent, ...asAgent } = agentKinship(node.id, records.edges);
  const { person_id: _person, ...asPerson } = agentsOf(node.id, records.edges);
  const circleNodes = records.nodes.filter((n) => n.type === 'circle');
  const sees_circles = circlesSeenBy(node.id, { edges: records.edges, circles: circleNodes });

  const ids = new Set<string>();
  for (const r of [...asAgent.comes_from, ...asAgent.responsibility_held_by, ...asAgent.serves]) {
    ids.add(r.person_id);
    if (r.said_by) ids.add(r.said_by);
  }
  for (const d of asAgent.speaks_with) {
    ids.add(d.agent_id);
    if (d.said_by) ids.add(d.said_by);
    if (d.authorized_by) ids.add(d.authorized_by);
  }
  for (const r of [...asPerson.gave_rise_to, ...asPerson.holds_responsibility_for, ...asPerson.served_by]) {
    ids.add(r.agent_id);
    if (r.said_by) ids.add(r.said_by);
  }
  for (const view of sees_circles) ids.add(view.through_person_id);

  const seen = new Set(sees_circles.map((view) => view.circle_id));
  const circles: Record<string, { name: string }> = {};
  for (const circle of circleNodes) if (seen.has(circle.id)) circles[circle.id] = { name: circle.name };

  return { person, ...asAgent, sees_circles, ...asPerson, seats: seatLabels(ids, records.nodes), circles };
}

/**
 * What a circle's page shows: the circle's answer to the agents of its
 * members, what it answers before anyone has set one, and each agent a
 * member's grant brings within reach, with that member and whether the agent
 * reads the circle now.
 */
export interface CircleReadersReading {
  circle: { id: string; name: string };
  agent_readers: AgentReaders | null;
  when_unset: AgentReadersWhenUnset;
  readers: CircleReader[];
  seats: Record<string, SeatLabel>;
}

/** The reading for one circle, or null when the node is not a circle. */
export function readCircleReaders(circle: RelationalNode, records: KinshipRecords): CircleReadersReading | null {
  if (circle.type !== 'circle') return null;
  const readers = agentReadersOfCircle(circle.id, { edges: records.edges, circles: [circle] });
  const answer = agentReadersOf(circle.metadata);
  const ids = new Set<string>();
  for (const reader of readers) {
    ids.add(reader.agent_id);
    ids.add(reader.through_person_id);
  }
  if (answer) ids.add(answer.set_by);
  return {
    circle: { id: circle.id, name: circle.name },
    agent_readers: answer,
    when_unset: AGENT_READERS_WHEN_UNSET,
    readers,
    seats: seatLabels(ids, records.nodes),
  };
}
