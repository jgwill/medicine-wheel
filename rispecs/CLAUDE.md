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
| `decomposition-strategies.spec.md` | prompt-decomposition (capability) | Strategy framework — depth on demand: multi-pass & dual-framing over the deterministic foundation |
| `ui-components.spec.md` | ui-components | React components |
| `reading-layer.spec.md` | *(unassigned)* | Standings registry, read-time composition, refusal as a return type, read-as-event |
| `council-record.spec.md` | *(unassigned)* | Contributions gathered on a matter, recognized patterns, advance-with-divergence |

> **This table covers a subset.** `rispecs/` holds well over forty documents; the rows above
> are the package specs plus later additions, not a complete listing. Run `ls rispecs/`
> before assuming a subject is unspecified — and read git dates, not file mtimes, when
> judging freshness: any checkout rewrites mtimes across the whole tree.

## How to Read

Start with `medicine-wheel.spec.md` for the system overview, then dive into individual package specs. Each spec is RISE-compliant (Reverse-engineer → Intent-extract → Specify → Export) and codebase-agnostic — another LLM should be able to re-implement the full system from these specs alone.
