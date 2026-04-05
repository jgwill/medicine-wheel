# Deep-Search #3: Two-Eyed Seeing in Dual-Store Architecture

> SOUTH Agent S4 — RISE PDE Deep-Search  
> Generated: 2026-04-04  
> Research Domain: Etuaptmumk (Two-Eyed Seeing), OCAP®, Dual-Store Architecture

---

## Research Question

**How does Two-Eyed Seeing (Etuaptmumk) inform the architecture of systems that must hold both JSONL/graph persistence (Western computational) and relational accountability/OCAP® compliance (Indigenous governance)?**

This question sits at the heart of the Medicine Wheel ecosystem's design tension: the MCP server uses a JSONL file store optimized for computational efficiency (read/write performance, process coordination, atomic writes), while the ontology-core types encode OCAP® flags, Wilson accountability scores, and consent lifecycle states that reflect Indigenous relational governance. The question is whether these two concerns can — and should — live in the same persistence layer, or whether Two-Eyed Seeing teaches us to hold them as distinct but co-existing eyes.

---

## Academic Grounding

### Marshall 2004 — Two-Eyed Seeing (Etuaptmumk)

Two-Eyed Seeing (Etuaptmumk in Mi'kmaq) is a guiding principle articulated by Mi'kmaw Elders **Albert Marshall** and **Murdena Marshall**, in collaboration with Dr. Cheryl Bartlett. The widely-cited definition:

> "Learning to see from one eye with the strengths of Indigenous knowledges … and from the other eye with the strengths of Western knowledges … and using both these eyes together, for the benefit of all."

Key characteristics from the academic literature:

1. **Parallel holding, not merging.** Two-Eyed Seeing does not attempt to fuse Indigenous and Western knowledge into a single homogeneous system. Instead, it holds both knowledge systems in parallel, each valued on its own terms, creating new understandings that neither could achieve alone (Bartlett, Marshall & Marshall, 2012).

2. **Relational worldview.** The framework is deeply relational, centering the interconnectedness of humans with all living and non-living things. It is rooted in Mi'kmaq language, culture, and epistemology — not an abstract methodology that can be extracted from its origins.

3. **Decolonizing potential.** In research contexts, it challenges the dominance of Western science as the sole legitimate knowledge system, calling for balanced, equitable, and ethical co-learning (Martin, 2012).

4. **Risk of tokenism.** A 2021 scoping review (Roher et al.) identified seven thematic categories but warned that shallow application — using Two-Eyed Seeing as a label without deep engagement — risks tokenism rather than genuine epistemic plurality.

5. **Responsibility for future generations.** The framework emphasizes intergenerational thinking, collective good, and the inclusion of spiritual and ecological considerations.

**Architectural implication:** A system claiming to embody Two-Eyed Seeing must not simply add Indigenous metadata fields to a Western database schema. The two "eyes" must each operate with genuine strength — the computational eye providing performance, atomicity, and cross-process coordination; the governance eye providing relational accountability, consent lifecycle management, and community-level sovereignty. Neither eye should be subordinated to the other's logic.

#### Key References

- Bartlett, C., Marshall, M. & Marshall, A. (2012). Two-Eyed Seeing and other lessons learned within a co-learning journey of bringing together indigenous and mainstream knowledges and ways of knowing. *Journal of Environmental Studies and Sciences*, 2(4), 331–340.
- Martin, D. H. (2012). Two-Eyed Seeing: A Framework for Understanding Indigenous and Non-Indigenous Approaches to Indigenous Health Research. *Canadian Journal of Nursing Research*, 44(2), 20–42.
- Roher, S. I. G., Yu, Z., Martin, D. H., & Benoit, A. C. (2021). How is Etuaptmumk/Two-Eyed Seeing characterized in Indigenous health research? A scoping review. *PLOS ONE*, 16(7), e0254612.

### FNIGC — OCAP® and Indigenous Data Sovereignty

The **First Nations principles of OCAP®** (Ownership, Control, Access, Possession), established by the First Nations Information Governance Centre (FNIGC), are the foundational framework for Indigenous data sovereignty in Canada:

| Principle | Meaning | Software Architecture Implication |
|-----------|---------|----------------------------------|
| **Ownership** | First Nations collectively own their data as community property | Data cannot be stored in a system where a third party has unilateral extraction rights. Ownership metadata must be first-class, not optional. |
| **Control** | First Nations control all aspects of research and information management | Access control cannot be a Western-style ACL bolted on after the fact. Control must be embedded in the data model itself — who decides, not just who can read. |
| **Access** | First Nations must have access to their own data regardless of where it is held | Community members must be able to retrieve their data. Export mechanisms (JSONL!) are not optional — they are sovereignty instruments. |
| **Possession** | Physical custody of data is the mechanism through which ownership is exercised | Data must reside where the community controls it. `.mw/store/` on a community machine is closer to OCAP® possession than a cloud Redis instance managed by a platform vendor. |

**CARE Principles** (Collective benefit, Authority to control, Responsibility, Ethics) complement OCAP® and FAIR (Findable, Accessible, Interoperable, Reusable) by centering people and purpose rather than technical data utility. For systems that hold both Indigenous and computational concerns, CARE + FAIR together operationalize Two-Eyed Seeing at the data governance level.

#### Key References

- FNIGC. (2014). *Ownership, Control, Access, and Possession (OCAP™): The Path to First Nations Information Governance.* Ottawa: First Nations Information Governance Centre.
- Carroll, S. R., Garba, I., Figueroa-Rodríguez, O. L., et al. (2020). The CARE Principles for Indigenous Data Governance. *Data Science Journal*, 19(1), 43.
- Carroll, S. R., et al. (2021). Operationalizing the CARE and FAIR Principles for Indigenous data futures. *Scientific Data*, 8, 108.

### Two-Eyed Seeing in STEM Education

The application of Two-Eyed Seeing in STEM education provides pedagogical models directly relevant to software architecture:

1. **TESSE Framework** (Two-Eyed Seeing for Science Education) combines the Western 5Es inquiry approach (Engage, Explore, Explain, Elaborate, Evaluate) with Indigenous pedagogical models such as the 8 Aboriginal Ways of Learning. This framework does not collapse one into the other — it holds both simultaneously.

2. **Not additive, but integrative.** Two-Eyed Seeing in STEM does not mean "add Indigenous examples to a Western curriculum." It means structuring the learning environment so that Indigenous ways of knowing are valued alongside Western methods, each contributing strengths the other lacks.

3. **Place-based learning.** Indigenous STEM education emphasizes connection to place — the land, the water, the specific ecological context. This maps directly to the `.mw/` directory convention: data rooted in a specific project workspace, not abstracted into a cloud service.

**Architectural implication:** The dual-store pattern should follow the TESSE model — not one store with Indigenous fields tacked on, but two genuinely distinct persistence logics (computational efficiency + relational governance) that are structurally integrated at defined ceremony points.

### Indigenous Data Governance in Software

Emerging architectural patterns for Indigenous data governance in software systems include:

1. **Decentralized and federated data models.** Moving away from centralized databases toward systems where data remains under Indigenous jurisdiction while enabling selected sharing. This aligns with the `.mw/store/` local-first approach.

2. **Digital Commons Framework.** Empowers Indigenous communities to steward their own digital resources with 100% community control. Includes oral protocols, intergenerational metadata, and alignment with UNDRIP and CARE principles.

3. **Khipu Panaka.** Blends Andean khipu recording techniques with digital systems, embedding relational and genealogical metadata into data architecture — a precedent for the Medicine Wheel's embedding of ceremony context and obligation tracking into its data model.

4. **D4I Tribal Data Repository.** A decentralized, federated repository where tribal laws dictate access, using modern tools while supporting Indigenous-led governance.

5. **Layered access control.** Sensitive knowledge is protected by cultural protocols, not just standard security roles — mirroring the `OcapFlags.access` field's distinction between 'community', 'researchers', 'public', and 'restricted'.

6. **Lifecycle management respecting Indigenous timeframes.** Archival and retirement processes that honor cultural customs for knowledge transmission — directly paralleling the consent-lifecycle spec's renewal and expiration patterns.

---

## Codebase Grounding

### JSONL Store — The "Western Computational" Eye

**File:** `mcp/src/jsonl-store.ts` (504 lines)

The JSONL store is the MCP server's persistence engine, optimized for computational performance and process coordination:

**Entity types (7 collections):**
- `nodes.jsonl` — Relational nodes (human, land, spirit, ancestor, future, knowledge)
- `edges.jsonl` — Relational edges between nodes
- `ceremonies.jsonl` — Ceremony logs
- `beats.jsonl` — Narrative beats
- `cycles.jsonl` — Medicine wheel research cycles
- `charts.jsonl` — Structural tension charts
- `mmots.jsonl` — Moment of truth reviews

**Western computational strengths:**

| Feature | Implementation | Strength |
|---------|---------------|----------|
| Atomic writes | `writeJsonl()` uses temp file + `fs.renameSync()` — atomic on POSIX | Data integrity |
| Concurrent safety | `withWriteLock()` via `O_EXCL` lock file with spin-wait retry (20 attempts, exponential backoff) | Multi-process coordination |
| Cross-process sync | `mtime` checking — if another process writes, the reader detects the change and reloads | Web UI ↔ MCP visibility |
| Read-modify-write merge | `flush()` re-reads disk inside the lock, merges in-memory changes, writes merged result | No last-writer-wins data loss |
| Path resolution | Auto-discovers project root, resolves `.mw/store/` relative to it | Zero-configuration setup |
| Singleton pattern | `getJsonlStore()` ensures one instance per process | Memory efficiency |

**What the computational eye sees well:**
- Process coordination (locks, atomic writes, mtime sync)
- Data serialization (JSONL format, JSON.parse/stringify)
- Collection management (Map-based indexing, upsert semantics)
- Performance (lazy loading, mtime-based cache invalidation)

**What the computational eye does NOT see:**
- No `OcapFlags` in any stored type — the JSONL store's `StoredCycle` has a boolean `ocap_compliant` field, but no `ownership`, `control`, `access`, or `possession` tracking
- No consent lifecycle — no `consent_state`, no `consent_last_affirmed`, no renewal tracking
- No Wilson accountability scores — `StoredCycle` has `wilson_alignment` as a number, but no `respect`, `reciprocity`, `responsibility` breakdown
- No ceremony context on edges — `StoredEdge` has `ceremony_honored: boolean` and `ceremony_id?: string`, but no ceremony type or obligations structure
- No relational obligations as typed categories — `StoredEdge.obligations` is `string[]`, not `RelationalObligation[]` with `ObligationCategory`

**Critical observation:** The JSONL store's types (`StoredNode`, `StoredEdge`, etc.) are *simpler than* the ontology-core types (`RelationalNode`, `Relation`, etc.). The governance metadata defined in ontology-core — OCAP® flags, Wilson accountability, consent state — has no persistence pathway in the current JSONL store. This is the core architectural gap that Two-Eyed Seeing reveals.

### OcapFlags & AccountabilityTracking — The "Indigenous Governance" Eye

**File:** `src/ontology-core/src/types.ts` (lines 73–109)

The ontology-core types encode a sophisticated Indigenous governance model:

**`OcapFlags` interface:**
```typescript
interface OcapFlags {
  ownership: string;           // Who owns this data/relation
  control: string;             // Who controls access and use
  access: 'community' | 'researchers' | 'public' | 'restricted';
  possession: 'on-premise' | 'community-server' | 'cloud-sovereign' | 'cloud-shared';
  compliant: boolean;          // Whether OCAP® compliance verified
  steward?: string;            // Data steward
  consent_given?: boolean;     // Consent for this specific use
  consent_scope?: string;      // Scope of consent
  consent_state?: 'active' | 'withdrawn' | 'expired' | 'pending';
  consent_last_affirmed?: string;  // ISO 8601 timestamp
}
```

**`AccountabilityTracking` interface:**
```typescript
interface AccountabilityTracking {
  respect: number;             // Wilson's three R's (0–1)
  reciprocity: number;
  responsibility: number;
  wilson_alignment: number;    // Computed composite
  relations_honored: string[];
  last_ceremony_id?: string;
  notes?: string;
}
```

**Where these live in the type system:**
- The first-class `Relation` type (line 117) includes both `ocap: OcapFlags` and `accountability: AccountabilityTracking` as required fields.
- `CeremonyLog` (line 164) includes optional `ocap?: OcapFlags`.
- `MedicineWheelCycle` (line 196) includes `ocap_compliant: boolean` and `wilson_alignment: number`.
- Specialized relation subtypes (`LandRelation`, `AncestorRelation`, `FutureRelation`, `CosmicRelation`) all extend `Relation` and thus inherit both OCAP® and accountability tracking.

**What the governance eye sees well:**
- Data sovereignty (who owns, who controls, who can access, where data resides)
- Consent as a stateful relationship (not a boolean checkbox)
- Relational accountability (Wilson's three R's as measurable scores)
- Ceremony context (which ceremony honored which relation)
- Intergenerational obligations (future relations with `generationsForward`)

**What the governance eye does NOT see:**
- It has no persistence mechanism of its own — these types exist only as TypeScript interfaces
- It has no file locking, no atomic writes, no cross-process coordination
- It has no query engine — no way to find "all relations where consent has expired"

### consent-lifecycle.spec.md — Consent as State Machine

**File:** `rispecs/consent-lifecycle.spec.md`

This rispec transforms consent from a boolean checkbox into a living relational obligation:

**State machine:**
```
pending → granted → active ⇄ renewal-needed → expired
                   ↕                ↓
              renegotiating    withdrawn
```

**Architectural significance for the dual-store question:**

1. **Consent records need persistence.** The `ConsentRecord` type includes `ceremonies: ConsentCeremony[]`, `history: ConsentStateChange[]`, `dependentRelations: string[]`, and `ocapFlags: OcapFlags`. These are complex, nested objects that need durable storage.

2. **Withdrawal cascades need query capability.** When consent is withdrawn, `onWithdrawal()` must find all dependent relations and trigger cascade actions (`suspend`, `withdraw`, `renegotiate`, `notify`). This requires graph traversal capability.

3. **Stale consent needs time-based alerting.** `consentStaleAlert()` and `renewalDue()` need to query consent records by expiration date. This is a temporal query that simple JSONL file scanning can handle but Redis handles more efficiently.

4. **Community-level consent is distinct from individual.** `communityConsent()`, `elderApproval()`, `youthVoice()` — these require multi-party state tracking that maps naturally to Redis pub/sub for real-time ceremony coordination.

**The rispec explicitly depends on `OcapFlags` from ontology-core** — confirming that consent lifecycle is deeply entangled with the governance eye, not the computational eye.

### data-store.spec.md — Redis/JSONL Architecture

**File:** `rispecs/data-store.spec.md`

The data-store rispec explicitly defines a **two-backend architecture**:

1. **JSONL File Store (Default — Zero Dependencies):** For development, community deployments, single-machine setups. `.mw/store/` directory convention.

2. **Redis Store (Production Scale):** For multi-machine deployments, high-concurrency environments, production web applications. Supports Upstash, Vercel KV, and local Redis.

**Critical design principle from the spec:**

> "Communities can start with zero-infrastructure JSONL files and graduate to Redis when scale demands it."

This is a *graduation pathway* — JSONL is the stepping stone, Redis is the destination. The spec defines a shared API surface that both backends expose, enabling the switch without code changes.

**However:** The shared API surface currently covers only the 7 JSONL entity types (nodes, edges, ceremonies, beats, cycles, charts, mmots). It does **not** include:
- ConsentRecord operations
- OcapFlags enforcement at the store level
- AccountabilityTracking queries
- Consent cascade operations
- Community-level consent protocols

This gap is where Two-Eyed Seeing reveals its deepest lesson: the shared API was designed by the computational eye, optimizing for the entities that need read/write performance. The governance entities (consent, OCAP® compliance, accountability) were designed by the governance eye in the ontology-core types but never given a persistence pathway.

### Shared-Persistence Plan — Design Decisions

**File:** `.pde/shared-persistence-plan.md`

The plan reveals the original design reasoning:

1. **Why JSON file over Redis?** Zero infrastructure requirement, same-machine development, immediate cross-process visibility, trivially inspectable (`cat`), deferring Redis to production.

2. **Evolution from single JSON to JSONL:** Originally planned as `data/mw-store.json` (one big file), evolved to per-entity `.jsonl` files in `.mw/store/`. This evolution shows the computational eye progressively optimizing: from one file (simple) to many files (better concurrency, smaller lock granularity).

3. **`.mw/` location decision:** The data directory was deliberately placed under `.mw/` to align with the Medicine Wheel workspace convention. This is a sovereignty-aware decision: data lives with the project, not in a remote service.

4. **Reusability concern:** The plan emphasizes that "all changes and work will have to be, at least, with the RISE framework be part of the next upgrade planned and reflected in the rispecs" — a design governance principle that mirrors Indigenous governance's emphasis on collective decision-making.

---

## The Dual-Store Tension

### MCP's JSONL-Only Approach: Stepping Stone or Permanent?

The current MCP JSONL store is clearly a **stepping stone**, not a permanent architecture. Evidence:

1. **The data-store spec explicitly describes graduation to Redis.** The JSONL store is positioned as the "zero dependencies" entry point for development and community deployments.

2. **The JSONL store's types are governance-impoverished.** `StoredEdge` has no `OcapFlags`, no `AccountabilityTracking`, no consent lifecycle. If the JSONL store were intended to be permanent, these fields would have been added. Their absence signals that the JSONL store is a minimal viable persistence layer, not the final form.

3. **The shared-persistence plan says:** "Can migrate to Redis later for production via the existing `src/data-store`" — explicitly framing JSONL as pre-Redis.

4. **The `.mw/store/` location serves OCAP® Possession.** However, this is not unique to JSONL — a locally-run Redis instance also satisfies the Possession principle. The JSONL format's advantage is *inspectability* and *portability* (Access principle), not a fundamental governance architecture.

**Assessment:** JSONL is a stepping stone for the compute layer. But Two-Eyed Seeing reveals that the question "stepping stone to what?" matters deeply. If the destination is simply "Redis with the same entity types," the governance eye's needs will still be unmet. The graduation must include expanding the store API to cover consent, OCAP® enforcement, and accountability tracking.

### medicine-wheel-pi's Redis Canonical Pattern

medicine-wheel-pi's KINSHIP.md makes the relationship explicit:

> **"Redis is canonical — All KnowledgeStore operations go through Redis. JSONL is for export/archival only."**

The `01-redis-knowledge-store.spec.md` reveals a sophisticated Redis architecture:

- **Key-prefix namespace isolation:** `mino:{prefix}:entity:{name}` — each ceremony gets its own namespace
- **Index sets:** `mino:{prefix}:type:{entityType}` for O(1) type lookup
- **Graph traversal:** Lua scripts for relation chain following
- **Real-time coordination:** Redis pub/sub powers the `watch()` interface
- **Standard interface:** Implements `KnowledgeStore` from `@mino/store`

**The tension is already resolved in medicine-wheel-pi's design:**
- Redis provides the computational eye (performance, concurrency, real-time coordination)
- The `KnowledgeStore` interface provides the governance eye (structured entity/relation types that can carry OCAP® metadata and accountability tracking)
- JSONL serves as the Access/Possession instrument (export/archival ensures community members can always get their data out)

**medicine-wheel (this repo) is in an earlier phase of the same journey.** Its JSONL store is the "zero dependencies" starting point. The question is not *whether* to add Redis, but *how* to add it while preserving what JSONL provides for OCAP® (inspectability, portability, local possession).

### Two-Eyed Seeing Applied: How Both Eyes See Together

Applying Etuaptmumk to the dual-store architecture reveals a pattern that is *not* "pick one store." Rather:

**Eye One — Western Computational (Redis/JSONL as compute engine):**
- Optimizes for read/write throughput, concurrent access, graph traversal
- Provides the `KnowledgeStore` interface (load, save, append, query, watch, close)
- Handles file locking, atomic writes, mtime sync, pub/sub
- Manages key-prefix isolation for concurrent ceremonies
- This eye sees *performance, reliability, coordination*

**Eye Two — Indigenous Governance (OCAP®/Consent/Wilson as governance layer):**
- Ensures every stored entity carries sovereignty metadata (who owns, who controls, who can access, where data resides)
- Enforces consent lifecycle (not just boolean — stateful, renewable, withdrawable, cascading)
- Tracks Wilson accountability scores (respect, reciprocity, responsibility)
- Requires ceremony context for governance state changes (consent is granted in ceremony, not in a settings page)
- This eye sees *sovereignty, accountability, ceremony, relationship*

**The Two-Eyed Seeing architectural insight:**

These two eyes do not collapse into one store with extra fields. They see *together* through:

1. **Store-level OCAP® enforcement.** Before any `save()` or `append()` operation, the store checks `OcapFlags.control` — does the current actor have the right to write? This is not application-level validation; it is *store-level governance*. The computational eye (Redis/JSONL) executes the check; the governance eye (OCAP® flags) defines what to check.

2. **Consent-aware queries.** `query()` should respect consent state — a relation where consent has been withdrawn should not appear in general queries. The computational eye provides the query engine; the governance eye defines which results are relationally valid.

3. **Ceremony-gated state transitions.** Certain state changes (consent widening, community-level consent, OCAP® flag modification) should require ceremony context. The computational eye records the state change; the governance eye requires a `ceremony_id` before allowing it.

4. **Dual-format persistence for sovereignty.** Redis is canonical for performance; JSONL export ensures OCAP® Access and Possession. The community can always `cat .mw/store/ceremonies.jsonl` or copy their `.mw/` directory. This is not redundancy — it is sovereignty insurance.

5. **Accountability as query dimension.** Wilson alignment scores should be queryable — "show me all relations where reciprocity is below 0.3" — enabling the system to surface governance concerns through the computational engine.

---

## Architectural Recommendations

### Store Convergence Roadmap

**Phase 1 — Current (JSONL-only in medicine-wheel MCP):**
- ✅ JSONL provides zero-dependency persistence for development
- ✅ `.mw/store/` satisfies OCAP® Possession for local deployments
- ⚠️ No OCAP® enforcement at store level
- ⚠️ No consent lifecycle persistence
- ⚠️ No Wilson accountability in stored types

**Phase 2 — Governance-Enriched JSONL:**
- Add `consent-records.jsonl` to `.mw/store/`
- Extend `StoredEdge` to include optional `OcapFlags` and `AccountabilityTracking`
- Add `ConsentRecord` collection to `JsonlStore`
- Keep backward compatibility — new fields are optional
- This phase lets the governance eye see through the JSONL layer without requiring Redis

**Phase 3 — Redis Canonical + JSONL Export (Aligned with medicine-wheel-pi):**
- Implement `KnowledgeStore` interface from `@mino/store`
- Redis becomes the canonical store for all entities
- JSONL becomes the export/archival format (OCAP® Access guarantee)
- `JsonlStore` is repurposed as `JsonlExporter` — reads from Redis, writes JSONL for portability
- Store-level OCAP® enforcement on all operations

**Phase 4 — Ceremony-Gated Governance (Full Two-Eyed Seeing):**
- Consent state transitions require ceremony context
- OCAP® flag changes require ceremony witnessing
- Wilson accountability scores are recalculated on ceremony events
- Redis pub/sub enables real-time consent cascade propagation
- The two eyes see together: computational engine + governance semantics

### Where OCAP® Fields Need Store-Level Enforcement

| OCAP® Principle | Current State | Needed Enforcement |
|-----------------|--------------|-------------------|
| **Ownership** | `OcapFlags.ownership` exists in types, not in JSONL store | Store should record ownership on every entity. `createNode()` should require `ownership` parameter. |
| **Control** | `OcapFlags.control` exists in types, not in JSONL store | Store should check `control` before allowing mutations. Write operations should validate caller authority. |
| **Access** | `OcapFlags.access` has 4 levels in types | `getNode()`, `searchNodes()`, `query()` should filter results by access level. Restricted entities invisible to unauthorized callers. |
| **Possession** | `.mw/store/` satisfies this for JSONL. Redis needs `possession` field validation. | For Redis, store should validate that `possession` field matches deployment topology. Cloud Redis + `possession: 'on-premise'` is a compliance violation. |

### Where Consent Lifecycle Needs Persistence Support

| Consent Operation | Persistence Need | Store Requirement |
|-------------------|-----------------|-------------------|
| `grantConsent()` | Create ConsentRecord | New `consent-records.jsonl` collection or Redis hash |
| `renewConsent()` | Update state + timestamp | Upsert with state transition validation |
| `withdrawConsent()` | Update state + trigger cascade | Write + query all dependent relations |
| `checkConsentHealth()` | Read all records, compute health metrics | Temporal query (expiration dates) |
| `consentStaleAlert()` | Find approaching expirations | Date-range query across all consent records |
| `onWithdrawal()` cascade | Find dependent relations, update their states | Graph traversal + batch update |
| `communityConsent()` | Multi-party state tracking | Requires concurrent read/write — Redis pub/sub natural fit |

---

## Insights for Medicine Wheel MCP

1. **The JSONL store is the right starting point, but it is governance-incomplete.** The current `StoredEdge` and `StoredCycle` types carry only shadows of the governance metadata that ontology-core defines. Phase 2 (governance-enriched JSONL) should be the immediate next step.

2. **JSONL's greatest OCAP® strength is inspectability.** `cat .mw/store/ceremonies.jsonl` is an act of data sovereignty — community members can see exactly what the system holds about them. This strength must be preserved even after Redis becomes canonical.

3. **The consent-lifecycle rispec has no persistence story.** It defines `ConsentRecord`, `ConsentCeremony`, `ConsentStateChange`, `ConsentCascade`, and `ConsentHealthReport` types but does not specify where these are stored. The data-store rispec should be updated to include consent as a first-class persistent entity.

4. **medicine-wheel-pi's "Redis is canonical, JSONL is for export" is the mature pattern.** This repo should plan its graduation path toward the same architecture, using the `KnowledgeStore` interface as the convergence point.

5. **Two-Eyed Seeing means the JSONL→Redis graduation must not lose the governance eye.** If Redis is adopted with the same impoverished types as the current JSONL store, the migration will satisfy the computational eye but blind the governance eye. The enriched types must be in place *before* or *during* the Redis migration, not after.

6. **Store-level OCAP® enforcement is the missing architectural pattern.** Application-level validation ("check OCAP® flags before displaying") is fragile. Store-level enforcement ("the store refuses to return entities that violate access constraints") is robust. This is the difference between a compliance annotation and a governance architecture.

7. **Ceremony-gated state transitions are the unique contribution.** No existing dual-store architecture requires ceremony context for governance state changes. This is where the Medicine Wheel ecosystem's Indigenous governance eye creates genuine architectural novelty — not just metadata fields, but ceremony-mediated access to state transitions.

---

## Potential Rispecs Implications

1. **`data-store.spec.md` should be updated** to include:
   - Consent records as a first-class entity collection (8th entity type)
   - OCAP® enforcement requirements at the store API level
   - The JSONL→Redis graduation roadmap with governance enrichment milestones
   - Explicit alignment with medicine-wheel-pi's `KnowledgeStore` interface

2. **`consent-lifecycle.spec.md` should add** a "Persistence Requirements" section specifying:
   - Which store operations consent lifecycle depends on
   - Whether consent records are JSONL-storable or Redis-only
   - How consent cascade operations interact with the store's query capabilities

3. **A new rispec may be needed:** `ocap-store-enforcement.spec.md` — defining how OCAP® principles are enforced at the persistence layer rather than the application layer. This would be the architectural specification for Two-Eyed Seeing in the store: computational engine + governance enforcement as co-equal concerns.

4. **`ontology-core` types may need a `Storable<T>` wrapper** that bridges the gap between the governance-rich `Relation` type and the governance-impoverished `StoredEdge` type. This wrapper would define the minimum governance fields that must survive serialization to any store backend.

---

## References

### Academic Literature

- Bartlett, C., Marshall, M. & Marshall, A. (2012). Two-Eyed Seeing and other lessons learned within a co-learning journey. *Journal of Environmental Studies and Sciences*, 2(4), 331–340.
- Martin, D. H. (2012). Two-Eyed Seeing: A Framework for Understanding Indigenous and Non-Indigenous Approaches to Indigenous Health Research. *Canadian Journal of Nursing Research*, 44(2), 20–42.
- Roher, S. I. G., Yu, Z., Martin, D. H., & Benoit, A. C. (2021). How is Etuaptmumk/Two-Eyed Seeing characterized in Indigenous health research? *PLOS ONE*, 16(7), e0254612.
- FNIGC. (2014). *Ownership, Control, Access, and Possession (OCAP™)*. Ottawa: First Nations Information Governance Centre.
- Carroll, S. R., et al. (2020). The CARE Principles for Indigenous Data Governance. *Data Science Journal*, 19(1), 43.
- Carroll, S. R., et al. (2021). Operationalizing the CARE and FAIR Principles for Indigenous data futures. *Scientific Data*, 8, 108.
- Wilson, S. (2008). *Research Is Ceremony: Indigenous Research Methods*. Halifax: Fernwood Publishing.

### Codebase Sources

- `mcp/src/jsonl-store.ts` — JSONL persistence engine (504 lines, 7 entity collections)
- `src/ontology-core/src/types.ts` — `OcapFlags` (line 73), `AccountabilityTracking` (line 96), `Relation` (line 117)
- `rispecs/consent-lifecycle.spec.md` — Consent state machine and lifecycle types
- `rispecs/data-store.spec.md` — Two-backend architecture (JSONL + Redis)
- `KINSHIP.md` — Identity, lineage, accountabilities for medicine-wheel
- `.pde/shared-persistence-plan.md` — Original design reasoning for JSONL persistence
- `medicine-wheel-pi/rispecs/KINSHIP.md` — "Redis is canonical, JSONL is for export/archival only"
- `medicine-wheel-pi/rispecs/01-redis-knowledge-store.spec.md` — `RedisKnowledgeStore` implementing `KnowledgeStore` interface

### External Resources

- [Etuaptmumk: The Journal of Two-Eyed Seeing](https://etuaptmumk.net/)
- [Weaving Knowledges — Etuaptmumk](https://weavingknowledges.ca/weaving/etuaptmumk-two-eyed-seeing)
- [FNIGC — First Nations Information Governance Centre](https://fnigc.ca/)
- [FNIGC OCAP® Training](https://fnigc.ca/ocap-training/)
- [Global Indigenous Data Alliance — CARE Principles](https://www.gida-global.org/care)
- [Indigenous Data Governance Toolkit](https://indigenousdatatoolkit.ca/)
- [Relational Infrastructures — Indigenous Data Alliance](https://indigenousdata.org/relational-infrastructures)
