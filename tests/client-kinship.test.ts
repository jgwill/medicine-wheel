/**
 * @medicine-wheel/client speaks agent kinship to the wheel
 * (rispecs/agent-kinship.spec.md): the four calls, the routes they reach and
 * what they answer when the wheel refuses or holds no such node.
 */
import { describe, expect, it } from "vitest";
import { createMedicineWheelClient } from "../src/client/src/index";

function recordingFetch(answers: Record<string, { status: number; body: unknown }>) {
  const seen: { key: string; body: unknown }[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const key = `${(init?.method ?? "GET").toUpperCase()} ${url.pathname}${url.search}`;
    seen.push({ key, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const out = answers[key] ?? { status: 404, body: { error: `no route ${key}` } };
    return new Response(JSON.stringify(out.body), { status: out.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { seen, fetchFn };
}

const kinship = { agent_id: "node:agent:wren", comes_from: [{ person_id: "node:human:ada", words: "I made Wren.", said_by: "node:human:ada", since: "2026-11-24T20:00:00.000Z" }], responsibility_held_by: [], serves: [], speaks_with: [] };

describe("@medicine-wheel/client kinship", () => {
  it("defines an agent with its relations in one call", async () => {
    const { seen, fetchFn } = recordingFetch({
      "POST /api/agents": { status: 201, body: { success: true, node: { id: "node:agent:wren", name: "Wren", type: "agent" }, edges: [{ from_id: "node:agent:wren", to_id: "node:human:ada", kinship_type: "BORN_FROM" }], kinship } },
    });
    const wheel = createMedicineWheelClient({ baseUrl: "http://wheel", fetch: fetchFn });
    const input = { agent: { name: "Wren", role: "companion_ai" }, comes_from: [{ person_id: "node:human:ada", words: "I made Wren.", said_by: "node:human:ada" }] };
    const made = await wheel.kinship.defineAgent(input);
    expect(made.node.id).toBe("node:agent:wren");
    expect(made.kinship.comes_from[0]).toMatchObject({ person_id: "node:human:ada", words: "I made Wren." });
    expect(made.edges).toHaveLength(1);
    expect(seen).toEqual([{ key: "POST /api/agents", body: input }]);
  });

  it("relates an existing agent, and carries the wheel's refusal with its status", async () => {
    const { seen, fetchFn } = recordingFetch({
      "POST /api/nodes/node%3Aagent%3Asol/kinship": { status: 200, body: { success: true, edges: [], kinship: { ...kinship, agent_id: "node:agent:sol" } } },
      "POST /api/nodes/node%3Ahuman%3Anoor/kinship": { status: 400, body: { error: "Invalid kinship — nothing was written.", issues: ["agent: node:human:noor is not an agent's seat on the wheel"] } },
    });
    const wheel = createMedicineWheelClient({ baseUrl: "http://wheel", fetch: fetchFn });
    const statement = { serves: [{ person_id: "node:human:ada", words: "Sol works with me.", said_by: "node:human:ada", grants: [{ kind: "see_circles", scope: "facilitated" }] }] };
    const related = await wheel.kinship.relate("node:agent:sol", statement);
    expect(related.kinship.agent_id).toBe("node:agent:sol");
    expect(seen[0]).toEqual({ key: "POST /api/nodes/node%3Aagent%3Asol/kinship", body: statement });
    await expect(wheel.kinship.relate("node:human:noor", statement)).rejects.toMatchObject({ status: 400 });
  });

  it("reads a person's kinship and a circle's agent readers; null when the wheel holds no such node", async () => {
    const reading = { person: { id: "node:agent:sol", name: "Sol", being: "agent" }, comes_from: [], responsibility_held_by: [], serves: [], speaks_with: [], sees_circles: [], gave_rise_to: [], holds_responsibility_for: [], served_by: [], seats: {}, circles: {}, provider: "jsonl" };
    const readers = { circle: { id: "circle:ada", name: "Ada's circle" }, agent_readers: null, when_unset: "facilitator", readers: [], seats: {}, provider: "jsonl" };
    const { fetchFn } = recordingFetch({
      "GET /api/nodes/node%3Aagent%3Asol/kinship": { status: 200, body: reading },
      "GET /api/nodes/circle%3Aada/readers": { status: 200, body: readers },
      "GET /api/nodes/circle%3Aada/kinship": { status: 400, body: { error: "circle:ada is not a person on the wheel." } },
    });
    const wheel = createMedicineWheelClient({ baseUrl: "http://wheel", fetch: fetchFn });
    expect(await wheel.kinship.of("node:agent:sol")).toEqual(reading);
    expect(await wheel.kinship.readersOf("circle:ada")).toEqual(readers);
    expect(await wheel.kinship.of("node:agent:nobody")).toBeNull();
    expect(await wheel.kinship.readersOf("circle:nowhere")).toBeNull();
    await expect(wheel.kinship.of("circle:ada")).rejects.toMatchObject({ status: 400 });
  });

  it("an edge can name its kinship type and context, and is removed by that name", async () => {
    const edge = { from_id: "a", to_id: "p", relationship_type: "SERVES", kinship_type: "SERVES", context: { stated_by: "p" } };
    const { seen, fetchFn } = recordingFetch({
      "POST /api/edges": { status: 201, body: { success: true, edge } },
      "DELETE /api/edges?from=a&to=p&kinship_type=SERVES": { status: 200, body: { success: true } },
      "DELETE /api/edges?from=a&to=p": { status: 200, body: { success: true } },
    });
    const wheel = createMedicineWheelClient({ baseUrl: "http://wheel", fetch: fetchFn });
    expect(await wheel.edges.create(edge)).toEqual(edge);
    await wheel.edges.remove("a", "p", "SERVES");
    await wheel.edges.remove("a", "p");
    expect(seen.map((s) => s.key)).toEqual(["POST /api/edges", "DELETE /api/edges?from=a&to=p&kinship_type=SERVES", "DELETE /api/edges?from=a&to=p"]);
    expect(seen[0].body).toEqual(edge);
  });
});
