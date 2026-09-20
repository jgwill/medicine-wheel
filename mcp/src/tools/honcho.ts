/**
 * Honcho tools — the wheel's projection into memory that reasons.
 *
 * The wheel is canonical; Honcho holds what the history has come to mean about
 * each peer. Three moves, mirroring `@medicine-wheel/honcho`: project a beat or
 * ceremony (wheel → Honcho), recall a peer (Honcho → agent), project a derived
 * conclusion back (Honcho → wheel, as a `knowledge` node with
 * `metadata.kind: "memory_projection"`).
 *
 * Configured by HONCHO_URL, HONCHO_WORKSPACE_ID, HONCHO_API_KEY. Without a URL
 * every tool answers with status 'unconfigured' and names the variable, rather
 * than reporting a projection that never left the process.
 */

import type { Tool } from "../types.js";
import { store } from "../store.js";
import {
  createHonchoClient,
  honchoFromEnv,
  honchoIdFor,
  memoryProjectionNode,
  project,
  projectBeat,
  projectCeremony,
  type HonchoClient,
  type MemoryProjection,
} from "@medicine-wheel/honcho";

function client(): HonchoClient | { status: "unconfigured"; message: string } {
  const cfg = honchoFromEnv();
  if (!cfg) {
    return {
      status: "unconfigured",
      message: "HONCHO_URL is not set. Point it at a Honcho /v3 API (http://localhost:8133 on eury, https://honcho.<tailnet>.ts.net on the tailnet); HONCHO_WORKSPACE_ID defaults to 'medicine-wheel'.",
    };
  }
  return createHonchoClient(cfg);
}

const isClient = (c: ReturnType<typeof client>): c is HonchoClient => !("status" in c);

function failure(what: string, error: unknown) {
  const err = error as { message?: string; status?: number; body?: string };
  return {
    status: "error",
    message: `${what}: ${err?.message ?? String(error)}`,
    ...(err?.status !== undefined ? { http_status: err.status } : {}),
    ...(err?.body ? { body: err.body } : {}),
  };
}

export const honchoTools: Tool[] = [
  {
    name: "honcho_status",
    description:
      "Is Honcho reachable, and where. Reports the configured URL and workspace and Honcho's /health. " +
      "Honcho is the wheel's memory that reasons: the wheel keeps what was recorded; Honcho keeps what " +
      "it has come to mean about each peer, revised as new beats and ceremonies are projected.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const c = client();
      if (!isClient(c)) return c;
      try {
        return { status: "ok", url: c.baseUrl, workspace: c.workspace, health: await c.health() };
      } catch (error) {
        return { ...failure("honcho unreachable", error), url: c.baseUrl, workspace: c.workspace };
      }
    },
  },
  {
    name: "honcho_project",
    description:
      "Project a wheel record into Honcho: a beat becomes one message from its speaker (witnesses seated) " +
      "in the session of its ceremony; a ceremony log becomes one message from the wheel in its own session, " +
      "every participant seated. Peers, session and workspace are created if missing; ids are mapped with " +
      "honchoIdFor and the wheel id travels as metadata.wheel_id. Nothing is filtered: what you name is projected.",
    inputSchema: {
      type: "object",
      properties: {
        beat_id: { type: "string", description: "A beat id on this wheel" },
        ceremony_id: { type: "string", description: "A ceremony id on this wheel" },
      },
    },
    handler: async (args) => {
      const c = client();
      if (!isClient(c)) return c;
      const { beat_id, ceremony_id } = args ?? {};
      if (!beat_id && !ceremony_id) return { status: "error", message: "Name a beat_id or a ceremony_id." };
      try {
        const projections = [];
        if (ceremony_id) {
          const ceremony = await store.getCeremony(ceremony_id);
          if (!ceremony) return { status: "error", message: `No ceremony ${ceremony_id} on this wheel.` };
          projections.push({ record: "ceremony", id: ceremony_id, ...(await project(c, projectCeremony(ceremony as any))) });
        }
        if (beat_id) {
          const beat = await store.getBeat(beat_id);
          if (!beat) return { status: "error", message: `No beat ${beat_id} on this wheel.` };
          projections.push({ record: "beat", id: beat_id, ...(await project(c, projectBeat(beat as any))) });
        }
        return {
          status: "projected",
          workspace: c.workspace,
          projections,
          teaching: "Honcho reasons in the background. Do not wait on it; the representation is richer next time you recall.",
        };
      } catch (error) {
        return failure("projection failed", error);
      }
    },
  },
  {
    name: "honcho_recall",
    description:
      "What Honcho has come to understand about a peer. Give a wheel node id or name (mapped with honchoIdFor) " +
      "or a Honcho peer id. Without a question: the representation, a fast read. With a question: the " +
      "dialectic answers from accumulated memory — seconds, not milliseconds, so ask when a read will not do.",
    inputSchema: {
      type: "object",
      properties: {
        peer: { type: "string", description: "Wheel node id, name, or Honcho peer id" },
        question: { type: "string", description: "Ask the dialectic instead of reading the representation" },
        session_id: { type: "string", description: "Scope to one Honcho session (a ceremony id is mapped)" },
        reasoning_level: { type: "string", enum: ["minimal", "low", "medium", "high", "max"], description: "For a question; pick the lowest that answers" },
      },
      required: ["peer"],
    },
    handler: async (args) => {
      const c = client();
      if (!isClient(c)) return c;
      const peer = honchoIdFor(String(args.peer));
      const session_id = args.session_id ? honchoIdFor(String(args.session_id)) : undefined;
      try {
        if (args.question) {
          const answer = await c.peers.chat(peer, String(args.question), { session_id, reasoning_level: args.reasoning_level });
          return { status: "ok", peer, question: args.question, answer };
        }
        const representation = await c.peers.representation(peer, { session_id });
        return {
          status: "ok",
          peer,
          representation,
          ...(representation ? {} : { note: "Empty: Honcho has not observed this peer yet, or has not finished reasoning. Project their beats and recall later." }),
        };
      } catch (error) {
        return failure("recall failed", error);
      }
    },
  },
  {
    name: "honcho_project_back",
    description:
      "Return a conclusion derived in Honcho to the wheel as a `knowledge` node with metadata.kind " +
      "'memory_projection' — the peer, the source event ids, the status (inferred | confirmed | rejected), " +
      "when and by whom it was derived. The wheel stays inspectable: a derived pattern is never stored as a bare fact.",
    inputSchema: {
      type: "object",
      properties: {
        // `peer` is the name honcho_recall uses. Both are accepted here because
        // one concept under two names is a trap a caller falls into once and
        // pays for silently.
        peer: { type: "string", description: "The Honcho peer (or wheel node id) the conclusion is about. Same argument as honcho_recall's `peer`" },
        peer_id: { type: "string", description: "Alias of `peer`, kept for callers written against the first release" },
        content: { type: "string", description: "The conclusion, in words" },
        kind: { type: "string", enum: ["pattern", "summary", "open_question", "preference"] },
        status: { type: "string", enum: ["inferred", "confirmed", "rejected"], description: "Default 'inferred'" },
        source_event_ids: { type: "array", items: { type: "string" }, description: "Wheel ids or Honcho message ids it rests on" },
        derived_by: { type: "string", description: "The model or agent that derived it" },
      },
      required: ["content", "kind"],
    },
    handler: async (args) => {
      const named = args.peer ?? args.peer_id;
      if (typeof named !== "string" || !named.trim()) {
        return { status: "error", message: "Name the peer the conclusion is about (`peer`, or its alias `peer_id`)." };
      }
      try {
        const projection: MemoryProjection = {
          source: "honcho",
          peerId: honchoIdFor(named.trim()),
          content: String(args.content),
          kind: args.kind,
          status: args.status ?? "inferred",
          sourceEventIds: Array.isArray(args.source_event_ids) ? args.source_event_ids.map(String) : [],
          generatedAt: new Date().toISOString(),
          ...(args.derived_by ? { derivedBy: String(args.derived_by) } : {}),
        };
        const node = memoryProjectionNode(projection);
        await store.createNode(node as any);
        return { status: "created", node_id: node.id, node };
      } catch (error) {
        return failure("projection back failed", error);
      }
    },
  },
];
