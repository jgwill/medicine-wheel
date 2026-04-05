# MMOT Review: Shared-Persistence & MCP Tool Audit

> **Agent:** S1 (South — Planning & Structure)  
> **Session:** 2604041906  
> **PDE:** 8302628d-f031-4724-b59b-4337c3e24bf0  
> **Date:** 2025-07-11  

---

## 1. MMOT Review — Shared-Persistence (PR #27)

### Step 1: Acknowledge the Truth

**Plan vs. Delivery — Task-by-Task Assessment:**

| # | Planned Task | Status | Evidence |
|---|---|---|---|
| 0 | Relation to `./packages/*` — reusability consideration | ⚠️ Partial | No new packages created. Code lives in `lib/` and `mcp/src/` as two separate files rather than a shared importable package. Future `@mw/store` package not extracted. |
| 1 | Create shared file-based persistence module (`lib/shared-store.ts`) | ✅ Delivered (renamed) | Delivered as `lib/jsonl-store.ts` (575 lines) and `mcp/src/jsonl-store.ts` (503 lines). All 7 entity types implemented. Atomic writes, file locking, MW_DATA_DIR support all present. |
| 2 | Rewire Web UI store (`lib/store.ts`) | ✅ Delivered | `lib/store.ts` (221 lines) now imports from `./jsonl-store` and wraps all operations. Public API preserved. Auto-seeds demo data on import. |
| 3 | Rewire MCP store (`mcp/src/store.ts`) | ✅ Delivered | `mcp/src/store.ts` is now a 17-line thin wrapper: `export const store = getJsonlStore()`. All tools use this. |
| 4 | Update rispecs | ⚠️ Not verified | Plan called for updates to CEREMONIES.md, CYCLES.md, data-store.spec.md. Not audited here — would need separate check. |
| 5 | Build MCP and test end-to-end | ✅ Delivered | MCP dist exists. Both stores resolve to `.mw/store/` directory with cross-process JSONL persistence. |
| 6 | Present completion report | ✅ Delivered | PR #27 merged. |

**Key Discrepancy: "Shared" module became two separate copies.**

The plan specified a *single* `lib/shared-store.ts` that both Web UI and MCP server would import. What was delivered is **two independent implementations** (`lib/jsonl-store.ts` at 575 lines and `mcp/src/jsonl-store.ts` at 503 lines) with near-identical code but subtle differences:

| Aspect | `lib/jsonl-store.ts` | `mcp/src/jsonl-store.ts` |
|---|---|---|
| Lines | ~575 | ~503 |
| Path resolution | `process.cwd() + .mw/store` | Walks up to find `medicine-wheel` package.json root |
| Singleton logging | Silent | `console.error()` with emoji |
| `resolveProjectDataDir` | Exported function | Private function |
| Edge key strategy | Identical | Identical |
| Lock strategy | Identical | Identical |

The code is not shared — it is *mirrored*. Any bug fix must be applied in both places.

**What was NOT in the plan but was delivered:**
- JSONL format (one file per entity type) instead of single JSON file — a positive deviation
- `.mw/store/` directory instead of `data/mw-store.json` — aligned with additional considerations in the plan
- EdgeCollection with upsert semantics — not in plan, a quality improvement
- Read-modify-write merge in flush() — addresses concurrent access, not in original plan

---

### Step 2: Analyze How It Got That Way (Blow-by-Blow)

**Why JSONL instead of single JSON?**

The plan called for `data/mw-store.json` (one monolithic JSON file). The implementation switched to JSONL (one file per entity type: `nodes.jsonl`, `edges.jsonl`, `ceremonies.jsonl`, etc.). This was the right call because:
1. JSONL files are append-friendly and easier to merge during concurrent writes
2. Separate files reduce lock contention (nodes writes don't block ceremony writes)
3. Each entity type gets its own mtime for change detection
4. Easier to inspect (`cat ceremonies.jsonl` vs parsing a giant JSON blob)

The plan's "Additional Considerations" section explicitly mentioned JSONL as a possibility and `.mw/` as the location, so the implementation followed the spirit of the plan even if it departed from the letter.

**Why two separate files instead of a shared module?**

This is the core architectural compromise. The Web UI runs in Next.js (with `@/lib/` path aliases, TypeScript module resolution via `tsconfig.json`). The MCP server runs as a standalone Node.js process from `mcp/` with its own `tsconfig.json` and `package.json`. These two build systems don't share a common module resolution path.

To share code between them would require one of:
1. **A shared npm package** (e.g., `@mw/store`) in a monorepo workspace — the plan's Task 0 hinted at this but it wasn't executed
2. **A symlink** — fragile across git operations
3. **A relative import crossing the mcp/ boundary** — MCP's tsconfig would need to reach into `../lib/`

The pragmatic choice was to duplicate the code. This works but creates maintenance debt.

**How does file locking work?**

```
withWriteLock(filePath, fn):
  1. Try fs.openSync(lockPath, 'wx')  — O_EXCL is atomic on POSIX
  2. If lock exists, spin-wait with linear backoff (25ms → 250ms max)
  3. Retry up to 20 times (~3.5 seconds total wait)
  4. Execute fn() inside try/finally
  5. Delete lock file in finally block
```

**Robustness Assessment:**

| Concern | Status |
|---|---|
| Atomic lock acquisition (POSIX O_EXCL) | ✅ Sound |
| Stale lock cleanup (process crash) | ❌ **Not handled** — if a process crashes while holding the lock, the `.lock` file persists forever. No timeout-based cleanup. |
| Spin-wait vs sleep | ⚠️ Busy-wait blocks the event loop. For a sync Node.js context this is acceptable but would be problematic in async contexts. |
| Lock scope | ⚠️ Per-file locking is good (nodes vs ceremonies don't contend), but flush() holds the lock for read+merge+write — if files grow large, lock duration increases. |
| Proceeds without lock | ❌ **Silent degradation** — if 20 attempts fail, `locked` remains false but the function still executes (`fn()` runs unlocked). Data corruption possible under heavy contention. |

**Is demo data seeding handled?**

Yes. `lib/store.ts` calls `seedDemoData()` at module load time. It checks `store.nodes.size() > 0` and only seeds if the store is empty. Creates 8 demo nodes, 5 edges, 1 ceremony, 1 beat, and 1 cycle.

The MCP store does **not** seed demo data — it reads whatever is on disk. This is correct: the Web UI seeds, MCP reads.

---

### Step 3: Create an Action Plan

**P0 — Critical (should fix before next ceremony session):**

1. **Stale lock recovery**: Add a timeout check to `withWriteLock()`. If a `.lock` file is older than 30 seconds, delete it and retry. Process crashes currently leave orphan locks that permanently block writes.

2. **Lock failure behavior**: When 20 lock attempts fail, the code currently executes `fn()` without the lock. It should either throw an error or log a loud warning. Silent unlocked writes defeat the purpose of locking.

3. **Extract shared package**: Create `packages/store/` (or similar) containing the JSONL store implementation once. Both `lib/store.ts` and `mcp/src/store.ts` import from it. This eliminates the mirrored-code maintenance burden. Aligns with plan Task 0.

**P1 — Important (next enhancement cycle):**

4. **Delete operations**: The store has Create and Read but no Delete for any entity type. Both `JsonlCollection` and `EdgeCollection` lack `delete(id)` methods. This blocks MCP tools from offering delete functionality.

5. **Update operations**: Only Charts and Edges have update methods. Nodes, Ceremonies, Beats, Cycles, and MMOTs can only be created, not updated in place (overwriting by ID via `set()` works but there's no explicit `updateNode()` store method).

6. **Path resolution divergence**: `lib/jsonl-store.ts` uses `process.cwd()` directly while `mcp/src/jsonl-store.ts` walks up the directory tree to find the project root. If someone runs the Next.js dev server from a subdirectory, paths will diverge. Unify resolution logic.

**P2 — Enhancement:**

7. **Rispecs documentation**: Verify and update `rispecs/data-store.spec.md`, `CEREMONIES.md`, `CYCLES.md` as called for in plan Task 4.

8. **Event notifications**: Neither store emits events on mutation. A future subscription mechanism would enable real-time sync in the Web UI when MCP writes data.

9. **Backup/export**: No mechanism to export the full store state or create point-in-time snapshots.

---

### Step 4: Documentation / Enhancement Opportunities

| ID | Action Item | Priority | Effort |
|----|-------------|----------|--------|
| E1 | Add stale lock detection (>30s → delete + retry) | P0 | Small |
| E2 | Throw or warn on lock failure instead of silent execution | P0 | Small |
| E3 | Extract `packages/store/` shared package | P0 | Medium |
| E4 | Add `delete(id)` to JsonlCollection and EdgeCollection | P1 | Small |
| E5 | Add explicit update methods for Nodes, Ceremonies, Beats | P1 | Small |
| E6 | Unify path resolution across lib/ and mcp/ | P1 | Small |
| E7 | Update rispecs documentation | P2 | Small |
| E8 | Add mutation event emitter for real-time UI sync | P2 | Medium |
| E9 | Store backup/snapshot mechanism | P2 | Medium |

---

## 2. MCP Tool Completeness Matrix

### Entity-Tool Matrix

#### Nodes

| Operation | Store Method | MCP Tool | Status |
|-----------|-------------|----------|--------|
| Create | `createNode(node)` | `create_relational_node` | ✅ |
| List | `getAllNodes(limit?)` | `list_relational_nodes` | ✅ |
| Get by ID | `getNode(id)` | — | ❌ **Missing** |
| Get by Type | `getNodesByType(type)` | `list_relational_nodes` (filter) | ✅ |
| Get by Direction | `getNodesByDirection(dir)` | `list_relational_nodes` (filter) | ✅ |
| Search | `searchNodes(query, opts)` | `search_nodes` | ✅ |
| Update | — (overwrite via `set()`) | — | ❌ **Missing** (no store method, no tool) |
| Delete | — | — | ❌ **Missing** (no store method, no tool) |

#### Edges

| Operation | Store Method | MCP Tool | Status |
|-----------|-------------|----------|--------|
| Create | `createEdge(edge)` | `create_relational_edge` | ✅ |
| Get for Node | `getEdgesForNode(nodeId)` | `get_relational_web` (indirect) | ⚠️ Indirect only |
| Get All | `edges.getAll()` | — | ❌ **Missing** |
| Get Related IDs | `getRelatedNodeIds(nodeId)` | `get_relational_web` (indirect) | ⚠️ Indirect |
| Update Ceremony | `updateEdgeCeremony(from, to, ceremonyId)` | `log_ceremony_with_memory` (automatic) | ✅ Auto |
| Relational Web | `getRelationalWeb(nodeId, depth)` | `get_relational_web` | ✅ |
| Update | — | — | ❌ **Missing** |
| Delete | — | — | ❌ **Missing** |

#### Ceremonies

| Operation | Store Method | MCP Tool | Status |
|-----------|-------------|----------|--------|
| Create | `logCeremony(ceremony)` | `log_ceremony_with_memory` | ✅ |
| List | `getAllCeremonies(limit?)` | `list_ceremonies` | ✅ |
| Get by ID | `getCeremony(id)` | — | ❌ **Missing** |
| Filter by Direction | `getCeremoniesByDirection(dir)` | `list_ceremonies` (filter) | ✅ |
| Filter by Type | `getCeremoniesByType(type)` | `list_ceremonies` (filter) | ✅ |
| Update | — | — | ❌ **Missing** |
| Delete | — | — | ❌ **Missing** |

#### Beats (Narrative)

| Operation | Store Method | MCP Tool | Status |
|-----------|-------------|----------|--------|
| Create | `createBeat(beat)` | `create_narrative_beat` | ✅ |
| List | `getAllBeats(limit?)` | `list_narrative_beats` | ✅ |
| Get by ID | `getBeat(id)` | `telescope_narrative_beat` | ✅ |
| Filter by Direction | `getBeatsByDirection(dir)` | `list_narrative_beats` (filter) | ✅ |
| Update | — | — | ❌ **Missing** |
| Delete | — | — | ❌ **Missing** |

#### Cycles

| Operation | Store Method | MCP Tool | Status |
|-----------|-------------|----------|--------|
| Create | `createCycle(cycle)` | `create_research_cycle` | ✅ |
| List | `getAllCycles()` | `list_cycles` | ✅ |
| Get by ID | `getCycle(id)` | `get_narrative_arc` (uses cycle) | ⚠️ Indirect |
| Archive | `archiveCycle(id)` | `archive_for_seven_generations` | ✅ |
| Update | — | — | ❌ **Missing** (can't change direction, update counts) |
| Delete | — | — | ❌ **Missing** |

#### Charts (Structural Tension)

| Operation | Store Method | MCP Tool | Status |
|-----------|-------------|----------|--------|
| Create | `saveChart(chart)` | `create_structural_tension_chart` | ✅ |
| List | `getAllCharts(direction?)` | `list_structural_tension_charts` | ✅ |
| Get by ID | `getChart(id)` | `get_chart_progress` | ✅ |
| Update Reality | `saveChart(chart)` | `update_current_reality` | ✅ |
| Add Action | `saveChart(chart)` | `add_action_step` | ✅ |
| Telescope | `saveChart(chart)` | `telescope_action_step` | ✅ |
| Update Progress | `saveChart(chart)` | `update_action_progress` | ✅ |
| Mark Complete | `saveChart(chart)` | `mark_action_complete` | ✅ |
| Link Ceremony | `saveChart(chart)` | `link_ceremony_to_chart` | ✅ |
| Link Cycle | `saveChart(chart)` | `link_chart_to_cycle` | ✅ |
| Honor Relation | `saveChart(chart)` | `honor_relation_in_action_step` | ✅ |
| Delete | — | — | ❌ **Missing** |

#### MMOTs (Moment of Truth)

| Operation | Store Method | MCP Tool | Status |
|-----------|-------------|----------|--------|
| Create | `saveMmot(mmot)` | `creator_moment_of_truth` | ✅ |
| Get by Chart | `getMmotsByChart(chartId)` | — | ❌ **Missing** (store method exists, no tool) |
| List All | — | — | ❌ **Missing** (no store method, no tool) |
| Get by ID | — | — | ❌ **Missing** |
| Update | — | — | ❌ **Missing** |
| Delete | — | — | ❌ **Missing** |

---

### Missing Tools Identified

**Highest Priority (needed for ceremony agents):**

| Tool Name (proposed) | Entity | Operation | Justification |
|---|---|---|---|
| `get_relational_node` | Node | Get by ID | Agents need to retrieve a specific node by ID. Currently must list and filter. |
| `get_ceremony` | Ceremony | Get by ID | Fire Keeper needs to retrieve a specific ceremony to validate it. |
| `get_cycle` | Cycle | Get by ID | Fire Keeper needs cycle details without full narrative arc overhead. |
| `list_mmots` | MMOT | List by chart | North Guide needs to review past MMOTs for a chart. |
| `list_edges` | Edge | List all / filter | No way to browse edges outside of `get_relational_web`. |
| `update_cycle_direction` | Cycle | Update | Fire Keeper needs to advance `current_direction` as ceremony progresses. |

**Medium Priority:**

| Tool Name (proposed) | Entity | Operation | Justification |
|---|---|---|---|
| `update_relational_node` | Node | Update | Agents should be able to update node descriptions and metadata. |
| `delete_relational_node` | Node | Delete | Data hygiene — remove test or erroneous nodes. |
| `update_ceremony` | Ceremony | Update | Correct ceremony records post-creation. |
| `delete_ceremony` | Ceremony | Delete | Remove test ceremonies. |
| `update_narrative_beat` | Beat | Update | Add learnings or ceremony links after creation. |
| `delete_chart` | Chart | Delete | Remove abandoned charts. |

---

### Store Methods Without Tool Exposure

| Store Method | Entity | Exposed via Tool? |
|---|---|---|
| `getMmotsByChart(chartId)` | MMOT | ❌ No tool |
| `getNode(id)` | Node | ❌ No tool (only via list+filter) |
| `getCeremony(id)` | Ceremony | ❌ No tool (only via list) |
| `getCycle(id)` | Cycle | ⚠️ Indirect via `get_narrative_arc` |
| `edges.getAll()` | Edge | ❌ No tool |
| `edges.getForNode(nodeId)` | Edge | ⚠️ Indirect via `get_relational_web` |
| `archiveCycle(id)` | Cycle | ✅ Via `archive_for_seven_generations` |

---

### Cross-System Compatibility (medicine-wheel-pi)

The ceremony agents spec (`medicine-wheel-pi/rispecs/02-ceremony-agents.spec.md`) defines six agents that depend on `mw_` prefixed tools. Here is the compatibility matrix:

#### Fire Keeper — Expected `mw_` Tools

| Expected Tool | Available Equivalent | Status |
|---|---|---|
| `mw_ceremony_open` | — | ❌ **Not implemented** |
| `mw_ceremony_close` | — | ❌ **Not implemented** |
| `mw_get_direction` | — | ❌ **Not implemented** |

**Note:** Fire Keeper also expects `mino_*` tools from @mino/ceremony packages (STC lifecycle, Knowledge Graph, Narrative). These are separate MCP servers, not part of medicine-wheel MCP.

#### North Guide — Expected `mw_` Tools

| Expected Tool | Available Equivalent | Status |
|---|---|---|
| `mw_store_memory` | — | ❌ **Not implemented** |

#### All Agents — Expected `mino_*` Tools (from @mino packages)

These are **not** medicine-wheel MCP tools — they come from separate `@mino/inquiry` (11 tools) and `@mino/ceremony` (33 tools) MCP servers. They are **outside the scope** of the medicine-wheel MCP server but are listed here for completeness:

| Agent | @mino Tools Expected | Count |
|---|---|---|
| Fire Keeper | `mino_create_chart`, `mino_get_chart`, `mino_list_charts`, `mino_get_chart_progress`, `mino_telescope`, `mino_init_guidance`, `mino_create_entities`, `mino_create_relations`, `mino_read_graph`, `mino_create_narrative_arc`, `mino_export_narrative_markdown` | 11 |
| East Guide | `mino_pde_decompose`, `mino_pde_parse_response`, `mino_pde_list`, `mino_pde_get`, `mino_pde_export_markdown`, `mino_observe_structure`, `mino_detect_patterns`, `mino_validate_three_universe`, `mino_generate_structural_questions`, `mino_classify_question`, `mino_map_question_to_direction`, `mino_create_entities`, `mino_search_nodes` | 13 |
| South Guide | `mino_create_chart`, `mino_update_desired_outcome`, `mino_update_current_reality`, `mino_add_action`, `mino_get_chart`, `mino_get_chart_progress`, `mino_telescope`, `mino_parse_plan_structural`, `mino_plan_to_stc`, `mino_sync_plan_to_chart`, `mino_sync_chart_to_plan`, `mino_pde_to_plan`, `mino_create_entities`, `mino_create_relations` | 14 |
| West Guide | `mino_advance_action`, `mino_complete_action`, `mino_get_action`, `mino_manage_action`, `mino_mark_action_complete`, `mino_get_chart_progress`, `mino_create_entities`, `mino_add_observations`, `mino_create_relations`, `mino_find_narrative_beats`, `mino_sync_plan_to_chart`, `mino_create_plan_trace` | 12 |
| North Guide | `mino_evaluate_mmot`, `mino_find_narrative_beats`, `mino_create_narrative_arc`, `mino_export_narrative_markdown`, `mino_create_entities`, `mino_add_observations`, `mino_search_nodes`, `mino_open_nodes`, `mino_read_graph`, `mino_get_chart`, `mino_get_chart_progress`, `mino_list_charts` | 12 |

#### medicine-wheel MCP: Available Tool Inventory (Current)

| Category | Tools | Count |
|---|---|---|
| **Integration (CRUD)** | `create_relational_node`, `create_relational_edge`, `get_relational_web`, `log_ceremony_with_memory`, `create_narrative_beat`, `create_research_cycle`, `get_narrative_arc`, `archive_for_seven_generations` | 8 |
| **Discovery (List/Search)** | `list_relational_nodes`, `list_ceremonies`, `list_narrative_beats`, `list_cycles`, `telescope_narrative_beat`, `search_nodes` | 6 |
| **Structural Tension** | `create_structural_tension_chart`, `add_action_step`, `telescope_action_step`, `update_action_progress`, `mark_action_complete`, `update_current_reality`, `get_chart_progress`, `list_structural_tension_charts`, `creator_moment_of_truth`, `link_ceremony_to_chart`, `link_chart_to_cycle`, `honor_relation_in_action_step` | 12 |
| **Direction Guidance** | `east_vision_inquiry`, `east_spirit_invocation`, `east_new_relation_mapper`, `south_growth_practice`, `south_youth_mentorship_protocol`, `south_embodied_data_collection`, `west_reflection_ceremony`, `west_emotional_processing`, `west_strawberry_teaching`, `north_wisdom_synthesis`, `north_elder_council_invocation`, `north_spirit_feeding_ceremony`, `north_story_archiving` | 13 |
| **Validators** | `accountability_validator`, `ocap_compliance_checker`, `two_eyed_seeing_bridge`, `wilson_paradigm_checker` | 4 |
| **TOTAL** | | **43** |

#### Gap Summary: `mw_` Tools Needed for Ceremony Agents

| Needed `mw_` Tool | Purpose | Priority |
|---|---|---|
| `mw_ceremony_open` | Open a ceremony session, set direction to East | P0 |
| `mw_ceremony_close` | Close a ceremony session, mark complete | P0 |
| `mw_get_direction` | Get current ceremony direction state | P0 |
| `mw_store_memory` | Store wisdom/memory from North direction | P1 |

These four `mw_` tools are the **minimum** the Fire Keeper and North Guide need. Without them, the ceremony agents cannot manage the ceremony lifecycle programmatically.

---

## 3. Recommendations

### Immediate (P0)

1. **Fix stale lock handling** — Add timeout-based cleanup to `withWriteLock()`. Orphan locks from crashed processes will permanently block writes.

2. **Fix lock-failure behavior** — Throw or log a warning when 20 lock attempts fail, instead of silently executing without the lock.

3. **Implement `mw_ceremony_open`, `mw_ceremony_close`, `mw_get_direction`** — These are the minimum tools for the Fire Keeper to orchestrate ceremony sessions. Could be a new `mcp/src/tools/ceremony-lifecycle.ts`.

4. **Add `get_relational_node`, `get_ceremony`, `get_cycle` tools** — Agents need single-entity retrieval by ID. Currently only list+filter is available.

### Near-Term (P1)

5. **Extract shared store package** — Move JSONL store to `packages/store/` to eliminate the duplicated 500+ line implementation. Configure both `lib/` and `mcp/` to import from it.

6. **Add delete methods and tools** — `delete(id)` on `JsonlCollection`, exposed as `delete_relational_node`, `delete_ceremony`, etc.

7. **Add `list_mmots` tool** — `getMmotsByChart()` exists in the store but has no MCP tool exposure. North Guide needs this for reviewing past evaluations.

8. **Add `update_cycle_direction` tool** — Fire Keeper needs to advance `current_direction` during ceremony flow (East→South→West→North).

### Strategic (P2)

9. **Unify path resolution** — Both `lib/jsonl-store.ts` and `mcp/src/jsonl-store.ts` resolve `.mw/store/` differently. Standardize to a single algorithm.

10. **Mutation events** — Add an EventEmitter to the store so the Web UI can react to MCP writes in real-time.

11. **Update rispecs** — Document the JSONL persistence architecture in `rispecs/data-store.spec.md` per plan Task 4.

12. **`mw_store_memory` tool** — For North Guide wisdom archival. Could store key-value memories alongside the entity JSONL files.

---

## Summary Scorecard

| Dimension | Score | Notes |
|---|---|---|
| **Plan Fidelity** | 4/6 tasks fully delivered | Tasks 0 (packages) and 4 (rispecs) partially done |
| **Code Quality** | Strong | Atomic writes, file locking, mtime-based cache invalidation, edge upsert semantics |
| **Architectural Debt** | Medium | Two mirrored implementations instead of shared package |
| **Store Completeness** | 70% | CRUD gap: no Update or Delete for most entities |
| **Tool Completeness** | 65% | 43 tools available but missing key CRUD tools (get-by-ID, delete, update) |
| **Ceremony Agent Readiness** | 30% | 4 critical `mw_` tools missing; Get-by-ID tools missing; `mino_*` tools come from separate servers |
| **Concurrency Safety** | 80% | Lock mechanism sound but stale lock and lock-failure edge cases not handled |

> *"The goal is effectiveness, not perfection. Use discrepancies to learn, not to judge. Truth as a verb."*
