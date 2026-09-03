# .guillaume/work — coordination ground for the 260831 input

Opened 2026-09-03 from `.guillaume/260831-input.md`.

## Epistemic rule for everything written here

William's word, 2026-09-03:

> anything you read anywhere is subject to be revised as well as the content of the
> actual chronicle that you read ... you need to be doubtful

So **every claim in every file here carries a source class**:

| class | meaning | how it can be wrong |
|---|---|---|
| `X` | executable — verified by running a command or reading code that runs | the command was run in the wrong tree, or against a dead port |
| `W` | written — a document, episode, issue or README *claims* this | the document is a draft, superseded, or aspirational |
| `A` | assumed — inference by the agent | the premise was never checked |

A `W` claim is quoted as a claim ("episode 340 states..."), never as a fact. The Chronicle
is `W`. Issues are `W`. READMEs are `W`. Only code that was read and commands that were run
are `X`.

Each lane's report must end with **"What would falsify this"** — the specific command or
question that would overturn its recommendation.

## Lanes

| lane | question | file |
|---|---|---|
| L1 | review → community choice: `community-review` ↔ `review-service` ↔ `inquiry-weave` ↔ ep340 | `L1-review-to-choice.md` |
| L2 | the consumable surface: what MW must export, what the prototypes hold that MW lacks | `L2-consumable-surface.md` |
| L3 | perspective: 205 nodes you cannot navigate; episode/chronicle viewing inside MW | `L3-perspective-and-navigation.md` |

## Coordinator files

- `PREDICTIONS.md` — written BEFORE the lanes reported, so the delta is scoreable (§7)
- `SURVEY.md` — what the coordinator verified in the same turn as dispatch
- `PHASES.md` — the synthesis: 2–5 phases, written after the lanes return
