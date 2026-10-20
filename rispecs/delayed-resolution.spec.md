# delayed-resolution - RISE Specification

> An action step on a structural tension chart can record that someone strategically chose to delay its resolution, list such delays by the date resolution is wanted, link the agent session to rehydrate, and end the delay. The chart tools also gain read-back, per-step due dates, and the chart edits coaia-narrative already had.

**Version:** 0.23.0 (`@medicine-wheel/mcp` 4.23.0). Delayed resolution, read-back, step due dates and chart edits landed in 0.22.0; chart-level links and the `/api/charts` field list in 0.23.0.
**Status:** Implemented and published on 2026-10-19: `@medicine-wheel/app` 0.23.0, `@medicine-wheel/mcp` 4.23.0 and `@medicine-wheel/ontology-core` 0.23.0 on npm (commits `1e2e462`, `442aa56` v0.22.0, `22d54ed`, `49f1afc` v0.23.0); vitest 744 of 744; a consumer installing the published packages passed 8 checks (Episode 297 `validation/medicine-wheel/output-261019.txt`). The live chronicle wheel (`ilex:8040`) is **not redeployed** and still runs an older app, so it drops the 0.23.0 chart-level fields (see Exportation).
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

---

## Intent

Fritz: "Part of the maturation process is to learn how to delay resolution in favor of longer-term goals." A delay is a secondary choice made for a primary choice. The wheel records that choice on the step itself, so a listing can say which delays have come due, and the person or agent that ends one gets back the command that resumes the waiting session. The medicine wheel is its own lineage: it implements the shared design in its own snake_case terms and depends on neither coaia package.

---

## Creative Advancement Scenarios

**Creative Advancement Scenario**: Setting a session aside until a date

**User Intent**: A person or seat sets aside the agent session that holds a step's work, and wants it back on a chosen date with its reason intact.
**Current Reality**: The step sits on a wheel chart with a due date. The session that was working on it is idle, and nothing on the chart says why it stopped or how to resume it.
**Natural Progression Steps**:
  1. `delay_resolution` records the choice on the step: `resolve_by`, `reason`, `chosen_by`, what the delay serves, the event cues, and the session with its `cwd` or `resume_command`. The step's status becomes `delayed` and its due date becomes `resolve_by`.
  2. `list_delayed_resolutions` and `get_chart_progress` place the step among the other delays by date, with `days_remaining`, and mark it `owed` once the date passes.
  3. On the date, or when a cue happens, `end_delayed_resolution` with `outcome: "rehydrated"` closes the record and returns the session's `resume_command`.
**Achieved Outcome**: The session comes back with the reason it was set aside, and the chart keeps the closed delay as part of its history.
**Supporting Features**: `delay_resolution`, `list_delayed_resolutions`, `end_delayed_resolution`, status `delayed`, `AgentSessionRef`.

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
}

interface DelayedResolution {
  chosen_at: string;             // ISO, set by the tool
  chosen_by: string;
  resolve_by: string;            // ISO, in the future when chosen
  reason: string;
  primary_choice?: string;       // defaults to the chart's desired outcome, copied when chosen
  wake_on?: string[];            // event cues, in words
  session?: AgentSessionRef;
  ended_at?: string; ended_by?: string;
  outcome?: 'rehydrated' | 'released' | 'resolved';
  end_note?: string;
}

// on ActionStep:
delayed_resolution?: DelayedResolution;           // the current delay, open or ended
delayed_resolution_history?: DelayedResolution[]; // earlier records, oldest first
```

A delay is **open** while `ended_at` is absent. An open delay is **owed** when `resolve_by` is at or before now. `ontology-core` exports these types and their Zod schemas (`ActionStepStatusSchema`, `AgentSessionRefSchema`, `DelayedResolutionSchema`); `ActionStepSchema` accepts the new fields as optional.

### Rules

1. Choosing a delay sets the step's `due_date` to `resolve_by` and its `status` to `delayed`.
2. A completed step cannot be delayed (`refusal: "step_completed"`). `resolve_by` must parse as a date (`resolve_by_invalid`) and lie in the future (`resolve_by_past`). `reason` and `chosen_by` are required.
3. Delaying a step that already carries a delay record, open or ended, moves that record to `delayed_resolution_history` and writes the new one. Nothing is overwritten.
4. Ending a delay keeps the record with `ended_at`, `ended_by`, `outcome`. A step whose status is `delayed` returns to `in_progress` when its `progress` is above 0, else `pending`. `due_date` keeps the `resolve_by` value.
4b. Completing a delayed step (`mark_action_complete`) ends its open delay with `outcome: "resolved"`, `ended_by` = the optional `completed_by` argument or `"mark_action_complete"`, and `end_note: "completed"`. `end_delayed_resolution` accepts only `rehydrated` and `released`.
5. Refusals are returned as `{ status: "refused", refusal, message }`; nothing is written. The codes are `step_completed`, `resolve_by_invalid`, `resolve_by_past`, `reason_missing`, `chosen_by_missing`, `session_invalid` (a `session` that is not an object carrying `session_id`), `no_open_delay`, `outcome_invalid`, `ended_by_missing` and `due_within_days_invalid` for the delay operations, and `due_date_invalid`, `desired_outcome_missing` and `github_issue_invalid` for the chart operations.

### Operations (MCP tools)

| tool | input | result |
|---|---|---|
| `delay_resolution` | `chart_id`, `step_id`, `resolve_by`, `reason`, `chosen_by`, optional `primary_choice`, `wake_on[]`, `session` | the step, its open delay, `days_remaining`, `redelayed`, `history_length` |
| `list_delayed_resolutions` | optional `due_within_days` (≥ 0), `include_ended` (default false) | rows sorted by `resolve_by` ascending: chart, step, `state` (`open`, `ended`, `superseded`), `resolve_by`, `days_remaining`, `owed`, `reason`, `chosen_by`, `primary_choice`, `wake_on`, `session`; plus `count`, `open_count`, `owed_count`, `as_of` |
| `end_delayed_resolution` | `chart_id`, `step_id`, `ended_by`, `outcome` (`rehydrated` or `released`), optional `end_note` | the closed record and the step's status; when `rehydrated`, the session's `resume_command` |

- `days_remaining` is `ceil((resolve_by - now) / 1 day)`: negative once owed, 0 within the last day.
- `due_within_days: N` keeps rows whose `resolve_by` is at or before now + N days, so owed delays are always included.
- With `include_ended`, history records appear as `ended` when they carry `ended_at`, else as `superseded` (replaced by a later delay).
- `resume_command`: the stored one (`resume_command_derived: false`); for a `claude` session without one, `claude --resume <session_id>`, prefixed by `cd <cwd> &&` when `cwd` is known (`resume_command_derived: true`); otherwise `null` with a note.

### Read-back

- `get_chart(chart_id)`: the chart as stored, plus `delayed_steps` and `owed_delays`.
- `get_action_step(chart_id, step_id)`: the step, its delay as a listing row (or `null`), and the sub-chart it telescopes into (`sub_chart`), following `sub_chart_id`; `sub_chart_missing` names an id that no longer resolves.

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

### The structural tension tool set at 4.23.0

`mcp/src/tools/structural-tension.ts` registers 21 tools. Before 0.22.0 there were 12.

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

`mw chart get <id>`, `mw chart delay <chart> <step> <resolve_by> <reason> --by <who> [--primary] [--wake-on] [--session --cwd --resume --host]`, `mw chart delayed [--within <days>] [--all]`, `mw chart end-delay <chart> <step> <rehydrated|released> --by <who> [--note]`. Missing arguments exit 2.

**Known defect at 0.23.0, not fixed:** `mw` sends a single `tools/call` request to the MCP server over stdin without `initialize` first (`cli/mw.ts` `mcpRaw`). The server expects `initialize`, so every `mw chart` command, old and new, prints nothing. The commands are wired and their argument checks work; their output does not reach the terminal until `mcpRaw` opens the session first.

---

## Exportation

- Tests: `mcp/tests/structural-tension.test.ts` covers the three delay operations, rule 4b, read-back, due dates, the parity operations, the awaited saves, and HTTP de-duplication against an append-only stand-in for `/api/charts`.
- `tests/charts-route.test.ts` covers the `/api/charts` field list.
- Out of scope: the clock that steers a session before `resolve_by` (who runs it is undecided); writing these fields from the session inventory; a `/api/charts` that updates in place instead of appending; a tool to set a chart's `status`; redeploying any running wheel. Until the wheel serving `/api/charts` runs app 0.23.0, HTTP mode drops `github_issue`, `status`, the sub-chart backlink and `due_date_history`; step-level fields, including every delay field, persist on any version of the route.

## Implementation Evidence Appendix

| behaviour | file |
|---|---|
| record, rules, tools | `mcp/src/tools/structural-tension.ts` (`createStructuralTensionTools(store)`) |
| de-duplication | `mcp/src/http-store.ts` `getAllCharts` |
| types and schemas | `src/ontology-core/src/types.ts`, `src/ontology-core/src/schemas.ts` |
| CLI | `cli/mw.ts` `cmdChart` |
| chart field list | `app/api/charts/route.ts` POST |
