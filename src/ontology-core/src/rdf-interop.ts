/**
 * @medicine-wheel/ontology-core — RDF Interop Adapter (OPTIONAL)
 *
 * Standard semantic-web namespaces and IRI utilities. This module is an
 * OPTIONAL serialization/interop adapter — NOT the backbone of the ontology.
 *
 * The non-hierarchical kinship graph is primary (see `kinship.ts`): beings are
 * co-equal and relations carry the meaning through named, context-bound edges.
 * RDF/OWL is provided here only for interop with triple stores and
 * knowledge-graph ecosystems. Nothing in the kinship core imports this module —
 * importing it is a deliberate choice to serialize OUT to the semantic web.
 */
import { MW_NS, IDS_NS, OCAP_NS, REL_NS, CER_NS, BEAT_NS } from './vocabulary';

// Standard ontology namespaces for interop
export const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' as const;
export const RDFS_NS = 'http://www.w3.org/2000/01/rdf-schema#' as const;
export const OWL_NS = 'http://www.w3.org/2002/07/owl#' as const;
export const SKOS_NS = 'http://www.w3.org/2004/02/skos/core#' as const;
export const PROV_NS = 'http://www.w3.org/ns/prov#' as const;
export const SHACL_NS = 'http://www.w3.org/ns/shacl#' as const;

/** Combined prefix map: Medicine Wheel domain namespaces + standard interop. */
export const PREFIXES = {
  mw: MW_NS,
  ids: IDS_NS,
  ocap: OCAP_NS,
  rel: REL_NS,
  cer: CER_NS,
  beat: BEAT_NS,
  rdf: RDF_NS,
  rdfs: RDFS_NS,
  owl: OWL_NS,
  skos: SKOS_NS,
  prov: PROV_NS,
  sh: SHACL_NS,
} as const;

/** Generate a prefixed IRI string (e.g., "mw:Direction"). */
export function prefixed(namespace: keyof typeof PREFIXES, localName: string): string {
  return `${namespace}:${localName}`;
}

/** Expand a prefixed IRI to full form (e.g., "mw:Direction" → full IRI). */
export function expandIRI(prefixedIRI: string): string {
  const [prefix, local] = prefixedIRI.split(':');
  const ns = PREFIXES[prefix as keyof typeof PREFIXES];
  if (!ns) throw new Error(`Unknown prefix: ${prefix}`);
  return `${ns}${local}`;
}

/** Compact a full IRI to prefixed form if possible. */
export function compactIRI(fullIRI: string): string {
  for (const [prefix, ns] of Object.entries(PREFIXES)) {
    if (fullIRI.startsWith(ns)) {
      return `${prefix}:${fullIRI.slice(ns.length)}`;
    }
  }
  return fullIRI;
}
