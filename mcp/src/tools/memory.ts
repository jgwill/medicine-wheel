/**
 * Memory tools — asking the wheel's memory, whoever keeps it.
 *
 * With MW_API_URL set (an agent beside a wheel server), every tool calls the
 * server's /api/memory routes: only the server holds the provider's settings,
 * so the agent needs no Honcho address. Without it (the MCP served by the wheel
 * itself, or a local JSONL wheel), the same questions are answered in process
 * by @medicine-wheel/memory over this store, with Honcho as provider when
 * HONCHO_URL is set. Either way an answer draws only on the ceremonies the
 * scope reaches, and every source names the wheel record it rests on.
 * jgwill/medicine-wheel#149
 */

import type { Tool } from "../types.js";
import { store } from "../store.js";
import {
  createMemory,
  type CeremonyRef,
  type Memory,
  type MemoryRecord,
  type MemoryScope,
  type MemoryWheel,
} from "@medicine-wheel/memory";
import {
  WHEEL_PEER,
  createHonchoClient,
  honchoFromEnv,
  honchoIdFor,
  honchoMemoryProvider,
  memoryProjectionNode,
  type MemoryProjectionKind,
  type MemoryProjectionStatus,
} from "@medicine-wheel/honcho";
import { honchoTools } from "./honcho.js";

const serverUrl = () => process.env.MW_API_URL?.trim().replace(/\/+$/, "") || null;

async function server(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${serverUrl()}${path}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 400) };
  }
  if (!res.ok) return { status: "error", http_status: res.status, message: data?.error ?? `The wheel answered ${res.status} on ${path}`, ...(data?.kinds ? { kinds: data.kinds } : {}) };
  return data;
}

/** The episode a ceremony is bound to: its typed field, else the legacy JSON in research_context. */
function episodeOf(c: any): string | null {
  if (typeof c.episode_path === "string" && c.episode_path) return c.episode_path;
  if (typeof c.research_context !== "string") return null;
  try {
    const parsed = JSON.parse(c.research_context);
    const p = parsed?.episode_path ?? parsed?.episodePath;
    return typeof p === "string" && p ? p : null;
  } catch {
    return null;
  }
}

/** This MCP's store, as the memory reads it. Diary entries are reached through the provider only. */
function localWheel(): MemoryWheel {
  return {
    async ceremonies(): Promise<CeremonyRef[]> {
      return (await store.getAllCeremonies(Number.MAX_SAFE_INTEGER)).map((c: any) => ({
        id: c.id,
        subject_id: c.subject_id ?? null,
        circle_id: c.circle_id ?? null,
        episode_path: episodeOf(c),
        closes: c.closes ?? null,
        participants: c.participants ?? [],
      }));
    },
    async seats() {
      return (await store.getAllEdges())
        .filter((e: any) => e.relationship_type === "member_of")
        .map((e: any) => ({ person_id: e.from_id, circle_id: e.to_id }));
    },
    async records(reach): Promise<MemoryRecord[]> {
      const ceremonies = new Set(reach.ceremonies);
      const out: MemoryRecord[] = [];
      for (const c of (await store.getAllCeremonies(Number.MAX_SAFE_INTEGER)) as any[]) {
        if (!ceremonies.has(c.id)) continue;
        out.push({
          wheel_kind: "ceremony",
          wheel_id: c.id,
          ceremony_id: c.id,
          speaker: WHEEL_PEER,
          text: [`Ceremony: ${c.type} (${c.direction})`, c.participants?.length ? `Participants: ${c.participants.join(", ")}` : "", c.intentions?.length ? `Intentions: ${c.intentions.join("; ")}` : ""].filter(Boolean).join("\n"),
          at: c.timestamp,
        });
      }
      for (const b of (await store.getAllBeats(Number.MAX_SAFE_INTEGER)) as any[]) {
        const ceremony = (b.ceremonies ?? []).find((id: string) => ceremonies.has(id));
        if (!ceremony) continue;
        out.push({
          wheel_kind: "beat",
          wheel_id: b.id,
          ceremony_id: ceremony,
          ...(b.speaker ? { speaker: b.speaker } : {}),
          text: [`[${b.direction}] ${b.title}`, b.description, b.prose && b.prose !== b.description ? b.prose : "", (b.learnings ?? []).join("\n")].filter(Boolean).join("\n"),
          at: b.timestamp,
        });
      }
      return out;
    },
    async names(ids) {
      const out: Record<string, string> = {};
      for (const id of ids) {
        if (id === WHEEL_PEER) out[id] = "the wheel";
        else {
          const node: any = await store.getNode(id);
          if (node?.name) out[id] = node.name;
        }
      }
      return out;
    },
  };
}

let local: { key: string; memory: Memory } | null = null;
function localMemory(): Memory {
  const cfg = honchoFromEnv();
  const key = cfg ? `${cfg.baseUrl}|${cfg.workspace}` : "none";
  if (!local || local.key !== key) {
    local = { key, memory: createMemory({ wheel: localWheel(), providers: cfg ? [honchoMemoryProvider(createHonchoClient(cfg))] : [] }) };
  }
  return local.memory;
}

const scopeSchema = {
  type: "object",
  description:
    "What the answer may reach. Every field adds ceremonies and the reach is their union, less exclude_ceremonies. " +
    "A scope with no field reaches nothing: the whole wheel is never the default.",
  properties: {
    ceremonies: { type: ["string", "array"], items: { type: "string" }, description: "Ceremony ids" },
    subject_id: { type: ["string", "array"], items: { type: "string" }, description: "Ceremonies held about these nodes: a review, a PDE (pde:<uuid>)" },
    circle_id: { type: ["string", "array"], items: { type: "string" }, description: "Ceremonies held in these circles" },
    episode_path: { type: ["string", "array"], items: { type: "string" }, description: "Ceremonies bound to these chronicle episodes, and diary entries kept against them" },
    participant: { type: "string", description: "Ceremonies where this person (a wheel node id) was seated: participant, circle member or facilitator" },
    exclude_ceremonies: { type: "array", items: { type: "string" }, description: "Removed from the reach last, e.g. a PDE's own ceremony" },
  },
};

function readScope(value: unknown): MemoryScope | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as MemoryScope) : null;
}

const needScope = { status: "error", message: "Name a scope: { ceremonies?, subject_id?, circle_id?, episode_path?, participant?, exclude_ceremonies? }." };

export const memoryTools: Tool[] = [
  {
    name: "memory_status",
    description:
      "Which memory providers answer for this wheel, whether each can keep its reasoning inside a scope, and what the wheel " +
      "still owes the provider. The wheel's own records always answer, as the provider `wheel`.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      if (serverUrl()) return server("GET", "/api/memory");
      return { ...(await localMemory().status()), answered_by: "this MCP (no MW_API_URL)" };
    },
  },
  {
    name: "memory_ask",
    description:
      "Ask the wheel's memory a question within a scope. The answer draws only on the ceremonies the scope reaches " +
      "(turns, diary entries, ceremony records) and lists its sources as wheel records, each naming its provider. " +
      "mode: dialectic (a provider reasoned), search (closest records, no reasoning), matched (the wheel's own records, " +
      "no provider answered), empty (the scope reaches nothing). Reasoning takes seconds.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string" },
        scope: scopeSchema,
        peer: { type: "string", description: "Whose memory is asked. Default: the wheel, seated in every ceremony" },
        reasoning_level: { type: "string", enum: ["minimal", "low", "medium", "high", "max"], description: "Pick the lowest that answers. Default low" },
        limit: { type: "number", description: "Sources at most (default 12, up to 50)" },
      },
      required: ["question", "scope"],
    },
    handler: async (args) => {
      const scope = readScope(args?.scope);
      if (!scope) return needScope;
      if (typeof args?.question !== "string" || !args.question.trim()) return { status: "error", message: "Ask a question." };
      const input = { question: args.question.trim(), scope, peer: args.peer, reasoning_level: args.reasoning_level, limit: args.limit };
      if (serverUrl()) return server("POST", "/api/memory/ask", input);
      return localMemory().ask(input);
    },
  },
  {
    name: "memory_search",
    description: "The records within a scope closest to a query, with no reasoning: fast, and each source names the wheel record it is.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, scope: scopeSchema, limit: { type: "number" } },
      required: ["query", "scope"],
    },
    handler: async (args) => {
      const scope = readScope(args?.scope);
      if (!scope) return needScope;
      if (typeof args?.query !== "string" || !args.query.trim()) return { status: "error", message: "Give a query." };
      const input = { query: args.query.trim(), scope, limit: args.limit };
      if (serverUrl()) return server("POST", "/api/memory/search", input);
      return localMemory().search(input);
    },
  },
  {
    name: "memory_about",
    description:
      "What the memory holds about one person, within a scope: a reading of them (or an answer to a question about them) " +
      "and what they said or wrote there.",
    inputSchema: {
      type: "object",
      properties: { person: { type: "string", description: "The person's wheel node id" }, scope: scopeSchema, question: { type: "string" }, limit: { type: "number" } },
      required: ["person", "scope"],
    },
    handler: async (args) => {
      const scope = readScope(args?.scope);
      if (!scope) return needScope;
      if (typeof args?.person !== "string" || !args.person.trim()) return { status: "error", message: "Name the person (a wheel node id)." };
      const input = { person: args.person.trim(), scope, question: args.question, limit: args.limit };
      if (serverUrl()) return server("POST", "/api/memory/about", input);
      return localMemory().about(input);
    },
  },
  {
    name: "memory_conclude",
    description:
      "Return a conclusion the memory derived to the wheel as a knowledge node (metadata.kind memory_projection): " +
      "{ about, content, kind, status?, source_event_ids?, derived_by? }. Or confirm or reject one already there, " +
      "recording who did it and when: { conclusion_id, status, by }. A derived pattern is never stored as a bare fact.",
    inputSchema: {
      type: "object",
      properties: {
        about: { type: "string", description: "The wheel node id the conclusion is about" },
        content: { type: "string" },
        kind: { type: "string", enum: ["pattern", "summary", "open_question", "preference"] },
        status: { type: "string", enum: ["inferred", "confirmed", "rejected"] },
        source_event_ids: { type: "array", items: { type: "string" }, description: "The wheel records it rests on" },
        derived_by: { type: "string", description: "The model or agent that derived it" },
        conclusion_id: { type: "string", description: "To judge an existing conclusion instead of creating one" },
        by: { type: "string", description: "Who confirms or rejects it (with conclusion_id)" },
      },
    },
    handler: async (args) => {
      if (args?.conclusion_id) {
        const judgement = { status: args.status, by: args.by };
        if (serverUrl()) return server("PATCH", `/api/memory/conclusions/${encodeURIComponent(String(args.conclusion_id))}`, judgement);
        const node: any = await store.getNode(String(args.conclusion_id));
        if (!node || node.metadata?.kind !== "memory_projection") return { status: "error", message: `No conclusion ${args.conclusion_id} on this wheel.` };
        if (!["inferred", "confirmed", "rejected"].includes(args.status) || typeof args.by !== "string" || !args.by.trim()) {
          return { status: "error", message: "Give status (inferred | confirmed | rejected) and by." };
        }
        const updated = await (store as any).updateNode(node.id, { metadata: { ...node.metadata, status: args.status, judged_by: args.by.trim(), judged_at: new Date().toISOString() } });
        return { node: updated };
      }
      if (serverUrl()) return server("POST", "/api/memory/conclusions", args);
      if (typeof args?.about !== "string" || !args.about.trim() || typeof args?.content !== "string" || !args.content.trim()) {
        return { status: "error", message: "Give about (a wheel node id) and content." };
      }
      const node: any = memoryProjectionNode({
        source: "honcho",
        peerId: honchoIdFor(args.about.trim()),
        content: args.content.trim(),
        kind: args.kind as MemoryProjectionKind,
        status: (args.status ?? "inferred") as MemoryProjectionStatus,
        sourceEventIds: Array.isArray(args.source_event_ids) ? args.source_event_ids.map(String) : [],
        generatedAt: new Date().toISOString(),
        ...(args.derived_by ? { derivedBy: String(args.derived_by) } : {}),
      });
      node.metadata.about = args.about.trim();
      await store.createNode(node);
      return { node };
    },
  },
  {
    name: "memory_resend",
    description: "Send one wheel record (a beat, a ceremony or a diary entry) to the memory provider again: { kind, id }.",
    inputSchema: {
      type: "object",
      properties: { kind: { type: "string", enum: ["beat", "ceremony", "diary"] }, id: { type: "string" } },
      required: ["kind", "id"],
    },
    handler: async (args) => {
      if (serverUrl()) return server("POST", "/api/memory/resend", { kind: args?.kind, id: args?.id });
      if (args?.kind === "diary") return { status: "error", message: "A diary entry is resent by the wheel server (set MW_API_URL)." };
      const project = honchoTools.find((t) => t.name === "honcho_project")!;
      return project.handler(args?.kind === "beat" ? { beat_id: args.id } : { ceremony_id: args?.id });
    },
  },
];
