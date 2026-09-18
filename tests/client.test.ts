import { describe, expect, it } from "vitest";
import { createMedicineWheelClient, MedicineWheelClientError, wheelUrlFromEnv } from "../src/client/src/index";

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
});
