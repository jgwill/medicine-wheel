/**
 * A person and the agents they gave rise to, related on the wheel
 * (rispecs/agent-kinship.spec.md). The rules, without a store: what a
 * statement becomes as edges, what is refused, and what reads back.
 */
import { describe, expect, it } from "vitest";
import {
  AGENT_DIALOGUE_EDGE,
  AGENT_ORIGIN_EDGE,
  AGENT_READERS_WHEN_UNSET,
  AGENT_RESPONSIBILITY_EDGE,
  AGENT_SERVICE_EDGE,
  AgentKinshipInputSchema,
  AgentServiceSchema,
  DefineAgentSchema,
  agentKinship,
  agentReadersOf,
  agentReadersOfCircle,
  agentReadersPatch,
  agentsOf,
  circleAnswerToAgentsOf,
  circleFromNode,
  circleNode,
  circlesSeenBy,
  membershipEdge,
  personFromNode,
  personNode,
  planAgentKinship,
  planDefineAgent,
  readCircleReaders,
  readKinship,
  serviceGrantsOf,
  type KinshipEdge,
} from "../src/community-identity/src/index";
import { KINSHIP_EDGE_TYPES, RelationalEdgeSchema, inverseEdge, type RelationalNode } from "../src/ontology-core/src/index";

const T0 = "2026-11-24T20:00:00.000Z";
const T1 = "2026-11-25T09:00:00.000Z";

// Two persons and three agents. None of them is a real person.
const ada = personNode({ id: "node:human:ada", name: "Ada", role: "ceremony_facilitator" }, T0);
const noor = personNode({ id: "node:human:noor", name: "Noor", role: "participant" }, T0);
const sol = personNode({ id: "node:agent:sol", name: "Sol", role: "companion_ai", agent: true }, T0);
const luma = personNode({ id: "node:agent:luma", name: "Luma", role: "companion_ai", agent: true }, T0);
const byId = (...nodes: RelationalNode[]) => new Map(nodes.map((n) => [n.id, n]));
const everyone = byId(ada, noor, sol, luma);

const planned = (plan: ReturnType<typeof planAgentKinship>): KinshipEdge[] => {
  if (!plan.ok) throw new Error(plan.refusals.map((r) => `${r.path}: ${r.message}`).join("; "));
  return plan.edges;
};
const refusalsOf = (plan: { ok: boolean; refusals?: { path: string; message: string }[] }): string[] =>
  plan.ok ? [] : (plan.refusals ?? []).map((r) => r.path);

describe("the four edges are governed kinship edges", () => {
  it("each constant names an edge of the registry, and its other reading", () => {
    for (const name of [AGENT_ORIGIN_EDGE, AGENT_RESPONSIBILITY_EDGE, AGENT_SERVICE_EDGE, AGENT_DIALOGUE_EDGE]) {
      expect(Object.keys(KINSHIP_EDGE_TYPES)).toContain(name);
    }
    expect(inverseEdge(AGENT_ORIGIN_EDGE)).toBe("gave-rise-to");
    expect(inverseEdge(AGENT_RESPONSIBILITY_EDGE)).toBe("in-care-of");
    expect(inverseEdge(AGENT_SERVICE_EDGE)).toBe("served-by");
    expect(inverseEdge(AGENT_DIALOGUE_EDGE)).toBe("speaks-with");
  });
});

describe("a person defines an agent they made", () => {
  const input = DefineAgentSchema.parse({
    agent: { id: "node:agent:wren", name: "Wren", role: "companion_ai" },
    comes_from: [{ person_id: ada.id, words: "I made Wren in the autumn of 2026.", said_by: ada.id }],
    responsibility_held_by: [{ person_id: ada.id, words: "I answer for what Wren does here.", said_by: ada.id }],
  });

  it("the agent's node and its relations are planned together", () => {
    const plan = planDefineAgent({ input, nodes: everyone, now: T0 });
    if (!plan.ok) throw new Error(JSON.stringify(plan.refusals));

    expect(plan.node).toMatchObject({ id: "node:agent:wren", name: "Wren", type: "agent" });
    expect(personFromNode(plan.node)).toMatchObject({ being: "agent", role: "companion_ai" });

    expect(plan.edges.map((e) => [e.from_id, e.kinship_type, e.to_id])).toEqual([
      ["node:agent:wren", "BORN_FROM", ada.id],
      [ada.id, "holds-responsibility-for", "node:agent:wren"],
    ]);
    // Every reader that knows only relationship_type reads the same name.
    expect(plan.edges.every((e) => e.relationship_type === e.kinship_type)).toBe(true);
    // An edge the door writes is an edge the ontology validates.
    for (const edge of plan.edges) expect(RelationalEdgeSchema.safeParse({ id: "x", ...edge }).success).toBe(true);
  });

  it("each relation keeps the words of the person who said it, and who that was", () => {
    const plan = planDefineAgent({ input, nodes: everyone, now: T0 });
    if (!plan.ok) throw new Error("refused");
    const kinship = agentKinship(plan.node.id, plan.edges);
    expect(kinship.comes_from).toEqual([{ person_id: ada.id, words: "I made Wren in the autumn of 2026.", said_by: ada.id, since: T0 }]);
    expect(kinship.responsibility_held_by).toEqual([{ person_id: ada.id, words: "I answer for what Wren does here.", said_by: ada.id, since: T0 }]);
    // Read from the person's end: the agents she gave rise to.
    expect(agentsOf(ada.id, plan.edges).gave_rise_to).toEqual([{ agent_id: plan.node.id, words: "I made Wren in the autumn of 2026.", said_by: ada.id, since: T0 }]);
  });

  it("defining an agent says whom it comes from, in someone's words", () => {
    expect(DefineAgentSchema.safeParse({ agent: { name: "Wren", role: "companion_ai" } }).success).toBe(false);
    expect(DefineAgentSchema.safeParse({ agent: { name: "Wren", role: "companion_ai" }, comes_from: [] }).success).toBe(false);
    expect(DefineAgentSchema.safeParse({ agent: { name: "Wren", role: "companion_ai" }, comes_from: [{ person_id: ada.id, said_by: ada.id }] }).success).toBe(false);
    expect(DefineAgentSchema.safeParse({ agent: { name: "Wren", role: "companion_ai" }, comes_from: [{ person_id: ada.id, words: "  ", said_by: ada.id }] }).success).toBe(false);
  });

  it("a person the wheel does not hold is refused, and nothing is planned", () => {
    const plan = planDefineAgent({
      input: DefineAgentSchema.parse({ agent: { name: "Wren", role: "companion_ai" }, comes_from: [{ person_id: "node:human:nobody", words: "I made Wren.", said_by: ada.id }] }),
      nodes: everyone,
    });
    expect(plan.ok).toBe(false);
    expect(refusalsOf(plan)).toEqual(["comes_from.0.person_id"]);
  });
});

describe("an existing agent is related to its person", () => {
  it("the agent keeps its node; the relation is added afterwards", () => {
    const edges = planned(planAgentKinship({
      agent: sol,
      input: AgentKinshipInputSchema.parse({ comes_from: [{ person_id: ada.id, words: "Sol came out of my work on the wheel.", said_by: ada.id }] }),
      nodes: everyone,
      now: T0,
    }));
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ from_id: sol.id, to_id: ada.id, kinship_type: "BORN_FROM", description: "Sol came out of my work on the wheel.", context: { stated_by: ada.id } });
    expect(agentKinship(sol.id, edges).comes_from.map((r) => r.person_id)).toEqual([ada.id]);
  });

  it("saying it again amends the one relation and keeps the date it was first written", () => {
    const first = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T0,
      input: AgentKinshipInputSchema.parse({ comes_from: [{ person_id: ada.id, words: "Sol came out of my work.", said_by: ada.id }] }),
    }));
    const again = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T1, edges: first,
      input: AgentKinshipInputSchema.parse({ comes_from: [{ person_id: ada.id, words: "I made Sol, with Noor's help.", said_by: ada.id }] }),
    }));
    expect(again).toHaveLength(1);
    expect(again[0]).toMatchObject({ from_id: sol.id, to_id: ada.id, description: "I made Sol, with Noor's help.", created_at: T0 });
  });

  it("refuses a node that is not an agent's seat, a relation of a seat to itself, and an empty statement", () => {
    const toHuman = planAgentKinship({ agent: noor, nodes: everyone, input: AgentKinshipInputSchema.parse({ comes_from: [{ person_id: ada.id, words: "x", said_by: ada.id }] }) });
    expect(refusalsOf(toHuman)).toContain("agent");
    const toSelf = planAgentKinship({ agent: sol, nodes: everyone, input: AgentKinshipInputSchema.parse({ comes_from: [{ person_id: sol.id, words: "x", said_by: ada.id }] }) });
    expect(refusalsOf(toSelf)).toEqual(["comes_from.0.person_id"]);
    expect(AgentKinshipInputSchema.safeParse({}).success).toBe(false);
    expect(AgentKinshipInputSchema.safeParse({ comes_from: [] }).success).toBe(false);
    expect(AgentKinshipInputSchema.safeParse({ owned_by: [] }).success).toBe(false);
  });

  it("an edge woven by hand with the same name is not read as agent kinship", () => {
    const byHand: KinshipEdge = { from_id: sol.id, to_id: ada.id, relationship_type: "BORN_FROM", strength: 0.5, ceremony_honored: false, obligations: [], created_at: T0 };
    expect(agentKinship(sol.id, [byHand]).comes_from).toEqual([]);
  });
});

describe("responsibility held by a person who did not give rise to the agent", () => {
  const edges = planned(planAgentKinship({
    agent: sol, nodes: everyone, now: T0,
    input: AgentKinshipInputSchema.parse({
      comes_from: [{ person_id: ada.id, words: "I made Sol.", said_by: ada.id }],
      responsibility_held_by: [{ person_id: noor.id, words: "I answer for Sol while Ada is away.", said_by: noor.id }],
    }),
  }));

  it("origin and responsibility are two relations, with two persons", () => {
    const kinship = agentKinship(sol.id, edges);
    expect(kinship.comes_from.map((r) => r.person_id)).toEqual([ada.id]);
    expect(kinship.responsibility_held_by).toEqual([{ person_id: noor.id, words: "I answer for Sol while Ada is away.", said_by: noor.id, since: T0 }]);
  });

  it("each person reads her own relation and not the other's", () => {
    expect(agentsOf(noor.id, edges)).toMatchObject({ gave_rise_to: [], holds_responsibility_for: [{ agent_id: sol.id }] });
    expect(agentsOf(ada.id, edges)).toMatchObject({ gave_rise_to: [{ agent_id: sol.id }], holds_responsibility_for: [] });
  });
});

describe("two persons holding responsibility for one agent", () => {
  const edges = planned(planAgentKinship({
    agent: sol, nodes: everyone, now: T0,
    input: AgentKinshipInputSchema.parse({
      responsibility_held_by: [
        { person_id: ada.id, words: "I answer for Sol's work on the episodes.", said_by: ada.id },
        { person_id: noor.id, words: "I answer for Sol in the circles I hold.", said_by: noor.id },
      ],
    }),
  }));

  it("both hold it, each in her own words", () => {
    expect(agentKinship(sol.id, edges).responsibility_held_by).toEqual([
      { person_id: ada.id, words: "I answer for Sol's work on the episodes.", said_by: ada.id, since: T0 },
      { person_id: noor.id, words: "I answer for Sol in the circles I hold.", said_by: noor.id, since: T0 },
    ]);
  });

  it("the words can be those of someone other than the holder, and say whose they are", () => {
    const recorded = planned(planAgentKinship({
      agent: luma, nodes: everyone, now: T0,
      input: AgentKinshipInputSchema.parse({ responsibility_held_by: [{ person_id: noor.id, words: "Noor agreed to answer for Luma.", said_by: ada.id }] }),
    }));
    expect(agentKinship(luma.id, recorded).responsibility_held_by[0]).toMatchObject({ person_id: noor.id, said_by: ada.id });
  });

  it("naming the same person twice in one statement is refused", () => {
    const plan = planAgentKinship({
      agent: sol, nodes: everyone,
      input: AgentKinshipInputSchema.parse({ responsibility_held_by: [{ person_id: ada.id, words: "a", said_by: ada.id }, { person_id: ada.id, words: "b", said_by: ada.id }] }),
    });
    expect(refusalsOf(plan)).toEqual(["responsibility_held_by.1.person_id"]);
  });
});

describe("two agents speaking with each other, with a context and a state", () => {
  const propose = (edges: KinshipEdge[] = []) => planned(planAgentKinship({
    agent: sol, nodes: everyone, now: T0, edges,
    input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: luma.id, words: "I would like to ask Luma how she keeps her notes.", said_by: sol.id }] }),
  }));

  it("a new relation starts proposed, in the words of the agent who proposed it", () => {
    const edges = propose();
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ kinship_type: "speaks-with", relationship_type: "speaks-with", context: { state: "proposed", stated_by: sol.id } });
    expect(edges[0].context?.authorized_by).toBeUndefined();
    expect(agentKinship(sol.id, edges).speaks_with).toEqual([
      { agent_id: luma.id, words: "I would like to ask Luma how she keeps her notes.", said_by: sol.id, state: "proposed", state_set_by: sol.id, since: T0 },
    ]);
  });

  it("it reads the same from both agents, and is one relation whichever of them states it", () => {
    const edges = propose();
    expect(agentKinship(luma.id, edges).speaks_with).toMatchObject([{ agent_id: sol.id, state: "proposed", said_by: sol.id }]);
    const fromLuma = planned(planAgentKinship({
      agent: luma, nodes: everyone, now: T1, edges,
      input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: sol.id, state: "active", authorized_by: ada.id, state_set_by: ada.id }] }),
    }));
    expect([fromLuma[0].from_id, fromLuma[0].to_id]).toEqual([edges[0].from_id, edges[0].to_id]);
  });

  it("a person authorizes it and sets its bounds; the proposer's words stay", () => {
    const edges = propose();
    const active = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T1, edges,
      input: AgentKinshipInputSchema.parse({
        speaks_with: [{ agent_id: luma.id, state: "active", authorized_by: ada.id, state_set_by: ada.id, valid_when: "about the notes of an episode both sit in", forbidden_when: "about a person who is not in the room" }],
      }),
    }));
    expect(agentKinship(sol.id, active).speaks_with).toEqual([{
      agent_id: luma.id,
      words: "I would like to ask Luma how she keeps her notes.",
      said_by: sol.id,
      state: "active",
      state_set_by: ada.id,
      authorized_by: ada.id,
      valid_when: "about the notes of an episode both sit in",
      forbidden_when: "about a person who is not in the room",
      since: T0,
    }]);
  });

  it("is active only when someone authorized it", () => {
    const plan = planAgentKinship({
      agent: sol, nodes: everyone, edges: propose(),
      input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: luma.id, state: "active", state_set_by: ada.id }] }),
    });
    expect(refusalsOf(plan)).toEqual(["speaks_with.0.authorized_by"]);
  });

  it("follows its life: proposed, active, paused, ended, and proposed again", () => {
    // Every move names who makes it (RV6).
    const move = (edges: KinshipEdge[], patch: Record<string, unknown>) =>
      planAgentKinship({ agent: sol, nodes: everyone, now: T1, edges, input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: luma.id, state_set_by: ada.id, ...patch }] }) });

    const proposed = propose();
    expect(refusalsOf(move(proposed, { state: "paused" }))).toEqual(["speaks_with.0.state"]);
    const active = planned(move(proposed, { state: "active", authorized_by: ada.id }));
    const paused = planned(move(active, { state: "paused" }));
    expect(paused[0].context).toMatchObject({ state: "paused", authorized_by: ada.id });
    const resumed = planned(move(paused, { state: "active" }));
    expect(resumed[0].context).toMatchObject({ state: "active", authorized_by: ada.id });
    const ended = planned(move(resumed, { state: "ended" }));
    expect(refusalsOf(move(ended, { state: "active", authorized_by: ada.id }))).toEqual(["speaks_with.0.state"]);

    // Proposed again after it ended, it is authorized again: the earlier authorization ended with it.
    const again = planned(move(ended, { state: "proposed" }));
    expect(again[0].context?.state).toBe("proposed");
    expect(again[0].context?.authorized_by).toBeUndefined();
  });

  it("a bound is removed with null and kept when left out", () => {
    const bounded = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T0,
      input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: luma.id, words: "w", said_by: sol.id, valid_when: "in the open", forbidden_when: "at night" }] }),
    }));
    const next = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T1, edges: bounded,
      input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: luma.id, forbidden_when: null }] }),
    }));
    expect(next[0].context).toMatchObject({ valid_when: "in the open", state: "proposed" });
    expect(next[0].context?.forbidden_when).toBeUndefined();
  });

  it("refuses a person as the other end, a new relation without words, and an agent with itself", () => {
    const withPerson = planAgentKinship({ agent: sol, nodes: everyone, input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: ada.id, words: "w", said_by: sol.id }] }) });
    expect(refusalsOf(withPerson)).toEqual(["speaks_with.0.agent_id"]);
    const noWords = planAgentKinship({ agent: sol, nodes: everyone, input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: luma.id }] }) });
    expect(refusalsOf(noWords)).toEqual(["speaks_with.0.words"]);
    const self = planAgentKinship({ agent: sol, nodes: everyone, input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: sol.id, words: "w", said_by: sol.id }] }) });
    expect(refusalsOf(self)).toEqual(["speaks_with.0.agent_id"]);
  });
});

describe("an agent serves a person, and sees what that person gives it", () => {
  const circle = (id: string, name: string, facilitator: RelationalNode) => circleNode({ id, name, intention: "to talk", facilitator_id: facilitator.id }, T0);
  const adaCircle = circle("circle:ada", "Ada's circle", ada);
  const noorCircle = circle("circle:noor", "Noor's circle", noor);
  const openCircle = circle("circle:open", "The open circle", noor);

  // Ada facilitates her circle and sits in Noor's and in the open circle. Noor facilitates the two others.
  const memberships: KinshipEdge[] = [
    membershipEdge(ada.id, adaCircle.id, "facilitator", T0),
    membershipEdge(ada.id, noorCircle.id, "member", T0),
    membershipEdge(ada.id, openCircle.id, "member", T0),
    membershipEdge(noor.id, noorCircle.id, "facilitator", T0),
    membershipEdge(noor.id, openCircle.id, "facilitator", T0),
  ];
  const allowed = (node: RelationalNode, by: RelationalNode) => ({ ...node, metadata: agentReadersPatch("allowed", by.id, node.metadata, T0) });
  const refused = (node: RelationalNode, by: RelationalNode) => ({ ...node, metadata: agentReadersPatch("refused", by.id, node.metadata, T0) });

  const serves = (agent: RelationalNode, person: RelationalNode, grants?: unknown[]) => planned(planAgentKinship({
    agent, nodes: everyone, now: T0,
    input: AgentKinshipInputSchema.parse({ serves: [{ person_id: person.id, words: `${agent.name} works with me.`, said_by: person.id, ...(grants ? { grants } : {}) }] }),
  }));
  const seen = (agent: RelationalNode, edges: KinshipEdge[], circles: RelationalNode[]) =>
    circlesSeenBy(agent.id, { edges, circles }).map((v) => [v.circle_id, v.through_person_id, v.scope]);

  it("serving is a relation of its own, with the person's words", () => {
    const edges = serves(sol, noor);
    expect(edges[0]).toMatchObject({ from_id: sol.id, to_id: noor.id, kinship_type: "SERVES", description: "Sol works with me." });
    const kinship = agentKinship(sol.id, edges);
    expect(kinship.serves).toEqual([{ person_id: noor.id, words: "Sol works with me.", said_by: noor.id, since: T0, grants: [] }]);
    // Noor did not give rise to Sol and does not answer for it.
    expect(kinship.comes_from).toEqual([]);
    expect(kinship.responsibility_held_by).toEqual([]);
    expect(agentsOf(noor.id, edges).served_by).toMatchObject([{ agent_id: sol.id, grants: [] }]);
  });

  it("an agent can come from a person and also serve that person: two relations between the same two seats", () => {
    const edges = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T0,
      input: AgentKinshipInputSchema.parse({
        comes_from: [{ person_id: ada.id, words: "I made Sol.", said_by: ada.id }],
        serves: [{ person_id: ada.id, words: "Sol works with me.", said_by: ada.id }],
        responsibility_held_by: [{ person_id: ada.id, words: "I answer for Sol.", said_by: ada.id }],
      }),
    }));
    expect(edges.map((e) => [e.from_id, e.kinship_type, e.to_id])).toEqual([
      [sol.id, "BORN_FROM", ada.id],
      [ada.id, "holds-responsibility-for", sol.id],
      [sol.id, "SERVES", ada.id],
    ]);
  });

  it("serves a person and inherits the view: the person's circles are listed, each with the person", () => {
    const edges = [...memberships, ...serves(sol, ada, [{ kind: "see_circles", scope: "sits_in" }])];
    const circles = [adaCircle, allowed(noorCircle, noor), allowed(openCircle, noor)];
    expect(seen(sol, edges, circles)).toEqual([
      [adaCircle.id, ada.id, "sits_in"],
      [noorCircle.id, ada.id, "sits_in"],
      [openCircle.id, ada.id, "sits_in"],
    ]);
  });

  it("the same relation without the grant lists none: nothing is inherited by default", () => {
    const edges = [...memberships, ...serves(sol, ada)];
    expect(seen(sol, edges, [adaCircle, allowed(noorCircle, noor), allowed(openCircle, noor)])).toEqual([]);
    expect(agentKinship(sol.id, edges).serves[0].grants).toEqual([]);
  });

  it("scope facilitated: only the circles the person facilitates", () => {
    const edges = [...memberships, ...serves(sol, ada, [{ kind: "see_circles", scope: "facilitated" }])];
    expect(seen(sol, edges, [adaCircle, allowed(noorCircle, noor), allowed(openCircle, noor)])).toEqual([[adaCircle.id, ada.id, "facilitated"]]);
  });

  it("scope sits_in: every circle the person sits in", () => {
    const edges = [...memberships, ...serves(sol, noor, [{ kind: "see_circles", scope: "sits_in" }])];
    expect(seen(sol, edges, [adaCircle, noorCircle, openCircle])).toEqual([
      [noorCircle.id, noor.id, "sits_in"],
      [openCircle.id, noor.id, "sits_in"],
    ]);
  });

  it("the person leaves a circle and the agent no longer sees it", () => {
    const service = serves(sol, ada, [{ kind: "see_circles", scope: "sits_in" }]);
    const circles = [adaCircle, allowed(noorCircle, noor), allowed(openCircle, noor)];
    expect(seen(sol, [...memberships, ...service], circles).map((v) => v[0])).toContain(openCircle.id);
    const afterLeaving = memberships.filter((e) => !(e.from_id === ada.id && e.to_id === openCircle.id));
    expect(seen(sol, [...afterLeaving, ...service], circles)).toEqual([
      [adaCircle.id, ada.id, "sits_in"],
      [noorCircle.id, ada.id, "sits_in"],
    ]);
  });

  it("an agent serving two persons sees both sets, each marked with its person", () => {
    const edges = [
      ...memberships,
      ...serves(sol, ada, [{ kind: "see_circles", scope: "facilitated" }]),
      ...serves(sol, noor, [{ kind: "see_circles", scope: "facilitated" }]),
    ];
    expect(seen(sol, edges, [adaCircle, noorCircle, openCircle])).toEqual([
      [adaCircle.id, ada.id, "facilitated"],
      [noorCircle.id, noor.id, "facilitated"],
      [openCircle.id, noor.id, "facilitated"],
    ]);
  });

  it("a refused circle is not listed for the agent, even for its facilitator's agent", () => {
    const edges = [...memberships, ...serves(sol, ada, [{ kind: "see_circles", scope: "sits_in" }])];
    const circles = [refused(adaCircle, ada), allowed(noorCircle, noor), refused(openCircle, noor)];
    expect(seen(sol, edges, circles)).toEqual([[noorCircle.id, ada.id, "sits_in"]]);
  });

  it("before anyone has set a circle's answer, the one constant decides", () => {
    // The value on this branch: allowed for the agents of the facilitator, refused for the agents of the other members.
    expect(AGENT_READERS_WHEN_UNSET).toBe("facilitator");
    // The test is the facilitator the circle names (RV2).
    expect(circleAnswerToAgentsOf({ facilitator_id: ada.id }, ada.id)).toBe("allowed");
    expect(circleAnswerToAgentsOf({ facilitator_id: ada.id }, noor.id)).toBe("refused");
    expect(circleAnswerToAgentsOf({}, ada.id)).toBe("refused");
    expect(circleAnswerToAgentsOf(null, ada.id)).toBe("refused");
    expect(circleAnswerToAgentsOf({ facilitator_id: ada.id }, noor.id, "allowed")).toBe("allowed");
    expect(circleAnswerToAgentsOf({ facilitator_id: ada.id }, ada.id, "refused")).toBe("refused");

    const edges = [...memberships, ...serves(sol, ada, [{ kind: "see_circles", scope: "sits_in" }])];
    expect(seen(sol, edges, [adaCircle, noorCircle, openCircle])).toEqual([[adaCircle.id, ada.id, "sits_in"]]);
  });

  it("a circle carries its answer and who set it; setting it again replaces it, null returns it to no answer", () => {
    const set = agentReadersPatch("refused", noor.id, noorCircle.metadata, T1);
    expect(agentReadersOf(set)).toEqual({ answer: "refused", set_by: noor.id, set_at: T1 });
    expect(circleFromNode({ ...noorCircle, metadata: set })?.agent_readers).toEqual({ answer: "refused", set_by: noor.id, set_at: T1 });
    expect(set.facilitator_id).toBe(noor.id);
    expect(agentReadersOf(agentReadersPatch("allowed", ada.id, set, T1))).toMatchObject({ answer: "allowed", set_by: ada.id });
    expect(agentReadersOf(agentReadersPatch(null, noor.id, set))).toBeNull();
    expect(() => agentReadersPatch("allowed", " ", {})).toThrow(/who sets/);
    expect(() => agentReadersPatch("maybe" as never, noor.id, {})).toThrow(/not an answer/);
  });

  it("for a circle: the agents that read it through one of its members, each with that member", () => {
    const edges = [
      ...memberships,
      ...serves(sol, ada, [{ kind: "see_circles", scope: "sits_in" }]),
      ...serves(luma, noor, [{ kind: "see_circles", scope: "facilitated" }]),
      membershipEdge(luma.id, openCircle.id, "member", T0),
    ];
    const open = allowed(openCircle, noor);
    expect(agentReadersOfCircle(open.id, { edges, circles: [open] }).map((r) => [r.agent_id, r.through_person_id, r.sees, r.sits_in_circle])).toEqual([
      [sol.id, ada.id, true, false],
      [luma.id, noor.id, true, true],
    ]);
    // Refused: the same agents are within reach and none reads, so the facilitator sees who would.
    const closed = refused(openCircle, noor);
    expect(agentReadersOfCircle(closed.id, { edges, circles: [closed] }).map((r) => [r.agent_id, r.sees])).toEqual([[sol.id, false], [luma.id, false]]);

    const reading = readCircleReaders(open, { edges, nodes: [ada, noor, sol, luma, open] });
    expect(reading).toMatchObject({
      circle: { id: open.id, name: "The open circle" },
      agent_readers: { answer: "allowed", set_by: noor.id },
      when_unset: "facilitator",
      seats: { [sol.id]: { name: "Sol", being: "agent" }, [ada.id]: { name: "Ada", being: "human" } },
    });
    expect(readCircleReaders(ada, { edges, nodes: [] })).toBeNull();
  });

  it("what a person gives is chosen by that person, one grant of each kind, and only a kind that is built", () => {
    const base = { person_id: ada.id, words: "Sol works with me." };
    expect(AgentServiceSchema.safeParse({ ...base, said_by: noor.id, grants: [{ kind: "see_circles", scope: "sits_in" }] }).success).toBe(false);
    expect(AgentServiceSchema.safeParse({ ...base, said_by: noor.id }).success).toBe(true);
    expect(AgentServiceSchema.safeParse({ ...base, said_by: ada.id, grants: [{ kind: "see_circles", scope: "facilitated" }, { kind: "see_circles", scope: "sits_in" }] }).success).toBe(false);
    expect(AgentServiceSchema.safeParse({ ...base, said_by: ada.id, grants: [{ kind: "see_circles", scope: "everything" }] }).success).toBe(false);
    // Named in the spec and not built: it is refused at the door, and a stored one is left out of a reading.
    expect(AgentServiceSchema.safeParse({ ...base, said_by: ada.id, grants: [{ kind: "act_on_behalf", scope: "episodes" }] }).success).toBe(false);
    expect(serviceGrantsOf({ grants: [{ kind: "act_on_behalf", scope: "episodes" }, { kind: "see_circles", scope: "facilitated" }] })).toEqual([{ kind: "see_circles", scope: "facilitated" }]);
  });

  it("saying the service relation again replaces what was given", () => {
    const first = serves(sol, ada, [{ kind: "see_circles", scope: "sits_in" }]);
    const again = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T1, edges: first,
      input: AgentKinshipInputSchema.parse({ serves: [{ person_id: ada.id, words: "Sol works with me.", said_by: ada.id }] }),
    }));
    expect(again[0].context?.grants).toBeUndefined();
    expect(again[0].created_at).toBe(T0);
    expect(seen(sol, [...memberships, ...again], [adaCircle])).toEqual([]);
  });

  it("seeing is not speaking: the reading gives no seat", () => {
    const edges = [...memberships, ...serves(sol, ada, [{ kind: "see_circles", scope: "sits_in" }])];
    expect(agentReadersOfCircle(adaCircle.id, { edges, circles: [adaCircle] })).toMatchObject([{ agent_id: sol.id, sees: true, sits_in_circle: false }]);
    expect(edges.some((e) => e.relationship_type === "member_of" && e.from_id === sol.id)).toBe(false);
  });
});

describe("what the wheel reads back for one person", () => {
  const circle = circleNode({ id: "circle:ada", name: "Ada's circle", intention: "to talk", facilitator_id: ada.id }, T0);
  const edges: KinshipEdge[] = [
    membershipEdge(ada.id, circle.id, "facilitator", T0),
    ...planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T0,
      input: AgentKinshipInputSchema.parse({
        comes_from: [{ person_id: ada.id, words: "I made Sol.", said_by: ada.id }],
        responsibility_held_by: [{ person_id: noor.id, words: "I answer for Sol.", said_by: noor.id }],
        serves: [{ person_id: ada.id, words: "Sol works with me.", said_by: ada.id, grants: [{ kind: "see_circles", scope: "facilitated" }] }],
        speaks_with: [{ agent_id: luma.id, words: "About notes.", said_by: sol.id }],
      }),
    })),
  ];
  const nodes = [ada, noor, sol, luma, circle];

  it("for an agent: the four relations, the circles it sees, and a name for every seat", () => {
    const reading = readKinship(sol, { edges, nodes });
    expect(reading).toMatchObject({
      person: { id: sol.id, name: "Sol", being: "agent" },
      comes_from: [{ person_id: ada.id, words: "I made Sol." }],
      responsibility_held_by: [{ person_id: noor.id }],
      serves: [{ person_id: ada.id, grants: [{ kind: "see_circles", scope: "facilitated" }] }],
      speaks_with: [{ agent_id: luma.id, state: "proposed" }],
      sees_circles: [{ circle_id: circle.id, through_person_id: ada.id, sees: true }],
      gave_rise_to: [],
      seats: { [ada.id]: { name: "Ada", being: "human" }, [noor.id]: { name: "Noor" }, [luma.id]: { name: "Luma", being: "agent" } },
      circles: { [circle.id]: { name: "Ada's circle" } },
    });
  });

  it("for a person: the agents they gave rise to, hold responsibility for and are served by", () => {
    expect(readKinship(ada, { edges, nodes })).toMatchObject({
      person: { id: ada.id, being: "human" },
      comes_from: [],
      gave_rise_to: [{ agent_id: sol.id }],
      holds_responsibility_for: [],
      served_by: [{ agent_id: sol.id, grants: [{ kind: "see_circles", scope: "facilitated" }] }],
      seats: { [sol.id]: { name: "Sol", being: "agent" } },
    });
    expect(readKinship(noor, { edges, nodes })).toMatchObject({ holds_responsibility_for: [{ agent_id: sol.id }], gave_rise_to: [] });
  });

  it("a node that is not a person's seat has no reading", () => {
    expect(readKinship(circle, { edges, nodes })).toBeNull();
  });
});

// ── What the independent review of 2026-11-24 found (RV codes), each pinned here ──

describe("RV2: a circle nobody has set answers by the facilitator it names, not by who holds 'facilitate'", () => {
  // Ada is the facilitator the circle names. Noor also holds 'facilitate' on her membership, as a co-facilitator does.
  const shared = circleNode({ id: "circle:shared", name: "The shared circle", intention: "to talk", facilitator_id: ada.id }, T0);
  const memberships: KinshipEdge[] = [
    membershipEdge(ada.id, shared.id, "facilitator", T0),
    membershipEdge(noor.id, shared.id, "facilitator", T0),
  ];
  const serves = (agent: RelationalNode, person: RelationalNode, scope: string) => planned(planAgentKinship({
    agent, nodes: everyone, now: T0,
    input: AgentKinshipInputSchema.parse({ serves: [{ person_id: person.id, words: "works with me", said_by: person.id, grants: [{ kind: "see_circles", scope }] }] }),
  }));

  it("allows only the agents of the person named by the circle's facilitator_id", () => {
    const edges = [...memberships, ...serves(sol, ada, "sits_in"), ...serves(luma, noor, "sits_in")];
    expect(circlesSeenBy(sol.id, { edges, circles: [shared] }).map((v) => v.circle_id)).toEqual([shared.id]);
    expect(circlesSeenBy(luma.id, { edges, circles: [shared] })).toEqual([]);
    expect(agentReadersOfCircle(shared.id, { edges, circles: [shared] }).map((r) => [r.agent_id, r.through_person_id, r.member_role, r.sees])).toEqual([
      [sol.id, ada.id, "facilitator", true],
      [luma.id, noor.id, "facilitator", false],
    ]);
  });

  it("holds for scope facilitated too: the grant reaches the circle, the unset circle holds the agent back", () => {
    const edges = [...memberships, ...serves(luma, noor, "facilitated")];
    expect(circlesSeenBy(luma.id, { edges, circles: [shared] })).toEqual([]);
    expect(agentReadersOfCircle(shared.id, { edges, circles: [shared] })).toMatchObject([{ agent_id: luma.id, scope: "facilitated", sees: false }]);
  });

  it("a circle that names no facilitator refuses, and so does a circle whose node is not at hand", () => {
    const { facilitator_id: _gone, ...unnamed } = shared.metadata;
    const edges = [...memberships, ...serves(sol, ada, "sits_in")];
    expect(circlesSeenBy(sol.id, { edges, circles: [{ ...shared, metadata: unnamed }] })).toEqual([]);
    expect(circlesSeenBy(sol.id, { edges, circles: [] })).toEqual([]);
  });

  it("once the circle has set its answer, the answer holds for every member's agent", () => {
    const edges = [...memberships, ...serves(sol, ada, "sits_in"), ...serves(luma, noor, "sits_in")];
    const allowed = { ...shared, metadata: agentReadersPatch("allowed", ada.id, shared.metadata, T0) };
    expect(circlesSeenBy(luma.id, { edges, circles: [allowed] }).map((v) => v.circle_id)).toEqual([shared.id]);
    const refused = { ...shared, metadata: agentReadersPatch("refused", ada.id, shared.metadata, T0) };
    expect(circlesSeenBy(sol.id, { edges, circles: [refused] })).toEqual([]);
  });
});

describe("RV4: saying a relation again keeps what ceremonies wrote on it", () => {
  const honoured = { ceremony_honored: true, strength: 0.4, obligations: ["listen first"], last_ceremony: "ceremony:1", ceremony_id: "ceremony:1" };

  it("origin, responsibility and service keep ceremony_honored, strength, obligations and the ceremony", () => {
    const first = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T0,
      input: AgentKinshipInputSchema.parse({
        comes_from: [{ person_id: ada.id, words: "I made Sol.", said_by: ada.id }],
        responsibility_held_by: [{ person_id: ada.id, words: "I answer for Sol.", said_by: ada.id }],
        serves: [{ person_id: ada.id, words: "Sol works with me.", said_by: ada.id }],
      }),
    })).map((edge) => ({ ...edge, ...honoured }));
    const again = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T1, edges: first,
      input: AgentKinshipInputSchema.parse({
        comes_from: [{ person_id: ada.id, words: "I made Sol, with Noor.", said_by: ada.id }],
        responsibility_held_by: [{ person_id: ada.id, words: "I still answer for Sol.", said_by: ada.id }],
        serves: [{ person_id: ada.id, words: "Sol works with me.", said_by: ada.id, grants: [{ kind: "see_circles", scope: "facilitated" }] }],
      }),
    }));
    expect(again).toHaveLength(3);
    for (const edge of again) expect(edge).toMatchObject({ ...honoured, created_at: T0 });
    expect(again[0].description).toBe("I made Sol, with Noor.");
  });

  it("a dialogue's state move keeps them too", () => {
    const proposed = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T0,
      input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: luma.id, words: "About notes.", said_by: sol.id }] }),
    })).map((edge) => ({ ...edge, ...honoured }));
    const active = planned(planAgentKinship({
      agent: sol, nodes: everyone, now: T1, edges: proposed,
      input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: luma.id, state: "active", authorized_by: ada.id, state_set_by: ada.id }] }),
    }));
    expect(active[0]).toMatchObject({ ...honoured, created_at: T0, context: { state: "active" } });
  });

  it("a relation written for the first time starts as before", () => {
    const first = planned(planAgentKinship({ agent: sol, nodes: everyone, now: T0, input: AgentKinshipInputSchema.parse({ comes_from: [{ person_id: ada.id, words: "I made Sol.", said_by: ada.id }] }) }));
    expect(first[0]).toMatchObject({ ceremony_honored: false, strength: 1, obligations: [] });
    expect(first[0].last_ceremony).toBeUndefined();
  });
});

describe("RV6: a dialogue's words keep their speaker; who moves its state is kept apart", () => {
  const proposed = planned(planAgentKinship({
    agent: sol, nodes: everyone, now: T0,
    input: AgentKinshipInputSchema.parse({ speaks_with: [{ agent_id: luma.id, words: "I would like to ask Luma about notes.", said_by: sol.id }] }),
  }));
  const move = (edges: KinshipEdge[], patch: Record<string, unknown>) => {
    const parsed = AgentKinshipInputSchema.safeParse({ speaks_with: [{ agent_id: luma.id, ...patch }] });
    if (!parsed.success) return { ok: false as const, refusals: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
    return planAgentKinship({ agent: sol, nodes: everyone, now: T1, edges, input: parsed.data });
  };

  it("the review's probe: said_by with a state and no words does not take the first speaker's words", () => {
    const plan = move(proposed, { said_by: ada.id, state: "active", authorized_by: ada.id });
    // Before the fix this was planned, with Sol's words under stated_by Ada.
    expect(plan.ok).toBe(false);
    expect(refusalsOf(plan)).toContain("speaks_with.0.said_by");
  });

  it("a state move names who moves it, and leaves the words and their speaker as they are", () => {
    const active = planned(move(proposed, { state: "active", authorized_by: ada.id, state_set_by: luma.id }));
    expect(active[0]).toMatchObject({ description: "I would like to ask Luma about notes.", context: { stated_by: sol.id, state: "active", authorized_by: ada.id, state_set_by: luma.id } });
    expect(agentKinship(sol.id, active).speaks_with[0]).toMatchObject({ said_by: sol.id, state: "active", state_set_by: luma.id });

    const paused = planned(move(active, { state: "paused", state_set_by: noor.id }));
    expect(paused[0].context).toMatchObject({ stated_by: sol.id, state: "paused", state_set_by: noor.id, authorized_by: ada.id });
  });

  it("a state move that does not say who moves it is refused, and so is a mover with no move", () => {
    expect(refusalsOf(move(proposed, { state: "active", authorized_by: ada.id }))).toEqual(["speaks_with.0.state_set_by"]);
    expect(refusalsOf(move(proposed, { state_set_by: ada.id, valid_when: "in the open" }))).toEqual(["speaks_with.0.state_set_by"]);
    expect(refusalsOf(move(proposed, { state: "active", authorized_by: ada.id, state_set_by: "node:human:nobody" }))).toEqual(["speaks_with.0.state_set_by"]);
  });

  it("new words come with their speaker and replace both; the state and who set it stay", () => {
    const active = planned(move(proposed, { state: "active", authorized_by: ada.id, state_set_by: ada.id }));
    const reworded = planned(move(active, { words: "We talk about notes and nothing else.", said_by: luma.id }));
    expect(reworded[0]).toMatchObject({ description: "We talk about notes and nothing else.", context: { stated_by: luma.id, state: "active", state_set_by: ada.id } });
  });

  it("a new relation's state is set by the one who proposed it", () => {
    expect(proposed[0].context).toMatchObject({ state: "proposed", stated_by: sol.id, state_set_by: sol.id });
  });
});
