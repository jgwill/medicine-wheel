# storage-provider — RISE Specification

> Canonical persistence boundary for Medicine Wheel runtime data. One asynchronous contract is implemented by local JSONL and Neon/Postgres providers while preserving relational refusal semantics and family-specific registry behavior.

**Version:** 0.6.3  
**Package:** `@medicine-wheel/storage-provider`  
**Document ID:** rispec-storage-provider-v1  
**Parity Baseline:** 2026-08-19

---

## Desired Outcome

Users create a Medicine Wheel system whose persistence backend can change without changing the meaning of the records being held.

The same application behavior must remain available when data is held locally in inspectable JSONL files or in Neon/Postgres. Storage is not permitted to flatten relational obligations, silently truncate totals, silently ignore filters, or turn a refused relational action into an apparent success.

---

## Current Reality

The suite has several historical persistence surfaces, but the runtime convergence boundary is `StorageProvider`.

It currently provides:

- a **JSONL provider** as the default local backend;
- a **Neon/Postgres provider** as the networked relational backend;
- a provider factory selected explicitly or through `MW_STORAGE_PROVIDER`;
- a declared `redis` provider name that currently returns an explicit unsupported-provider error rather than pretending Redis parity exists;
- shared operations for nodes, edges, ceremonies, inquiry weaves, plan perspectives, ceremonial diary entries, ceremony events, and capture records.

The separate `@medicine-wheel/data-store` Redis package and `@medicine-wheel/data-store-postgres` scaffold remain real packages, but neither defines this cross-backend contract.

---

## Structural Tension

**Desired state:** a caller asks Medicine Wheel to hold or retrieve relational knowledge without needing backend-specific logic.

**Current pressure:** JSONL, SQL, and historical Redis surfaces naturally differ in indexing, pagination, mutation, and schema affordances.

**Natural resolution:** one provider interface defines behavioral meaning; each backend implements that meaning in its own storage language. Backend-specific optimizations are permitted only when observable behavior remains equivalent.

---

## Provider Selection

The provider vocabulary is:

```typescript
type ProviderType = 'jsonl' | 'neon' | 'redis' | 'auto';
```

Behavior:

- `auto` reads `MW_STORAGE_PROVIDER` and otherwise selects JSONL.
- `local` and `file` normalize to JSONL.
- `postgres` normalizes to Neon.
- `upstash` normalizes to Redis.
- An unknown configured value fails explicitly.
- Redis selection currently fails explicitly because the canonical Redis provider is not implemented.

A missing backend is never substituted silently with another backend after an explicit selection.

---

## Core Relational Operations

### Nodes

The provider supports create, get, typed filtering by node type or direction, paged listing, explicit total counting, update, and deletion.

Two distinct questions must remain distinct:

```text
getAllNodes(limit?)  -> a collection page
countNodes()         -> cardinality of the whole collection
```

The default page size may be bounded. A page length must never be presented as a total.

`updateNode` returns the updated node and fails with a typed not-found error when the target does not exist.

`deleteNode` refuses deletion while living relations still touch the node. It does not cascade those relations away. Releasing a related node requires conscious release of its relations first.

### Edges

The provider supports create, get, list, related-node lookup, ceremony updates, partial updates, and deletion.

An edge update or deletion that targets no relation fails with a typed edge-not-found error.

### Ceremonies

The provider supports logging, retrieval, timelines, filtering by direction and ceremony type, paged listing, and explicit whole-collection counting.

As with nodes, `countCeremonies()` is not derived from the length of a paged listing.

---

## Registry Families

The provider also holds record families whose contracts are not reducible to generic nodes.

### Inquiry Weaves

Operations:

```typescript
registerInquiryWeave(record)
getInquiryWeave(id)
listInquiryWeaves(filters?)
```

Filters include episode path, episode number, issue, and artefact identity.

### Plan Perspectives

Operations:

```typescript
registerPlanPerspective(record)
getPlanPerspective(id)
listPlanPerspectives(filters?)
```

A perspective preserves the plan fingerprint, narrative interpretation, optional lineage, episode associations, and registration source.

### Ceremonial Diary

Operations:

```typescript
registerDiaryEntry(record)
getDiaryEntry(id)
listDiaryEntries(filters?)
deleteDiaryEntry(id)
```

The diary's five ceremonial phases remain their own vocabulary; they are not collapsed into Four Directions. Chronicle association is optional.

### Ceremony Events

GitHub-derived issue, pull-request, merge, and commit events can be registered as ceremonial records while preserving their ceremonial phase, optional Four-Directions bridge, participants, relational impacts, source reference, and spiral key.

### Captures

Operations:

```typescript
registerCapture(record)
getCapture(id)
listCaptures(filters?)
```

The capture family stores records and URIs, never file bytes. Capture semantics are specified in `capture-registry.spec.md`.

---

## Backend Parity

### JSONL

JSONL is the local/default implementation. It keeps records inspectable and usable without network infrastructure.

### Neon/Postgres

Neon is the implemented SQL provider. It may use SQL indexes, projected columns, JSON payloads, and `COUNT(*)`, but those implementation choices must not change provider-level meaning.

### Redis

Redis is a named future path in the provider vocabulary. Until a canonical provider exists, selecting it must fail rather than route through the historical Redis package invisibly.

---

## Relational Refusal Is Part of the Contract

Provider failures are not all infrastructure errors. Some are domain refusals.

The provider exposes typed conditions including:

- node not found;
- edge not found;
- node still holding relations.

A caller can therefore distinguish "the store is unavailable" from "the requested relational action is not currently valid."

---

## Creative Advancement Scenarios

### Scenario: Local work becomes hosted work

**Desired Outcome:** Move a working Medicine Wheel installation from local files to hosted persistence without rewriting domain behavior.  
**Current Reality:** Records are held through JSONL.  
**Natural Progression:** Select Neon, preserve the same provider operations, verify registry and relational behavior against the same expectations.  
**Resolution:** The storage location changes while application semantics remain stable.

### Scenario: A node still belongs to relationships

**Desired Outcome:** Remove a node without erasing relational history by accident.  
**Current Reality:** Relations still touch the node.  
**Natural Progression:** Deletion returns a relational refusal; the caller surfaces those relations; people or higher-level workflows release them deliberately.  
**Resolution:** The node can be removed only after its relationships have been consciously addressed.

### Scenario: Health reports a real total

**Desired Outcome:** Report how much the wheel actually holds.  
**Current Reality:** Collection reads are paged.  
**Natural Progression:** Use provider cardinality operations rather than page length.  
**Resolution:** Health and observability report whole-store totals without materializing every record.

---

## Quality Criteria

- JSONL and Neon implement the same observable provider contract.
- Explicit backend selection never silently falls back.
- A paged result is never treated as collection cardinality.
- Relational deletion refusals are preserved as typed domain outcomes.
- Registry-family merge/filter semantics remain centralized where a family defines them.
- Capture byte content is never stored by this layer.
- Unknown or unsupported capabilities fail visibly rather than returning apparently successful partial behavior.

---

## Implementation Evidence Appendix

This appendix exists to keep specification/code parity checkable; it is evidence, not the conceptual contract.

- Provider contract: `src/storage-provider/src/interface.ts`
- Provider selection: `src/storage-provider/src/factory.ts`
- JSONL implementation: `src/storage-provider/src/jsonl.ts`
- Neon implementation: `src/storage-provider/src/neon.ts`
- Capture shared semantics: `src/storage-provider/src/capture-records.ts`
- Inquiry weave shared semantics: `src/storage-provider/src/inquiry-weaves.ts`
- Plan perspective shared semantics: `src/storage-provider/src/plan-perspectives.ts`
- Current package line: 0.6.3
