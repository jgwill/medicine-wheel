import { NextResponse } from "next/server";
import { agentKinship, AgentKinshipInputSchema, nodeIdsNamedIn, planAgentKinship, readKinship } from "@medicine-wheel/community-identity";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";
import { kinshipRecords, nodesById, refusalIssues, writeKinshipEdges } from "@/lib/agent-kinship";

function notFound(id: string) {
  return NextResponse.json(
    { error: `No node with id ${id}.`, hint: "Check the id on /nodes, or list the agents with /api/nodes?type=agent&limit=all." },
    { status: 404 },
  );
}

/**
 * What the wheel reads back for one person (rispecs/agent-kinship.spec.md).
 *
 * For an agent: whom it comes from, who holds responsibility for it, whom it
 * serves and what each of those persons gives it, which agents it speaks with
 * and in which state, and the circles it sees through the persons it serves.
 * For any person: the agents they gave rise to, hold responsibility for and
 * are served by. Each relation carries the words of the one who said it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = await createProvider();
    const node = await store.getNode(id);
    if (!node) return notFound(id);
    const reading = readKinship(node, await kinshipRecords(store));
    if (!reading) {
      return NextResponse.json(
        { error: `${id} is not a person on the wheel.`, hint: "Kinship is read for a person's seat: a human or agent node whose metadata.kind is person." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ...reading, provider: detectProvider() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * An agent that already has a node is related to its persons, and to the
 * agents it speaks with. Saying a relation again amends it: the same two
 * seats and the same kind of relation are one relation, and it keeps the date
 * it was first written. For origin, responsibility and service the new
 * statement replaces the earlier one whole, grants included. For a dialogue,
 * what is left out stays as it is.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = AgentKinshipInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid kinship — nothing was written.",
          issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`),
        },
        { status: 400 },
      );
    }

    const store = await createProvider();
    const agent = await store.getNode(id);
    if (!agent) return notFound(id);

    const [named, allEdges] = await Promise.all([
      nodesById(store, nodeIdsNamedIn(parsed.data)),
      store.getAllEdges(Number.MAX_SAFE_INTEGER),
    ]);
    const touching = allEdges.filter((edge) => edge.from_id === id || edge.to_id === id);
    const plan = planAgentKinship({ agent, input: parsed.data, nodes: named, edges: touching });
    if (!plan.ok) {
      return NextResponse.json(
        { error: "Invalid kinship — nothing was written.", issues: refusalIssues(plan.refusals) },
        { status: 400 },
      );
    }

    await writeKinshipEdges(store, plan.edges, new Map([...named, [agent.id, agent]]));
    const after = await store.getAllEdges(Number.MAX_SAFE_INTEGER);
    return NextResponse.json({
      success: true,
      edges: plan.edges,
      kinship: agentKinship(id, after),
      provider: detectProvider(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
