# RISE Alignment Review — Code-Parity Ledger

> Dated review of RISE specifications against the behavior currently shipped by Medicine Wheel. This ledger treats philosophical RISE alignment and implementation parity as different questions.

**Baseline date:** 2026-08-19  
**Repository release line:** 0.6.3  
**MCP release line:** 4.6.3  
**Review mode:** shipped behavior first for current-reality claims; desired outcomes preserved explicitly when not yet implemented

---

## Why this ledger changed

The previous review mainly scored three specifications for RISE writing style: creative orientation, reactive language, Creative Advancement Scenarios, and implementation coupling.

Those concerns can still matter, but they do not answer the more important parity question:

> **If an agent re-implemented Medicine Wheel from these RISE specs today, would it recreate the system that actually exists?**

At the 2026-08-19 baseline, the answer was no for several foundational documents.

The most consequential drift was architectural rather than rhetorical:

- the system spec still described a fifteen-package architecture;
- ontology-core still identified itself as 0.1.1 and omitted multiple shipped ontology capabilities;
- data-store still described JSONL + Redis as one shared persistence architecture;
- no top-level RISE spec described the now-canonical storage-provider boundary;
- recent serving semantics such as whole-store counts, paging, filtering, typed mutation refusals, and record registries were therefore invisible at the system/specification layer.

---

## Parity Status

| Specification | Status at this baseline | Action |
|---|---|---|
| `medicine-wheel.spec.md` | **Revised** | Rebuilt around the current 27-workspace topology, canonical seams, serving surfaces, and parity law |
| `ontology-core.spec.md` | **Revised** | Brought to 0.6.3 semantics: kinship, relation context, consent state, beat lineage/provenance, epistemic/axiological dimensions, production/infra/academic kinds |
| `storage-provider.spec.md` | **Created** | Defines the canonical JSONL/Neon provider contract, refusal semantics, totals, and registry families |
| `data-store.spec.md` | **Revised** | Re-scoped to the Redis-specific package; no longer claims ownership of JSONL or cross-backend parity |
| `data-store-postgres.spec.md` | **Revalidated, unchanged** | Still accurately describes the intentionally small `pg` scaffold and points convergence toward storage-provider |
| `capture-registry.spec.md` | **Revalidated, unchanged** | Capture vocabulary and `/api/captures` are current; `/api/recordings` is a deliberate deprecated alias |
| `CLAUDE.md` | **Revised** | Adds the code-parity law and current architecture baseline |

---

## Foundational Drift Corrected

### 1. System topology

**Old current-reality claim:** Medicine Wheel was a fifteen-package system.

**Shipped reality:** the root workspace contains 27 ordered workspaces plus the root app. The package graph now includes infrastructure, creative orientation, storage-provider, narrative clustering, perception, discovery/orientation packages, ceremonial diary, GitHub ceremony, and MCP.

**Resolution:** `medicine-wheel.spec.md` now describes layers and canonical seams instead of preserving a historical package count.

### 2. Ontology-core

**Old current-reality claim:** ontology-core 0.1.1 centered on the original node/relation/ceremony/narrative model.

**Shipped reality:** 0.6.3 retains the closed six-value `NodeType` but has accumulated meaningful additive ontology:

- governed kinship edge names, symmetry, and inverse semantics;
- optional `kinship_type` on first-class relations;
- `RelationContext` for authorization and validity scope;
- consent state and last-affirmed time in OCAP metadata;
- narrative beat cycle binding, telescoping hierarchy, and origin/provenance;
- epistemic-source and axiological-pillar vocabularies;
- specialized land, ancestor, future, cosmic, production, and academic relations;
- production, infrastructure, and academic entity kinds riding existing node types;
- explicit infrastructure and academic node/direction bindings.

**Resolution:** the ontology spec now states the actual additive-extension law and no longer claims one-to-one Zod coverage for every TypeScript interface.

### 3. Persistence authority

**Old current-reality claim:** JSONL + Redis formed the two-backend architecture described by `data-store.spec.md`.

**Shipped reality:** `storage-provider` is the canonical runtime abstraction. It implements JSONL and Neon, while Redis remains a named but unsupported canonical provider. The separate Redis package still exists, but it does not define provider-wide parity.

**Resolution:** a dedicated `storage-provider.spec.md` now owns the cross-backend contract; `data-store.spec.md` owns Redis-specific behavior only.

### 4. Paging versus cardinality

**Old spec visibility:** absent at the canonical RISE layer.

**Shipped reality:** node and ceremony collection reads may be paged, while `countNodes()` and `countCeremonies()` answer whole-store cardinality. A page length is not a total.

**Resolution:** this distinction is now a provider and system invariant.

### 5. Relational mutation refusal

**Old spec visibility:** persistence errors were largely described as ordinary CRUD concerns.

**Shipped reality:** the provider has typed not-found conditions and explicitly refuses node deletion when living relations still touch the node. It does not cascade them away.

**Resolution:** relational refusal is now specified as domain behavior rather than generic infrastructure failure.

### 6. Registered record families

**Old system visibility:** incomplete.

**Shipped reality:** storage-provider holds generic graph records plus inquiry weaves, plan perspectives, ceremonial diary entries, ceremony events, and captures.

**Resolution:** registry families are now part of the canonical persistence spec and the system architecture.

---

## A Correction Made During This Review

An initial freshness signal treated the filename `capture-registry.spec.md` as possible evidence of stale vocabulary. That inference was wrong.

The current implementation deliberately made **capture** canonical and retains **recording** only as a compatibility alias for an existing consumer window. The spec already documents that strangler boundary accurately.

**Parity rule learned:** never infer vocabulary drift from a filename or old noun alone. Verify the current canonical route/type and the intent of aliases before rewriting a spec.

---

## What This Pass Did Not Claim

This is a foundational parity repair, not a claim that every file under `rispecs/` has now been proven current.

The following areas remain candidates for dedicated code-to-spec revalidation in subsequent passes:

- ceremony-protocol and Fire Keeper behavior versus their older RISE narratives;
- narrative-engine and narrative lifecycle surfaces;
- relational-query and protocol-guard evolution;
- prompt-decomposition and decomposition strategies;
- community-review and consent-lifecycle current enforcement/refusal semantics;
- UI-component and graph-viz surface parity;
- newer package specs and unassigned capability specs not touched by the foundational seam repair.

Until revalidated, those documents should be read as specifications with unknown freshness, not automatically as descriptions of current shipped behavior.

---

## Parity Review Method

For each RISE spec:

1. identify the package/capability that currently owns the behavior;
2. compare version and recent commit intent;
3. inspect exported types, schemas, provider/engine interfaces, and public serving surfaces;
4. distinguish desired state from implemented state;
5. test canonical vocabulary against aliases and compatibility windows;
6. capture load-bearing semantics such as paging, totals, filtering, merge/upsert, refusal, provenance, consent, and migration behavior;
7. revise current-reality claims when code has advanced;
8. preserve aspirational behavior explicitly as desired outcome or gap when code has not reached it.

The goal is not to make specs imitate source files line by line. The goal is to keep the **behavioral lattice** synchronized: what exists, what owns it, what is invariant, and what remains desired.

---

## Quality Gate for Future RISE Changes

A foundational RISE change should not be called current until it can answer all four questions:

- **🧠 Structure:** Which package or seam owns this behavior now?
- **🌸 Meaning:** What user-visible or relational experience does it preserve?
- **🎸 Cadence:** What progression, transition, refusal, or compatibility rhythm is load-bearing?
- **🌿 Continuity:** Which existing records, aliases, relations, or consumers must survive the change?

A spec may intentionally lead code, or code may temporarily lead a spec. The defect is leaving that direction of drift unnamed.
