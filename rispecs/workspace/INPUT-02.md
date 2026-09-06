# Originating Input 02 — Question the Definition, Ground It, Name the Service Layer

> Recorded verbatim for compliance. Second input in the `rispecs/workspace/` sequence.
> See `INPUT.md` for the first.

**Recorded:** 2026-09-06
**Requester:** ava@jgwill.com (jgwill)
**Session branch:** `claude/workspace-config-erd-lu1qfs`
**Answering documents:** `workspace-prior-art.research.md`, `workspace-definition.spec.md`, `workspace-erd-services.md`

---

## Verbatim request

> It makes me see that, uh, yes, we might have a definition of workspace, uh, but it's questionable and, uh, also don't hesitate to, uh, go on the Internet, uh, to deep research that a little bit to support what we're gonna create. We're not trying to please or do something, uh, that ain't going to work. We're trying to do something that's gonna work to include that as the input that I provided to you because we need to be, uh, grounded in something that's gonna work, not necessarily, take on what is there, uh, that might not, uh, have all the the logic and relationship that we're making work.
>
> Obviously, I don't know if I was clear enough, but, uh, what we're creating would add a layer of configuration for services of the medicine wheel just to make sure that the the implication of what I ask was, uh, more explicit.

*(Transcribed speech, kept as spoken. The disfluencies are left in: this is the record of what was
said, not a tidied paraphrase of it.)*

---

## What was asked, in three parts

1. **The existing definition is questionable — do not defer to it.** The inherited
   `workspace-scope-and-access.spec.md` was to be treated as a proposal to be tested, not an
   authority to be elaborated. "Not necessarily take on what is there that might not have all the
   logic and relationship that we're making work."
2. **Research it properly.** Ground the design in prior art that demonstrably works, rather than in
   internal coherence alone.
3. **The clarification that reorganised the work:** what is being created *"would add a layer of
   configuration for services of the medicine wheel."* Not a UI tenancy label — a **service
   configuration layer**.

---

## What changed as a result

| Before (after INPUT.md) | After (this input) |
| --- | --- |
| Workspace = a data and access boundary with memberships | Workspace = a **named binding** of store location + provider + service endpoints; scope follows, governance attaches later |
| The inherited spec elaborated | The inherited spec **critiqued on evidence**, six specific problems named, values kept |
| No location in the model | `location` is central — `mwsrv --directory` already does this, anonymously |
| Provider is deployment-level, workspace partitions it | Provider moves **into the binding** — the direct answer to HashiCorp's own warning that shared-backend workspaces are not isolation |
| Memberships/capabilities/bilateral acceptance in the first slice | **Deferred**, explicitly, as the SaaS meaning of the word, blocked on an identity contract that does not exist |
| No ports, no processes, no reconciliation | **ERD 3** — service intents, per-host port scarcity, level-triggered drift, `undeclared` as the state that pays for the layer |
| 2 ERDs | 3 ERDs — binding/services, scope, governance |

## The finding that made the clarification land

The Medicine Wheel **already has workspaces, and they are anonymous.** `mwsrv --directory <dir>
--port <port>` resolves `<dir>/.mw/store`, binds a port, and sets `MW_DATA_DIR`; `mw` and the MCP
server connect via `MW_API_URL` or that store. That tuple is a workspace with no name, re-typed by
hand on every invocation.

`rispecs/docker-containerized-app.kin.md` — written earlier by the same requester — already said it:
*"potentially have many of them opened in different workspace (project location)."*

The parenthesis was the definition.

---

## Method note, for the record

Research was conducted against primary documentation where available (Kubernetes, HashiCorp, Docker,
VS Code, Claude Code, 12factor) and secondary practitioner sources where named as such. Every claim
carried into `workspace-definition.spec.md` is cited in `workspace-prior-art.research.md`. Where
prior art contradicts what was already written here, the contradiction is stated rather than
smoothed — including one case (twelve-factor's rejection of grouped "environments") where the
objection is real and the answer is a boundary rule, not a dismissal.

🌸: "Not trying to please" was the operative instruction. The most useful thing in this folder is now the list of six things the previous document got wrong.
