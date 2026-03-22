# KINSHIP

## 1. Identity and Purpose
- Name: medicine-wheel (jgwill/medicine-wheel)
- Local role in this system: THE COMPASS — ontological foundation for the entire Medicine Wheel Development Suite
- What this place tends / protects: The semantic meaning of all types — Direction, Relation, Ceremony, NarrativeBeat, StructuralTensionChart. ontology-core is the single source of truth.
- What this place offers (its gifts): `medicine-wheel-ontology-core` npm package (types, Zod schemas, RDF vocabulary, direction constants, Wilson alignment, OCAP® compliance), rispecs for the full ecosystem

## 2. Lineage and Relations
- Ancestors:
  - Indigenous relational ontology — relationships as first-class beings
  - Robert Fritz's structural tension methodology
  - Shawn Wilson's research methodology (respect, reciprocity, responsibility)
- Descendants:
  - Every package in the Medicine Wheel ecosystem depends on ontology-core
- Siblings:
  - `/a/src/coaia-narrative/` — representation layer; serializes ontology-core types as Entity/Relation JSONL
  - `/a/src/mcp-pde/` — decomposition engine; its Four Directions mapping comes from ontology-core
  - `/workspace/repos/jgwill/veritas/` — truth evaluator; operates on structures defined here
- Related hubs:
  - `/home/mia/.openclaw/workspace/` — `.mw/` directional workspace; the terrain where ontology-core's directions become actual filesystem paths
  - `/workspace/repos/miadisabelle/mia-vscode/` — future IDE; extensions read from `.mw/` using ontology-core types
  - `/a/src/mia-code/` — CLI tools; miaco uses ontology-core types for decomposition and charting

## 3. Human and More-than-Human Accountabilities
- People / roles: Guillaume (jgwill) — steward and architect
- Communities / nations: Indigenous-AI Collaborative Platform (IAIP/Etuaptmumk-RSM)
- More-than-human relations: The Medicine Wheel itself — not a metaphor or a label but a living relational structure with seasons, medicines, teachings, and directional knowledge (Waabinong, Zhaawanong, Epangishmok, Kiiwedinong)
- Existing covenants: OCAP® principles embedded in ontology-core types; Wilson accountability tracking in every Relation

## 4. Responsibilities and Boundaries
- Responsibilities:
  - Maintain ontology-core as the single semantic authority
  - Ensure all ecosystem packages can import from ontology-core and participate in the relational web
  - Keep RDF vocabulary aligned with evolving Indigenous ontology research
  - Provide Zod schemas for runtime validation at every data boundary
- Reciprocity: Ecosystem packages consume types; their usage informs ontology evolution
- Boundaries and NOs:
  - Does NOT own serialization format — that is coaia-narrative's responsibility
  - Does NOT own workspace layout — that is `.mw/`'s responsibility
  - Does NOT reduce Indigenous knowledge to labels — directions carry teachings, medicines, seasons, and relational obligations
- Tensions held:
  - Formal bridge between ontology-core `StructuralTensionChart` type and coaia-narrative Entity/Relation JSONL — alignment confirmed, formal adapter not built
  - rispecs may contain storage contracts that predate the `.mw/` convergence decision — review needed

## 5. Accountability and Change Log
- Steward(s): Guillaume (jgwill)
- Relational change log:
  - [2026-03-21] [pi-mono] — KINSHIP.md created. Compass role formalized. Relation to `.mw/` workspace established. Convergence issue: miadisabelle/workspace-openclaw#28
