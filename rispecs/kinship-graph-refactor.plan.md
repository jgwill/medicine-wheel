# Kinship-Graph Refactor — Staged Reorganization Plan

> **Intent:** Evolve the Medicine Wheel ontology from an RDF/OWL taxonomy *bridge*
> into a **non-hierarchical relational kinship graph** (LPG-native): named contextual
> edges, edge-level context metadata, and avoidance-protocol guards — then provide
> RDF→flat-kinship migration tooling.
>
> **Source intent:** Perplexity thread (non-hierarchical relational AI ontologies) +
> `potentialFollowUp` vectors. Related: `miadisabelle/Etuaptmumk-RSM#236` (PR),
> tracking issue `miadisabelle/Etuaptmumk-RSM#161` (esp. `#163` Kinship vs References,
> `#164` Medicine Wheel as Spec Architecture).
>
> **Audience:** A fresh agent picking this up cold. Each stage is self-contained:
> goal → files → work → acceptance. Do stages in order; 1–3 are additive (back-compat),
> 4 is the reorganization, 5 is new tooling, 6 is integration.

---

## Structural Reality (what already exists — do NOT rebuild)

The ontology is **already relational-first**. Confirmed by reverse-engineering:

| Already present | Where |
|---|---|
| `Relation` as first-class being (obligations, ocap, ceremony_context, accountability) | `src/ontology-core/src/types.ts:117` |
| Specialized relation subtypes (Land/Ancestor/Future/Cosmic) | `src/ontology-core/src/types.ts:404-448` |
| Cypher / LPG generation for KuzuDB | `src/relational-query/src/cypher.ts` |
| Named RSIS edge types (STEWARDS, BORN_FROM, KINSHIP_OF…) | `src/ontology-core/src/types.ts:267-273` |
| Ceremony-bounded + OCAP-filtered traversal | `src/relational-query/src/traversal.ts:62-115` |
| Zod validation at every boundary | `src/ontology-core/src/schemas.ts` |

**Tension to resolve (what is missing):**

1. `relationship_type` is a **free string** (`types.ts:124`) — no governed, named, directional kinship-edge vocabulary.
2. **No edge-level context metadata** — `authorized_by`, `active_context`, `avoidance_protocol` are absent (grep-confirmed).
3. **No protocol guards** — traversal has only two hardcoded booleans (`respectCeremonyBoundaries`, `ocapOnly`), not a pluggable conditional-edge-filter / escalation stack.
4. **RDF/OWL framed as the backbone** — `owl:`/`rdfs:` namespaces in `vocabulary.ts:27-41` present the taxonomic model as foundation rather than as an optional interop adapter.
5. **No RDF→flat-kinship migration** tooling.

---

## Stage 0 — Decision Record + Spec (EAST · Vision) · ~low risk

**Goal:** Name the architecture move on paper before touching code, so every later stage has a single reference.

**Files:**
- New: `rispecs/kinship-graph.spec.md` (RISE-compliant, mirrors structure of `ontology-core.spec.md`).
- Edit: `KINSHIP.md` (root) §4 "Tensions held" — record the taxonomy→kinship-graph reorganization.

**Work:**
- Document the canonical model: **flat ontological layer** (human, land, spirit, agent, story, tool all first-class — already true) + **named contextual edges** + **guards**.
- State explicitly what stays (Relation-as-being, OCAP, Wilson) and what is added (Stages 1–3).
- Declare RDF as an **export adapter**, not the backbone (sets up Stage 4).

**Acceptance:** Spec is implementation-sufficient (another LLM could build Stages 1–5 from it); no code changed.

---

## Stage 1 — Named Kinship-Edge Vocabulary (ontology-core) · additive

**Goal:** Replace the free-string edge with a governed registry of named, directional edges — `tends-to`, `speaks-with`, `holds-responsibility-for`, `co-emerges-with`, plus the existing RSIS types.

**Files:**
- New: `src/ontology-core/src/kinship.ts` — `KinshipEdgeType` registry. Each entry: `{ name, symmetry: 'symmetric'|'asymmetric', inverse?, description, defaultObligations? }`.
- Edit: `src/ontology-core/src/types.ts` — add optional `kinship_type?: KinshipEdgeType` to `Relation` (keep `relationship_type: string` for back-compat).
- Edit: `src/ontology-core/src/schemas.ts` — `KinshipEdgeTypeSchema`; extend `RelationSchema`.
- Edit: `src/ontology-core/src/index.ts` — export new surface.

**Work:** Define the registry as data (not a class hierarchy). Symmetric edges (`co-emerges-with`) have no inverse; asymmetric edges (`holds-responsibility-for`) declare their inverse for traversal-direction reasoning.

**Acceptance:** Registry + schema + a vitest spec; all existing types still compile and parse (new field optional).

---

## Stage 2 — Edge Context Metadata (ontology-core) · additive

**Goal:** Let an edge carry the context that makes a relation valid — the second `potentialFollowUp` vector ("metadata structures for contextualizing relational edges").

**Files:**
- Edit: `src/ontology-core/src/types.ts` — add optional `context?: RelationContext` to `Relation`:
  `{ authorized_by?, active_context?, valid_when?, forbidden_when?, authorized_kin?: string[] }`.
- Edit: `src/ontology-core/src/schemas.ts` — `RelationContextSchema`; extend `RelationSchema`.
- Edit: `src/ontology-core/src/index.ts` — export.

**Work:** Keep all fields optional so existing stored relations parse unchanged. `active_context` references ceremony state / scope; `authorized_kin` is the identity allowlist consumed by Stage 3 guards.

**Acceptance:** New schema validates; existing relation fixtures still pass; round-trip preserved.

---

## Stage 3 — Avoidance Protocols + Protocol Guards (relational-query) · new capability

**Goal:** The headline capability — conditional edge filters evaluated before traversal, with escalation-to-custodian on failure (the "in-the-loop" protocol).

**Files:**
- New: `src/relational-query/src/guards.ts` — `ProtocolGuard` type + `evaluateGuards(edge, relation, context)` → `{ allowed: boolean, escalateTo?: string, reason?: string }`.
- Edit: `src/relational-query/src/traversal.ts` — generalize the hardcoded `respectCeremonyBoundaries`/`ocapOnly` checks (`traversal.ts:62-115`) into a **pluggable guard pipeline**; the two existing booleans become built-in guards (behavior preserved).
- Edit: `src/relational-query/src/types.ts` — add `guards?: ProtocolGuard[]` to `TraversalOptions`; add escalation to result.

**Work:** A guard inspects `RelationContext` (Stage 2): e.g. `context.active_context === 'open'` AND `agent.identity ∈ authorized_kin`. On fail → don't traverse; surface `escalateTo: 'qualified_custodian'`. Compose as a stack; first failing guard wins.

**Acceptance:** A guarded edge is blocked unless context satisfies; escalation directive surfaced in the result; traversal with no guards behaves exactly as today.

---

## Stage 4 — Demote the RDF Bridge to an Adapter (ontology-core) · reorganization · medium risk

**Goal:** The "reorganization" itself — RDF/OWL moves from *foundation* to *optional serialization adapter*; the LPG kinship model becomes primary.

**Files:**
- Split: `src/ontology-core/src/vocabulary.ts` → keep LPG-relevant constants; move `owl:`/`rdfs:`/`skos:`/`prov:`/SHACL interop into new `src/ontology-core/src/rdf-interop.ts` (re-exported for back-compat).
- Edit: `src/ontology-core/src/index.ts` — surface RDF as `rdfInterop` namespace, not top-level backbone.
- Edit: `rispecs/ontology-core.spec.md` — reframe "RDF Vocabulary" section as "RDF Interop Adapter (optional)".

**Work:** No deletion of capability — RDF export still works. The change is **framing + module boundary**: nothing in the kinship core imports from `rdf-interop`. Verify no consumer treats RDF as required.

**Acceptance:** `npm run build:packages` green; RDF export still functions via the adapter; kinship core has zero dependency on RDF module.

---

## Stage 5 — RDF → Flat-Kinship-Graph Migration Tooling (relational-query) · new tooling

**Goal:** The third `potentialFollowUp` vector — migrate existing RDF/triple datasets into flat LPG kinship-graph records.

**Files:**
- New: `src/relational-query/src/migrate.ts` — `rdfToKinshipGraph(triples)` → `{ nodes: RelationalNode[], relations: Relation[] }`; emits Cypher DDL via existing `cypher.ts` and/or JSONL via `storage-provider/src/jsonl.ts`.
- New: vitest spec with a small sample triple set (incl. a `subClassOf` triple → mapped to a named kinship edge, not a class hierarchy).

**Work:** Map `rdf:type`/`subClassOf` triples onto **named kinship edges** (Stage 1) rather than re-introducing taxonomy. Preserve provenance into `RelationContext.authorized_by` where the source carries it.

**Acceptance:** Sample RDF → flat kinship graph; round-trip preserved; Cypher/JSONL output validated by the existing store readers.

---

## Stage 6 — Integration, Build, Docs (NORTH · Wisdom) · closing

**Goal:** Thread the new surface through consumers and prove the bundle holds.

**Files:**
- Consumers to check: `src/graph-viz`, `src/data-store`, `mcp/` — surface `kinship_type`/guards where they render or persist relations.
- Docs: `src/ontology-core/README.md`, `src/relational-query/README.md`, root `llms.txt`/`llms-full.txt`, `KINSHIP.md` change log.

**Work:** Run `npm run build:packages` then `npm test` (vitest). Fix type drift. Update READMEs and the KINSHIP change log entry.

**Acceptance:** Full workspace build green; `vitest run` passes; docs reflect the kinship-graph model.

---

## Dependency Order & Risk

```
Stage 0 (spec) ─► Stage 1 (edge vocab) ─► Stage 2 (edge context) ─► Stage 3 (guards)
                                                                          │
Stage 4 (RDF→adapter, parallel-safe after 0) ───────────────────────────┤
                                                                          ▼
                                              Stage 5 (migration) ─► Stage 6 (integrate)
```

- **Stages 1–3:** additive, optional fields/params — back-compat guaranteed.
- **Stage 4:** module reorganization — medium risk, contained to ontology-core.
- **Stages 5–6:** net-new tooling + verification.

## Out of Scope (explicitly)
- No rename of `relationship_type` (kept for back-compat; `kinship_type` is the governed addition).
- No deletion of RDF capability (demoted, not removed).
- No storage-backend swap (KuzuDB Cypher + JSONL stay; migration emits into them).

---

## References & Learning Path

These are **references** (external substrate), not kinship relations *inside* the system —
the distinction tracked by `miadisabelle/Etuaptmumk-RSM#163`. Guillaume intends to try to
attend the Concordia courses below to build the technical substrate; each is tagged with the
stage(s) it feeds. Stage 0's `kinship-graph.spec.md` carries a condensed copy.

### Paradigm grounding (the *why* — Indigenous relational AI)
- **Abundant Intelligences** — Concordia-led Indigenous AI program (Jason Edward Lewis;
  NFRF Transformation grant ~CA$23M / 6 yrs), at the Indigenous Futures Research Centre
  (IFRC), Montréal. Three axes — Integration (ontology/epistemology), Imaginaries
  (creative/narrative), Intelligence (technical AI). Core: *relationality* — kinship
  protocols replace optimization metrics. · indigenous-ai.net · ifrc.ca · IFRC Symposium 2026
- *Making Kin with the Machines* — Lewis et al. (Montreal AI Ethics Institute) → grounds Stages 1–3.
- *Indigenous Protocol and AI* (Concordia Spectrum, 2020) + *Out of the Black Box* (ANAT):
  kinship & **avoidance protocols as code logic** → grounds Stage 3.

### Technical substrate (the *how* — courses Guillaume may attend)
> None of these courses *teach* Indigenous knowledge — they supply the ontology / graph / IR
> substrate; the epistemological re-framing is the design challenge brought *to* the course.

| Course | Provides | Feeds stage(s) |
|---|---|---|
| COMP 6591 — Knowledge-Based Systems | Ontology design, knowledge graphs, semantic web | Stages 1–2 |
| COMP 6741 — Intelligent Systems | Reasoning under uncertainty, hybrid symbolic AI | Stage 3 (guards as rules) |
| COMP 6791 — Information Retrieval / Semantic Computing | Indexing, embedding retrieval, semantic layers | Stage 5 (migration) |
| COMP 6781 — NLP | Language models, semantic analysis | adjacent |
| COMP 6861 — Conversational AI | LLMs, dialogue, tool-use orchestration | adjacent (agent layer) |
| SOEN 6221 — Engineering AI Systems | MLOps lifecycle, deployment | adjacent (Stage 6) |

### Project threads
- Perplexity research threads (relational ontologies; Concordia AI survey).
- PR `miadisabelle/Etuaptmumk-RSM#236`; tracking `#161` (`#163` Kinship vs References,
  `#164` Medicine Wheel as Spec Architecture).
