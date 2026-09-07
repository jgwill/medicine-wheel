# STATUS — This Folder Answers the Wrong Question

**Date:** 2026-09-06
**State:** ⛔ Not the plan of record. Do not implement from it.
**Recorded by:** the authoring agent, at the requester's instruction, after the misunderstanding was found in conversation.

---

## The requirement

**One server. The workspace is chosen per request. The server reads and writes a different location on
disk depending on which workspace was chosen.**

That is what was asked for. It was stated plainly in conversation on 2026-09-06:

> *"So we start one service And depending on which workspace I choose, it reads and it writes on
> different location on disk?"*

and, when the answer came back as "no":

> *"The whole logic doesn't work. I mean, we have a server. and it needs to work with different
> workspaces. So my understanding is it has nothing... what your design has nothing to do with this."*

That is correct. It does not.

---

## What this folder built instead

A naming scheme for running **several servers**, one per location, each holding its store for the life
of the process — with the ability to switch inside one server deferred to "Slice 3", the slice the
documents describe as expensive and explicitly do not plan.

So the requirement was not deferred by accident. It was reclassified as the expensive part, and the
cheap part shipped in its place. The cheap part is a way of *avoiding* the requirement, not a step
toward it.

---

## Where the actual work is

Two lines:

```
lib/store.ts:32       const store = getJsonlStore();
mcp/src/store.ts:49   export const store = createStore();
```

Both are module-level. The location is resolved once, at import, and held until the process exits.
No request can change it. Every route, every MCP tool and every CLI call downstream inherits that one
store.

**Making those resolve per request, from a workspace named in the request, is the feature.** The
registry, the naming, the precedence chain and the slice ordering in this folder are decoration around
those two lines — and the folder never says so.

---

## What is still worth keeping

- **`workspace-prior-art.research.md`** — the research holds. The kubectl `context` / `namespace`
  split, HashiCorp's warning about shared backends, the Postgres tenancy patterns and the MCP
  no-merge rule are all verified and all still apply. What was wrong is the conclusion drawn from
  them, not the sources.
- **ERD 1's `UNCLASSIFIED_COLLECTION`** — which stored families are workspace-owned versus global is
  a real exercise, needed under any design, and not yet done.
- **The port and reconciliation material in ERD 3** — several servers on one host still collide, and
  `@medicine-wheel/infra` still detects it. That is real, it is just not the requirement.
- **The honesty rules** — local configurability is not authenticated privacy; a visible relationship
  is not an access grant; the `NodeType` union stays closed at six.

## What is void

- **`workspace-definition.spec.md`** — its definition ("a name for a store location and the service
  that serves it") is built on one process per location. Under the real requirement one process
  serves many locations, and the definition has to be rewritten from the request boundary inward,
  not from the process outward.
- **The four-slice cadence** — it puts the requirement third.
- **The precedence chain's premise** — its top layer is `/api/workspaces/:id/nodes`, which assumes a
  server answering for several workspaces. Written for the right system, then attached to a design
  that cannot host it.
- **`GOAL.md`'s second paragraph** — "an operator can keep several fires" describes several servers.
  Wrong picture.

## Also unresolved, from review

`jgwill/medicine-wheel#135` and `#136` (Mia, 2026-09-06) reviewed this folder against the tree and
against the two `INPUT` files. Their findings stand independently of this status and are not
superseded by it — in particular `G4`: the six hardcoded cards already encode two tiers (four
repositories, two `#fragment` subjects on one repository), and no document in this folder read that
data before proposing to replace it.

---

## Next

Start from the requirement, not from this folder:

1. How does a request name its workspace, and how does a server resolve that name to a store — per
   request, cheaply, without reopening files on every call?
2. What happens to `lib/store.ts` and `mcp/src/store.ts`, which are the whole blocker?
3. Only then: what is a workspace, in a system where one server holds many?

🌸: Recorded rather than rewritten. The folder is evidence of a misunderstanding, and deleting it would delete the evidence.
