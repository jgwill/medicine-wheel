# delayed-resolution - RISE Specification

> An action step on a structural tension chart can record that someone strategically chose to delay its resolution, list such delays by the date resolution is wanted, link the agent session to rehydrate (with its LLMOps trace and the prompt version that rehydrates it), name the follow-up prompt composed when the delay was chosen, and end the delay. The chart tools also gain read-back, per-step due dates, and the chart edits coaia-narrative already had.

**Version:** 0.26.0 (`@medicine-wheel/mcp` 4.26.0). Delayed resolution, read-back, step due dates and chart edits landed in 0.22.0; chart-level links and the `/api/charts` field list in 0.23.0; the session's `trace` and `rehydrate_with`, and `mw` one-shot commands that print (F1 fixed), in 0.24.0; a globally installed `mw` that finds the globally installed server in 0.24.1; the delay's `follow_up_prompt` in 0.26.0. 0.25.0 (2026-10-20, jgwill/medicine-wheel#166, the episode packages) did not touch the chart code.
**Status (0.26.0):** Implemented on 2026-10-25 (Episode 297, lane L4c of the feedback map William's screenwalk `2610221013` produced, V1, V2 and V5). Release evidence is recorded in the Exportation section.
**Status (0.24.x):** Implemented and published on 2026-10-20: `@medicine-wheel/app` 0.24.0 and 0.24.1, `@medicine-wheel/mcp` 4.24.0 and 4.24.1, `@medicine-wheel/ontology-core` 0.24.0 and 0.24.1 on npm (commits `cadc230`, `c90e051`, `1f05da2` v0.24.0, `8978357`, `b0971a9` v0.24.1); vitest 756 of 756. 0.24.1 exists because the installed 0.24.0 `mw` could not find the installed server (RELEASING.md step 7, see CLI). A consumer installing `@medicine-wheel/mcp` 4.24.0 and `@miadi/llmops` 0.1.0 from npm carried llmops's printed `trace` and `rehydrate_with` through delay, list and a `rehydrated` end and got both back unchanged, 9 checks (Episode 297 `validation/medicine-wheel/output-261020.txt`). The globally installed 0.24.1 `mw chart create` and `mw chart list` print and exit 0. Earlier: 0.22.0 and 0.23.0 published on 2026-10-19 (commits `1e2e462`, `442aa56` v0.22.0, `22d54ed`, `49f1afc` v0.23.0; `validation/medicine-wheel/output-261019.txt`, 8 checks). The live chronicle wheel (`ilex:8040`) is **not redeployed** and still runs an older app, so it drops the 0.23.0 chart-level fields (see Exportation).
**Package boundary:** `@medicine-wheel/mcp` (tools, HTTP store), `@medicine-wheel/ontology-core` (types and schemas), `@medicine-wheel/app` (`/api/charts`, `mw chart` CLI)
**Origin:** Miadi Chronicle Episode 297 (`miadi-chronicle://297`), `2026-07-24-episode-297-mino-bimaadizi-daa-stc-bot-ceremony/delayed-resolution-design-261019.md` (the contract shared with `coaia-narrative` and `coaiajs`), and `delayed-resolution-parity-261019.md` in the same vessel (the parity map this work follows). The episode's own cross-lineage spec is its `rispecs/delayed-resolution/`.
**Relational context:** `delayed-resolution.kin.md` beside this file.

---

## Reverse Engineering

### Current Reality (before 0.22.0)

- A wheel step (`mcp/src/tools/structural-tension.ts`) had `status: pending | in_progress | completed` and an optional `due_date` stored as sent: not validated, never inherited from the chart, never given to steps written with the chart.
- Nothing recorded a *chosen* delay. A due date says when; it does not say that someone chose to wait, why, or for what.
- Nothing linked a step to an agent session.
- There was no tool to read a chart or a step whole; `get_chart_progress` is a projection.
- In HTTP mode (`MW_API_URL` set), `/api/charts` appends a full copy of a chart on every save and returns every copy, so `list_structural_tension_charts` listed a chart once per save.
- `mark_action_complete` said "Completion flows into current reality" and wrote nothing there. Step ids were the array length, which collides once a step can be removed. `link_ceremony_to_chart` and `honor_relation_in_action_step` did not await their save, so a failed HTTP write reported success.

### Structural Tension

**Current Reality:** the wheel holds a step's date but not the choice to wait, and cannot hand back the session that was waiting.

**Desired State:** every step can carry an open or ended delayed resolution with its date, reason, primary choice, event cues and session; listings show what is owed; ending a delay rehydrates the session or releases the step; the chart operations match coaia-narrative's in the wheel's own terms.

### Current Reality (before 0.24.0)

- A delay's `session` could name how to resume an agent (`resume_command`) but not the session's LLMOps record or the pinned prompt version that rehydrates it. `@miadi/llmops` 0.1.0 (jgwill/Miadi#829) prints both as `miadi-` addresses.
- Every `mw chart` command printed nothing and exited 0 (finding F1). `mcpRaw` in `cli/mw.ts` wrote one JSON-RPC request to the server's stdin with no `initialize` before it and no newline after it. The SDK's stdio transport reads newline-delimited messages, so the request was never read. The newline was the cause that decided it: the same request with a newline and no handshake was answered.

### Current Reality (before 0.26.0)

- A delay could name the session to resume, but not the follow-up prompt composed when the delay was chosen. William's screenwalk of the T1 video (2026-10-22, V1 at 04:12): rehydration as shown "makes it looks a little too great". A due date that arrives is an event: a talking circle takes up a follow-up prompt, and what is rehydrated is that prompt, "potentially with the session" (15:44).
- `end_delayed_resolution` with `rehydrated` on a delay that carried no session ended the delay and answered `resume_command: null` with the note "This delay carried no session to rehydrate." Nothing was refused.

---

## Intent

Fritz: "Part of the maturation process is to learn how to delay resolution in favor of longer-term goals." A delay is a secondary choice made for a primary choice. The wheel records that choice on the step itself, so a listing can say which delays have come due, and the person or agent that ends one gets back the follow-up prompt composed when the delay was chosen and the command that resumes the waiting session. What is rehydrated is that prompt, potentially with the session: resuming is a decision taken in a circle at the date, not an instant or flawless restoration of context. The medicine wheel is its own lineage: it implements the shared design in its own snake_case terms and depends on neither coaia package.

---

## Creative Advancement Scenarios

**Creative Advancement Scenario**: Setting a session aside until a date

**User Intent**: A person or seat sets aside the agent session that holds a step's work, and wants it back on a chosen date with its reason intact.
**Current Reality**: The step sits on a wheel chart with a due date. The session that was working on it is idle, and nothing on the chart says why it stopped or how to resume it.
**Natural Progression Steps**:
  1. `npx @miadi/llmops rehydrate --domain <d> --trace <T> --mission <miadiRun-name>.v<N>` prints the session's `trace` and the `rehydrate_with` prompt version.
  2. `delay_resolution` records the choice on the step: `resolve_by`, `reason`, `chosen_by`, what the delay serves, the event cues, and the session with its `cwd` or `resume_command`, and with `trace` and `rehydrate_with` as llmops printed them. The step's status becomes `delayed` and its due date becomes `resolve_by`.
  3. `list_delayed_resolutions` and `get_chart_progress` place the step among the other delays by date, with `days_remaining`, and mark it `owed` once the date passes.
  4. On the date, or when a cue happens, `end_delayed_resolution` with `outcome: "rehydrated"` closes the record and returns the session's `resume_command`, `trace` and `rehydrate_with`.
**Achieved Outcome**: The session comes back with the reason it was set aside and the prompt version that rehydrates it, and the chart keeps the closed delay as part of its history.
**Supporting Features**: `delay_resolution`, `list_delayed_resolutions`, `end_delayed_resolution`, status `delayed`, `AgentSessionRef` with `trace` and `rehydrate_with`.

**Creative Advancement Scenario**: A circle at the date takes up the follow-up prompt (0.26.0)

**User Intent**: When a person or seat suspends a session, they compose the prompt a circle will take up at the date, and want the wheel to keep it with the delay.
**Current Reality**: The suspension is decided. The follow-up prompt has an address (`miadi-prompt:ceremony/<name>@<v>`) and a text, composed by the person or proposed by an agent.
**Natural Progression Steps**:
  1. `delay_resolution` (or `mw chart delay --follow-up-prompt <address> --follow-up-text <text> --follow-up-by <who>`) records `follow_up_prompt` on the delay, with `composed_at` set to the delay's `chosen_at`. A session is optional.
  2. `list_delayed_resolutions`, `mw chart delayed` and `get_action_step` show the prompt's address on the delay.
  3. At the date, the clock (tide-runtime, lane L5) reads `follow_up_prompt.address` and opens the circle.
  4. The circle ends the delay as `rehydrated`, and gets back `follow_up_prompt` beside the session's `resume_command`, or with `session: null` when the delay carried none. The circle may instead start a new context with new sessions.
**Achieved Outcome**: The prompt composed at the moment of suspension reaches the circle at the date, with or without the session it was composed for.
**Supporting Features**: `DelayedResolution.follow_up_prompt`, `FollowUpPromptSchema`, refusals `follow_up_prompt_invalid` and `nothing_to_rehydrate`.

**Creative Advancement Scenario**: A delayed step is completed before its date

**User Intent**: Work that was set aside gets done another way, earlier.
**Current Reality**: The step holds an open delay and a session that no longer needs to come back.
**Natural Progression Steps**:
  1. `mark_action_complete` completes the step, with `completed_by` when known.
  2. The open delay ends with `outcome: "resolved"`, and `Completed: <title>` is added to the chart's current reality.
**Achieved Outcome**: Nobody rehydrates a session whose work is already done, and the record shows the delay ended in resolution.
**Supporting Features**: rule 4b, `mark_action_complete`.

**Creative Advancement Scenario**: A wheel chart answers to its GitHub issue

**User Intent**: A chart created in the wheel is found again from the GitHub issue that holds the same work, as coaia-narrative charts already are.
**Current Reality**: Before 0.23.0 the chart had no issue field, and `/api/charts` dropped any chart field outside its fixed list.
**Natural Progression Steps**:
  1. `link_chart_to_github_issue` stores the full `owner/repo#number` with its URL.
  2. It reads the chart back, and answers `not_persisted` when the wheel's app is older than 0.23.0.
**Achieved Outcome**: The link exists where it was written, or the caller learns plainly that the serving wheel did not keep it.
**Supporting Features**: `link_chart_to_github_issue`, the `/api/charts` field list of 0.23.0.

---

## Specifications

### The record, on `ActionStep`

```typescript
type ActionStepStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

interface AgentSessionRef {
  session_id: string;            // required
  agent?: string;                // "claude" when not given
  host?: string; cwd?: string; tmux?: string;
  resume_command?: string; inventory_record?: string;
  trace?: string;                // 0.24.0: the session's LLMOps record, e.g. miadi-tracing:ceremony/session/<id>
  rehydrate_with?: string;       // 0.24.0: the pinned prompt version, e.g. miadi-tracing:ceremony/prompt/<name>@<N>
}

interface FollowUpPrompt {        // 0.26.0
  address: string;               // required, begins with miadi-, e.g. miadi-prompt:ceremony/<name>@<v>; stored as given
  text?: string;                 // the prompt's text as composed, so a circle can read it without the provider
  composed_at: string;           // set by the tool to the delay's chosen_at; a caller's value is ignored
  composed_by?: string;          // the person or seat that composed it (an agent may propose it)
}

interface DelayedResolution {
  chosen_at: string;             // ISO, set by the tool
  chosen_by: string;
  resolve_by: string;            // ISO, in the future when chosen
  reason: string;
  primary_choice?: string;       // defaults to the chart's desired outcome, copied when chosen
  wake_on?: string[];            // event cues, in words
  session?: AgentSessionRef;
  follow_up_prompt?: FollowUpPrompt;  // 0.26.0
  ended_at?: string; ended_by?: string;
  outcome?: 'rehydrated' | 'released' | 'resolved';
  end_note?: string;
}

// on ActionStep:
delayed_resolution?: DelayedResolution;           // the current delay, open or ended
delayed_resolution_history?: DelayedResolution[]; // earlier records, oldest first
```

`trace` and `rehydrate_with` are what `npx @miadi/llmops rehydrate --domain <d> --trace <T> --mission <miadiRun-name>.v<N>` prints (`@miadi/llmops` 0.1.0). The wheel accepts any string that begins with `miadi-` for either, stores it exactly as given (no trimming), and never resolves it: resolving an address is the LLMOps package's work. `AgentSessionRefSchema` checks the same prefix.

`follow_up_prompt` (0.26.0) is the follow-up prompt composed when the delay was chosen (Episode 297 feedback map, V1 and V2). Its `address` follows the same rule as a session's LLMOps addresses: any string beginning with `miadi-`, stored exactly as given, never resolved by the wheel. `text` is stored as given; `composed_by` is trimmed. The same meaning ships in coaia-narrative 0.26.0 and coaiajs 0.8.0 as camelCase `followUpPrompt`; the wheel implements it on its own and imports from neither.

A delay is **open** while `ended_at` is absent. An open delay is **owed** when `resolve_by` is at or before now. `ontology-core` exports these types and their Zod schemas (`ActionStepStatusSchema`, `AgentSessionRefSchema`, `FollowUpPromptSchema`, `DelayedResolutionSchema`); `ActionStepSchema` accepts the new fields as optional.

### Rules

1. Choosing a delay sets the step's `due_date` to `resolve_by` and its `status` to `delayed`.
2. A completed step cannot be delayed (`refusal: "step_completed"`). `resolve_by` must parse as a date (`resolve_by_invalid`) and lie in the future (`resolve_by_past`). `reason` and `chosen_by` are required.
3. Delaying a step that already carries a delay record, open or ended, moves that record to `delayed_resolution_history` and writes the new one. Nothing is overwritten.
4. Ending a delay keeps the record with `ended_at`, `ended_by`, `outcome`. A step whose status is `delayed` returns to `in_progress` when its `progress` is above 0, else `pending`. `due_date` keeps the `resolve_by` value.
4b. Completing a delayed step (`mark_action_complete`) ends its open delay with `outcome: "resolved"`, `ended_by` = the optional `completed_by` argument or `"mark_action_complete"`, and `end_note: "completed"`. `end_delayed_resolution` accepts only `rehydrated` and `released`.
4c. (0.26.0) What is rehydrated is the follow-up prompt, potentially with the session. A delay that carries a `follow_up_prompt` and no `session` can end as `rehydrated`. A delay that carries neither is refused as `nothing_to_rehydrate` and stays open; it can still be `released`. Up to 0.25.0 such a delay ended as `rehydrated` with `resume_command: null`.
5. Refusals are returned as `{ status: "refused", refusal, message }`; nothing is written. The codes are `step_completed`, `resolve_by_invalid`, `resolve_by_past`, `reason_missing`, `chosen_by_missing`, `session_invalid` (a `session` that is not an object carrying `session_id`, or whose `trace` or `rehydrate_with` is not a string beginning with `miadi-`), `follow_up_prompt_invalid` (0.26.0: a `follow_up_prompt` that is not an object, whose `address` is missing or does not begin with `miadi-`, whose `text` is not a string, or whose `composed_by` is blank), `no_open_delay`, `outcome_invalid`, `nothing_to_rehydrate` (0.26.0), `ended_by_missing` and `due_within_days_invalid` for the delay operations, and `due_date_invalid`, `desired_outcome_missing` and `github_issue_invalid` for the chart operations.

### Operations (MCP tools)

| tool | input | result |
|---|---|---|
| `delay_resolution` | `chart_id`, `step_id`, `resolve_by`, `reason`, `chosen_by`, optional `primary_choice`, `wake_on[]`, `session` (its `trace` and `rehydrate_with` advertised with `pattern: "^miadi-"`), `follow_up_prompt` (0.26.0: `address` required with `pattern: "^miadi-"`, optional `text`, `composed_by`) | the step, its open delay, `days_remaining`, `redelayed`, `history_length` |
| `list_delayed_resolutions` | optional `due_within_days` (≥ 0), `include_ended` (default false) | rows sorted by `resolve_by` ascending: chart, step, `state` (`open`, `ended`, `superseded`), `resolve_by`, `days_remaining`, `owed`, `reason`, `chosen_by`, `primary_choice`, `wake_on`, `session`, `follow_up_prompt` (0.26.0, or `null`); plus `count`, `open_count`, `owed_count`, `as_of` |
| `end_delayed_resolution` | `chart_id`, `step_id`, `ended_by`, `outcome` (`rehydrated` or `released`), optional `end_note` | the closed record and the step's status; when `rehydrated`, `follow_up_prompt` (0.26.0) and the session's `resume_command`, `trace` and `rehydrate_with` |

- `days_remaining` is `ceil((resolve_by - now) / 1 day)`: negative once owed, 0 within the last day.
- `due_within_days: N` keeps rows whose `resolve_by` is at or before now + N days, so owed delays are always included.
- With `include_ended`, history records appear as `ended` when they carry `ended_at`, else as `superseded` (replaced by a later delay).
- `resume_command`: the stored one (`resume_command_derived: false`); for a `claude` session without one, `claude --resume <session_id>`, prefixed by `cd <cwd> &&` when `cwd` is known (`resume_command_derived: true`); otherwise `null` with a note.
- `trace` and `rehydrate_with` (0.24.0): returned beside `resume_command` when `rehydrated`, each as stored on the session, or `null` when the session carried none. A `released` answer carries neither; the closed record keeps them.
- `follow_up_prompt` (0.26.0): returned beside `resume_command` when `rehydrated`, as stored on the delay, or `null` when the delay carried none. For a delay with a follow-up prompt and no session, `session`, `resume_command`, `trace` and `rehydrate_with` are `null` and the note says that what is rehydrated is the follow-up prompt. A `released` answer does not carry it; the closed record keeps it. A re-delay moves the open record, with its follow-up prompt, into `delayed_resolution_history` (rule 3).

### Read-back

- `get_chart(chart_id)`: the chart as stored, plus `delayed_steps` and `owed_delays`.
- `get_action_step(chart_id, step_id)`: the step, its delay as a listing row (or `null`; the row carries `follow_up_prompt` from 0.26.0), and the sub-chart it telescopes into (`sub_chart`), following `sub_chart_id`; `sub_chart_missing` names an id that no longer resolves.

### Due dates per step

- `create_structural_tension_chart` refuses a `due_date` that is not a date and stores it in ISO form. Steps written with the chart get due dates spread evenly between now and the chart's date, one interval short of it; a chart already past its date gives each step that date; a chart without a date gives none. `telescope_action_step` does the same for the sub-chart's initial steps.
- `add_action_step` refuses an unparseable `due_date`, stores it in ISO form, and otherwise inherits the chart's due date (`due_date_inherited: true`).
- `get_chart_progress` reports each step's `due_date` and, for an open delay, `delayed: { resolve_by, days_remaining, owed }`; counts `delayed` steps; and names `next_action`, the open, not-delayed step due soonest.
- `list_structural_tension_charts` lists each chart's steps with `status`, `due_date`, and for open delays `resolve_by` and `owed`, plus `delayed_steps` and `owed_delays`.

### Chart operations at parity with coaia-narrative

- `update_chart_due_date(chart_id, due_date, redistribute_action_steps?)`: ISO-normalizes, appends `{ from, to, at }` to the chart's `due_date_history`, optionally respreads open steps that are not in an open delay, and reports `action_steps_past_due_date` (open steps due after the new date, delayed ones included).
- `update_desired_outcome(chart_id, new_desired_outcome)`: replaces the outcome and returns the previous one.
- `mark_action_complete` appends `Completed: <title>` to the chart's `current_reality` the first time a step completes.
- `remove_action_step(chart_id, step_id)`: removes the step and returns it; a sub-chart it telescoped into is left in place and named in `sub_chart_left` (`/api/charts` has no DELETE).
- Step ids are one past the highest `<chart_id>_action_<n>` index in use, so an id is never reused after a removal.
- Every chart save is awaited, so a failed HTTP write is reported as `status: "error"`.

### Chart-level links (0.23.0)

- `link_chart_to_github_issue(chart_id, github_issue)` accepts only the full `owner/repo#number` (a bare `#number` is refused as `github_issue_invalid`) and stores `github_issue: { ref, owner, repo, number, url }` on the chart. It reads the chart back after saving and answers `status: "not_persisted"` when the store did not keep the field, which is what a wheel app older than 0.23.0 does.
- `telescope_action_step` writes the sub-chart's backlink: `parent_chart_id`, `parent_action_step_id`, and `level` (the parent's level plus one; a top-level chart is 0).
- `list_structural_tension_charts` shows `github_issue` (as its `ref`), `status`, and the backlink when present.
- `/api/charts` POST keeps `github_issue`, `status` (`active`, `paused`, `resolved`, `archived` in the types), `parent_chart_id`, `parent_action_step_id`, `level` and `due_date_history` in addition to its earlier field list. Other unknown chart fields are still dropped. This ships in `@medicine-wheel/app`; a running wheel keeps its old route until its app is upgraded and restarted.

### The structural tension tool set at 4.26.0

`mcp/src/tools/structural-tension.ts` registers 21 tools. Before 0.22.0 there were 12. 0.24.0 adds no tool; it widens `delay_resolution`'s `session` and `end_delayed_resolution`'s answer. 0.26.0 adds no tool; it adds `delay_resolution`'s `follow_up_prompt`, the listing row's `follow_up_prompt`, and `end_delayed_resolution`'s `follow_up_prompt` and `nothing_to_rehydrate`.

| tool | since | role |
|---|---|---|
| `create_structural_tension_chart` | earlier, due dates hardened in 0.22.0 | write a chart and its first steps |
| `get_chart` | 0.22.0 | read a chart whole |
| `get_action_step` | 0.22.0 | read a step, its delay and its sub-chart |
| `add_action_step` | earlier, due dates hardened in 0.22.0 | add a flat step |
| `remove_action_step` | 0.22.0 | remove a step |
| `telescope_action_step` | earlier, backlink in 0.23.0 | expand a step into a sub-chart |
| `update_action_progress` | earlier | progress and the step's current reality |
| `mark_action_complete` | earlier, rule 4b and current reality in 0.22.0 | complete a step |
| `delay_resolution` | 0.22.0 | choose a delay |
| `list_delayed_resolutions` | 0.22.0 | list delays by `resolve_by` |
| `end_delayed_resolution` | 0.22.0 | end a delay |
| `update_current_reality` | earlier | replace the chart's current reality |
| `update_desired_outcome` | 0.22.0 | replace the desired outcome |
| `update_chart_due_date` | 0.22.0 | move the chart's date, with history |
| `get_chart_progress` | earlier, due dates and delays in 0.22.0 | progress projection |
| `list_structural_tension_charts` | earlier, one copy per chart and step rows in 0.22.0 | list charts |
| `creator_moment_of_truth` | earlier | MMOT |
| `link_ceremony_to_chart` | earlier, save awaited in 0.22.0 | ceremony link |
| `link_chart_to_github_issue` | 0.23.0 | issue link |
| `link_chart_to_cycle` | earlier | cycle link |
| `honor_relation_in_action_step` | earlier, save awaited in 0.22.0 | relation link |

No tool sets a chart's `status`, although `/api/charts` keeps the field from 0.23.0.

### HTTP store

`HttpStore.getAllCharts` keeps one copy per chart id: the latest `updated_at`, and on a tie the copy that comes later in the response (the route's sort is stable, so a later line was written later). The direction filter applies after de-duplication. `getChart` reads through it. The route itself is unchanged and still appends.

### CLI

`mw chart get <id>`, `mw chart delay <chart> <step> <resolve_by> <reason> --by <who> [--primary] [--wake-on] [--session --cwd --resume --host] [--trace <miadi-...> --rehydrate-with <miadi-...>] [--follow-up-prompt <miadi-...> --follow-up-text <text> --follow-up-by <who>]`, `mw chart delayed [--within <days>] [--all]`, `mw chart end-delay <chart> <step> <rehydrated|released> --by <who> [--note]`. Missing arguments exit 2, and so do `--trace` or `--rehydrate-with` without `--session`, and (0.26.0) `--follow-up-text` or `--follow-up-by` without `--follow-up-prompt`. `--follow-up-prompt` needs no `--session`.

**F1, fixed in 0.24.0.** Each `mw` command that reaches the MCP server (`mw chart`, `tools`, `edge`, `web`, `mmot`, `arc`, `validate`, `memory`, and the MCP fallback of `ceremony`, `cycle`, `node`, `beat`, `direction` and `events` when no HTTP server answers) opens one MCP session over the server's stdio: `initialize`, the `notifications/initialized` notification, then the request, each on its own line. `mcpRaw` returns the response line whose `id` matches the request. When no response comes back it prints `MCP error: no response to <method>` with the server's last stderr lines and exits 1. Up to 0.23.0 the request went alone and without a newline, the transport never read it, and every such command printed nothing and exited 0.

**Fixed in 0.24.1.** With `@medicine-wheel/app` and `@medicine-wheel/mcp` installed globally side by side, `mw` looks for the server by resolving the package `@medicine-wheel/mcp` (its `"."` export is `./dist/index.js`, the server). Up to 0.24.0 it resolved the subpath `@medicine-wheel/mcp/dist/index.js`, which the package's `exports` map does not export, so every installed `mw chart` answered "MCP server path not found" and exited 1. `MW_MCP_PATH` still overrides the search.

---

## Exportation

- Tests: `mcp/tests/structural-tension.test.ts` covers the three delay operations, rule 4b, read-back, due dates, the parity operations, the awaited saves, HTTP de-duplication against an append-only stand-in for `/api/charts`, and (0.24.0) the session's `trace` and `rehydrate_with`: stored as given, refused without the `miadi-` prefix, returned when rehydrated, advertised in the schema, and checked by `AgentSessionRefSchema`.
- (0.26.0) `mcp/tests/structural-tension.test.ts` "the follow-up prompt (0.26.0)": the address stored as given with `text` and `composed_by`, `composed_at` taken from `chosen_at` over a caller's value, refusals that write nothing, the record kept in history on re-delay, the address in `list_delayed_resolutions` and `get_action_step`, `follow_up_prompt` returned when `rehydrated` and not when `released`, a delay with only a follow-up prompt ending as `rehydrated`, `nothing_to_rehydrate` for a delay with neither, the advertised schema, and `FollowUpPromptSchema`.
- `mcp/tests/mw-chart-cli.test.ts` (0.24.0) runs the built `dist/cli/mw.js` against a temporary `MW_DATA_DIR` with no wheel URL or Honcho variable: chart create, list, delay with `--trace` and `--rehydrate-with`, delayed, end-delay, a refusal, a usage exit 2, and `mw tools`. From 0.26.0 also delay with `--follow-up-prompt`, `--follow-up-text` and `--follow-up-by` and no session, `delayed` showing the address, `end-delay rehydrated` returning it, the refusal of a non-`miadi-` address, and exit 2 for `--follow-up-text` or `--follow-up-by` alone. It needs `npm run build:packages && npm run build:cli` first and fails with that instruction when the build is missing.
- `tests/charts-route.test.ts` covers the `/api/charts` field list.
- Out of scope: the clock that steers a session before `resolve_by` and opens the circle at the date. William named it on 2026-10-22 (screenwalk `2610221013`, 27:43): tide-runtime, built in lane L5 on jgwill/Miadi `runtime/tide-runtime`; it reads `follow_up_prompt.address`. Composing each suspension's follow-up prompt is the session inventory's work (lane L3); writing these fields from the session inventory; a `/api/charts` that updates in place instead of appending; a tool to set a chart's `status`; redeploying any running wheel. Until the wheel serving `/api/charts` runs app 0.23.0, HTTP mode drops `github_issue`, `status`, the sub-chart backlink and `due_date_history`; step-level fields, including every delay field, persist on any version of the route.

## Implementation Evidence Appendix

| behaviour | file |
|---|---|
| record, rules, tools | `mcp/src/tools/structural-tension.ts` (`createStructuralTensionTools(store)`) |
| de-duplication | `mcp/src/http-store.ts` `getAllCharts` |
| types and schemas | `src/ontology-core/src/types.ts`, `src/ontology-core/src/schemas.ts` |
| CLI | `cli/mw.ts` `cmdChart` |
| one-shot MCP session (F1) | `cli/mw.ts` `mcpRaw` |
| finding the installed server | `cli/mw.ts` `resolveMcpPath` |
| chart field list | `app/api/charts/route.ts` POST |
