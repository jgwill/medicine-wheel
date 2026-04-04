# Research: Ontological Alignment — Wilson × Medicine Wheel Packages

> **Scope:** Ontological alignment only — how data models and type systems embody Wilson's relational ontology. Epistemology, axiology, and methodology are handled by other research agents.
>
> **Packages Analyzed:** `ontology-core`, `data-store`, `relational-query`
> **Date:** 2026-03-14
> **Source Text:** Shawn Wilson, *Research Is Ceremony: Indigenous Research Methods* (2008)

---

## Executive Summary

- **The `Relation` type in ontology-core is a genuine ontological achievement.** It elevates relationships from labeled graph edges to first-class entities carrying obligations, ceremony context, OCAP® governance, and Wilson accountability tracking — directly embodying Wilson's claim that "relations are first-class beings with their own obligations, protocols, ceremonies."
- **A critical structural gap persists between ontology-core and data-store:** the rich `Relation` type exists in the type system but has *no persistence path*. The data-store only stores `RelationalEdge` (simple edges), meaning the full relational ontology evaporates at the storage boundary. This is the single most urgent architectural deficiency.
- **Ceremony-bounded traversal in relational-query is ontologically profound.** The ability to halt graph traversal at unhonored ceremony boundaries (`respectCeremonyBoundaries: true`) and restrict paths to OCAP-compliant relations (`ocapOnly: true`) means the system enforces Wilson's principle that knowledge requires relational protocol — not just models it.
- **The model remains fundamentally node-centric despite relational aspirations.** Nodes have primary identity (IDs, storage keys, lookup functions); relations derive identity from the nodes they connect (`from_id`/`to_id`, Redis key `edge:{from}:{to}`). Wilson's ontology demands the inverse: reality *is* the relationships, and entities emerge from relational webs.
- **Wilson's six relation types are partially mapped but structurally incomplete.** The `NodeType` taxonomy (`human | land | spirit | ancestor | future | knowledge`) covers five of Wilson's six relation domains (people, land/environment, ancestors, future generations, ideas/knowledge) but conflates "cosmos" with "spirit" and cannot model multi-party or relation-to-relation connections.

---

## Detailed Analysis

### ontology-core: Relational Type System

#### The `Relation` Interface — Where Wilson Lives in Code

The centerpiece of ontological alignment is the `Relation` interface (`types.ts`, lines 122–150). This is not a graph edge. It is, in Wilson's language, a being:

```typescript
export interface Relation {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;                    // 0–1
  direction?: DirectionName;
  ceremony_context?: {
    ceremony_id?: string;
    ceremony_type?: CeremonyType;
    ceremony_honored: boolean;
  };
  obligations: RelationalObligation[]; // categorized: human/land/spirit/future
  ocap: OcapFlags;                     // Ownership, Control, Access, Possession
  accountability: AccountabilityTracking; // Wilson's three R's
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

What makes this ontologically significant:

1. **Obligations are categorized by relational domain** (`types.ts`, lines 75–80). The `ObligationCategory` type (`'human' | 'land' | 'spirit' | 'future'`) directly maps Wilson's relational web — every relation carries explicit obligations to multiple domains of being. This is not decoration; it is structural.

2. **Ceremony context is embedded in every relation** (`types.ts`, lines 135–139). The `ceremony_honored` boolean is a gate: a relation without ceremony is ontologically incomplete. This maps Wilson's assertion that relations require ceremonial protocol to be fully enacted.

3. **OCAP® as ontological governance** (`types.ts`, lines 82–99). The `OcapFlags` interface embeds data sovereignty *within* the relation itself — ownership, control, access, possession, consent. In Wilson's terms, the relation carries its own governance protocols.

4. **Wilson's three R's as quantifiable scores** (`types.ts`, lines 101–114). The `AccountabilityTracking` interface stores respect, reciprocity, and responsibility as 0–1 scores, plus a computed `wilson_alignment` aggregate. Relations are not just present or absent — they have measurable relational health.

#### The `RelationalEdge` Problem — Two Ontologies Coexist

A critical tension: `RelationalEdge` (`types.ts`, lines 59–68) and `Relation` (`types.ts`, lines 122–150) model the same concept at different ontological depths:

| Feature | `RelationalEdge` | `Relation` |
|---------|-------------------|------------|
| Own ID | ✅ | ✅ |
| Obligations | `string[]` (flat) | `RelationalObligation[]` (categorized) |
| OCAP® governance | ❌ | ✅ full `OcapFlags` |
| Wilson accountability | ❌ | ✅ full `AccountabilityTracking` |
| Ceremony context | `boolean` only | Full ceremony context object |
| Direction alignment | ❌ | ✅ |

This dual type system means any function accepting `RelationalEdge` can silently bypass all relational accountability. It creates an escape hatch from Wilson's ontology — a structural backdoor to Western extractive data patterns. Functions in `data-store` (all edge operations) and much of `relational-query` (`filterEdges`, `shortestPath`, `filterByRelation`, `relationCounts`) operate on `RelationalEdge`, not `Relation`.

#### NodeType Taxonomy vs. Wilson's Six Relations

Wilson identifies six domains of relation: (1) people, (2) land/environment, (3) cosmos, (4) ideas, (5) ancestors, (6) future generations. The `NodeType` (`types.ts`, line 39–45) maps:

| Wilson's Domain | NodeType | Alignment |
|----------------|----------|-----------|
| People | `'human'` | ✅ Direct |
| Land/Environment | `'land'` | ✅ Direct |
| Cosmos | `'spirit'` | ⚠️ Conflated — spirit ≠ cosmos |
| Ideas | `'knowledge'` | ✅ Adequate |
| Ancestors | `'ancestor'` | ✅ Direct |
| Future Generations | `'future'` | ✅ Direct |

The "cosmos" domain — relations with stars, seasons, cardinal directions, the more-than-human universe — is collapsed into "spirit." Wilson distinguishes spiritual relations from cosmic relations; the type system does not.

#### RDF Vocabulary — Semantic Bridge

The vocabulary module (`vocabulary.ts`) creates six custom RDF namespaces:

- `mw:` — Core Medicine Wheel concepts
- `cer:` — Ceremony and protocol
- `ocap:` — OCAP® principles
- `rel:` — Relational accountability (Wilson)
- `ids:` — Indigenous Data Sovereignty
- `beat:` — Narrative beats

The `rel:` namespace (`vocabulary.ts`, lines 554–572) is particularly significant. It creates semantic web predicates for Wilson's three R's (`rel:respect`, `rel:reciprocity`, `rel:responsibility`) and obligation categories (`rel:humanObligation`, `rel:landObligation`, `rel:spiritObligation`, `rel:futureObligation`). This means relational accountability is not just a TypeScript construct — it can interoperate with RDF/OWL knowledge graph ecosystems.

The `ids:` namespace (`vocabulary.ts`, lines 576–584) creates predicates for Indigenous Data Sovereignty (`ids:communityAuthority`, `ids:treatyRelationship`, `ids:territorialScope`, `ids:protocolReference`). These exist in the vocabulary but have **no corresponding TypeScript types or interfaces** — they are semantic placeholders without implementation.

#### Zod Schemas — Validation as Ontological Guard

The `RelationSchema` (`schemas.ts`, lines 744–758) enforces the full `Relation` structure at runtime validation boundaries. This is important: any data entering the system through a Zod-validated path must carry OCAP flags, accountability tracking, and categorized obligations. The schema does not allow partial relations.

However, `RelationalEdgeSchema` (`schemas.ts`, lines 699–708) validates the lightweight edge type — meaning data can enter through the "thin" ontological path and bypass relational accountability validation entirely.

#### Semantic Query Helpers — Relational Intelligence

The `queries.ts` module contains genuinely Wilson-aligned computation:

- **`relationalCompleteness()`** (`queries.ts`, lines 1335–1368) — Assesses whether a node has obligations across all four categories (human, land, spirit, future). This directly operationalizes Wilson's web: an entity is "complete" only when relationally connected across all domains.

- **`findAccountabilityGaps()`** (`queries.ts`, lines 1211–1218) — Finds relations where Wilson alignment drops below a threshold. Accountability gaps are not just data quality issues — they are relational health indicators.

- **`computeWilsonAlignment()`** (`queries.ts`, lines 1175–1179) — Simple average of respect, reciprocity, responsibility. While straightforward, the equal weighting assumes the three R's are always equally important, which Wilson might dispute in context-specific situations.

- **`checkOcapCompliance()`** (`queries.ts`, lines 1227–1250) — Validates OCAP flags and returns specific issues. Notably, it checks `consent_given === false` as a compliance violation — consent is not optional.

---

### data-store: Relational Persistence

#### The Ontological Flattening Problem

The most critical ontological gap in the entire system exists here: **the data-store cannot persist first-class Relations.**

The `store.ts` module (`data-store/store.ts`, lines 35–44) defines its own `RelationalEdge` interface that lacks:
- OCAP flags
- Wilson accountability tracking
- Categorized obligations (uses flat `string[]`)
- Full ceremony context
- Direction alignment

The `createEdge()` function (`store.ts`, lines 171–185) serializes edges to Redis as:
```
edge:{from_id}:{to_id} → { from_id, to_id, relationship_type, strength, ceremony_honored, obligations: JSON.stringify(...), created_at }
```

This means:
1. **Edge identity derives from nodes** — the Redis key is `edge:{from}:{to}`, not `edge:{own_id}`. Relations have no independent identity in storage. They exist only as connections between nodes.
2. **Obligations flatten to opaque JSON** — `JSON.stringify(edge.obligations)` destroys the categorical structure. You cannot query Redis for "all edges with land obligations" without deserializing every edge.
3. **No OCAP at the storage layer** — Despite rich OCAP types in ontology-core, the persistence layer stores no ownership, control, access, or possession metadata for edges.
4. **No Wilson scores on edges** — Accountability tracking doesn't reach persistence for individual relations.

The `AccountabilityData` interface in store.ts (`store.ts`, lines 57–63) is separate from Wilson's `AccountabilityTracking` — it has `wilson_score` (singular number), `ocap_compliant` (boolean), `elders_consulted`, `community_approval`, and `last_audit`. This is a *different* accountability model than what ontology-core defines. The two don't share types.

#### What Persistence Gets Right

1. **Ceremony as a first-class persistent entity** (`store.ts`, lines 229–300) — Ceremonies have their own Redis hashes with directional indexing (`ceremonies:direction:{dir}`), type indexing (`ceremonies:type:{type}`), and a sorted timeline (`ceremonies:timeline`). Ceremonies are not afterthoughts in storage; they are primary.

2. **Session-ceremony bidirectional linking** (`session-link.ts`, lines 555–605) — The `linkSessionToCeremony()` function creates bidirectional Redis sets (`ceremony-sessions:{id}` ↔ `session-ceremony:{id}`). This means any work session can be connected to the ceremonies that frame it. This honors Wilson's principle that research/work occurs within ceremonial context.

3. **Relational web traversal** (`store.ts`, lines 308–333) — `getRelationalWeb()` performs BFS from a center node, collecting connected nodes and edges up to a configurable depth. This acknowledges that knowledge exists in webs, not isolation.

#### Connection Management — Ontological Neutrality

The `connection.ts` module is ontologically neutral — it manages Redis connections with detection for Upstash, Vercel KV, and local Redis. This is appropriate: infrastructure should not embed ontological assumptions. However, there is no ceremony-gated access pattern at the connection level. Any code with a Redis connection can access any data — OCAP® flags are not enforced at the persistence layer.

---

### relational-query: Relational Traversal

#### Ceremony-Bounded Traversal — The Ontological High Point

The `traverse()` function in `traversal.ts` (lines 271–372) implements something genuinely unprecedented in graph query libraries: **traversal that respects ceremonial boundaries**.

```typescript
if (options.respectCeremonyBoundaries && !edge.ceremony_honored) {
  continue; // BFS stops at unhonored edges
}
```

This single conditional statement (`traversal.ts`, line 338–339) embodies a core Wilson principle: **not all knowledge is freely traversable**. Some relations require ceremony before they can be followed. In Western graph databases, the entire graph is always accessible. Here, the graph's traversability depends on relational protocol status.

Similarly, OCAP-only traversal (`traversal.ts`, lines 287–299) restricts paths to relations whose OCAP flags pass compliance checks. Data sovereignty is not a post-hoc filter — it shapes what paths are even visible.

#### The Accountability Audit — Relational Health as First-Class Concern

The `auditAccountability()` function (`audit.ts`, lines 466–542) produces a comprehensive `AccountabilityReport` covering:

- OCAP compliance counts
- Average Wilson alignment across all relations
- Direction coverage (which of the four directions are represented)
- Ceremony honoring ratios
- Outstanding obligation counts
- Generated recommendations in natural language

This treats relational health as a system-level metric, not a per-relation afterthought. The recommendations are actionable: "3 relation(s) lack full OCAP® compliance — review ownership, control, access, and possession flags."

The `relationsNeedingAttention()` function (`audit.ts`, lines 550–559) specifically identifies relations that are either OCAP-noncompliant or below Wilson alignment thresholds. This is *proactive relational care* — the system tells you where attention is needed.

#### Where Query Falls Back to Western Patterns

1. **`shortestPath()` is ceremony-blind** (`traversal.ts`, lines 375–423) — It accepts only `RelationalNode[]` and `RelationalEdge[]`, not `Relation[]`. There are no ceremony boundary or OCAP options. The shortest path is computed purely by graph distance, ignoring relational protocol entirely. In Wilson's ontology, the "shortest" path may not be the appropriate path.

2. **Traversal results are node-centric** — `TraversalResult` returns `paths: TraversalPath[]` where each path is `{ nodes: RelationalNode[], edges: RelationalEdge[], depth: number }`. Paths are defined by the sequence of nodes visited. A Wilson-aligned traversal would foreground the relations traversed, with nodes as emergent context.

3. **`filterByRelation()` and `relationCounts()`** (`query.ts`, lines 139–176) operate on `RelationalEdge`, not `Relation`. These utility functions treat relations as thin connectors between nodes — exactly the Western graph pattern Wilson critiques.

4. **Cypher builders are entity-first** (`cypher.ts`) — Every Cypher query begins with `MATCH (entity)` and follows edges to other entities. Relations are edge labels with properties, not queryable entities. This is a KuzuDB/Neo4j structural constraint, but it reveals how the graph database model itself imposes Western ontology.

---

## Strengths (What Wilson Would Affirm)

1. **First-class `Relation` type with obligations, ceremony, OCAP, and accountability** (`ontology-core/types.ts`, lines 122–150). Wilson: "Relations are beings with their own obligations and protocols." The code embodies this.

2. **Categorized relational obligations** (`ontology-core/types.ts`, lines 75–80). Obligations to humans, land, spirit, and future generations are structurally distinct — not a flat list but a domain-aware taxonomy.

3. **Ceremony-bounded graph traversal** (`relational-query/traversal.ts`, lines 338–339). Knowledge access requires relational protocol. This is Wilson's ceremony-as-methodology encoded as a traversal constraint.

4. **OCAP® governance embedded in relations** (`ontology-core/types.ts`, lines 82–99). Data sovereignty is not an external policy layer — it is woven into every relation's structure. Wilson insists that Indigenous data carries its own governance.

5. **Wilson alignment as computable, auditable metrics** (`ontology-core/queries.ts`, lines 1175–1250). Respect, reciprocity, and responsibility are quantified and aggregated. `findAccountabilityGaps()` proactively identifies where relational health needs attention.

6. **Relational completeness assessment** (`ontology-core/queries.ts`, lines 1335–1368). A node's completeness is measured by whether it maintains obligations across all four relational domains — not by how much data it holds.

7. **Dedicated RDF namespaces for relational accountability and Indigenous governance** (`ontology-core/vocabulary.ts`, lines 554–584). Wilson's concepts are not just TypeScript types — they are semantic web ontology terms with stable IRIs.

8. **Accountability audit with natural-language recommendations** (`relational-query/audit.ts`, lines 466–542). The system doesn't just compute metrics — it tells you what to do about them. "Consider honoring these connections" is an invitational, not extractive, prompt.

9. **Session-ceremony bidirectional linking** (`data-store/session-link.ts`). Work sessions and ceremonies are permanently connected. Every act of creation can be traced to its ceremonial context.

10. **Cultural grounding in Ojibwe language and medicine teachings** (`ontology-core/constants.ts`, lines 880–925). Direction definitions include Ojibwe names (Waabinong, Zhaawanong, Epangishmok, Kiiwedinong), sacred medicines (Tobacco/Asemaa, Cedar/Giizhik, Sage/Mashkodewashk), life stages, and ceremonial practices. This is not decorative — it anchors the ontology in specific cultural knowledge.

---

## Gaps (Where Western Ontology Creeps In)

1. **Node-centric identity model.** Nodes have independent IDs and storage keys (`node:{id}`). Relations derive identity from node pairs (`edge:{from}:{to}`). Wilson's ontology inverts this: entities emerge from relations, not the reverse. The current model treats nodes as primary and relations as derivative.

2. **`RelationalEdge` escape hatch.** The existence of a lightweight edge type without OCAP, Wilson accountability, or categorized obligations means code can create, persist, and traverse relations that bypass all relational accountability. Every function that accepts `RelationalEdge` instead of `Relation` is a structural backdoor.

3. **Data-store cannot persist `Relation` objects.** The richest ontological type has no storage path. `createEdge()` stores `RelationalEdge`; there is no `createRelation()` or `storeRelation()`. The relational ontology exists at the type level but evaporates at the persistence boundary.

4. **Binary `from_id`/`to_id` relation model.** All relations connect exactly two entities. Wilson's ontology includes multi-party relations: a ceremony connects many participants simultaneously, a treaty binds communities. The current binary model cannot express "this relation connects entities A, B, C, and D together."

5. **No relation-to-relation connections.** In Wilson's ontology, relations can have relationships with other relations. A kinship relation may produce obligation relations; a treaty relation may modify ceremony relations. The current model has no mechanism for relations pointing to other relations.

6. **No relational lifecycle states.** Relations have `created_at`/`updated_at` timestamps but no state model. In Indigenous ontology, relations can be: dormant, active, in need of ceremony, broken, being-repaired, honored-through-ceremony. The current model treats relations as static once created.

7. **`shortestPath()` ignores ceremony and OCAP** (`relational-query/traversal.ts`). The shortest path algorithm operates on pure graph distance with no relational awareness. In Wilson's ontology, the appropriate path may not be the shortest.

8. **Accountability types diverge between packages.** `ontology-core` defines `AccountabilityTracking` (respect, reciprocity, responsibility as separate scores). `data-store` defines `AccountabilityData` (single wilson_score, elders_consulted, community_approval). These are structurally incompatible representations of the same concept.

9. **OCAP® not enforced at storage layer.** Despite rich OCAP types, `data-store` has no access control. Any code can `getNode()` or `getEdge()` without ceremony checks or OCAP validation. Governance is modeled but not enforced.

10. **"Cosmos" relation domain missing.** Wilson's six relation types include "cosmos" — relations with the stars, the seasons, the more-than-human universe. The `NodeType` taxonomy has no explicit cosmos type; "spirit" is overloaded to cover both spiritual and cosmic relations.

11. **IDS vocabulary has no implementation.** The `ids:` RDF namespace defines predicates (`ids:communityAuthority`, `ids:treatyRelationship`, `ids:territorialScope`) but there are no corresponding TypeScript interfaces, Zod schemas, or query helpers. Indigenous Data Sovereignty exists in vocabulary only.

12. **Wilson alignment is a simple average.** `computeWilsonAlignment()` averages respect + reciprocity + responsibility equally. Wilson might argue that in specific relational contexts, one R matters more than others (e.g., reciprocity is paramount in land relations; respect is paramount in elder relations). Context-weighted alignment is not supported.

---

## Recommendations for Future Packaging

### Priority 1: Close the Persistence Gap

**Add `Relation` CRUD to data-store.** This is the single most impactful change:

```typescript
// data-store/store.ts — new functions needed
async function createRelation(relation: Relation): Promise<void>
async function getRelation(id: string): Promise<Relation | null>
async function getRelationsForNode(nodeId: string): Promise<Relation[]>
async function updateRelationAccountability(id: string, accountability: AccountabilityTracking): Promise<void>
```

Redis key schema: `relation:{id}` (not `edge:{from}:{to}`) — give relations their own identity in storage. Store OCAP flags, accountability scores, and obligations as nested hashes, not opaque JSON strings.

### Priority 2: Deprecate or Elevate `RelationalEdge`

Either:
- **Deprecate `RelationalEdge`** entirely. Make `Relation` the only way to model connections. This is the Wilson-aligned choice.
- **Or create a migration path** where `RelationalEdge` is a view/projection of `Relation` (read-only, computed from Relation data) rather than an independent type that can be created and stored.

The dual type system is the primary vector for Western ontological backsliding.

### Priority 3: Add Relational Lifecycle States

```typescript
export type RelationState =
  | 'emerging'           // newly formed, not yet ceremonied
  | 'active'             // healthy, obligations being met
  | 'dormant'            // not recently tended
  | 'needs-ceremony'     // flagged for ceremonial attention
  | 'in-repair'          // acknowledged damage, active healing
  | 'honored'            // fully ceremonied and reciprocated
  | 'ancestral';         // relation with those who have passed on

export interface Relation {
  // ... existing fields ...
  state: RelationState;
  state_history: Array<{ state: RelationState; timestamp: string; ceremony_id?: string }>;
}
```

This gives relations a lifecycle — they are born, grow, require attention, and are honored through ceremony. Static `created_at`/`updated_at` timestamps cannot express this.

### Priority 4: OCAP Enforcement in Data-Store

Add an access-control layer to `data-store` that checks OCAP flags before returning data:

```typescript
interface AccessContext {
  requester: string;        // who is asking
  ceremony_active?: string; // current ceremony ID, if any
  role?: PersonRole;        // requester's role
}

async function getRelation(id: string, context: AccessContext): Promise<Relation | null>
// Checks: Does requester have access per OCAP flags?
// Checks: Is ceremony required for this relation's access level?
// Checks: Does requester have the authority role?
```

Without enforcement, OCAP is aspirational metadata — not operative governance.

### Priority 5: Ceremony-Aware `shortestPath()`

Extend `shortestPath()` to accept `TraversalOptions`:

```typescript
export function shortestPath(
  fromId: string,
  toId: string,
  nodes: RelationalNode[],
  edges: RelationalEdge[],
  relations: Relation[],           // add
  opts?: Partial<TraversalOptions> // add
): TraversalPath | null
```

This allows shortest path computation to respect ceremony boundaries and OCAP compliance — making "shortest" mean "shortest appropriate path," not just "shortest graph distance."

### Priority 6: Add "Cosmos" Node Type

```typescript
export type NodeType =
  | 'human'
  | 'land'
  | 'cosmos'     // NEW — stars, seasons, cardinal directions, more-than-human universe
  | 'spirit'
  | 'ancestor'
  | 'future'
  | 'knowledge';
```

And add a corresponding obligation category:

```typescript
export type ObligationCategory = 'human' | 'land' | 'cosmos' | 'spirit' | 'future';
```

### Priority 7: Implement IDS Types

Create TypeScript interfaces that correspond to the existing `ids:` RDF namespace:

```typescript
export interface DataSovereigntyPolicy {
  community_authority: string;
  treaty_relationship?: string;
  territorial_scope?: string;
  protocol_reference?: string;
  governing_nation?: string;
}
```

Add a `sovereignty?: DataSovereigntyPolicy` field to `Relation` and corresponding Zod schemas.

### Priority 8: Unify Accountability Types

Deprecate `AccountabilityData` in `data-store/store.ts` and use `AccountabilityTracking` from `ontology-core` everywhere. The persistence layer should not define its own accountability model.

---

## Proposed New Packages

### 1. `medicine-wheel-relation-lifecycle` (New Package)

**Purpose:** Manage the lifecycle of first-class Relations — state transitions, ceremony gating, dormancy detection, repair protocols.

**Core API:**

```typescript
// State machine for relational lifecycle
function transitionRelation(relation: Relation, event: RelationEvent): Relation
function detectDormantRelations(relations: Relation[], thresholdDays: number): Relation[]
function flagForCeremony(relation: Relation, reason: string): Relation
function honorRelation(relation: Relation, ceremonyId: string): Relation

// Lifecycle events
type RelationEvent =
  | { type: 'ceremony_performed'; ceremony_id: string }
  | { type: 'obligation_met'; category: ObligationCategory }
  | { type: 'dormancy_detected' }
  | { type: 'repair_initiated'; facilitator: string }
  | { type: 'ancestor_transition' };
```

**Wilson Alignment:** Relations are living beings with lifecycles. This package makes that literal.

### 2. `medicine-wheel-ocap-enforcement` (New Package)

**Purpose:** Enforcement layer for OCAP® and Indigenous Data Sovereignty — access control, audit logging, ceremony-gated access, consent management.

**Core API:**

```typescript
// Access decisions
function canAccess(relation: Relation, context: AccessContext): AccessDecision
function canTraverse(edge: RelationalEdge, context: AccessContext): boolean
function requireCeremony(relation: Relation): CeremonyRequirement | null

// Consent management
function recordConsent(relationId: string, scope: string, grantor: string): void
function revokeConsent(relationId: string, scope: string): void
function auditAccessLog(relationId: string): AccessLogEntry[]

interface AccessDecision {
  allowed: boolean;
  reason: string;
  ceremony_required?: boolean;
  authority_needed?: PersonRole;
}
```

**Wilson Alignment:** OCAP without enforcement is Western "informed consent" — a checkbox, not governance. This package makes governance operative.

### 3. `medicine-wheel-multi-relation` (New Package — Exploratory)

**Purpose:** Support multi-party relations and relation-to-relation connections that go beyond binary `from_id`/`to_id` modeling.

**Core Types:**

```typescript
// Multi-party relation (ceremony connecting many participants)
export interface MultiRelation {
  id: string;
  participant_ids: string[];          // 2+ entities
  relationship_type: string;
  ceremony_context?: CeremonyContext;
  obligations: RelationalObligation[];
  ocap: OcapFlags;
  accountability: AccountabilityTracking;
}

// Relation-to-relation connection
export interface MetaRelation {
  id: string;
  source_relation_id: string;
  target_relation_id: string;
  meta_type: 'produces' | 'modifies' | 'depends_on' | 'heals' | 'honors';
}
```

**Wilson Alignment:** "Reality is relational" includes relations between relations. A treaty relation produces obligation relations. A ceremony relation honors dormant relations. Binary modeling cannot capture this depth.

---

## Ontological Alignment Score Card

| Wilson Principle | ontology-core | data-store | relational-query |
|-----------------|---------------|------------|-----------------|
| Relations are first-class beings | ✅ `Relation` type | ❌ Only stores `RelationalEdge` | ⚠️ Mixed — some functions use `Relation`, others `RelationalEdge` |
| Relations carry obligations | ✅ Categorized obligations | ❌ Flat `string[]` | ✅ Audits obligations |
| Relations require ceremony | ✅ `ceremony_context` | ⚠️ Ceremonies stored but not linked to edges | ✅ Ceremony-bounded traversal |
| Data sovereignty (OCAP®) | ✅ `OcapFlags` on relations | ❌ Not persisted | ✅ OCAP-only traversal + audit |
| Wilson's three R's | ✅ `AccountabilityTracking` | ⚠️ Different type (`AccountabilityData`) | ✅ Aggregation + gap detection |
| Six relation domains | ⚠️ 5 of 6 (missing cosmos) | N/A | N/A |
| Relations have lifecycles | ❌ Static timestamps only | ❌ No lifecycle | ❌ No lifecycle queries |
| Multi-party relations | ❌ Binary only | ❌ Binary only | ❌ Binary only |
| Relation-to-relation | ❌ Not supported | ❌ Not supported | ❌ Not supported |
| Governance enforcement | ❌ Modeled, not enforced | ❌ No access control | ⚠️ Traversal respects it, but no true enforcement |

---

## Conclusion

The Medicine Wheel codebase has done something rare: it has taken Wilson's relational ontology seriously at the type system level. The `Relation` interface is not a decorated graph edge — it is a genuine attempt to make relationships into beings with their own obligations, ceremonies, governance, and accountability tracking.

The critical work remaining is **vertical alignment**: the ontological depth achieved in `ontology-core` must penetrate downward into persistence (`data-store`) and outward into all query functions (`relational-query`). The `RelationalEdge` escape hatch must be closed. OCAP must be enforced, not just modeled. Relations need lifecycles, not just timestamps.

Wilson wrote: *"An Indigenous ontology is actually the relationship that one has with the truth."* The Medicine Wheel packages model this relationship. The next step is making the code *live* it — from type declaration through storage through query through access control.
