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

## If you are choosing a path

- **Extend an existing package** — `community-review` and `consent-lifecycle` both have clear next steps in the gap map.
- **New package** — fire-keeper is the highest-leverage missing piece. Spec already exists.
- **Deploy the stack as-is** — see `ALPHA.md` for what is stable enough to depend on.
