/**
 * The wheel's side of agent kinship (rispecs/agent-kinship.spec.md): fetching
 * the nodes a statement names and writing the planned edges with their
 * events. The rules and the readings live in
 * `@medicine-wheel/community-identity`; this file only joins them to the store.
 */

import type { KinshipEdge, KinshipRefusal } from "@medicine-wheel/community-identity";
import { relationWritten } from "@medicine-wheel/events";
import type { RelationalNode, StorageProvider } from "@medicine-wheel/storage-provider";
import { recordEvent } from "@/lib/event-log";

/** The nodes with these ids that the wheel holds, by id. An id it does not hold is absent from the map. */
export async function nodesById(store: StorageProvider, ids: readonly string[]): Promise<Map<string, RelationalNode>> {
  const found = await Promise.all([...new Set(ids)].map(async (id) => [id, await store.getNode(id)] as const));
  return new Map(found.filter((pair): pair is readonly [string, RelationalNode] => pair[1] !== null));
}

export function refusalIssues(refusals: readonly KinshipRefusal[]): string[] {
  return refusals.map((r) => `${r.path}: ${r.message}`);
}

/** The whole store, for a reading: a reading over a page would miss relations without saying so. */
export async function kinshipRecords(store: StorageProvider) {
  const [nodes, edges] = await Promise.all([
    store.getAllNodes(Number.MAX_SAFE_INTEGER),
    store.getAllEdges(Number.MAX_SAFE_INTEGER),
  ]);
  return { nodes, edges };
}

/**
 * Writes each planned edge and records it in the event log. A relation that
 * already exists is amended in place: same two ends, same kinship type.
 * `written` receives each edge as it lands, so a caller can undo them.
 */
export async function writeKinshipEdges(
  store: StorageProvider,
  edges: readonly KinshipEdge[],
  ends: ReadonlyMap<string, RelationalNode>,
  written: KinshipEdge[] = [],
): Promise<KinshipEdge[]> {
  for (const edge of edges) {
    const previous = await store.getEdge(edge.from_id, edge.to_id, edge.kinship_type);
    await store.createEdge(edge);
    written.push(edge);
    recordEvent(relationWritten(previous, edge, { from: ends.get(edge.from_id), to: ends.get(edge.to_id) }));
  }
  return written;
}
