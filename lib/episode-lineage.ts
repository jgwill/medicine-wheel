/**
 * An episode's lineage, read from the relations the wheel already holds.
 *
 * Miadi's chronicle writes every episode↔episode relation to the wheel as an
 * edge, with the words that say why it holds in `description` (jgwill/Miadi#702,
 * jgwill/medicine-wheel#150). The wheel kept them, and its Episodes tab listed a
 * neighbour's name and a raw `relationship_type` — never the words, and never
 * which way the relation runs. This module turns an edge into the sentence a
 * reader expects from where they stand: on episode 549, `549 continues_from 045`
 * reads "continues from 045"; on episode 045, the same edge reads "continued by
 * 549".
 *
 * Pure functions, no fetching: the episode page and the lineage web read the
 * same answer. Ref jgwill/medicine-wheel#156.
 */

export interface LineageEdge {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  description?: string;
}

export interface EpisodeRelation {
  /** The node on the other end. */
  other: string;
  /** The relation as read from this episode: "continues from", "continued by", "relates to"… */
  label: string;
  /** Lineage relations sort first, in this order; everything else after them. */
  rank: number;
  /** The words that say why it holds — one per edge that said something. */
  descriptions: string[];
  /** The edges this relation was read from (two when both directions were woven). */
  edgeIds: string[];
}

/**
 * Relations with a direction: [as read from `from_id`, as read from `to_id`].
 * Both spellings appear on the chronicle wheel (`continues_from` from Miadi's
 * lineage door, `continues-from` from an earlier writer), so both are named.
 */
const DIRECTED: Record<string, [string, string]> = {
  continues_from: ["continues from", "continued by"],
  "continues-from": ["continues from", "continued by"],
  continued_by: ["continued by", "continues from"],
  "continued-by": ["continued by", "continues from"],
  descends_from: ["descends from", "gave rise to"],
  "descends-from": ["descends from", "gave rise to"],
  born_from: ["born from", "gave birth to"],
};

/** Relations that read the same from either end. */
const SYMMETRIC = new Set(["relates_to", "relates-to", "speaks-with", "speaks_with"]);

const RANK: Record<string, number> = {
  "continues from": 0,
  "descends from": 0,
  "born from": 0,
  "continued by": 1,
  "gave rise to": 1,
  "gave birth to": 1,
  "relates to": 2,
};

function words(type: string): string {
  return type.replace(/[_-]+/g, " ").trim().toLowerCase();
}

/** One edge, read from `episodeId`'s end. Null when the edge does not touch it, or loops on it. */
export function readEdge(episodeId: string, edge: LineageEdge): { other: string; label: string } | null {
  const outgoing = edge.from_id === episodeId;
  const incoming = edge.to_id === episodeId;
  if (outgoing === incoming) return null;
  const other = outgoing ? edge.to_id : edge.from_id;
  const type = edge.relationship_type ?? "";
  const directed = DIRECTED[type.toLowerCase()];
  if (directed) return { other, label: outgoing ? directed[0] : directed[1] };
  if (SYMMETRIC.has(type.toLowerCase())) return { other, label: words(type) };
  // A type the chronicle has not named a reverse for keeps its own words, and
  // an arrow says which way it was written.
  return { other, label: `${outgoing ? "→" : "←"} ${words(type) || "related"}` };
}

/**
 * Every relation touching an episode, one per (other node, reading).
 *
 * Miadi's lineage door can weave a relation both ways — `A relates_to B` and
 * `B relates_to A`, each with its own words. Read from A, those are the same
 * relation said twice, so they merge and keep both sets of words. Two different
 * readings of the same pair (A continues from B, and also relates to it) stay
 * two relations.
 */
export function relationsOf(episodeId: string, edges: LineageEdge[]): EpisodeRelation[] {
  const byKey = new Map<string, EpisodeRelation>();
  for (const edge of edges) {
    const read = readEdge(episodeId, edge);
    if (!read) continue;
    const key = `${read.other}\u0000${read.label}`;
    const relation =
      byKey.get(key) ??
      { other: read.other, label: read.label, rank: RANK[read.label] ?? 3, descriptions: [], edgeIds: [] };
    relation.edgeIds.push(edge.id);
    const said = edge.description?.trim();
    if (said && !relation.descriptions.includes(said)) relation.descriptions.push(said);
    byKey.set(key, relation);
  }
  return [...byKey.values()].sort((a, b) => a.rank - b.rank || a.other.localeCompare(b.other));
}

/** Episode↔episode edges only — the lineage, without the chronicle root every episode belongs to. */
export function lineageEdges(edges: LineageEdge[], isEpisode: (id: string) => boolean): LineageEdge[] {
  return edges.filter(
    (edge) => edge.from_id !== edge.to_id && isEpisode(edge.from_id) && isEpisode(edge.to_id),
  );
}

/** Whether a reading runs along time (continues, descends) rather than across it (relates). */
export function isContinuation(edge: LineageEdge): boolean {
  return Boolean(DIRECTED[(edge.relationship_type ?? "").toLowerCase()]);
}

// ── Where an episode sits in the chronicle ──────────────────────────────────

/** The fields of a wheel node these helpers read. */
export interface ChronicleNode {
  id: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

const FOLDER = /^(\d{4}-\d{2}-\d{2})-episode-(\d+)/i;

/**
 * The episode's folder name — what the wheel's other records file it under.
 *
 * From the id when it is `chronicle:<folder>`. A few early episodes were
 * registered under other ids (`node:knowledge:…`, a bare uuid); their node
 * still carries the artefact reference, so the folder comes from
 * `metadata.relative_path` when `metadata.root` names the chronicle.
 */
export function episodeFolderOfNode(node: ChronicleNode): string | null {
  if (node.id.startsWith("chronicle:")) return node.id.slice("chronicle:".length) || null;
  const root = node.metadata?.root;
  const relative = node.metadata?.relative_path;
  if (root !== "MIADI_CHRONICLE_ROOT" || typeof relative !== "string") return null;
  const folder = relative.split("/")[0];
  return folder && folder !== relative ? folder : null;
}

/**
 * Where an episode sits in the chronicle: its folder's date, then its number —
 * the order the folders keep on disk. Not `created_at`, which records when the
 * wheel learned of an episode, and not the number alone, which the chronicle
 * does not hand out in date order (episode 1000 follows episode 550 by two days).
 */
export function chronicleKey(node: ChronicleNode): string {
  const match = (episodeFolderOfNode(node) ?? "").match(FOLDER);
  return match ? `${match[1]}-${match[2].padStart(6, "0")}` : (node.created_at ?? "");
}

/** The day the episode's folder is dated, when it has one. */
export function episodeDateOf(node: ChronicleNode): string | undefined {
  return (episodeFolderOfNode(node) ?? "").match(FOLDER)?.[1];
}
