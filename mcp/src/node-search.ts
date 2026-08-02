/**
 * Node Search — term matching and ranking for `search_nodes`
 *
 * The original matcher lowercased the WHOLE query and asked whether that one
 * literal string appeared inside `name` or `description`. That meant a person
 * typing the words in any order, or typing words that live in different fields,
 * got nothing back — while the node sat in the graph. Measured 2026-08-02
 * against the live wheel:
 *
 *   search_nodes("veritas")                        → 2   (literal phrase present)
 *   search_nodes("MMOT review surface")            → 1   (contiguous in description)
 *   search_nodes("veritas stc")                    → 0   ← both words in the NAME
 *   search_nodes("veritas stc surface service")    → 0   ← all four words present
 *   search_nodes("ServiceFacet")                   → 0   ← metadata was never read
 *
 * Registering infrastructure in the wheel is only worth doing if it can be found
 * again. So the query is now split into terms and each node is scored across
 * name + description + metadata values.
 *
 * The matching contract, stated so it cannot drift:
 *
 *  1. **Primary tier — every term must be found.** A node is returned when all
 *     of the query's terms appear somewhere in its searchable text. This is AND
 *     *across* fields rather than AND *within one* field, which is the whole
 *     defect: "veritas stc" (name) + "service" (description/metadata) is one
 *     node, not three failed lookups.
 *  2. **Fallback tier — only when the primary tier is empty.** Nodes matching at
 *     least one term are returned, ranked. This keeps one mistyped or extra word
 *     from turning a good query into a void, without flooding: the fallback is
 *     never mixed into a result set that already has full matches.
 *  3. **A query whose terms match nothing returns nothing.** There is no
 *     "closest node" consolation prize — a search that always answers is a
 *     search that cannot be trusted.
 *
 * Ranking puts the strongest evidence first: an exact name, then the literal
 * phrase in the name, then per-term hits weighted by field (name > description >
 * metadata) with whole-word hits beating substrings. Ties break on recency so
 * the order is stable rather than insertion-dependent.
 *
 * @see mcp/src/tools/discovery.ts — the `search_nodes` tool
 * @see mcp/src/http-store.ts      — server-backed store (the live wheel path)
 * @see mcp/src/jsonl-store.ts     — local JSONL store
 */

/** The shape `search_nodes` ranks. Structural only — both stores satisfy it. */
export interface SearchableNode {
  id: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/** Field weights. Name outranks description outranks metadata, always. */
const SCORE = {
  /** Query, lowercased, equals the whole name. Nothing beats this. */
  EXACT_NAME: 100,
  /** The full query appears verbatim inside the name. */
  PHRASE_IN_NAME: 40,
  /** The full query appears verbatim inside the description. */
  PHRASE_IN_DESCRIPTION: 12,
  /** Every term was found somewhere — the primary tier's badge. */
  ALL_TERMS: 30,
  TERM_IN_NAME_WORD: 10,
  TERM_IN_NAME_PART: 6,
  TERM_IN_DESCRIPTION_WORD: 4,
  TERM_IN_DESCRIPTION_PART: 2,
  TERM_IN_METADATA_WORD: 2,
  TERM_IN_METADATA_PART: 1,
} as const;

/**
 * Split text into comparable terms.
 *
 * Anything that is not a letter or digit separates. That is what lets
 * "veritas stc surface" reach `veritas-stc-surface`, and what lets a pasted
 * identifier be typed back as plain words.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(t => t.length > 0);
}

/**
 * Flatten metadata into searchable text.
 *
 * Values only — keys like `url`, `repo` and `scope` repeat across most nodes and
 * would match everything while meaning nothing. Values are what a person
 * remembers: a port, a branch, a repo slug, `ServiceFacet`.
 */
function flattenMetadata(value: unknown, depth = 0): string {
  if (depth > 4 || value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(v => flattenMetadata(v, depth + 1)).join(' ');
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(v => flattenMetadata(v, depth + 1))
      .join(' ');
  }
  return '';
}

/** Pre-computed haystack for one node: raw text for substrings, word sets for exact hits. */
interface Haystack {
  nameRaw: string;
  nameWords: Set<string>;
  descriptionRaw: string;
  descriptionWords: Set<string>;
  metadataRaw: string;
  metadataWords: Set<string>;
}

function buildHaystack(node: SearchableNode): Haystack {
  const nameRaw = (node.name || '').toLowerCase();
  const descriptionRaw = (node.description || '').toLowerCase();
  const metadataRaw = flattenMetadata(node.metadata).toLowerCase();
  return {
    nameRaw,
    nameWords: new Set(tokenize(nameRaw)),
    descriptionRaw,
    descriptionWords: new Set(tokenize(descriptionRaw)),
    metadataRaw,
    metadataWords: new Set(tokenize(metadataRaw)),
  };
}

/** Score one term against one node. 0 means the term is absent everywhere. */
function scoreTerm(term: string, hay: Haystack): number {
  if (hay.nameWords.has(term)) return SCORE.TERM_IN_NAME_WORD;
  if (hay.nameRaw.includes(term)) return SCORE.TERM_IN_NAME_PART;
  if (hay.descriptionWords.has(term)) return SCORE.TERM_IN_DESCRIPTION_WORD;
  if (hay.descriptionRaw.includes(term)) return SCORE.TERM_IN_DESCRIPTION_PART;
  if (hay.metadataWords.has(term)) return SCORE.TERM_IN_METADATA_WORD;
  if (hay.metadataRaw.includes(term)) return SCORE.TERM_IN_METADATA_PART;
  return 0;
}

/** Newest first, so equally-relevant results come back in a stable order. */
function recencyOf(node: SearchableNode): number {
  const stamp = node.updated_at || node.created_at;
  const parsed = stamp ? Date.parse(stamp) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Match and rank nodes against a natural multi-word query.
 *
 * Returns best-first. An empty/whitespace-only query returns nothing rather
 * than the entire graph — asking nothing is not asking for everything.
 */
export function rankNodes<T extends SearchableNode>(nodes: T[], query: string): T[] {
  const raw = (query || '').trim().toLowerCase();
  if (raw.length === 0) return [];

  const terms = tokenize(raw);
  if (terms.length === 0) return [];
  const unique = Array.from(new Set(terms));

  const full: { node: T; score: number }[] = [];
  const partial: { node: T; score: number }[] = [];

  for (const node of nodes) {
    const hay = buildHaystack(node);

    let score = 0;
    let matched = 0;
    for (const term of unique) {
      const termScore = scoreTerm(term, hay);
      if (termScore > 0) {
        matched += 1;
        score += termScore;
      }
    }
    if (matched === 0) continue;

    if (hay.nameRaw === raw) score += SCORE.EXACT_NAME;
    else if (hay.nameRaw.includes(raw)) score += SCORE.PHRASE_IN_NAME;
    if (hay.descriptionRaw.includes(raw)) score += SCORE.PHRASE_IN_DESCRIPTION;

    if (matched === unique.length) {
      full.push({ node, score: score + SCORE.ALL_TERMS });
    } else {
      partial.push({ node, score });
    }
  }

  // Partial matches are a fallback, never a dilution: they are consulted only
  // when nothing matched every term.
  const chosen = full.length > 0 ? full : partial;
  chosen.sort((a, b) => b.score - a.score || recencyOf(b.node) - recencyOf(a.node));
  return chosen.map(entry => entry.node);
}
