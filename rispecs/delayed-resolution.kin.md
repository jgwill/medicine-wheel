# delayed-resolution: kin

Who and what `delayed-resolution.spec.md` is in relationship with, where each relative lives, and what each relationship asks of the medicine wheel. Written 2026-10-20 from Miadi Chronicle Episode 297 (`miadi-chronicle://297`).

## Came from

| relative | where | what it asks |
|---|---|---|
| William's takes of 2026-10-19 | Episode 297 `captures/261019191540`, `261019193132`, `261019193919` | Keep his words: the delay is a chosen state, not only a date. |
| The design shared by three lineages | Episode 297 `delayed-resolution-design-261019.md` | Same fields and meaning as coaia-narrative and coaiajs, written in the wheel's snake_case on its own `ActionStep`. |
| The parity map | Episode 297 `delayed-resolution-parity-261019.md` | The chart operations coaia-narrative had and the wheel lacked, ranked. The wheel took the first four groups and the supporting operations. |
| Robert Fritz's course lessons | `/w/CSV/kb2508` (jgwill/CreerSaVieHelper): `docs/LAA-w04-22bc-Delay_Resolution.md`, `transcriptions/LAA-w01-06e-Due-Date.txt`, `LAA-w01-06f-Assigning-Due-Date.txt` | Cite him for the teaching: a delay is "a secondary choice to our primary choice". |

## Walks beside

| relative | where | what it asks |
|---|---|---|
| coaia-narrative | avadisabelle/coaia-narrative, npm 0.24.1 | A separate lineage. Refers to a step by `actionStepName`, writes camelCase in `metadata`, and refuses to delay a chart without a parent. Do not import from it. |
| coaiajs | jgwill/coaiajs, npm 0.6.1 | A separate lineage, same distance. |
| Episode 297's cross-lineage spec | Episode 297 `rispecs/delayed-resolution/` | Proposed for jgwill/Miadi. Keeps the one meaning of "delayed" across the three lineages. |
| `@miadi/llmops` | jgwill/Miadi `packages/llmops`, npm 0.1.0 (jgwill/Miadi#829) | Its `llmops rehydrate` prints the `trace` and `rehydrate_with` a session carries from 0.24.0. The wheel checks only the `miadi-` prefix, stores both as given, and leaves resolving them to that package. Do not import from it. |

## Relies on us

| relative | where | what it asks |
|---|---|---|
| The live chronicle wheel | `ilex:8040` (`MIADI_CHRONICLE_MW_URL`) | It still runs an app older than 0.23.0, so chart-level fields are dropped there. Redeploying it is held for William. |
| Agents using the wheel's MCP | `@medicine-wheel/mcp` 4.24.1 | Refusals are answers, not errors. `not_persisted` means the serving app did not keep a field. |
| People and seats typing `mw chart` | `@medicine-wheel/app` 0.24.1 | Until 0.24.0 every `mw chart` command printed nothing (F1), and until 0.24.1 a global install could not find its server. From 0.24.1 both print, and an MCP command that gets no answer says so and exits 1. |
| The session inventory (Mino seat) | `~/workspace/.mino/session-inventory/` | It owns its records. `AgentSessionRef.inventory_record` lets a delay point at one; the inventory decides whether to point back. |

## Holds a decision

| decision | keeper |
|---|---|
| Who runs the clock that steers a session before `resolve_by` | William (Episode 297 chart, step `chart_1792455485265_action_7`, resolve-by 2026-10-27) |
| Redeploying `ilex:8040` with app 0.24.1 | William |
