/**
 * Shared paging contract for the wheel's read routes.
 *
 * The provider's `getAllNodes()` / `getAllEdges()` default to 100 rows. A bare
 * `GET /api/nodes` therefore returned 100 of the store's 205 nodes, and the graph
 * page — which sends no parameters — drew that window while its own panel read
 * "100 Nodes / 100 Relations". Of the 100 it drew, 53 had no drawable edge,
 * because 27 of the 100 delivered edges pointed at nodes that were never sent.
 *
 * Nothing was broken. Every layer did what it was told. The lie was that no layer
 * ever said how much it had left out.
 *
 * So both routes accept the same `limit`, and both report enough for a caller to
 * know it holds a page: `?limit=all` for the whole store, `?limit=<n>` for n.
 * This lives in `lib/` rather than in either route because a second hand-written
 * copy of a validation rule is how the two drift apart — the same defect this
 * repo just removed from `PersonRole`.
 */
import { NextResponse } from "next/server";

/** The provider's own default page size, restated so a route can report honestly. */
export const DEFAULT_PAGE_SIZE = 100;

/** Sentinel meaning "the whole store", distinct from "no limit given". */
export const LIMIT_ALL = "all";

/**
 * Returns the requested page size, `null` for "everything", or a 400 response.
 *
 * An unparseable limit is refused rather than coerced. Falling back to the
 * default on bad input would reintroduce the silent truncation this parameter
 * exists to close, and would do it precisely when a caller had tried to ask.
 */
export function parseLimit(raw: string | null): number | null | NextResponse {
  if (raw === null || raw === "") return DEFAULT_PAGE_SIZE;
  if (raw === LIMIT_ALL) return null;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return NextResponse.json(
      {
        error: `Invalid limit: ${raw} — nothing was returned.`,
        hint: `limit must be a positive integer, or "${LIMIT_ALL}" for the whole store.`,
      },
      { status: 400 },
    );
  }
  return parsed;
}
