/**
 * @medicine-wheel/ontology-core — RDF Vocabulary
 *
 * Namespace IRIs and predicate constants for Medicine Wheel concepts,
 * bridging Indigenous relational ontology with semantic web standards.
 *
 * Namespaces:
 *   mw:   — Medicine Wheel core concepts
 *   ids:  — Indigenous Data Sovereignty
 *   ocap: — OCAP® (Ownership, Control, Access, Possession)
 *   rel:  — Relational accountability (Wilson)
 *   cer:  — Ceremony and protocol
 */

// ── Namespace IRIs ──────────────────────────────────────────────────────────

export const MW_NS = 'https://ontology.medicine-wheel.dev/mw#' as const;
export const IDS_NS = 'https://ontology.medicine-wheel.dev/ids#' as const;
export const OCAP_NS = 'https://ontology.medicine-wheel.dev/ocap#' as const;
export const REL_NS = 'https://ontology.medicine-wheel.dev/rel#' as const;
export const CER_NS = 'https://ontology.medicine-wheel.dev/cer#' as const;
export const BEAT_NS = 'https://ontology.medicine-wheel.dev/beat#' as const;

// Standard ontology namespaces for interop
export const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' as const;
export const RDFS_NS = 'http://www.w3.org/2000/01/rdf-schema#' as const;
export const OWL_NS = 'http://www.w3.org/2002/07/owl#' as const;
export const SKOS_NS = 'http://www.w3.org/2004/02/skos/core#' as const;
export const PROV_NS = 'http://www.w3.org/ns/prov#' as const;
export const SHACL_NS = 'http://www.w3.org/ns/shacl#' as const;

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

// ── Medicine Wheel Classes (mw:) ───────────────────────────────────────────

export const MW = {
  // Directions
  Direction: `${MW_NS}Direction`,
  East: `${MW_NS}East`,
  South: `${MW_NS}South`,
  West: `${MW_NS}West`,
  North: `${MW_NS}North`,

  // Core entities
  RelationalNode: `${MW_NS}RelationalNode`,
  RelationalEdge: `${MW_NS}RelationalEdge`,
  Relation: `${MW_NS}Relation`,
  NarrativeBeat: `${MW_NS}NarrativeBeat`,
  MedicineWheelCycle: `${MW_NS}MedicineWheelCycle`,
  StructuralTensionChart: `${MW_NS}StructuralTensionChart`,

  // Node types
  Human: `${MW_NS}Human`,
  Land: `${MW_NS}Land`,
  Spirit: `${MW_NS}Spirit`,
  Ancestor: `${MW_NS}Ancestor`,
  Future: `${MW_NS}Future`,
  Knowledge: `${MW_NS}Knowledge`,

  // Properties
  direction: `${MW_NS}direction`,
  ojibweName: `${MW_NS}ojibweName`,
  season: `${MW_NS}season`,
  lifeStage: `${MW_NS}lifeStage`,
  ages: `${MW_NS}ages`,
  medicine: `${MW_NS}medicine`,
  teaching: `${MW_NS}teaching`,
  practice: `${MW_NS}practice`,
  act: `${MW_NS}act`,
  color: `${MW_NS}color`,
  nodeType: `${MW_NS}nodeType`,
  strength: `${MW_NS}strength`,
  wilsonAlignment: `${MW_NS}wilsonAlignment`,

  // Structural tension
  desiredOutcome: `${MW_NS}desiredOutcome`,
  currentReality: `${MW_NS}currentReality`,
  actionStep: `${MW_NS}actionStep`,
  tensionPhase: `${MW_NS}tensionPhase`,
} as const;

// ── Ceremony Classes (cer:) ────────────────────────────────────────────────

export const CER = {
  Ceremony: `${CER_NS}Ceremony`,
  Smudging: `${CER_NS}Smudging`,
  TalkingCircle: `${CER_NS}TalkingCircle`,
  SpiritFeeding: `${CER_NS}SpiritFeeding`,
  Opening: `${CER_NS}Opening`,
  Closing: `${CER_NS}Closing`,

  // Properties
  ceremonyType: `${CER_NS}ceremonyType`,
  participant: `${CER_NS}participant`,
  medicineUsed: `${CER_NS}medicineUsed`,
  intention: `${CER_NS}intention`,
  researchContext: `${CER_NS}researchContext`,
  ceremonyHonored: `${CER_NS}ceremonyHonored`,
} as const;

// ── OCAP® Classes (ocap:) ─────────────────────────────────────────────────

export const OCAP = {
  OcapPolicy: `${OCAP_NS}OcapPolicy`,

  // The four OCAP® principles
  ownership: `${OCAP_NS}ownership`,
  control: `${OCAP_NS}control`,
  access: `${OCAP_NS}access`,
  possession: `${OCAP_NS}possession`,

  // Governance
  compliant: `${OCAP_NS}compliant`,
  steward: `${OCAP_NS}steward`,
  consentGiven: `${OCAP_NS}consentGiven`,
  consentScope: `${OCAP_NS}consentScope`,
  dataLocation: `${OCAP_NS}dataLocation`,
} as const;

// ── Relational Accountability (rel:) ───────────────────────────────────────

export const REL = {
  RelationalAccountability: `${REL_NS}RelationalAccountability`,

  // Wilson's three R's
  respect: `${REL_NS}respect`,
  reciprocity: `${REL_NS}reciprocity`,
  responsibility: `${REL_NS}responsibility`,

  // Obligation categories
  obligationCategory: `${REL_NS}obligationCategory`,
  humanObligation: `${REL_NS}humanObligation`,
  landObligation: `${REL_NS}landObligation`,
  spiritObligation: `${REL_NS}spiritObligation`,
  futureObligation: `${REL_NS}futureObligation`,

  // Tracking
  relationsHonored: `${REL_NS}relationsHonored`,
  accountabilityScore: `${REL_NS}accountabilityScore`,
} as const;

// ── Indigenous Data Sovereignty (ids:) ─────────────────────────────────────

export const IDS = {
  DataSovereigntyPolicy: `${IDS_NS}DataSovereigntyPolicy`,

  // Governance
  communityAuthority: `${IDS_NS}communityAuthority`,
  treatyRelationship: `${IDS_NS}treatyRelationship`,
  territorialScope: `${IDS_NS}territorialScope`,
  protocolReference: `${IDS_NS}protocolReference`,
} as const;

// ── Narrative Beats (beat:) ────────────────────────────────────────────────

export const BEAT = {
  Beat: `${BEAT_NS}Beat`,
  Arc: `${BEAT_NS}Arc`,

  // Properties
  title: `${BEAT_NS}title`,
  description: `${BEAT_NS}description`,
  prose: `${BEAT_NS}prose`,
  learning: `${BEAT_NS}learning`,
  relationsHonored: `${BEAT_NS}relationsHonored`,
} as const;

/**
 * Generate a prefixed IRI string (e.g., "mw:Direction")
 */
export function prefixed(namespace: keyof typeof PREFIXES, localName: string): string {
  return `${namespace}:${localName}`;
}

/**
 * Expand a prefixed IRI to full form (e.g., "mw:Direction" → full IRI)
 */
export function expandIRI(prefixedIRI: string): string {
  const [prefix, local] = prefixedIRI.split(':');
  const ns = PREFIXES[prefix as keyof typeof PREFIXES];
  if (!ns) throw new Error(`Unknown prefix: ${prefix}`);
  return `${ns}${local}`;
}

/**
 * Compact a full IRI to prefixed form if possible
 */
export function compactIRI(fullIRI: string): string {
  for (const [prefix, ns] of Object.entries(PREFIXES)) {
    if (fullIRI.startsWith(ns)) {
      return `${prefix}:${fullIRI.slice(ns.length)}`;
    }
  }
  return fullIRI;
}
