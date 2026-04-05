# Orchestration Plan — Medicine Wheel MCP Enhancement

**Session UUID**: 8302628d-f031-4724-b59b-4337c3e24bf0
**Child PDE**: e04e9a02-5be3-45f7-9b37-b335c72c902a
**Date**: 2026-04-05
**Protocol**: RISE PDE Session Multi-Agent v2

---

## Structural Tension Chart

**Desired Outcome**: A fully-featured Medicine Wheel MCP server with complete CRUD operations for all entity types (nodes, edges, ceremonies, beats, cycles, charts, mmots), backed by shared JSONL persistence, academically grounded in Indigenous epistemology, and documented with orchestration learnings that inform future ceremonial technology development sessions.

**Current Reality**: MCP has 30+ tools but `create_research_cycle` was just added and not yet validated end-to-end. Shared JSONL persistence exists (PR #27) but hasn't been reviewed via MMOT. CRUD coverage is uneven — some entity types have create/list but not get/update. No academic validation of the design against Indigenous epistemology literature. No orchestration documentation exists.

**Action Steps** (strategic secondary choices supporting the primary goal):

1. **PART 1 — MMOT Review & Validation** (SOUTH→WEST→NORTH)
   - Review PR #27 shared-persistence using 4-step MMOT
   - Audit MCP tool completeness matrix
   - Validate create_research_cycle end-to-end
   - Write mmot-review.md

2. **PART 2 — Deep-Search & Academic Grounding** (SOUTH→WEST→NORTH)
   - 3 parallel deep-searches: Indigenous epistemology in orchestration, ceremonial tech patterns, decolonizing software
   - Cross-reference with codebase
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
- **S1**: MMOT review of shared-persistence + MCP tool audit
- **S2**: Deep-search Indigenous epistemology in agent orchestration
- **S3**: Deep-search ceremonial technology development patterns
- **S4**: Deep-search decolonizing software architecture
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
