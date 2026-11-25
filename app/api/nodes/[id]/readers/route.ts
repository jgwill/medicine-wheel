import { NextResponse } from "next/server";
import { readCircleReaders } from "@medicine-wheel/community-identity";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";
import { kinshipRecords } from "@/lib/agent-kinship";

/**
 * The agents that read a circle through one of its members
 * (rispecs/agent-kinship.spec.md): what a circle's page shows.
 *
 * A person can give an agent the view of the circles they sit in. The other
 * members admitted that person, not the agent, so the circle answers for
 * itself: `agent_readers` is its answer (allowed or refused, and who set it),
 * `when_unset` what it answers before anyone has set one. Each reader comes
 * with the member it reads through; `sees` is false for an agent the circle
 * holds back, so a facilitator can see who would read before allowing.
 *
 * The answer is set by patching the circle's node with
 * `agentReadersPatch` from `@medicine-wheel/community-identity`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = await createProvider();
    const node = await store.getNode(id);
    if (!node) {
      return NextResponse.json(
        { error: `No node with id ${id}.`, hint: "List the circles with /api/nodes?type=circle&limit=all." },
        { status: 404 },
      );
    }
    const reading = readCircleReaders(node, await kinshipRecords(store));
    if (!reading) {
      return NextResponse.json({ error: `${id} is not a circle.` }, { status: 400 });
    }
    return NextResponse.json({ ...reading, provider: detectProvider() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
