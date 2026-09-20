import { describe, expect, it } from "vitest";
import {
  HonchoClientError,
  WHEEL_PEER,
  createHonchoClient,
  honchoFromEnv,
  honchoIdFor,
  memoryProjectionNode,
  project,
  projectBeat,
  projectCeremony,
  sessionIdForBeat,
} from "../src/honcho/src/index";
import type { CeremonyLog, NarrativeBeat } from "@medicine-wheel/ontology-core";

type Hit = { method: string; path: string; body?: any };

function fakeFetch(routes: Record<string, (init?: RequestInit) => { status: number; body: unknown }>, hits: Hit[] = []): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const u = new URL(url);
    const method = (init?.method ?? "GET").toUpperCase();
    hits.push({ method, path: u.pathname + u.search, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const key = `${method} ${u.pathname}`;
    const match = Object.keys(routes).find((k) => k === key) ?? Object.keys(routes).find((k) => key.startsWith(k));
    if (!match) return new Response(JSON.stringify({ detail: `no route ${key}` }), { status: 404 });
    const out = routes[match](init);
    return new Response(JSON.stringify(out.body), { status: out.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

const beat: NarrativeBeat = {
  id: "beat:1726000000:abc",
  direction: "east",
  title: "Guillaume speaks",
  description: "A daily creative practice is hard to hold.",
  ceremonies: ["ceremony:1725999999:tc1"],
  learnings: ["small steps persist"],
  timestamp: "2026-09-18T12:00:00.000Z",
  act: 1,
  relations_honored: [],
  speaker: "node:human:1725000000:gui",
  witnesses: ["Éloïse Tremblay"],
};

const ceremony: CeremonyLog = {
  id: "ceremony:1725999999:tc1",
  type: "talking_circle",
  direction: "east",
  participants: ["node:human:1725000000:gui", "Éloïse Tremblay"],
  medicines_used: ["cedar"],
  intentions: ["hold the practice"],
  timestamp: "2026-09-18T11:00:00.000Z",
  episode_path: "2026-09-18-episode-350-practice",
};

describe("honchoIdFor", () => {
  it("maps wheel ids and names onto Honcho's resource pattern, deterministically", () => {
    expect(honchoIdFor("node:human:1725000000:gui")).toBe("node-human-1725000000-gui");
    expect(honchoIdFor("Éloïse Tremblay")).toBe("Eloise-Tremblay");
    expect(honchoIdFor("::")).toBe("unnamed");
    expect(honchoIdFor("a".repeat(600))).toHaveLength(512);
    expect(honchoIdFor("node:human:1725000000:gui")).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});

describe("honchoFromEnv", () => {
  it("is null without a URL, and defaults the workspace", () => {
    expect(honchoFromEnv({})).toBeNull();
    expect(honchoFromEnv({ HONCHO_URL: "http://h:8133/" })).toEqual({ baseUrl: "http://h:8133/", workspace: "medicine-wheel", apiKey: undefined });
    expect(honchoFromEnv({ HONCHO_URL: "http://h", HONCHO_WORKSPACE_ID: "miadi-dev", HONCHO_API_KEY: "k" })).toMatchObject({ workspace: "miadi-dev", apiKey: "k" });
  });
});

describe("projection", () => {
  it("a beat becomes one message from its speaker in its ceremony's session, witnesses seated", () => {
    const p = projectBeat(beat);
    expect(p.session_id).toBe("ceremony-1725999999-tc1");
    expect(Object.keys(p.peers).sort()).toEqual(["Eloise-Tremblay", "node-human-1725000000-gui"]);
    expect(p.peer_metadata["node-human-1725000000-gui"]).toEqual({ wheel_id: "node:human:1725000000:gui" });
    expect(p.messages).toHaveLength(1);
    expect(p.messages[0]).toMatchObject({ peer_id: "node-human-1725000000-gui", created_at: beat.timestamp });
    expect(p.messages[0].content).toContain("[east] Guillaume speaks");
    expect(p.messages[0].content).toContain("Learnings: small steps persist");
    expect(p.messages[0].metadata).toMatchObject({ wheel_kind: "beat", wheel_id: beat.id, ceremonies: [ceremony.id] });
  });

  it("a beat with no speaker is spoken by the wheel; no ceremony falls back to cycle, then the wheel", () => {
    const orphan = { ...beat, speaker: undefined, witnesses: undefined, ceremonies: [] };
    expect(projectBeat(orphan).messages[0].peer_id).toBe(WHEEL_PEER);
    expect(sessionIdForBeat({ ceremonies: [], cycle_id: "cycle:2026:1" })).toBe("cycle-2026-1");
    expect(sessionIdForBeat({ ceremonies: [] })).toBe(WHEEL_PEER);
  });

  it("a ceremony lands in the same session as its beats, with every participant seated", () => {
    const p = projectCeremony(ceremony);
    expect(p.session_id).toBe(projectBeat(beat).session_id);
    expect(Object.keys(p.peers).sort()).toEqual(["Eloise-Tremblay", WHEEL_PEER, "node-human-1725000000-gui"].sort());
    expect(p.session_metadata).toMatchObject({ wheel_kind: "ceremony", episode_path: ceremony.episode_path });
    expect(p.messages[0].content).toContain("Ceremony: talking_circle (east)");
    expect(p.messages[0].content).toContain("Intentions: hold the practice");
  });
});

describe("client + project", () => {
  it("ensures workspace, peers and session, seats newcomers, then appends the messages", async () => {
    const hits: Hit[] = [];
    const honcho = createHonchoClient({
      baseUrl: "http://honcho/",
      workspace: "medicine-wheel",
      fetch: fakeFetch({
        "POST /v3/workspaces": () => ({ status: 200, body: { id: "medicine-wheel" } }),
        "POST /v3/workspaces/medicine-wheel/peers": (init) => ({ status: 201, body: JSON.parse(String(init?.body)) }),
        "POST /v3/workspaces/medicine-wheel/sessions": (init) => ({ status: 201, body: JSON.parse(String(init?.body)) }),
        "POST /v3/workspaces/medicine-wheel/sessions/ceremony-1725999999-tc1/peers": () => ({ status: 200, body: { id: "ceremony-1725999999-tc1" } }),
        "POST /v3/workspaces/medicine-wheel/sessions/ceremony-1725999999-tc1/messages": (init) => ({ status: 201, body: JSON.parse(String(init?.body)).messages.map((m: any, i: number) => ({ id: `m${i}`, session_id: "s", ...m })) }),
      }, hits),
    });
    const out = await project(honcho, projectBeat(beat));
    expect(out).toEqual({ session_id: "ceremony-1725999999-tc1", peers: ["node-human-1725000000-gui", "Eloise-Tremblay"], messages: 1 });
    expect(hits.map((h) => `${h.method} ${h.path}`)).toEqual([
      "POST /v3/workspaces",
      "POST /v3/workspaces/medicine-wheel/peers",
      "POST /v3/workspaces/medicine-wheel/peers",
      "POST /v3/workspaces/medicine-wheel/sessions",
      "POST /v3/workspaces/medicine-wheel/sessions/ceremony-1725999999-tc1/peers",
      "POST /v3/workspaces/medicine-wheel/sessions/ceremony-1725999999-tc1/messages",
    ]);
    expect(hits[3].body).toMatchObject({ id: "ceremony-1725999999-tc1", peers: { "node-human-1725000000-gui": { observe_me: true, observe_others: false } } });
  });

  it("chunks messages by Honcho's batch limit of 100, in order", async () => {
    const batches: number[] = [];
    const honcho = createHonchoClient({
      baseUrl: "http://honcho", workspace: "w",
      fetch: fakeFetch({ "POST /v3/workspaces/w/sessions/s/messages": (init) => { const ms = JSON.parse(String(init?.body)).messages; batches.push(ms.length); return { status: 201, body: ms.map((m: any) => ({ id: m.content, ...m })) }; } }),
    });
    const stored = await honcho.sessions.addMessages("s", Array.from({ length: 205 }, (_, i) => ({ content: String(i), peer_id: "p" })));
    expect(batches).toEqual([100, 100, 5]);
    expect(stored.map((m) => m.id).slice(0, 3)).toEqual(["0", "1", "2"]);
  });

  it("recall reads the representation, chat returns the dialectic's content, and a bearer travels when configured", async () => {
    const hits: Hit[] = [];
    let auth: string | null = null;
    const honcho = createHonchoClient({
      baseUrl: "http://honcho", workspace: "w", apiKey: "hch-x",
      fetch: (async (input: any, init?: RequestInit) => {
        auth = (init?.headers as Record<string, string>).authorization;
        return fakeFetch({
          "POST /v3/workspaces/w/peers/gui/representation": () => ({ status: 200, body: { representation: "values music; sensitive to workflow complexity" } }),
          "POST /v3/workspaces/w/peers/gui/chat": () => ({ status: 200, body: { content: "Keep it small." } }),
          "GET /v3/workspaces/w/sessions/s/context": () => ({ status: 200, body: { id: "s", messages: [], peer_representation: "r" } }),
        }, hits)(input, init);
      }) as typeof fetch,
    });
    expect(await honcho.peers.representation("gui")).toContain("workflow complexity");
    expect(await honcho.peers.chat("gui", "what persists?", { reasoning_level: "minimal" })).toBe("Keep it small.");
    expect(hits[1].body).toMatchObject({ query: "what persists?", stream: false, reasoning_level: "minimal" });
    expect((await honcho.sessions.context("s", { peer_target: "gui" })).peer_representation).toBe("r");
    expect(hits[2].path).toBe("/v3/workspaces/w/sessions/s/context?peer_target=gui");
    expect(auth).toBe("Bearer hch-x");
  });

  it("fails fast with the status and body when Honcho refuses, and 502 when unreachable", async () => {
    const refusing = createHonchoClient({ baseUrl: "http://honcho", workspace: "w", fetch: fakeFetch({ "POST /v3/workspaces/w/peers": () => ({ status: 422, body: { detail: "String should match pattern" } }) }) });
    await expect(refusing.peers.ensure("node:bad")).rejects.toMatchObject({ name: "HonchoClientError", status: 422, body: expect.stringContaining("pattern") });
    const dead = createHonchoClient({ baseUrl: "http://honcho", workspace: "w", fetch: (async () => { throw new Error("ECONNREFUSED"); }) as typeof fetch });
    await expect(dead.health()).rejects.toBeInstanceOf(HonchoClientError);
    await expect(dead.health()).rejects.toMatchObject({ status: 502 });
  });
});

describe("memoryProjectionNode", () => {
  it("returns to the wheel as a knowledge node with kind memory_projection and its provenance", () => {
    const node = memoryProjectionNode({
      source: "honcho", sourceEventIds: [beat.id], peerId: "node-human-1725000000-gui", kind: "pattern",
      content: "Small, low-friction creative tasks persist.\nElaborate setups do not.", status: "inferred",
      generatedAt: "2026-09-19T00:00:00.000Z", derivedBy: "dialectic",
    });
    expect(node.type).toBe("knowledge");
    expect(node.id).toBe("node:knowledge:memory_projection:node-human-1725000000-gui:1789776000000");
    expect(node.name).toBe("pattern: Small, low-friction creative tasks persist.");
    expect(node.metadata).toMatchObject({ kind: "memory_projection", status: "inferred", source_event_ids: [beat.id], peer_id: "node-human-1725000000-gui", derived_by: "dialectic" });
  });
});
