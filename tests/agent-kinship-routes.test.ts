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

    const unauthorized = await relate(luma.id, { speaks_with: [{ agent_id: sol.id, state: "active", state_set_by: ada.id }] });
    expect(unauthorized.status).toBe(400);
    expect(unauthorized.body.issues[0]).toContain("authorized_by");
    const unnamed = await relate(luma.id, { speaks_with: [{ agent_id: sol.id, state: "active", authorized_by: ada.id }] });
    expect(unnamed.status).toBe(400);
    expect(unnamed.body.issues[0]).toContain("state_set_by");

    const active = await relate(luma.id, {
      speaks_with: [{ agent_id: sol.id, state: "active", authorized_by: ada.id, state_set_by: ada.id, valid_when: "about the notes of an episode both sit in", forbidden_when: "about a person who is not in the room" }],
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

    const paused = await relate(sol.id, { speaks_with: [{ agent_id: luma.id, state: "paused", state_set_by: noor.id }] });
    expect(paused.body.kinship.speaks_with).toMatchObject([{ state: "paused", state_set_by: noor.id, authorized_by: ada.id, said_by: sol.id }]);
    const wrong = await relate(sol.id, { speaks_with: [{ agent_id: luma.id, state: "proposed", state_set_by: noor.id }] });
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

// The four agent-kinship types are written through the kinship door (RV3 below).
// Every other governed kinship type is written here, as these two are.
describe("/api/edges carries a governed relation's kinship type and context", () => {
  const pair = { from_id: luma.id, to_id: noor.id };

  it("keeps one relation for each kinship type beside the one relation without any", async () => {
    const plain = await postEdge({ ...pair, relationship_type: "works-beside", description: "by hand" });
    const origin = await postEdge({ ...pair, kinship_type: "tends-to", description: "Luma looks after Noor's notes.", context: { stated_by: noor.id } });
    const service = await postEdge({ ...pair, kinship_type: "part-of", relationship_type: "part-of", context: { stated_by: noor.id, grants: [{ kind: "see_circles", scope: "facilitated" }] } });
    expect([plain.status, origin.status, service.status]).toEqual([201, 201, 201]);
    expect([plain.body.replaced, origin.body.replaced, service.body.replaced]).toEqual([false, false, false]);
    expect(origin.body.edge).toMatchObject({ relationship_type: "tends-to", kinship_type: "tends-to", context: { stated_by: noor.id } });

    const between = (await allEdges()).filter((e) => e.from_id === luma.id && e.to_id === noor.id);
    expect(between.map((e) => e.kinship_type ?? null).sort()).toEqual(["tends-to", "part-of", null].sort());
    expect(between.find((e) => e.kinship_type === "part-of")?.context).toEqual({ stated_by: noor.id, grants: [{ kind: "see_circles", scope: "facilitated" }] });
  });

  it("writing a relation again replaces the one with the same kinship type and no other", async () => {
    const again = await postEdge({ ...pair, kinship_type: "tends-to", description: "Luma looks after the notes of Noor and Ada." });
    expect(again.body.replaced).toBe(true);
    const between = (await allEdges()).filter((e) => e.from_id === luma.id && e.to_id === noor.id);
    expect(between).toHaveLength(3);
    expect(between.find((e) => e.kinship_type === "tends-to")?.description).toBe("Luma looks after the notes of Noor and Ada.");
    expect(between.find((e) => !e.kinship_type)?.description).toBe("by hand");
  });

  it("PATCH and DELETE reach a governed relation by its kinship type, and the plain one without it", async () => {
    const q = `from=${encodeURIComponent(luma.id)}&to=${encodeURIComponent(noor.id)}`;
    const patched = await answer(await edgesRoute.PATCH(json("PATCH", `/api/edges?${q}&kinship_type=part-of`, { context: { stated_by: noor.id } })));
    expect(patched.status, JSON.stringify(patched.body)).toBe(200);
    expect(patched.body.edge).toMatchObject({ kinship_type: "part-of", context: { stated_by: noor.id } });

    const renamed = await answer(await edgesRoute.PATCH(json("PATCH", `/api/edges?${q}&kinship_type=part-of`, { relationship_type: "owns" })));
    expect(renamed.status).toBe(400);

    const plainPatched = await answer(await edgesRoute.PATCH(json("PATCH", `/api/edges?${q}`, { strength: 0.9 })));
    expect(plainPatched.body.edge).toMatchObject({ relationship_type: "works-beside", strength: 0.9 });
    expect(plainPatched.body.edge.kinship_type).toBeUndefined();

    const removed = await answer(await edgesRoute.DELETE(json("DELETE", `/api/edges?${q}&kinship_type=part-of`)));
    expect(removed.status).toBe(200);
    expect(removed.body.deleted).toEqual({ from_id: luma.id, to_id: noor.id, kinship_type: "part-of" });
    const between = (await allEdges()).filter((e) => e.from_id === luma.id && e.to_id === noor.id);
    expect(between.map((e) => e.kinship_type ?? null).sort()).toEqual(["tends-to", null].sort());

    const gone = await answer(await edgesRoute.DELETE(json("DELETE", `/api/edges?${q}&kinship_type=part-of`)));
    expect(gone.status).toBe(404);
    expect(gone.body.error).toContain("part-of");
  });

  it("refuses a name the registry does not govern, two names on one relation, and a context key it does not know", async () => {
    const unknown = await postEdge({ ...pair, kinship_type: "owned-by" });
    expect(unknown.status).toBe(400);
    const twoNames = await postEdge({ ...pair, kinship_type: "part-of", relationship_type: "helps" });
    expect(twoNames.status).toBe(400);
    expect(twoNames.body.issues[0]).toContain("must be part-of");
    const strangeContext = await postEdge({ ...pair, kinship_type: "part-of", context: { owner: noor.id } });
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

// ── What the independent review of 2026-11-24 found (RV codes), each pinned here ──

describe("RV3: the generic edge door leaves agent kinship to the kinship door", () => {
  const rvA = personNode({ id: "node:agent:rv3-a", name: "Rill", role: "companion_ai", agent: true });
  const rvB = personNode({ id: "node:agent:rv3-b", name: "Vale", role: "companion_ai", agent: true });
  const q = (from: string, to: string, kinship: string) => `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&kinship_type=${encodeURIComponent(kinship)}`;
  const patchEdge = async (query: string, body: unknown) => answer(await edgesRoute.PATCH(json("PATCH", `/api/edges?${query}`, body)));
  const dialogue = async () => (await allEdges()).filter((e) => e.kinship_type === "speaks-with" && [e.from_id, e.to_id].includes(rvA.id));

  it("refuses to create one of the four, and names the kinship door", async () => {
    for (const node of [rvA, rvB]) expect((await postNode(node)).status).toBe(201);

    // The review's probe: a speaks-with posted higher id first.
    const backwards = await postEdge({ from_id: rvB.id, to_id: rvA.id, kinship_type: "speaks-with", context: { state: "active" } });
    expect(backwards.status).toBe(400);
    expect(JSON.stringify(backwards.body)).toContain("/kinship");
    // The review's probe: a third person gives what is not theirs to give.
    const thirdPerson = await postEdge({ from_id: rvA.id, to_id: ada.id, kinship_type: "SERVES", context: { stated_by: noor.id, grants: [{ kind: "see_circles", scope: "sits_in" }] } });
    expect(thirdPerson.status).toBe(400);
    for (const kinship of ["BORN_FROM", "holds-responsibility-for"]) {
      expect((await postEdge({ from_id: rvA.id, to_id: ada.id, kinship_type: kinship })).status).toBe(400);
    }
    expect((await allEdges()).filter((e) => [e.from_id, e.to_id].includes(rvA.id))).toEqual([]);
  });

  it("refuses to change the context or the words of one that exists, and lets a ceremony update through", async () => {
    const proposed = await relate(rvA.id, { speaks_with: [{ agent_id: rvB.id, words: "About the tide tables.", said_by: rvA.id }] });
    expect(proposed.status, JSON.stringify(proposed.body)).toBe(200);
    const active = await relate(rvA.id, { speaks_with: [{ agent_id: rvB.id, state: "active", authorized_by: ada.id, state_set_by: ada.id }] });
    expect(active.status, JSON.stringify(active.body)).toBe(200);
    const [stored] = await dialogue();
    const query = q(stored.from_id, stored.to_id, "speaks-with");

    // The review's probe: a PATCH of context moved the dialogue back to proposed and dropped stated_by.
    const moved = await patchEdge(query, { context: { state: "proposed" } });
    expect(moved.status).toBe(400);
    expect(JSON.stringify(moved.body)).toContain("/kinship");
    const reworded = await patchEdge(query, { description: "About anything at all." });
    expect(reworded.status).toBe(400);
    const reposted = await postEdge({ from_id: stored.from_id, to_id: stored.to_id, kinship_type: "speaks-with", context: { ...stored.context, state: "ended" } });
    expect(reposted.status).toBe(400);
    expect((await dialogue())[0]).toMatchObject({ description: "About the tide tables.", context: stored.context });

    // What a ceremony update sends: the same edge again, honoured. It passes and the context stays.
    const honoured = await postEdge({ ...stored, ceremony_honored: true });
    expect(honoured.status, JSON.stringify(honoured.body)).toBe(201);
    expect(honoured.body.replaced).toBe(true);
    // The same without the context: nothing is changed, so nothing is lost.
    const bare = await postEdge({ from_id: stored.from_id, to_id: stored.to_id, kinship_type: "speaks-with", strength: 0.8, ceremony_honored: true });
    expect(bare.status, JSON.stringify(bare.body)).toBe(201);
    const same = await patchEdge(query, { context: stored.context, strength: 0.7 });
    expect(same.status, JSON.stringify(same.body)).toBe(200);
    expect((await dialogue())[0]).toMatchObject({ description: "About the tide tables.", context: stored.context, ceremony_honored: true, strength: 0.7 });
    expect((await kinshipOf(rvA.id)).body.speaks_with).toMatchObject([{ agent_id: rvB.id, state: "active", said_by: rvA.id, authorized_by: ada.id }]);
  });

  it("still releases one, and still weaves every other governed kinship type", async () => {
    const [stored] = await dialogue();
    const released = await answer(await edgesRoute.DELETE(json("DELETE", `/api/edges?${q(stored.from_id, stored.to_id, "speaks-with")}`)));
    expect(released.status).toBe(200);
    expect(await dialogue()).toEqual([]);

    const tended = await postEdge({ from_id: rvA.id, to_id: rvB.id, kinship_type: "tends-to", context: { authorized_by: ada.id } });
    expect(tended.status, JSON.stringify(tended.body)).toBe(201);
    const patched = await patchEdge(q(rvA.id, rvB.id, "tends-to"), { context: { authorized_by: noor.id } });
    expect(patched.body.edge).toMatchObject({ kinship_type: "tends-to", context: { authorized_by: noor.id } });
  });
});

describe("RV5: an existing governed edge keeps the date it was first written", () => {
  it("through a re-post on the generic door", async () => {
    const pair = { from_id: sol.id, to_id: luma.id, kinship_type: "tends-to" };
    const first = await postEdge({ ...pair, description: "first" });
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 15));
    const again = await postEdge({ ...pair, description: "second", ceremony_honored: true });
    expect(again.body.replaced).toBe(true);
    expect(again.body.edge.created_at).toBe(first.body.edge.created_at);
    const stored = (await allEdges()).find((e) => e.from_id === sol.id && e.to_id === luma.id && e.kinship_type === "tends-to");
    expect(stored).toMatchObject({ description: "second", ceremony_honored: true, created_at: first.body.edge.created_at });
  });
});

describe("RV4: saying a relation again through the kinship door keeps what a ceremony wrote", () => {
  it("keeps the ceremony, the strength and the obligations of an origin relation", async () => {
    const provider = await (await import("../src/storage-provider/src/index")).createProvider();
    const since = (await allEdges()).find((e) => e.from_id === sol.id && e.to_id === ada.id && e.kinship_type === "BORN_FROM")?.created_at;
    await provider.updateEdgeCeremony(sol.id, ada.id, "ceremony:rv4");
    const tuned = await answer(await edgesRoute.PATCH(json("PATCH", `/api/edges?from=${encodeURIComponent(sol.id)}&to=${encodeURIComponent(ada.id)}&kinship_type=BORN_FROM`, { strength: 0.6, obligations: ["remember where Sol comes from"] })));
    expect(tuned.status, JSON.stringify(tuned.body)).toBe(200);

    const again = await relate(sol.id, { comes_from: [{ person_id: ada.id, words: "Sol came out of two winters of my work.", said_by: ada.id }] });
    expect(again.status, JSON.stringify(again.body)).toBe(200);
    const stored = (await allEdges()).find((e) => e.from_id === sol.id && e.to_id === ada.id && e.kinship_type === "BORN_FROM");
    expect(stored).toMatchObject({
      description: "Sol came out of two winters of my work.",
      ceremony_honored: true,
      last_ceremony: "ceremony:rv4",
      strength: 0.6,
      obligations: ["remember where Sol comes from"],
      created_at: since,
    });
  });
});

describe("RV7: a POST /api/agents that fails leaves the event log balanced", () => {
  it("records a removal for each relation and for the node it takes back", async () => {
    const { JsonlProvider } = await import("../src/storage-provider/src/index");
    const real = JsonlProvider.prototype.createEdge;
    let calls = 0;
    const spy = vi.spyOn(JsonlProvider.prototype, "createEdge").mockImplementation(function (this: InstanceType<typeof JsonlProvider>, edge) {
      calls += 1;
      if (calls === 2) return Promise.reject(new Error("the disk is full"));
      return real.call(this, edge);
    });
    let failed;
    try {
      failed = await defineAgent({
        agent: { id: "node:agent:rv7", name: "Brae", role: "companion_ai" },
        comes_from: [{ person_id: ada.id, words: "I made Brae.", said_by: ada.id }],
        responsibility_held_by: [{ person_id: ada.id, words: "I answer for Brae.", said_by: ada.id }],
      });
    } finally {
      spy.mockRestore();
    }
    expect(failed.status).toBe(500);
    expect(failed.body.rolled_back).toBe(true);
    expect((await nodeRoute.GET(json("GET", "/api/nodes/node:agent:rv7"), at("node:agent:rv7"))).status).toBe(404);
    expect((await allEdges()).filter((e) => [e.from_id, e.to_id].includes("node:agent:rv7"))).toEqual([]);

    const events = fs.readFileSync(path.join(tempDir, "events.jsonl"), "utf-8").split("\n").filter(Boolean).map((line) => JSON.parse(line))
      .filter((event) => JSON.stringify(event).includes("node:agent:rv7"))
      .map((event) => event.event_type.replace(/^medicine-wheel\./, ""));
    const count = (name: string) => events.filter((e) => e === name).length;
    expect(count("relation.made")).toBe(1);
    expect(count("relation.removed")).toBe(count("relation.made"));
    expect(events.filter((e) => e.startsWith("node.")).length % 2).toBe(0);
    expect(events[events.length - 1]).toMatch(/removed$/);
  });
});
