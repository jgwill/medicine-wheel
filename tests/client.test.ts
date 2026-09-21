import { describe, expect, it } from "vitest";
import { circlesHeldIn, closingOf, createMedicineWheelClient, episodeNodeId, episodeOf, MedicineWheelClientError, wheelUrlFromEnv } from "../src/client/src/index";

function fakeFetch(routes: Record<string, (init?: RequestInit) => { status: number; body: unknown }>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const key = `${(init?.method ?? "GET").toUpperCase()} ${new URL(url).pathname}${new URL(url).search}`;
    const match = Object.keys(routes).find((k) => k === key) ?? Object.keys(routes).find((k) => key.startsWith(k));
    if (!match) return new Response(JSON.stringify({ error: `no route ${key}` }), { status: 404 });
    const out = routes[match](init);
    return new Response(JSON.stringify(out.body), { status: out.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

describe("@medicine-wheel/client", () => {
  it("carries the paging honesty through a ceremony list", async () => {
    const wheel = createMedicineWheelClient({
      baseUrl: "http://wheel/",
      fetch: fakeFetch({
        "GET /api/ceremonies?episode_path=ep&limit=2": () => ({ status: 200, body: { ceremonies: [{ id: "a" }, { id: "b" }], count: 2, total: 410, matched: 4, truncated: true, provider: "jsonl" } }),
      }),
    });
    const page = await wheel.ceremonies.list({ episode_path: "ep", limit: 2 });
    expect(page.items.map((c) => c.id)).toEqual(["a", "b"]);
    expect(page).toMatchObject({ count: 2, total: 410, matched: 4, truncated: true, provider: "jsonl" });
    expect(wheel.baseUrl).toBe("http://wheel");
  });

  it("returns null on 404 for a read, and the minted record on create", async () => {
    const wheel = createMedicineWheelClient({
      baseUrl: "http://wheel",
      fetch: fakeFetch({
        "GET /api/ceremonies/ghost": () => ({ status: 404, body: { error: "no" } }),
        "POST /api/ceremonies": (init) => ({ status: 201, body: { success: true, ceremony: { id: "minted", ...JSON.parse(String(init?.body)) } } }),
        "PATCH /api/narrative/beats/b1": (init) => ({ status: 200, body: { id: "b1", ...JSON.parse(String(init?.body)) } }),
      }),
    });
    expect(await wheel.ceremonies.get("ghost")).toBeNull();
    const created = await wheel.ceremonies.create({ type: "opening", direction: "east", participants: [], medicines_used: [], intentions: ["x"] });
    expect(created.id).toBe("minted");
    const witnessed = await wheel.beats.witness("b1", { witnesses: ["m"] });
    expect(witnessed.witnesses).toEqual(["m"]);
  });

  it("removes a node, treats 404 as already gone, and surfaces the wheel's 409 while relations hold it", async () => {
    const wheel = createMedicineWheelClient({
      baseUrl: "http://wheel",
      fetch: fakeFetch({
        "DELETE /api/nodes/free": () => ({ status: 200, body: { success: true, deleted: "free" } }),
        "DELETE /api/nodes/gone": () => ({ status: 404, body: { error: "no" } }),
        "DELETE /api/nodes/held": () => ({ status: 409, body: { error: "held by 2 relations", relation_count: 2 } }),
      }),
    });
    await expect(wheel.nodes.remove("free")).resolves.toBeUndefined();
    await expect(wheel.nodes.remove("gone")).resolves.toBeUndefined();
    await expect(wheel.nodes.remove("held")).rejects.toMatchObject({ status: 409 });
  });

  it("fails fast with the wheel's status and body on refusal, 502 when unreachable, 503 with no URL", async () => {
    const refusing = createMedicineWheelClient({
      baseUrl: "http://wheel",
      fetch: fakeFetch({ "POST /api/ceremonies": () => ({ status: 400, body: { error: "Invalid episode_path" } }) }),
    });
    await expect(refusing.ceremonies.create({ type: "opening", direction: "east", participants: [], medicines_used: [], intentions: [] })).rejects.toMatchObject({ status: 400, body: expect.stringContaining("Invalid episode_path") });

    const down = createMedicineWheelClient({ baseUrl: "http://wheel", fetch: (async () => { throw new Error("ECONNREFUSED"); }) as typeof fetch });
    await expect(down.ceremonies.list()).rejects.toBeInstanceOf(MedicineWheelClientError);
    await expect(down.ceremonies.list()).rejects.toMatchObject({ status: 502 });
    expect((await down.health()).ok).toBe(false);

    expect(() => createMedicineWheelClient({ baseUrl: "  " })).toThrow(MedicineWheelClientError);
  });

  it("reads the wheel url the way Miadi tools do", () => {
    expect(wheelUrlFromEnv({ MIADI_CHRONICLE_MW_URL: "http://a/", MW_API_URL: "http://b" })).toBe("http://a");
    expect(wheelUrlFromEnv({ MW_API_URL: "http://b/" })).toBe("http://b");
    expect(wheelUrlFromEnv({})).toBeNull();
  });

  it("reads the episode binding and the closing, typed first, legacy second", () => {
    expect(episodeOf({ episode_path: "ep", episode_number: 3, source: "s" })).toEqual({ episode_path: "ep", episode_number: 3, source: "s" });
    expect(episodeOf({ research_context: JSON.stringify({ episode_path: "old", episode_number: 1, source: "gm" }) })).toEqual({ episode_path: "old", episode_number: 1, source: "gm" });
    expect(episodeOf({ research_context: "free text" })).toBeNull();
    expect(closingOf({ type: "closing", closes: "abc" })).toBe("abc");
    expect(closingOf({ type: "closing", research_context: "ceremony:1780507732459:f3u72" })).toBe("ceremony:1780507732459:f3u72");
    expect(closingOf({ type: "opening", closes: "abc" })).toBeNull();
  });

  it("reads what the wheel holds for an episode: its node, or null before registration, and every ceremony bound to it", async () => {
    const ep = "2026-09-17-episode-349-a-circle-can-enter";
    const wheel = createMedicineWheelClient({
      baseUrl: "http://wheel",
      fetch: fakeFetch({
        [`GET /api/nodes/${encodeURIComponent(`chronicle:${ep}`)}`]: () => ({ status: 200, body: { node: { id: `chronicle:${ep}`, name: "Episode 349" } } }),
        [`GET /api/ceremonies?episode_path=${ep}&limit=all`]: () => ({ status: 200, body: { ceremonies: [{ id: "c1" }, { id: "c2" }], count: 2, matched: 2, truncated: false } }),
        "GET /api/nodes/chronicle%3Aunregistered": () => ({ status: 404, body: { error: "Node not found" } }),
        "GET /api/ceremonies?episode_path=unregistered&limit=all": () => ({ status: 200, body: { ceremonies: [], count: 0, matched: 0, truncated: false } }),
      }),
    });
    const held = await wheel.episodes.get(`chronicle:${ep}`);
    expect(held).toMatchObject({ episode_path: ep, node_id: `chronicle:${ep}`, node: { name: "Episode 349" }, truncated: false });
    expect(held.ceremonies.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(await wheel.episodes.get("unregistered")).toEqual({ episode_path: "unregistered", node_id: "chronicle:unregistered", node: null, ceremonies: [], truncated: false });
  });

  it("names an episode's node id once, whichever form it is given in", () => {
    expect(episodeNodeId("2026-07-30-episode-303-x")).toBe("chronicle:2026-07-30-episode-303-x");
    expect(episodeNodeId(" chronicle:2026-07-30-episode-303-x ")).toBe("chronicle:2026-07-30-episode-303-x");
    expect(episodeNodeId("chronicle: 2026-07-30-episode-303-x")).toBe("chronicle:2026-07-30-episode-303-x");
    expect(episodeNodeId("chronicle:chronicle:2026-07-30-episode-303-x")).toBe("chronicle:2026-07-30-episode-303-x");
    expect(() => episodeNodeId("  ")).toThrow();
    expect(() => episodeNodeId("chronicle:")).toThrow();
  });

  it("refuses an empty episode instead of reading every ceremony on the wheel as its own", async () => {
    let asked = 0;
    const wheel = createMedicineWheelClient({ baseUrl: "http://wheel", fetch: (async () => { asked += 1; return new Response("{}", { status: 200 }); }) as typeof fetch });
    for (const ref of ["", "   ", "chronicle:", "chronicle: "]) {
      await expect(wheel.episodes.get(ref)).rejects.toMatchObject({ status: 400 });
    }
    expect(asked).toBe(0);
  });

  it("finds the circles ceremonies were held in, most recently active first, with closings folded into what they close", () => {
    const circles = circlesHeldIn([
      { id: "a1", type: "talking_circle", timestamp: "2026-09-18T10:00:00Z", circle_id: "circle:a" },
      { id: "a2", type: "opening", timestamp: "2026-09-18T11:00:00Z", circle_id: "circle:a" },
      { id: "x1", type: "closing", timestamp: "2026-09-18T12:00:00Z", circle_id: "circle:a", closes: "a1" },
      { id: "ceremony:1:b1", type: "talking_circle", timestamp: "2026-09-19T09:00:00Z", circle_id: "circle:b" },
      { id: "b2", type: "closing", timestamp: "2026-09-19T09:30:00Z", circle_id: "circle:b", research_context: "ceremony:1:b1" },
      { id: "free", type: "opening", timestamp: "2026-09-20T00:00:00Z" },
    ]);
    expect(circles).toEqual([
      { circle_id: "circle:b", ceremonies: 1, open: 0, last: "2026-09-19T09:30:00Z" },
      { circle_id: "circle:a", ceremonies: 2, open: 1, last: "2026-09-18T12:00:00Z" },
    ]);
  });
});
