# CLAUDE — rispecs/

This folder contains RISE framework specifications for Medicine Wheel packages, capabilities, registries, and cross-package contracts.

## Specification Index

| File | Package / boundary | Description |
|------|--------------------|-------------|
| `medicine-wheel.spec.md` | System | Current workspace architecture, canonical seams, and parity law |
| `ontology-core.spec.md` | ontology-core | Closed node ontology, first-class relations, kinship, schemas, additive domain kinds |
| `storage-provider.spec.md` | storage-provider | Canonical persistence contract, JSONL/Neon parity, typed relational refusals, registries |
| `data-store.spec.md` | data-store | Redis-specific data access; explicitly not the canonical provider boundary |
| `data-store-postgres.spec.md` | data-store-postgres | Minimal `pg` scaffold; explicitly not a competing provider architecture |
| `ceremony-protocol.spec.md` | ceremony-protocol | Ceremony state, phases, governance |
| `narrative-engine.spec.md` | narrative-engine | Beat sequencing, arc validation, timeline, cycle |
| `graph-viz.spec.md` | graph-viz | Circular layout, SVG paths, data converters |
| `relational-query.spec.md` | relational-query | Query, traversal, audit, Cypher |
| `prompt-decomposition.spec.md` | prompt-decomposition | Intent extraction, Four Directions PDE |
| `decomposition-strategies.spec.md` | prompt-decomposition capability | Depth-on-demand strategies over the deterministic foundation |
| `ui-components.spec.md` | ui-components | React components |
| `capture-registry.spec.md` | storage-provider + app | Capture records + URIs, canonical `/api/captures`, deprecated `/api/recordings` alias |
| `reading-layer.spec.md` | unassigned | Standings registry, read-time composition, refusal as return type, read-as-event |
| `council-record.spec.md` | unassigned | Contributions on a matter, recognized patterns, advance-with-divergence |

> **This table is intentionally not exhaustive.** `rispecs/` contains package specs, capability specs, registry specs, proposals, and records. Search the directory before concluding that a subject is unspecified.

## How to Read

Start with `medicine-wheel.spec.md` for the current system seams, then read the package or capability spec that owns the behavior.

A RISE spec is intended to be re-implementable from its conceptual contract. Current repository paths may therefore appear in an **Implementation Evidence Appendix** for parity checking without turning incidental file layout into the normative design.

## Code-Parity Law

Do **not** treat a spec as current merely because its language remains philosophically aligned with RISE.

Before using a spec as implementation authority, check:

1. **Release line** — compare the spec version/date with the package or workspace that currently ships.
2. **Exports** — verify types, schemas, functions, commands, and provider operations that materially define behavior.
3. **Canonical seam** — identify which package now owns the cross-package contract; historical packages may remain real without remaining authoritative.
4. **Implemented vs deferred** — a named provider, route, skill, or phase is not necessarily implemented.
5. **Serving surfaces** — REST, CLI, MCP, and UI behavior belongs in parity when users or agents depend on it.
6. **Load-bearing semantics** — paging vs totals, filtering, refusal/errors, merge/upsert rules, aliases, migrations, provenance, and consent state must be represented when they affect observable behavior.
7. **Vocabulary changes** — distinguish a canonical rename from a compatibility alias; never infer drift from a filename alone.
8. **Recent commits** — read commit intent when a change altered an invariant without changing the package name.

When code and an old rispec disagree about **what currently exists**, current shipped behavior is the evidence baseline and the rispec should be revised. When they disagree about **what ought to exist**, preserve the desired outcome as desired state and label the implementation gap explicitly instead of rewriting aspiration into false present tense.

## Parity Baseline — 2026-08-19

The current baseline repair establishes these boundaries:

- root suite and workspace line: `0.6.3`;
- MCP line: `4.6.3`;
- root topology: 27 ordered workspaces plus the root app;
- `ontology-core`: closed six-value `NodeType`, governed kinship edges, relation authorization context, consent state, narrative provenance/telescoping, epistemic/axiological dimensions, and additive production/infra/academic kinds;
- `storage-provider`: canonical JSONL + Neon contract; Redis is a named but unimplemented canonical backend;
- `data-store`: Redis-specific package, not the owner of JSONL/provider parity;
- `capture-registry`: capture vocabulary is canonical; `/api/recordings` is a deprecated compatibility alias, not evidence that capture naming is stale.

Use `rise-alignment-review.md` as the dated parity ledger for what has and has not been revalidated.
