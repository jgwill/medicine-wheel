# Orchestration Plan — Medicine Wheel MCP Enhancement

**Session UUID**: 8302628d-f031-4724-b59b-4337c3e24bf0
**Child PDE**: e04e9a02-5be3-45f7-9b37-b335c72c902a
**Date**: 2026-04-05
**Protocol**: RISE PDE Session Multi-Agent v2

---

## Structural Tension Chart

**Desired Outcome**: A fully-featured Medicine Wheel MCP server with complete CRUD operations for all entity types (nodes, edges, ceremonies, beats, cycles, charts, mmots), backed by shared JSONL persistence, academically grounded in Indigenous epistemology, and documented with orchestration learnings that inform future ceremonial technology development sessions.

**Current Reality** _(updated post-wake 2026-04-05)_:
- ✅ `create_research_cycle` validated end-to-end — cycle created, listed, retrieved by ID via JSONL store
- ✅ JSONL persistence confirmed working — 3 cycles and 3 ceremonies persisting across sessions
- ✅ Store at `.mw/store/` with nodes.jsonl, edges.jsonl, ceremonies.jsonl, cycles.jsonl, beats.jsonl
- 🔄 S1 agent running MMOT review of shared-persistence + tool completeness audit
- 🔄 S2-S4 agents running 3 parallel deep-searches (Wilson/ceremonial protocol/Two-Eyed Seeing)
- ⬜ CRUD coverage uneven — audit in progress
- ⬜ No academic validation yet — deep-searches running
- ⬜ rispecs/CYCLES.md and rispecs/CEREMONIES.md exist only as demo versions in `rispecs/demo/`

**Action Steps** (strategic secondary choices supporting the primary goal):

1. **PART 1 — MMOT Review & Validation** (SOUTH→WEST→NORTH)
   - Review completed PR #27 shared-persistence using 4-step MMOT — identify enhancement opportunities
   - Audit MCP tool completeness matrix
   - Validate create_research_cycle end-to-end
   - Write mmot-review.md

2. **PART 2 — Deep-Search & Academic Grounding** (SOUTH→WEST→NORTH)
   - **DS#1**: Wilson's relational ontology → multi-agent orchestration design (agent identity as relational, not capability-based). Compare with AutoGen/CrewAI to surface structural differences. Ground: Wilson 2008 ch.4, KINSHIP.md, IAIP DRAFT §2.1
   - **DS#2**: Ceremonial protocol precedents in technology development — ceremony-as-lifecycle (opening/closing, witnessing, consent, circle governance → PR review, deploy, incident). Ground: ceremony-protocol.spec.md, fire-keeper.spec.md, Kovach 2009, Smith 1999
   - **DS#3**: Two-Eyed Seeing (Etuaptmumk) in dual-store architecture — JSONL/graph persistence (Western) alongside OCAP®/relational accountability (Indigenous). Ground: Marshall 2004, consent-lifecycle.spec.md, FNIGC Indigenous data sovereignty
   - Cross-reference findings with codebase
   - Transform into rispecs
   - Store thesis

3. **PART 3 — Enhancement & Orchestration Documentation** (SOUTH→NORTH)
   - Explore skill patterns
   - Enhance MCP CRUD completeness
   - Update rispecs
   - Create orchestration-upgrade-recommendations.md

---

## Agent Deployment Plan

### SOUTH Agents (model: claude-opus-4.6)
- **S1**: MMOT review of completed shared-persistence (PR #27) — enhancement opportunities + MCP tool audit
- **S2**: Deep-search #1 — Wilson’s relational ontology → multi-agent orchestration (compare Western frameworks)
- **S3**: Deep-search #2 — Ceremonial protocol precedents in technology lifecycle
- **S4**: Deep-search #3 — Two-Eyed Seeing in dual-store architecture + Indigenous data sovereignty
- **S5**: Explore orchestration skill patterns

### WEST Agents (model: claude-opus-4.6)
- **W1**: Validation — cross-reference, CRUD completeness verification

### NORTH Agents (model: claude-opus-4.6)
- **N1**: MCP CRUD enhancement implementation
- **N2**: Rispecs author (CEREMONIES.md, CYCLES.md updates)
- **N3**: Orchestration documentation author
- **N4**: Thesis synthesis from deep-search results

---

## Part Boundaries

| Part | Focus | Commit Message Pattern |
|------|-------|----------------------|
| 1 | MMOT Review + Validation | `[pde] Part 1: MMOT review of shared-persistence + MCP validation` |
| 2 | Deep-Search + Academic | `[pde] Part 2: Academic grounding — orchestration thesis` |
| 3 | Enhancement + Documentation | `[pde] Part 3: MCP CRUD enhancement + orchestration recommendations` |
