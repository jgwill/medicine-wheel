# Community service paths

Companion to [`COMMUNITY.md`](./COMMUNITY.md). If you are deciding what to build next, the research in [`output/`](./output/) mapped the gaps. The short version:

## What is already there

`ceremony-protocol`, `ontology-core`, `relational-query`, `community-review`, `consent-lifecycle` — structural foundation covering ~55% of Wilson's full paradigm. Relations, Four Directions, OCAP®, and Three R's are solid.

## Where the gaps are

| What is missing | Where to start |
|---|---|
| Fire Keeper — a living ceremony maintainer, not just state objects | `rispecs/fire-keeper.spec.md` |
| Community review — circle-of-reviewers, Elder validation | `src/community-review/` (partial) |
| Transformation tracking — how work changes the people doing it | not yet implemented |
| Consent as a living obligation, not a checkbox | `src/consent-lifecycle/` (partial) |

Full gap map: [`output/research-gap-analysis.md`](./output/research-gap-analysis.md)

## External repos and packages to draw from

These are starting points for forking or extending — they carry the specs, schemas, or infrastructure this suite does not yet implement.

| Repo / package | What it has |
|---|---|
| [`miadisabelle/forgewright`](https://github.com/miadisabelle/forgewright) | Episode visibility UI; consumes Medicine Wheel inquiry-weave data. Branch `4-plan-episode-visibility` is the live integration target. |
| `@miadi/inquiry-weave` (Miadi monorepo) | Owns `.weave.yaml` authoring and sync semantics; the registration contract for this repo lives in `rispecs/inquiry-weave-registration.spec.md`. |
| [`RDFLib/rdflib`](https://github.com/RDFLib/rdflib) | RDF triple store machinery; candidate backend for `ontology-core` if a graph-store layer is added. |
| [`xdobry/rdfglance`](https://github.com/xdobry/rdfglance) | Lightweight RDF graph browser; fork target for a Medicine-Wheel-aware ontology explorer. |
| [`Rathachai/d3rdf`](https://github.com/Rathachai/d3rdf) | D3-based RDF visualizer; closest open match to the graph-viz direction this suite is heading. |
| `iaip-mcp` / `coaiapy-mcp` | MCP servers for direction guidance and tracing; the Fire Keeper worker wires into these for ceremony state. |

## If you are choosing a path

- **Extend an existing package** — `community-review` and `consent-lifecycle` both have clear next steps in the gap map.
- **New package** — fire-keeper is the highest-leverage missing piece. Spec already exists at `rispecs/fire-keeper.spec.md`; the implementation-ready spec is in `output/research-gap-analysis.md` §1.
- **Fork an external repo** — `rdfglance` or `d3rdf` for a relational graph explorer; `forgewright` for episode/community views.
- **Deploy the stack as-is** — see `ALPHA.md` for what is stable enough to depend on.
