/**
 * @medicine-wheel/relational-query — RDF → Flat Kinship-Graph Migration
 *
 * Ingests RDF triples and emits a flat kinship graph (co-equal nodes + named,
 * context-bound relations). The reconciliation move: `rdfs:subClassOf` and
 * `rdf:type` — the axes that encode taxonomic subordination — are mapped onto
 * a NAMED kinship edge (`co-emerges-with` by default), never re-introduced as
 * a class hierarchy. Source provenance is carried into each relation's
 * `context.authorized_by`.
 */
import type {
  Relation,
  RelationalNode,
  KinshipEdgeName,
} from '@medicine-wheel/ontology-core';
import { isKinshipEdgeName } from '@medicine-wheel/ontology-core';

/** A single RDF statement (subject–predicate–object), IRIs or prefixed names. */
export interface RdfTriple {
  subject: string;
  predicate: string;
  object: string;
}

export interface MigrationOptions {
  /** Provenance label written into each relation's context.authorized_by. */
  source?: string;
  /** Predicate (IRI or prefixed) → kinship edge name overrides. */
  predicateMap?: Record<string, KinshipEdgeName>;
  /** Predicates whose (literal) objects fold into node.name. */
  labelPredicates?: string[];
  /** Decide whether an RDF term is a resource (→ node) vs a literal (→ attribute). */
  isResource?: (term: string) => boolean;
  /** ISO timestamp for created/updated fields (defaults to now). */
  now?: string;
}

export interface KinshipGraph {
  nodes: RelationalNode[];
  relations: Relation[];
}

/**
 * The subordinating axes are flattened to co-emergence: an instance/subclass
 * stands beside its kind rather than beneath it.
 */
const DEFAULT_PREDICATE_MAP: Record<string, KinshipEdgeName> = {
  a: 'co-emerges-with',
  'rdf:type': 'co-emerges-with',
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': 'co-emerges-with',
  'rdfs:subClassOf': 'co-emerges-with',
  'http://www.w3.org/2000/01/rdf-schema#subClassOf': 'co-emerges-with',
};

const DEFAULT_LABEL_PREDICATES = [
  'rdfs:label',
  'http://www.w3.org/2000/01/rdf-schema#label',
];

function defaultIsResource(term: string): boolean {
  if (/^https?:\/\//.test(term)) return true;
  // A prefixed name like `mw:Direction` or `ex:river` (not a free-text literal).
  return /^[A-Za-z][\w-]*:[\w./#-]+$/.test(term);
}

/** The local name of an IRI or prefixed term (after the last #, / or :). */
export function localName(term: string): string {
  const hash = term.lastIndexOf('#');
  if (hash >= 0) return term.slice(hash + 1);
  if (/^https?:\/\//.test(term)) {
    const slash = term.lastIndexOf('/');
    if (slash >= 0) return term.slice(slash + 1);
  }
  const colon = term.lastIndexOf(':');
  if (colon >= 0) return term.slice(colon + 1);
  return term;
}

/** Migrate RDF triples into a flat kinship graph. */
export function rdfToKinshipGraph(
  triples: RdfTriple[],
  options: MigrationOptions = {},
): KinshipGraph {
  const now = options.now ?? new Date().toISOString();
  const source = options.source;
  const predicateMap = { ...DEFAULT_PREDICATE_MAP, ...(options.predicateMap ?? {}) };
  const labelPredicates = new Set(options.labelPredicates ?? DEFAULT_LABEL_PREDICATES);
  const isResource = options.isResource ?? defaultIsResource;

  const nodeMap = new Map<string, RelationalNode>();
  const relations: Relation[] = [];
  let relSeq = 0;

  const ensureNode = (id: string): RelationalNode => {
    let n = nodeMap.get(id);
    if (!n) {
      // Every being lands on the same flat ontological layer.
      n = { id, name: id, type: 'knowledge', metadata: {}, created_at: now, updated_at: now };
      nodeMap.set(id, n);
    }
    return n;
  };

  for (const t of triples) {
    const subject = ensureNode(t.subject);

    // Literal object → an attribute on the subject node.
    if (!isResource(t.object)) {
      if (labelPredicates.has(t.predicate)) {
        subject.name = t.object;
      } else {
        subject.metadata[localName(t.predicate)] = t.object;
      }
      continue;
    }

    // Resource object → a named kinship relation.
    ensureNode(t.object);
    const local = localName(t.predicate);
    const kinship_type: KinshipEdgeName | undefined =
      predicateMap[t.predicate] ?? (isKinshipEdgeName(local) ? local : undefined);

    relations.push({
      id: `rel-${relSeq++}`,
      from_id: t.subject,
      to_id: t.object,
      relationship_type: local,
      ...(kinship_type ? { kinship_type } : {}),
      strength: 1,
      obligations: [],
      // Migrated relations are unverified until a steward honors them — an
      // honest default rather than assumed compliance/consent.
      ocap: {
        ownership: source ?? 'unknown',
        control: source ?? 'unknown',
        access: 'community',
        possession: 'community-server',
        compliant: false,
        steward: source,
      },
      accountability: {
        respect: 0,
        reciprocity: 0,
        responsibility: 0,
        wilson_alignment: 0,
        relations_honored: [],
      },
      ...(source ? { context: { authorized_by: source } } : {}),
      metadata: { source_predicate: t.predicate },
      created_at: now,
      updated_at: now,
    });
  }

  return { nodes: [...nodeMap.values()], relations };
}

function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Emit MERGE statements for a kinship graph (KuzuDB / openCypher). */
export function kinshipGraphToCypher(graph: KinshipGraph): string[] {
  const stmts: string[] = [];
  for (const n of graph.nodes) {
    stmts.push(
      `MERGE (n {id: '${esc(n.id)}'}) SET n.name = '${esc(n.name)}', n.type = '${esc(n.type)}'`,
    );
  }
  for (const r of graph.relations) {
    const type = r.kinship_type ?? r.relationship_type;
    stmts.push(
      `MATCH (a {id: '${esc(r.from_id)}'}), (b {id: '${esc(r.to_id)}'}) ` +
        `MERGE (a)-[:KINSHIP {type: '${esc(type)}'}]->(b)`,
    );
  }
  return stmts;
}

/** Emit newline-delimited JSON (one node/relation per line) for the JSONL store. */
export function kinshipGraphToJsonl(graph: KinshipGraph): string {
  const lines: string[] = [];
  for (const n of graph.nodes) lines.push(JSON.stringify({ kind: 'node', ...n }));
  for (const r of graph.relations) lines.push(JSON.stringify({ kind: 'relation', ...r }));
  return lines.join('\n');
}
