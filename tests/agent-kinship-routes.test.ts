/**
 * Agent kinship through the wheel's API, on a store of its own
 * (rispecs/agent-kinship.spec.md): a person defines an agent they made, an
 * existing agent is related to its person, and the wheel reads it all back.
 * Also what the store had to learn for it: two governed relations between the
 * same two seats, in the same direction, each kept.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => {
  return await import("../src/storage-provider/src/index");
});
vi.mock("@medicine-wheel/community-identity", async () => {
  return await import("../src/community-identity/src/index");
});

import { agentReadersPatch, circleNode, membershipEdge, personNode } from "../src/community-identity/src/index";

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
let tempDir: string;
let nodesRoute: typeof import("../app/api/nodes/route");
let nodeRoute: typeof import("../app/api/nodes/[id]/route");
let edgesRoute: typeof import("../app/api/edges/route");
let agentsRoute: typeof import("../app/api/agents/route");
let kinshipRoute: typeof import("../app/api/nodes/[id]/kinship/route");
let readersRoute: typeof import("../app/api/nodes/[id]/readers/route");

const json = (method: string, url: string, body?: unknown) =>
  new Request(`http://wheel.test${url}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const answer = async (res: Response) => ({ status: res.status, body: await res.json() });
const at = (id: string) => ({ params: Promise.resolve({ id }) });

const postNode = async (node: unknown) => answer(await nodesRoute.POST(json("POST", "/api/nodes", node)));
const postEdge = async (edge: unknown) => answer(await edgesRoute.POST(json("POST", "/api/edges", edge)));
const allEdges = async () => (await (await edgesRoute.GET(json("GET", "/api/edges?limit=all"))).json()) as Array<Record<string, any>>;
const defineAgent = async (body: unknown) => answer(await agentsRoute.POST(json("POST", "/api/agents", body)));
const relate = async (id: string, body: unknown) => answer(await kinshipRoute.POST(json("POST", `/api/nodes/${id}/kinship`, body), at(id)));
const kinshipOf = async (id: string) => answer(await kinshipRoute.GET(json("GET", `/api/nodes/${id}/kinship`), at(id)));
const readersOf = async (id: string) => answer(await readersRoute.GET(json("GET", `/api/nodes/${id}/readers`), at(id)));

// Two persons and two agents that already have a node. None of them is a real person.
const ada = personNode({ id: "node:human:ada", name: "Ada", role: "ceremony_facilitator" });
const noor = personNode({ id: "node:human:noor", name: "Noor", role: "participant" });
const sol = personNode({ id: "node:agent:sol", name: "Sol", role: "companion_ai", agent: true });
const luma = personNode({ id: "node:agent:luma", name: "Luma", role: "companion_ai", agent: true });
const adaCircle = circleNode({ id: "circle:ada", name: "Ada's circle", intention: "to talk", facilitator_id: ada.id });
const noorCircle = circleNode({ id: "circle:noor", name: "Noor's circle", intention: "to talk", facilitator_id: noor.id });

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-agent-kinship-"));
  process.env.MW_DATA_DIR = tempDir;
  nodesRoute = await import("../app/api/nodes/route");
  nodeRoute = await import("../app/api/nodes/[id]/route");
  edgesRoute = await import("../app/api/edges/route");
  agentsRoute = await import("../app/api/agents/route");
  kinshipRoute = await import("../app/api/nodes/[id]/kinship/route");
  readersRoute = await import("../app/api/nodes/[id]/readers/route");
  for (const node of [ada, noor, sol, luma, adaCircle, noorCircle]) expect((await postNode(node)).status).toBe(201);
  for (const edge of [
    membershipEdge(ada.id, adaCircle.id, "facilitator"),
    membershipEdge(ada.id, noorCircle.id, "member"),
    membershipEdge(noor.id, noorCircle.id, "facilitator"),
  ]) expect((await postEdge(edge)).status).toBe(201);
});

afterAll(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("POST /api/agents: a person defines an agent they made", () => {
  it("writes the agent's node and its relations together, and reads them back", async () => {
    const made = await defineAgent({
      agent: { id: "node:agent:wren", name: "Wren", role: "companion_ai" },
      comes_from: [{ person_id: ada.id, words: "I made Wren in the autumn of 2026.", said_by: ada.id }],
      responsibility_held_by: [{ person_id: ada.id, words: "I answer for what Wren does here.", said_by: ada.id }],
      serves: [{ person_id: ada.id, words: "Wren works with me.", said_by: ada.id, grants: [{ kind: "see_circles", scope: "facilitated" }] }],
    });
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    expect(made.body.node).toMatchObject({ id: "node:agent:wren", type: "agent", metadata: { kind: "person", role: "companion_ai" } });
    expect(made.body.kinship.comes_from).toMatchObject([{ person_id: ada.id, words: "I made Wren in the autumn of 2026.", said_by: ada.id }]);

    // The node is on the wheel as an agent's seat.
    const stored = await answer(await nodeRoute.GET(json("GET", "/api/nodes/node:agent:wren"), at("node:agent:wren")));
    expect(stored.status).toBe(200);

    const read = await kinshipOf("node:agent:wren");
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({
      person: { id: "node:agent:wren", name: "Wren", being: "agent" },
      comes_from: [{ person_id: ada.id, words: "I made Wren in the autumn of 2026." }],
      responsibility_held_by: [{ person_id: ada.id, words: "I answer for what Wren does here." }],
      serves: [{ person_id: ada.id, grants: [{ kind: "see_circles", scope: "facilitated" }] }],
      sees_circles: [{ circle_id: adaCircle.id, through_person_id: ada.id, scope: "facilitated", sees: true }],
      seats: { [ada.id]: { name: "Ada", being: "human" } },
      circles: { [adaCircle.id]: { name: "Ada's circle" } },
    });
  });

  it("keeps origin and service as two relations between the same two seats, in the same direction", async () => {
    const between = (await allEdges()).filter((e) => e.from_id === "node:agent:wren" && e.to_id === ada.id);
    expect(between.map((e) => e.kinship_type).sort()).toEqual(["BORN_FROM", "SERVES"]);
    expect(between.map((e) => e.relationship_type).sort()).toEqual(["BORN_FROM", "SERVES"]);
    expect(new Set(between.map((e) => e.id)).size).toBe(2);
  });

  it("writes nothing when a person it names is not on the wheel", async () => {
    const refused = await defineAgent({
      agent: { id: "node:agent:ghost", name: "Ghost", role: "companion_ai" },
      comes_from: [{ person_id: "node:human:nobody", words: "I made Ghost.", said_by: ada.id }],
    });
    expect(refused.status).toBe(400);
    expect(refused.body.issues).toEqual(["comes_from.0.person_id: no node node:human:nobody on the wheel"]);
    const node = await nodeRoute.GET(json("GET", "/api/nodes/node:agent:ghost"), at("node:agent:ghost"));
    expect(node.status).toBe(404);
  });

  it("refuses a statement with no origin, and an id that is already a node", async () => {
    const noOrigin = await defineAgent({ agent: { name: "Wren", role: "companion_ai" } });
    expect(noOrigin.status).toBe(400);
    const taken = await defineAgent({ agent: { id: sol.id, name: "Sol", role: "companion_ai" }, comes_from: [{ person_id: ada.id, words: "x", said_by: ada.id }] });
    expect(taken.status).toBe(409);
    expect(taken.body.hint).toContain("/kinship");
  });
});

describe("POST /api/nodes/{id}/kinship: an existing agent is related to its person", () => {
  it("relates Sol to the person it comes from, afterwards", async () => {
    const before = await kinshipOf(sol.id);
    expect(before.body.comes_from).toEqual([]);

    const related = await relate(sol.id, { comes_from: [{ person_id: ada.id, words: "Sol came out of my work on the wheel.", said_by: ada.id }] });
    expect(related.status, JSON.stringify(related.body)).toBe(200);
    expect(related.body.kinship.comes_from).toMatchObject([{ person_id: ada.id, said_by: ada.id }]);

    const read = await kinshipOf(sol.id);
    expect(read.body.comes_from).toMatchObject([{ person_id: ada.id, words: "Sol came out of my work on the wheel." }]);
    // Read from the person's end.
    const adaRead = await kinshipOf(ada.id);
    expect(adaRead.body.gave_rise_to.map((r: { agent_id: string }) => r.agent_id).sort()).toEqual(["node:agent:sol", "node:agent:wren"]);
  });

  it("responsibility held by a person who did not give rise to the agent", async () => {
    const related = await relate(sol.id, { responsibility_held_by: [{ person_id: noor.id, words: "I answer for Sol while Ada is away.", said_by: noor.id }] });
    expect(related.status, JSON.stringify(related.body)).toBe(200);
    const read = await kinshipOf(sol.id);
    expect(read.body.comes_from.map((r: { person_id: string }) => r.person_id)).toEqual([ada.id]);
    expect(read.body.responsibility_held_by).toMatchObject([{ person_id: noor.id, words: "I answer for Sol while Ada is away.", said_by: noor.id }]);
  });

  it("two persons holding responsibility for one agent", async () => {
    const related = await relate(sol.id, { responsibility_held_by: [{ person_id: ada.id, words: "I answer for Sol's work on the episodes.", said_by: ada.id }] });
    expect(related.status, JSON.stringify(related.body)).toBe(200);
    const read = await kinshipOf(sol.id);
    expect(read.body.responsibility_held_by.map((r: { person_id: string }) => r.person_id).sort()).toEqual([ada.id, noor.id].sort());
    expect(read.body.seats).toMatchObject({ [ada.id]: { name: "Ada" }, [noor.id]: { name: "Noor" } });
  });

  it("two agents speaking with each other, with a context and a state", async () => {
    const proposed = await relate(sol.id, { speaks_with: [{ agent_id: luma.id, words: "I would like to ask Luma how she keeps her notes.", said_by: sol.id }] });
    expect(proposed.status, JSON.stringify(proposed.body)).toBe(200);
    expect(proposed.body.kinship.speaks_with).toMatchObject([{ agent_id: luma.id, state: "proposed" }]);

    const unauthorized = await relate(luma.id, { speaks_with: [{ agent_id: sol.id, state: "active" }] });
    expect(unauthorized.status).toBe(400);
    expect(unauthorized.body.issues[0]).toContain("authorized_by");

    const active = await relate(luma.id, {
      speaks_with: [{ agent_id: sol.id, state: "active", authorized_by: ada.id, valid_when: "about the notes of an episode both sit in", forbidden_when: "about a person who is not in the room" }],
    });
    expect(active.status, JSON.stringify(active.body)).toBe(200);

    const expected = {
      words: "I would like to ask Luma how she keeps her notes.",
      said_by: sol.id,
      state: "active",
      authorized_by: ada.id,
      valid_when: "about the notes of an episode both sit in",
      forbidden_when: "about a person who is not in the room",
    };
    expect((await kinshipOf(sol.id)).body.speaks_with).toMatchObject([{ agent_id: luma.id, ...expected }]);
    expect((await kinshipOf(luma.id)).body.speaks_with).toMatchObject([{ agent_id: sol.id, ...expected }]);
    // One relation on the wheel, not one for each agent.
    expect((await allEdges()).filter((e) => e.kinship_type === "speaks-with")).toHaveLength(1);

    const paused = await relate(sol.id, { speaks_with: [{ agent_id: luma.id, state: "paused" }] });
    expect(paused.body.kinship.speaks_with).toMatchObject([{ state: "paused", authorized_by: ada.id }]);
    const wrong = await relate(sol.id, { speaks_with: [{ agent_id: luma.id, state: "proposed" }] });
    expect(wrong.status).toBe(400);
  });

  it("refuses a node the wheel does not hold, a node that is not an agent's seat, and an unknown key", async () => {
    expect((await relate("node:agent:nobody", { comes_from: [{ person_id: ada.id, words: "x", said_by: ada.id }] })).status).toBe(404);
    const human = await relate(noor.id, { comes_from: [{ person_id: ada.id, words: "x", said_by: ada.id }] });
    expect(human.status).toBe(400);
    expect(human.body.issues[0]).toContain("not an agent's seat");
    expect((await relate(sol.id, { owned_by: [{ person_id: ada.id }] })).status).toBe(400);
    expect((await kinshipOf("node:agent:nobody")).status).toBe(404);
    expect((await kinshipOf(adaCircle.id)).status).toBe(400);
  });
});

describe("what an agent sees through the person it serves, and what a circle answers", () => {
  it("lists the person's circles by the scope the person chose, each with the person", async () => {
    const none = await relate(sol.id, { serves: [{ person_id: ada.id, words: "Sol works with me.", said_by: ada.id }] });
    expect(none.status, JSON.stringify(none.body)).toBe(200);
    expect((await kinshipOf(sol.id)).body.sees_circles).toEqual([]);

    await relate(sol.id, { serves: [{ person_id: ada.id, words: "Sol works with me.", said_by: ada.id, grants: [{ kind: "see_circles", scope: "sits_in" }] }] });
    // Ada facilitates her circle and is a member of Noor's, which has set no answer: only hers is seen.
    expect((await kinshipOf(sol.id)).body.sees_circles.map((v: { circle_id: string }) => v.circle_id)).toEqual([adaCircle.id]);
  });

  it("a circle's facilitator allows the agents of its members, then refuses them", async () => {
    const patch = async (answerTo: "allowed" | "refused") => {
      const current = await (await nodeRoute.GET(json("GET", `/api/nodes/${noorCircle.id}`), at(noorCircle.id))).json();
      const node = current.node ?? current;
      const res = await nodeRoute.PATCH(json("PATCH", `/api/nodes/${noorCircle.id}`, { metadata: agentReadersPatch(answerTo, noor.id, node.metadata) }), at(noorCircle.id));
      expect(res.status).toBe(200);
    };

    const held = await readersOf(noorCircle.id);
    expect(held.body).toMatchObject({ circle: { id: noorCircle.id }, agent_readers: null, when_unset: "facilitator" });
    expect(held.body.readers).toMatchObject([{ agent_id: sol.id, through_person_id: ada.id, sees: false, sits_in_circle: false }]);

    await patch("allowed");
    const open = await readersOf(noorCircle.id);
    expect(open.body.agent_readers).toMatchObject({ answer: "allowed", set_by: noor.id });
    expect(open.body.readers).toMatchObject([{ agent_id: sol.id, through_person_id: ada.id, sees: true }]);
    expect(open.body.seats).toMatchObject({ [sol.id]: { name: "Sol", being: "agent" }, [ada.id]: { name: "Ada" }, [noor.id]: { name: "Noor" } });
    expect((await kinshipOf(sol.id)).body.sees_circles.map((v: { circle_id: string }) => v.circle_id).sort()).toEqual([adaCircle.id, noorCircle.id].sort());

    await patch("refused");
    expect((await kinshipOf(sol.id)).body.sees_circles.map((v: { circle_id: string }) => v.circle_id)).toEqual([adaCircle.id]);
    expect((await readersOf(noorCircle.id)).body.readers).toMatchObject([{ agent_id: sol.id, sees: false }]);
  });

  it("the person leaves a circle and the agent no longer sees it", async () => {
    const left = await edgesRoute.DELETE(json("DELETE", `/api/edges?from=${encodeURIComponent(ada.id)}&to=${encodeURIComponent(adaCircle.id)}`));
    expect(left.status).toBe(200);
    expect((await kinshipOf(sol.id)).body.sees_circles).toEqual([]);
    expect((await readersOf(adaCircle.id)).body.readers).toEqual([]);
    expect((await readersOf(sol.id)).status).toBe(400);
  });
});

describe("/api/edges carries a governed relation's kinship type and context", () => {
  const pair = { from_id: luma.id, to_id: noor.id };

  it("keeps one relation for each kinship type beside the one relation without any", async () => {
    const plain = await postEdge({ ...pair, relationship_type: "works-beside", description: "by hand" });
    const origin = await postEdge({ ...pair, kinship_type: "BORN_FROM", description: "Luma came from Noor's work.", context: { stated_by: noor.id } });
    const service = await postEdge({ ...pair, kinship_type: "SERVES", relationship_type: "SERVES", context: { stated_by: noor.id, grants: [{ kind: "see_circles", scope: "facilitated" }] } });
    expect([plain.status, origin.status, service.status]).toEqual([201, 201, 201]);
    expect([plain.body.replaced, origin.body.replaced, service.body.replaced]).toEqual([false, false, false]);
    expect(origin.body.edge).toMatchObject({ relationship_type: "BORN_FROM", kinship_type: "BORN_FROM", context: { stated_by: noor.id } });

    const between = (await allEdges()).filter((e) => e.from_id === luma.id && e.to_id === noor.id);
    expect(between.map((e) => e.kinship_type ?? null).sort()).toEqual(["BORN_FROM", "SERVES", null].sort());
    expect(between.find((e) => e.kinship_type === "SERVES")?.context).toEqual({ stated_by: noor.id, grants: [{ kind: "see_circles", scope: "facilitated" }] });
  });

  it("writing a relation again replaces the one with the same kinship type and no other", async () => {
    const again = await postEdge({ ...pair, kinship_type: "BORN_FROM", description: "Luma came from the work Noor and Ada did." });
    expect(again.body.replaced).toBe(true);
    const between = (await allEdges()).filter((e) => e.from_id === luma.id && e.to_id === noor.id);
    expect(between).toHaveLength(3);
    expect(between.find((e) => e.kinship_type === "BORN_FROM")?.description).toBe("Luma came from the work Noor and Ada did.");
    expect(between.find((e) => !e.kinship_type)?.description).toBe("by hand");
  });

  it("PATCH and DELETE reach a governed relation by its kinship type, and the plain one without it", async () => {
    const q = `from=${encodeURIComponent(luma.id)}&to=${encodeURIComponent(noor.id)}`;
    const patched = await answer(await edgesRoute.PATCH(json("PATCH", `/api/edges?${q}&kinship_type=SERVES`, { context: { stated_by: noor.id } })));
    expect(patched.status, JSON.stringify(patched.body)).toBe(200);
    expect(patched.body.edge).toMatchObject({ kinship_type: "SERVES", context: { stated_by: noor.id } });

    const renamed = await answer(await edgesRoute.PATCH(json("PATCH", `/api/edges?${q}&kinship_type=SERVES`, { relationship_type: "owns" })));
    expect(renamed.status).toBe(400);

    const plainPatched = await answer(await edgesRoute.PATCH(json("PATCH", `/api/edges?${q}`, { strength: 0.9 })));
    expect(plainPatched.body.edge).toMatchObject({ relationship_type: "works-beside", strength: 0.9 });
    expect(plainPatched.body.edge.kinship_type).toBeUndefined();

    const removed = await answer(await edgesRoute.DELETE(json("DELETE", `/api/edges?${q}&kinship_type=SERVES`)));
    expect(removed.status).toBe(200);
    expect(removed.body.deleted).toEqual({ from_id: luma.id, to_id: noor.id, kinship_type: "SERVES" });
    const between = (await allEdges()).filter((e) => e.from_id === luma.id && e.to_id === noor.id);
    expect(between.map((e) => e.kinship_type ?? null).sort()).toEqual(["BORN_FROM", null].sort());

    const gone = await answer(await edgesRoute.DELETE(json("DELETE", `/api/edges?${q}&kinship_type=SERVES`)));
    expect(gone.status).toBe(404);
    expect(gone.body.error).toContain("SERVES");
  });

  it("refuses a name the registry does not govern, two names on one relation, and a context key it does not know", async () => {
    const unknown = await postEdge({ ...pair, kinship_type: "owned-by" });
    expect(unknown.status).toBe(400);
    const twoNames = await postEdge({ ...pair, kinship_type: "SERVES", relationship_type: "helps" });
    expect(twoNames.status).toBe(400);
    expect(twoNames.body.issues[0]).toContain("must be SERVES");
    const strangeContext = await postEdge({ ...pair, kinship_type: "SERVES", context: { owner: noor.id } });
    expect(strangeContext.status).toBe(400);
    const noName = await postEdge({ ...pair });
    expect(noName.status).toBe(400);
    expect(noName.body.issues).toContain("relationship_type: relationship_type is required");
  });

  it("a node still refuses to be removed while a governed relation holds it", async () => {
    const res = await nodeRoute.DELETE(json("DELETE", `/api/nodes/${luma.id}`), at(luma.id));
    expect(res.status).toBe(409);
  });
});
