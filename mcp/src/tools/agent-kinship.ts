/**
 * Agent kinship tools — a person and the agents they gave rise to.
 *
 * Four relations between seats on the wheel, each a governed kinship edge:
 * whom an agent comes from, who holds responsibility for it, whom it serves
 * (with what that person gives it) and which agents it speaks with. The rules
 * are `@medicine-wheel/community-identity`'s; these tools are the door an
 * agent reaches them through. Spec: rispecs/agent-kinship.spec.md.
 *
 * With MW_API_URL set (an agent beside a wheel server) the two writes go to
 * the server's own routes, which undo a half-written agent. Without it they
 * are planned and written in process over this store. The reads go through
 * the store either way.
 *
 * No tool here checks who is calling. That the caller is the person the words
 * belong to is the check of the application in front of the wheel.
 */

import type { Tool } from "../types.js";
import { store } from "../store.js";
import {
  agentKinship,
  AgentKinshipInputSchema,
  DefineAgentSchema,
  nodeIdsNamedIn,
  planAgentKinship,
  planDefineAgent,
  readCircleReaders,
  readKinship,
  SEE_CIRCLES,
  SEE_CIRCLES_SCOPES,
  type KinshipEdge,
} from "@medicine-wheel/community-identity";
import type { RelationalNode } from "@medicine-wheel/ontology-core";

const serverUrl = () => process.env.MW_API_URL?.trim().replace(/\/+$/, "") || null;

async function server(method: "GET" | "POST", path: string, body?: unknown): Promise<any> {
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
  if (!res.ok) {
    return {
      status: "error",
      http_status: res.status,
      message: data?.error ?? `The wheel answered ${res.status} on ${path}`,
      ...(data?.issues ? { issues: data.issues } : {}),
      ...(data?.hint ? { hint: data.hint } : {}),
    };
  }
  return data;
}

const refused = (message: string, issues: string[]) => ({ status: "error", message, issues });
const zodIssues = (error: { issues: { path: (string | number)[]; message: string }[] }) =>
  error.issues.map((issue) => `${issue.path.join(".") || "arguments"}: ${issue.message}`);

async function namedNodes(ids: readonly string[]): Promise<Map<string, RelationalNode>> {
  const found = await Promise.all([...new Set(ids)].map(async (id) => [id, await store.getNode(id)] as const));
  return new Map(found.filter((pair) => pair[1]).map(([id, node]) => [id, node as RelationalNode]));
}

async function records() {
  const [nodes, edges] = await Promise.all([store.getAllNodes(), store.getAllEdges()]);
  return { nodes: nodes as RelationalNode[], edges: edges as KinshipEdge[] };
}

const statement = (what: string) => ({
  type: "object",
  properties: {
    person_id: { type: "string", description: `The node id of the person ${what}` },
    words: { type: "string", description: "The relation in the words of the one who says it" },
    said_by: { type: "string", description: "The node id of the person whose words these are" },
  },
  required: ["person_id", "words", "said_by"],
});

const relationProperties = {
  comes_from: {
    type: "array",
    description: "Whom the agent comes from: the persons who gave rise to it",
    items: statement("the agent comes from"),
  },
  responsibility_held_by: {
    type: "array",
    description: "Who holds responsibility for the agent. It may be a person who did not give rise to it, and more than one person",
    items: statement("who holds responsibility for the agent"),
  },
  serves: {
    type: "array",
    description: "Whom the agent serves, and what each person gives it. With no grant nothing passes",
    items: {
      type: "object",
      properties: {
        ...statement("the agent serves").properties,
        grants: {
          type: "array",
          description: `What the person gives the agent, chosen by that person (said_by must be person_id). Kind ${SEE_CIRCLES}: the agent sees the talking circles the person facilitates (scope facilitated) or every circle the person sits in (scope sits_in). Seeing is not speaking`,
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: [SEE_CIRCLES] },
              scope: { type: "string", enum: [...SEE_CIRCLES_SCOPES] },
            },
            required: ["kind", "scope"],
          },
        },
      },
      required: ["person_id", "words", "said_by"],
    },
  },
  speaks_with: {
    type: "array",
    description: "The agents this agent speaks with. A new relation needs words and said_by and starts proposed; for one already on the wheel, what is left out stays as it is",
    items: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "The node id of the other agent" },
        words: { type: "string", description: "What the two agents speak about, in the words of the one who proposes it" },
        said_by: { type: "string", description: "The node id of the one whose words these are" },
        state: { type: "string", enum: ["proposed", "active", "paused", "ended"], description: "Where the relation stands. Active needs authorized_by" },
        authorized_by: { type: "string", description: "The node id of the person who authorized the two agents to speak with each other" },
        valid_when: { type: "string", description: "When the relation holds" },
        forbidden_when: { type: "string", description: "When it does not" },
      },
      required: ["agent_id"],
    },
  },
};

export const agentKinshipTools: Tool[] = [
  {
    name: "define_agent",
    description:
      "A person defines an agent they made. Writes the agent's seat (an agent node) together with its relations: whom it comes from, " +
      "and when the person says them, who holds responsibility for it, whom it serves and which agents it speaks with. " +
      "Everything is checked before anything is written. For an agent that already has a node, use relate_agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent: {
          type: "object",
          description: "The agent's seat",
          properties: {
            name: { type: "string", description: "The agent's name" },
            role: { type: "string", description: "The role of the seat (e.g. companion_ai, participant)" },
            id: { type: "string", description: "A node id to use. Left out, one is made" },
            email: { type: "string" },
            github_handle: { type: "string" },
            output_language: { type: "string", description: "The language the seat prefers answers in, a BCP 47 tag" },
            direction: { type: "string", enum: ["east", "south", "west", "north"] },
          },
          required: ["name", "role"],
        },
        ...relationProperties,
      },
      required: ["agent", "comes_from"],
    },
    handler: async (args) => {
      try {
        const parsed = DefineAgentSchema.safeParse(args);
        if (!parsed.success) return refused("Invalid agent — nothing was written.", zodIssues(parsed.error));
        if (serverUrl()) {
          const answer = await server("POST", "/api/agents", parsed.data);
          return answer.status === "error" ? answer : { status: "created", node: answer.node, edges: answer.edges, kinship: answer.kinship };
        }

        const { agent, ...relations } = parsed.data;
        if (agent.id && (await store.getNode(agent.id))) {
          return refused(`A node ${agent.id} already exists — nothing was written.`, ["agent.id: relate an agent that already has a node with relate_agent"]);
        }
        const plan = planDefineAgent({ input: parsed.data, nodes: await namedNodes(nodeIdsNamedIn(relations)) });
        if (!plan.ok) return refused("Invalid agent — nothing was written.", plan.refusals.map((r) => `${r.path}: ${r.message}`));

        await store.createNode(plan.node);
        for (const edge of plan.edges) await store.createEdge(edge as any);
        return { status: "created", node: plan.node, edges: plan.edges, kinship: agentKinship(plan.node.id, plan.edges) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to define the agent: ${message}`, error: message };
      }
    },
  },
  {
    name: "relate_agent",
    description:
      "Relates an agent that already has a node to its persons and to the agents it speaks with, or says one of its relations again. " +
      "The same two seats and the same kind of relation are one relation: saying it again amends it and keeps its first date. " +
      "For origin, responsibility and service the new statement replaces the earlier one whole, grants included.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "The node id of the agent's seat" },
        ...relationProperties,
      },
      required: ["agent_id"],
    },
    handler: async (args) => {
      try {
        const { agent_id, ...relations } = args ?? {};
        if (typeof agent_id !== "string" || !agent_id.trim()) return refused("Invalid kinship — nothing was written.", ["agent_id: required"]);
        const parsed = AgentKinshipInputSchema.safeParse(relations);
        if (!parsed.success) return refused("Invalid kinship — nothing was written.", zodIssues(parsed.error));
        if (serverUrl()) {
          const answer = await server("POST", `/api/nodes/${encodeURIComponent(agent_id)}/kinship`, parsed.data);
          return answer.status === "error" ? answer : { status: "related", edges: answer.edges, kinship: answer.kinship };
        }

        const agent = (await store.getNode(agent_id)) as RelationalNode | undefined;
        if (!agent) return refused(`No node with id ${agent_id}.`, ["agent_id: list the agents with list_relational_nodes"]);
        const touching = ((await store.getAllEdges()) as KinshipEdge[]).filter((e) => e.from_id === agent_id || e.to_id === agent_id);
        const plan = planAgentKinship({ agent, input: parsed.data, nodes: await namedNodes(nodeIdsNamedIn(parsed.data)), edges: touching });
        if (!plan.ok) return refused("Invalid kinship — nothing was written.", plan.refusals.map((r) => `${r.path}: ${r.message}`));

        for (const edge of plan.edges) await store.createEdge(edge as any);
        return { status: "related", edges: plan.edges, kinship: agentKinship(agent_id, (await store.getAllEdges()) as KinshipEdge[]) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to relate the agent: ${message}`, error: message };
      }
    },
  },
  {
    name: "get_agent_kinship",
    description:
      "What the wheel reads back for one person. For an agent: whom it comes from, who holds responsibility for it, whom it serves and what each person gives it, " +
      "which agents it speaks with and in which state, and the circles it sees through the persons it serves. " +
      "For any person: the agents they gave rise to, hold responsibility for and are served by. Each relation carries the words of the one who said it.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "The node id of the agent's seat, or of a person" },
      },
      required: ["node_id"],
    },
    handler: async (args) => {
      try {
        const node = (await store.getNode(args.node_id)) as RelationalNode | undefined;
        if (!node) return { status: "error", message: `No node with id ${args.node_id}.` };
        const reading = readKinship(node, await records());
        if (!reading) return { status: "error", message: `${args.node_id} is not a person on the wheel.` };
        return { status: "ok", ...reading };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to read the kinship: ${message}`, error: message };
      }
    },
  },
  {
    name: "get_circle_agent_readers",
    description:
      "The agents that read a circle through one of its members, each with that member: what a circle's page shows. " +
      "Also the circle's answer to the agents of its members (allowed or refused, and who set it) and what it answers before anyone has set one. " +
      "An agent the circle holds back is listed with sees false.",
    inputSchema: {
      type: "object",
      properties: {
        circle_id: { type: "string", description: "The node id of the circle" },
      },
      required: ["circle_id"],
    },
    handler: async (args) => {
      try {
        const circle = (await store.getNode(args.circle_id)) as RelationalNode | undefined;
        if (!circle) return { status: "error", message: `No node with id ${args.circle_id}.` };
        const reading = readCircleReaders(circle, await records());
        if (!reading) return { status: "error", message: `${args.circle_id} is not a circle.` };
        return { status: "ok", ...reading };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { status: "error", message: `Failed to read the circle's agent readers: ${message}`, error: message };
      }
    },
  },
];
