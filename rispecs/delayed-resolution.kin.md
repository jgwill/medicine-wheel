# delayed-resolution: kin

Who and what `delayed-resolution.spec.md` is in relationship with, where each relative lives, and what each relationship asks of the medicine wheel. Written 2026-10-20 from Miadi Chronicle Episode 297 (`miadi-chronicle://297`); revised 2026-10-25 for 0.26.0 (the follow-up prompt).

## Came from

| relative | where | what it asks |
|---|---|---|
| William's takes of 2026-10-19 | Episode 297 `captures/261019191540`, `261019193132`, `261019193919` | Keep his words: the delay is a chosen state, not only a date. |
| William's screenwalk of the T1 video, 2026-10-22 | Episode 297 `captures/screenwalk-2610221013-DD-VideoExplainerFeedback-001/feedback-map.md` (V1, V2, V5) | Rehydration is not instant or flawless. A delay names the follow-up prompt composed when it was chosen; what is rehydrated is that prompt, "potentially with the session". The three lineages are independent. |
| The design shared by three lineages | Episode 297 `delayed-resolution-design-261019.md` | Same fields and meaning as coaia-narrative and coaiajs, written in the wheel's snake_case on its own `ActionStep`. |
| The parity map | Episode 297 `delayed-resolution-parity-261019.md` | The chart operations coaia-narrative had and the wheel lacked, ranked. The wheel took the first four groups and the supporting operations. |
| Robert Fritz's course lessons | `/w/CSV/kb2508` (jgwill/CreerSaVieHelper): `docs/LAA-w04-22bc-Delay_Resolution.md`, `transcriptions/LAA-w01-06e-Due-Date.txt`, `LAA-w01-06f-Assigning-Due-Date.txt` | Cite him for the teaching: a delay is "a secondary choice to our primary choice". |

## Walks beside

| relative | where | what it asks |
|---|---|---|
| coaia-narrative | avadisabelle/coaia-narrative, npm 0.26.0 | A separate lineage. Refers to a step by `actionStepName`, writes camelCase in `metadata` (`followUpPrompt` from 0.26.0), and refuses to delay a chart without a parent. Do not import from it. |
| coaiajs | jgwill/coaiajs, npm 0.8.0 | A separate lineage, same distance. Ships `followUpPrompt` from 0.8.0. |
| Episode 297's cross-lineage spec | Episode 297 `rispecs/delayed-resolution/` | Proposed for jgwill/Miadi. Keeps the one meaning of "delayed" across the three lineages. |
| `@miadi/llmops` | jgwill/Miadi `packages/llmops`, npm 0.1.0 (jgwill/Miadi#829) | Its `llmops rehydrate` prints the `trace` and `rehydrate_with` a session carries from 0.24.0. The wheel checks only the `miadi-` prefix, stores both as given, and leaves resolving them to that package. Do not import from it. |

## Relies on us

| relative | where | what it asks |
|---|---|---|
| The live chronicle wheel | `ilex:8040` (`MIADI_CHRONICLE_MW_URL`) | It still runs an app older than 0.23.0, so chart-level fields are dropped there. Redeploying it is held for William. |
| Agents using the wheel's MCP | `@medicine-wheel/mcp` 4.26.0 | Refusals are answers, not errors. `not_persisted` means the serving app did not keep a field. From 4.26.0 a delay with neither a session nor a follow-up prompt is refused as `rehydrated` (`nothing_to_rehydrate`). |
| The clock, tide-runtime (lane L5) | jgwill/Miadi `runtime/tide-runtime` | Reads `follow_up_prompt.address` on a delay when it opens the circle at the date. The wheel stores the address as given and never resolves it. |
| The session inventory's follow-up prompts (lane L3) | `~/workspace/.mino/session-inventory/` (the witness seat) | It composes each suspension's follow-up prompt; the wheel keeps the address and text it is given. |
| People and seats typing `mw chart` | `@medicine-wheel/app` 0.26.0 | Until 0.24.0 every `mw chart` command printed nothing (F1), and until 0.24.1 a global install could not find its server. From 0.24.1 both print, and an MCP command that gets no answer says so and exits 1. |
| The session inventory (Mino seat) | `~/workspace/.mino/session-inventory/` | It owns its records. `AgentSessionRef.inventory_record` lets a delay point at one; the inventory decides whether to point back. |

## Holds a decision

| decision | keeper |
|---|---|
| Who runs the clock that steers a session before `resolve_by` | Named by William on 2026-10-22 (screenwalk `2610221013`, 27:43): tide-runtime, lane L5. Who keeps each witness session is still held (26:09). |
| Redeploying `ilex:8040` with app 0.26.0 | William |
