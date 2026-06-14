# kinship-graph — RISE Specification

> The canonical relational model for the Medicine Wheel Developer Suite: a **non-hierarchical kinship graph** where every being is first-class and *relations carry the meaning* through named, directional, context-bound edges with avoidance-protocol guards. RDF/OWL is demoted from backbone to optional interop adapter.

**Version:** 0.1.0 (decision record)
**Scope:** `@medicine-wheel/ontology-core` + `@medicine-wheel/relational-query`
**Document ID:** rispec-kinship-graph-v1
**Last Updated:** 2026-06-14
**Lineage:** evolves `ontology-core.spec.md` · governs `kinship-graph-refactor.plan.md`

---

## Desired Outcome

Developers model relational webs where **no being is subordinate to another** and where a
relation may say *"not yet"* until its context is honored. Land, human, spirit, ancestor,
future, knowledge, agent, story, and tool all sit on **one ontological layer**; the structure
that orders them lives in the **edges**, not in a class tree.

## Creative Intent

**What this enables:** A flat kinship graph (LPG-native) where relations are named
(`tends-to`, `speaks-with`, `holds-responsibility-for`, `co-emerges-with`), carry the context
that authorizes them (`authorized_by`, `active_context`, `authorized_kin`), and are governed by
**protocol guards** that conditionally permit or escalate traversal — the "in-the-loop"
delegation pattern, not an inference-time veto.

**Structural Tension (resolved here):** Standard OWL/RDF encodes a tree-shaped `subClassOf`
hierarchy — a concept is always *less than* its parent. Indigenous relational epistemology holds
that a river is not a subclass of water; it is *in relation with* land, people, time, and
ceremony simultaneously, with no privileged axis. This spec resolves that tension by making the
kinship graph primary and RDF a serialization adapter.

---

## Canonical Model

### 1. Flat ontological layer (already true — preserve)
`RelationalNode.type` enumerates co-equal kinds; none is a parent of another. `Relation` is a
first-class being carrying `obligations`, `ocap`, `ceremony_context`, and `accountability`
(`src/ontology-core/src/types.ts`). **Nothing here is rebuilt.**

### 2. Named, directional edges (Stage 1 — additive)
A `KinshipEdgeType` registry expressed as *data*, not a class tree:
```
{ name, symmetry: 'symmetric' | 'asymmetric', inverse?, description, defaultObligations? }
```
- Symmetric (e.g. `co-emerges-with`): no inverse.
- Asymmetric (e.g. `holds-responsibility-for`): declares its inverse for traversal-direction reasoning.
- `Relation` gains optional `kinship_type?: KinshipEdgeType`; `relationship_type: string` is kept
  for back-compat.

### 3. Edge context metadata (Stage 2 — additive)
`Relation` gains optional `context?: RelationContext`:
```
{ authorized_by?, active_context?, valid_when?, forbidden_when?, authorized_kin?: string[] }
```
This is what contextualizes a relation: who authorized it, in which ceremony/scope it is valid,
and which identities may traverse it. All fields optional → existing stored relations parse unchanged.

### 4. Avoidance protocols + protocol guards (Stage 3 — new capability)
A `ProtocolGuard` is a conditional edge filter evaluated *before* traversal:
```
evaluateGuards(edge, relation, context) -> { allowed: boolean, escalateTo?: string, reason?: string }
```
On failure the traversal does not cross the edge and surfaces an escalation directive
(`escalateTo: 'qualified_custodian'`). The existing hardcoded `respectCeremonyBoundaries` and
`ocapOnly` checks become two built-in guards in a pluggable stack; behavior is preserved when no
guards are supplied. (Grounded in the IP//AI "avoidance protocols as code logic.")

### 5. RDF as optional interop adapter (Stage 4 — reorganization)
The `owl:`/`rdfs:`/`skos:`/`prov:`/SHACL namespaces move out of the backbone into an
`rdf-interop` module. RDF export still round-trips; the kinship core imports zero RDF.

### 6. RDF → flat-kinship-graph migration (Stage 5 — tooling)
`rdfToKinshipGraph(triples) -> { nodes, relations }` maps `rdf:type` / `subClassOf` triples onto
**named kinship edges** (never a re-introduced hierarchy), carrying source provenance into
`RelationContext.authorized_by`, and emits Cypher (via `relational-query/cypher.ts`) and/or JSONL
(via `storage-provider/jsonl.ts`).

---

## What Stays vs What Is Added

| Stays (preserve) | Added (this spec) |
|---|---|
| `Relation` as first-class being | Named `KinshipEdgeType` registry |
| OCAP® flags + Wilson accountability | Edge `RelationContext` metadata |
| Ceremony-bounded / OCAP traversal | Pluggable `ProtocolGuard` stack + escalation |
| KuzuDB Cypher / LPG generation | RDF→kinship migration tooling |
| Zod validation at boundaries | RDF demoted to optional adapter |

---

## References & Paradigm Grounding

These are **references** (external substrate), not kinship relations inside the system
(`miadisabelle/Etuaptmumk-RSM#163`).

- **Abundant Intelligences** — Concordia-led Indigenous AI program (Jason Edward Lewis; IFRC,
  Montréal). *Relationality* — kinship protocols replace optimization metrics.
  indigenous-ai.net · ifrc.ca
- *Making Kin with the Machines* (Lewis et al.); *Indigenous Protocol and AI* (Concordia
  Spectrum, 2020); *Out of the Black Box* (ANAT) — avoidance protocols as code logic.
- **Technical substrate courses** (substrate only — they do not teach Indigenous knowledge):
  COMP 6591 Knowledge-Based Systems → §2–3; COMP 6741 Intelligent Systems → §4 guards;
  COMP 6791 IR/Semantic Computing → §6 migration.

---

## Quality Criteria

- ✅ Creative Orientation: enables modeling kinship webs, not storing taxonomies.
- ✅ Structural Dynamics: the `subClassOf` subordination tension is resolved by edge-carried meaning.
- ✅ Implementation Sufficient: Stages 1–5 are buildable from this spec + `kinship-graph-refactor.plan.md`.
- ✅ Codebase Agnostic: conceptual; file references are illustrative anchors only.
- ✅ Back-compatible: every additive stage uses optional fields/params.
