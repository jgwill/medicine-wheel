import { NextResponse } from "next/server";
import { agentKinship, DefineAgentSchema, nodeIdsNamedIn, planDefineAgent, type KinshipEdge } from "@medicine-wheel/community-identity";
import { nodeWritten } from "@medicine-wheel/events";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";
import { nodesById, refusalIssues, writeKinshipEdges } from "@/lib/agent-kinship";
import { recordEvent } from "@/lib/event-log";

/**
 * A person defines an agent they made (rispecs/agent-kinship.spec.md).
 *
 * The agent's seat and its relations are written together: whom it comes
 * from, and with it who holds responsibility for it, whom it serves and which
 * agents it speaks with, when the person says them. Everything is checked
 * before anything is written, so a statement that names a person the wheel
 * does not hold writes nothing. An agent that already has a node is related
 * afterwards with POST /api/nodes/{id}/kinship.
 *
 * The wheel does not check who is calling. That the caller is the person the
 * words belong to is the check of the application in front of it.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = DefineAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid agent — nothing was written.",
          issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`),
        },
        { status: 400 },
      );
    }

    const store = await createProvider();
    const { agent, ...relations } = parsed.data;
    if (agent.id && (await store.getNode(agent.id))) {
      return NextResponse.json(
        {
          error: `A node ${agent.id} already exists — nothing was written.`,
          hint: `Relate an agent that already has a node with POST /api/nodes/${encodeURIComponent(agent.id)}/kinship.`,
        },
        { status: 409 },
      );
    }

    const named = await nodesById(store, nodeIdsNamedIn(relations));
    const plan = planDefineAgent({ input: parsed.data, nodes: named });
    if (!plan.ok) {
      return NextResponse.json(
        { error: "Invalid agent — nothing was written.", issues: refusalIssues(plan.refusals) },
        { status: 400 },
      );
    }

    // No provider offers a transaction across a node and its edges, so the
    // two are written in order and undone in reverse when a write fails: the
    // wheel is left without half an agent.
    const written: KinshipEdge[] = [];
    await store.createNode(plan.node);
    try {
      await writeKinshipEdges(store, plan.edges, new Map([...named, [plan.node.id, plan.node]]), written);
    } catch (error: unknown) {
      const undone: string[] = [];
      for (const edge of written.reverse()) {
        await store.deleteEdge(edge.from_id, edge.to_id, edge.kinship_type).then(() => undone.push(`${edge.kinship_type}`), () => undefined);
      }
      const nodeRemoved = await store.deleteNode(plan.node.id).then(() => true, () => false);
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        {
          error: `The agent's relations could not be written: ${message}`,
          rolled_back: nodeRemoved,
          ...(nodeRemoved ? {} : { left_on_the_wheel: plan.node.id }),
        },
        { status: 500 },
      );
    }
    recordEvent(nodeWritten(null, plan.node));

    return NextResponse.json(
      {
        success: true,
        node: plan.node,
        edges: plan.edges,
        kinship: agentKinship(plan.node.id, plan.edges),
        provider: detectProvider(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
