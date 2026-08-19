# ontology-core — RISE Specification

> Foundational ontology layer for the Medicine Wheel Developer Suite. It defines the closed core node vocabulary, first-class relations, governed kinship edges, ceremony and narrative types, runtime validation, directional constants, semantic queries, and additive domain kinds that ride existing nodes rather than widening the ontology casually.

**Version:** 0.6.3  
**Package:** `@medicine-wheel/ontology-core`  
**Document ID:** rispec-ontology-core-v2  
**Parity Baseline:** 2026-08-19

---

## Desired Outcome

Users create **relationally accountable software systems** through one shared ontological foundation that:

- treats relationships as beings with obligations, context, ceremony, consent, and accountability;
- keeps a small stable core ontology while allowing new domains to participate additively;
- distinguishes governed kinship vocabulary from free-form backward-compatible relationship labels;
- validates boundary-critical records at runtime;
- tracks Wilson alignment and OCAP® governance without reducing them to decorative metadata;
- supports narrative, infrastructure, production, and academic work without inventing a new top-level node type for every application domain.

---

## Structural Tension

**Desired state:** many Medicine Wheel packages can describe different worlds while still sharing one relational grammar.

**Current pressure:** every new domain naturally wants its own entity classes and bespoke schema, while an over-expanded core enum would make the ontology brittle and force every consumer to change.

**Natural resolution:** keep `NodeType` closed at six foundational kinds, then express domain-specific kinds through typed `metadata.kind` discriminators and specialized relation/facet contracts. Relations remain first-class and may additionally reference a governed kinship edge.

---

## Core Directions

```typescript
type DirectionName = 'east' | 'south' | 'west' | 'north';
```

`Direction` carries ceremonial teaching data including Ojibwe name, season, color, life stage, medicines, teachings, and practices.

Two directional vocabularies exist at different altitudes:

- `DIRECTIONS` / `DIRECTION_MAP` carry ceremonial and teaching information.
- `DIRECTION_INFO` carries working-session focus and guidance.

They are related but not interchangeable.

---

## Closed Node Ontology

```typescript
type NodeType =
  | 'human'
  | 'land'
  | 'spirit'
  | 'ancestor'
  | 'future'
  | 'knowledge';

interface RelationalNode {
  id: string;
  name: string;
  type: NodeType;
  direction?: DirectionName;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

The six-value `NodeType` union is intentionally closed. New application domains normally ride these nodes through a typed `metadata.kind` discriminator rather than widening the union.

---

## Relations as First-Class Beings

A simple `RelationalEdge` remains available for compatibility and lightweight graph operations. The richer `Relation` is the relational-first entity.

```typescript
interface Relation {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  kinship_type?: KinshipEdgeName;
  strength: number;
  direction?: DirectionName;
  ceremony_context?: {
    ceremony_id?: string;
    ceremony_type?: CeremonyType;
    ceremony_honored: boolean;
  };
  obligations: RelationalObligation[];
  ocap: OcapFlags;
  accountability: AccountabilityTracking;
  context?: RelationContext;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

`relationship_type` remains free-form for compatibility. `kinship_type` optionally points into the governed kinship registry so software can reason about symmetry, inverse direction, and default obligations without turning kinship into a class hierarchy.

### Relation Context

```typescript
interface RelationContext {
  authorized_by?: string;
  active_context?: string;
  valid_when?: string;
  forbidden_when?: string;
  authorized_kin?: string[];
}
```

Context answers a different question from edge identity: **where, when, and for whom does this relation hold?** Protocol guards may use this information to permit, refuse, or escalate traversal.

---

## Governed Kinship Vocabulary

Kinship edges are data in a registry, not subclasses. Named edges include vocabulary such as `tends-to`, `speaks-with`, `holds-responsibility-for`, and `co-emerges-with`, plus RSIS relation verbs.

The registry supports:

- checking whether a name is governed;
- determining symmetry/asymmetry;
- resolving an inverse edge when one exists;
- carrying default obligation categories.

This lets the graph remain non-hierarchical while still providing semantic discipline.

---

## OCAP® and Consent State

```typescript
interface OcapFlags {
  ownership: string;
  control: string;
  access: 'community' | 'researchers' | 'public' | 'restricted';
  possession: 'on-premise' | 'community-server' | 'cloud-sovereign' | 'cloud-shared';
  compliant: boolean;
  steward?: string;
  consent_given?: boolean;
  consent_scope?: string;
  consent_state?: 'active' | 'withdrawn' | 'expired' | 'pending';
  consent_last_affirmed?: string;
}
```

Consent is therefore not represented only as a historical boolean. The ontology can carry its current state and the last affirmation time while preserving earlier compatibility fields.

---

## Wilson Accountability

```typescript
interface AccountabilityTracking {
  respect: number;
  reciprocity: number;
  responsibility: number;
  wilson_alignment: number;
  relations_honored: string[];
  last_ceremony_id?: string;
  notes?: string;
}
```

Scores are bounded from 0 to 1 at validated boundaries. Query helpers can compute and aggregate Wilson alignment and surface accountability gaps.

---

## Ceremony Model

```typescript
type CeremonyType =
  | 'smudging'
  | 'talking_circle'
  | 'spirit_feeding'
  | 'opening'
  | 'closing';
```

`CeremonyLog` records direction, participants, medicines, intentions, timestamp, optional research context, honored relations, and optional OCAP governance.

This ceremony vocabulary is distinct from the RSIS four-phase `CeremonyPhase` vocabulary (`opening`, `council`, `integration`, `closure`) and from the five ceremonial-diary phases owned by the persistence/domain layer. Similar words do not make these phase systems interchangeable.

---

## Narrative Model

A narrative beat now carries both story content and lineage/provenance.

```typescript
interface NarrativeBeat {
  id: string;
  direction: DirectionName;
  title: string;
  description: string;
  prose?: string;
  ceremonies: string[];
  learnings: string[];
  timestamp: string;
  act: number;
  relations_honored: string[];
  cycle_id?: string;
  parent_beat_id?: string;
  sub_beats?: string[];
  origin?: BeatOrigin;
}

interface BeatOrigin {
  producer: string;
  source_ref?: string;
  method?: string;
}
```

Beat telescoping can therefore preserve parent/sub-beat relations, and generated or witnessed beats can identify how they entered the wheel.

---

## Structural Tension Model

```typescript
type TensionPhase = 'germination' | 'assimilation' | 'completion';
```

`StructuralTensionChart` holds desired outcome, current reality, action steps, phase, optional direction, and timestamps. Action steps may themselves carry a direction and due date.

---

## Epistemic and Axiological Dimensions

```typescript
type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';
type AxiologicalPillar = 'ontology' | 'epistemology' | 'methodology' | 'axiology';
```

These types give other packages a shared vocabulary for the relational origin of knowledge and Wilson's four research-paradigm pillars.

---

## Specialized Relation Families

The ontology includes additive relation subtypes that preserve the first-class `Relation` contract:

- `LandRelation` — land kinship, teaching, and stewardship;
- `AncestorRelation` — ancestor teaching, obligation, and lineage;
- `FutureRelation` — future obligation, gift, and teaching;
- `CosmicRelation` — cosmic/spirit kinship, teaching, and reciprocity;
- `ProductionRelation` — film/media relationships such as shot-of, rush-of, sequence-of, witnessed-by, directed-by, and sounds-in;
- `AcademicRelation` — academic relationships including researches-in, appointed-at, supervises-in, field-aligns-with, profiled-in, and corresponds-with.

Specialization adds domain meaning without replacing the relational obligations, OCAP data, accountability, and context inherited from `Relation`.

---

## Additive Entity Kinds

### Production

```typescript
type ProductionEntityKind =
  | 'shot'
  | 'rush'
  | 'sequence'
  | 'scene'
  | 'recording'
  | 'collaborator'
  | 'edit-brief';
```

Production entities ride `knowledge`/other existing nodes as appropriate; they do not become new `NodeType` values.

### Infrastructure

```typescript
type InfraEntityKind = 'host' | 'tenant' | 'service';
```

Canonical binding:

- host → `land`, no imposed direction;
- tenant → `human`, south;
- service → `knowledge`, west.

The binding is a typed constant so a future change to the closed `NodeType` union cannot drift silently from infrastructure semantics.

### Academic

```typescript
type AcademicEntityKind =
  | 'faculty'
  | 'research-field'
  | 'program'
  | 'institution';
```

Canonical binding:

- faculty → `human`, south;
- research-field → `knowledge`, east;
- program → `knowledge`, south;
- institution → `land`, no imposed direction.

Academic appointment state includes `full-time`, `part-time`, `tenure-track`, `tenured`, `affiliated`, `emeritus`, and the explicit epistemic value `unverified`.

A claim that has not earned a stronger status must remain `unverified`; absence of proof is not silently upgraded.

---

## Runtime Validation

Zod schemas validate the boundary-critical ontology, including:

- directions, node types, ceremony types, obligation categories, tension phases;
- epistemic sources and axiological pillars;
- consent state, access, and possession;
- governed kinship-edge names and descriptors;
- relational nodes, simple edges, first-class relations, relation context, obligations, OCAP data, and accountability;
- ceremony guidance and logs;
- narrative beats and beat origin;
- cycles, action steps, structural-tension charts, and direction responses.

The specification does **not** claim that every TypeScript interface has a one-to-one Zod schema. Validation coverage is an explicit boundary contract, not a slogan.

---

## Semantic Query Helpers

Pure helpers operate over in-memory collections and do not own persistence.

They include:

- node lookup by id, type, and direction;
- relation lookup by node and relationship type;
- neighbor discovery and bounded relational traversal;
- Wilson alignment computation and aggregation;
- accountability-gap discovery;
- OCAP compliance checks and audits;
- narrative beat filtering and direction completeness;
- ceremony filtering/counting;
- relational completeness analysis.

Persistence belongs outside ontology-core.

---

## RDF Interop

The **kinship graph is primary**. RDF/OWL remains an optional serialization and interoperability adapter, not the ontology backbone.

Medicine Wheel domain namespaces include `mw:`, `cer:`, `ocap:`, `rel:`, `ids:`, and `beat:`. Standard semantic-web namespaces and IRI utilities are exposed through the RDF interop adapter, with compatibility exports retained at the package root.

---

## Creative Advancement Scenarios

### Scenario: Infrastructure enters the relational web

**Desired Outcome:** Represent a host, tenant, and service without creating a parallel machine ontology.  
**Current Reality:** Machine details need typed meaning, but the core node union is intentionally small.  
**Natural Progression:** Bind infrastructure kinds onto existing land/human/knowledge nodes and let the infrastructure package hold machine facets keyed by node id.  
**Resolution:** Infrastructure becomes queryable relationally without widening `NodeType`.

### Scenario: A relation is valid only in a circle

**Desired Outcome:** Traverse a relationship only where its authorization holds.  
**Current Reality:** Edge identity alone cannot express who authorized it or where it is valid.  
**Natural Progression:** Attach `RelationContext`; a protocol guard evaluates active/forbidden context and authorized kin.  
**Resolution:** The same graph can preserve a relation without pretending it is universally traversable.

### Scenario: Academic outreach remains evidence-grounded

**Desired Outcome:** Represent a faculty relationship without turning an uncertain appointment into a fact.  
**Current Reality:** A profile may establish identity and field alignment while appointment status remains unclear.  
**Natural Progression:** Register the academic entity and relation with grounding; retain appointment as `unverified` until evidence supports a stronger value.  
**Resolution:** The wheel can hold the relationship and its uncertainty at the same time.

---

## Quality Criteria

- The six-value `NodeType` union remains the foundational node ontology unless an explicit ontology revision changes it.
- New domain kinds prefer additive discriminators and typed bindings over casual union expansion.
- `Relation` preserves obligations, OCAP governance, accountability, and optional authorization context.
- Governed kinship names coexist with the backward-compatible free-string relationship field.
- Narrative provenance and beat hierarchy survive serialization and validation.
- Consent state can be represented independently of historical consent booleans.
- RDF remains an interoperability adapter, not a replacement for the kinship graph.
- Validation claims match the schemas actually exported.

---

## Implementation Evidence Appendix

This appendix keeps parity auditable while the normative sections remain re-implementable.

- Core types and additive kinds: `src/ontology-core/src/types.ts`
- Runtime schemas: `src/ontology-core/src/schemas.ts`
- Kinship registry: `src/ontology-core/src/kinship.ts`
- Direction/RSIS constants: `src/ontology-core/src/constants.ts`
- Semantic queries: `src/ontology-core/src/queries.ts`
- RDF adapter: `src/ontology-core/src/rdf-interop.ts`
- Package exports/version: `src/ontology-core/package.json`
