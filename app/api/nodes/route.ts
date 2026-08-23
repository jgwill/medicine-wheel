import { NextResponse } from "next/server";
import { z } from "zod";
import { DirectionNameSchema, NodeTypeSchema } from "@medicine-wheel/ontology-core";
import { createProvider, detectProvider } from "@medicine-wheel/storage-provider";

const NodeCreateSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string({ required_error: "name is required" }).trim().min(1, "cannot be empty"),
  type: NodeTypeSchema,
  description: z.string().optional(),
  // Forms send "" when no direction is chosen — treat that as "no direction".
  direction: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    DirectionNameSchema.optional(),
  ),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * The query params `GET /api/nodes` understands. Anything else is a 400.
 *
 * Node `type` is a closed enum of six and cannot grow, so every artifact kind
 * the ecosystem has invented — `chronicle_episode`, `structured_plan`,
 * `service`, `stc_chart`, `product_goal` — got in through `metadata.kind`
 * instead, and containment got in through `metadata.parent_id` (31 nodes point
 * at `chronicle:miadi-chronicle` that way). Both were reachable only by
 * fetching the whole graph and filtering client-side; forgewright's
 * `chronicle/client.ts` and this repo's own `HttpStore.searchNodes` each do
 * exactly that, the latter under the comment "Server has no search endpoint
 * yet". So the wheel needed no schema change — it needed a way to ask.
 *
 * Query params rather than a scoped `/api/nodes/:id/children` route because the
 * question consumers actually have is "artifacts of kind X belonging to episode
 * Y", which is `kind` AND `parent_id` together; a scoped route would still need
 * `?kind=` bolted onto it, and `type`/`direction` already set the query-param
 * precedent on this same route.
 */
const NODE_FILTER_PARAMS = ["type", "direction", "kind", "parent_id"] as const;

/**
 * A silently-ignored filter is the failure this route exists to prevent: a
 * consumer that asks `?kinds=service` and gets a filtered-looking payload it
 * never filtered has been lied to. An unknown param is therefore a 400 naming
 * what is accepted, not a shrug.
 */
function rejectUnknownParams(searchParams: URLSearchParams) {
  const unknown = [...new Set(searchParams.keys())].filter(
    (key) => !(NODE_FILTER_PARAMS as readonly string[]).includes(key),
  );
  if (unknown.length === 0) return null;

  return NextResponse.json(
    {
      error: `Unknown query parameter${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")} — nothing was filtered.`,
      accepted: [...NODE_FILTER_PARAMS],
    },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const rejection = rejectUnknownParams(searchParams);
    if (rejection) return rejection;

    // An empty value means "no filter" — forms submit "" for an unchosen
    // option, the same reason POST preprocesses "" on `direction`.
    const filters = Object.fromEntries(
      NODE_FILTER_PARAMS.map((key) => [key, searchParams.get(key) || undefined]),
    ) as Partial<Record<(typeof NODE_FILTER_PARAMS)[number], string>>;
    const filtering = Object.values(filters).some(Boolean);

    const store = await createProvider();

    // Unfiltered reads keep the provider's own default page size, so this route
    // answers a bare GET exactly as it always has. A *filtered* read must see
    // the whole store or it answers from a truncated window — `getAllNodes()`
    // defaults to 100 and the live wheel already holds 76, so filtering after
    // the default slice would start returning quietly incomplete sets rather
    // than failing loudly.
    let nodes = filtering
      ? await store.getAllNodes(Number.MAX_SAFE_INTEGER)
      : await store.getAllNodes();

    // Every supplied filter narrows (AND). Previously `type` and `direction`
    // were `else if`, so `?type=x&direction=y` silently dropped the direction —
    // the same silent-ignore defect the 400 above closes. Single-param requests
    // are unaffected.
    if (filters.type) nodes = nodes.filter((n) => n.type === filters.type);
    if (filters.direction) nodes = nodes.filter((n) => n.direction === filters.direction);
    if (filters.kind) nodes = nodes.filter((n) => n.metadata?.kind === filters.kind);
    if (filters.parent_id) {
      nodes = nodes.filter((n) => n.metadata?.parent_id === filters.parent_id);
    }

    return NextResponse.json({
      nodes,
      provider: detectProvider(),
      count: nodes.length,
      // Echoed only when asked for, so an unfiltered response stays byte-identical
      // to what every existing consumer already parses — and so a caller can tell
      // an empty result from an unapplied filter.
      ...(filtering ? { filters } : {}),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = NodeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid node — nothing was created.",
          issues: parsed.error.issues.map(
            (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const store = await createProvider();
    const node = {
      id: parsed.data.id || crypto.randomUUID(),
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description || "",
      direction: parsed.data.direction,
      metadata: parsed.data.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.createNode(node);
    return NextResponse.json({ success: true, node, provider: detectProvider() }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
