# CLAUDE — rispecs/

This folder contains RISE framework specifications for all Medicine Wheel packages.

## Specification Index

| File | Package | Description |
|------|---------|-------------|
| `medicine-wheel.spec.md` | System | Top-level spec linking all packages |
| `ontology-core.spec.md` | ontology-core | Types, schemas, vocabulary, constants, queries |
| `ceremony-protocol.spec.md` | ceremony-protocol | Ceremony state, phases, governance |
| `narrative-engine.spec.md` | narrative-engine | Beat sequencing, arc validation, timeline, cycle |
| `graph-viz.spec.md` | graph-viz | Circular layout, SVG paths, data converters |
| `relational-query.spec.md` | relational-query | Query, traversal, audit, Cypher |
| `prompt-decomposition.spec.md` | prompt-decomposition | Intent extraction, Four Directions PDE |
| `ui-components.spec.md` | ui-components | React components |

## How to Read

Start with `medicine-wheel.spec.md` for the system overview, then dive into individual package specs. Each spec is RISE-compliant (Reverse-engineer → Intent-extract → Specify → Export) and codebase-agnostic — another LLM should be able to re-implement the full system from these specs alone.
