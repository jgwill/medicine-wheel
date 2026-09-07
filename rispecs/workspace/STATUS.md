# DIVERGENCE — What Was Asked, What Was Built, and Where They Parted

**Date:** 2026-09-06
**State:** ⛔ **Not settled.** The requirement has been stated three times; this folder has been
corrected twice and matches none of the three. The requester does not consider the definition agreed.
**Recorded by:** the authoring agent, at the requester's instruction, after the divergence was found
in conversation. **§0 added by a second agent after the requirement was stated a third time.**

---

## 0. The requirement, stated a third time — and this record is not the last word

§1 below states the requirement as *one server resolving **that workspace's location** on disk*. The
requester's words later the same day say something narrower:

> *"what we want is we want the storage to be **in the same location** and be capable of supporting
> multiple workspaces. At least this was the idea at the beginning and the whole discussion with both
> of you has led somewhere else that I don't think starting a server will support what we need."*

> *"we load up the web page, and there are workspaces in there. So I don't see how we're gonna be
> able to serve that inside of, based on the specifications and what we did. So we we did not
> understood each other on the definition of the workspace."*

**One storage location. Many workspaces inside it. One deployment. Chosen in the web page.**

That is not several locations resolved per request. It is one store, partitioned — `workspace_id` on
owned records with composite keys, the shape `workspace-scope-and-access.spec.md` and ERD 1 already
carry, and the shape §6 below correctly restores to standing.

**The correction of 2026-09-06 landed on both designs at once, and they are not the same design.**
`workspace-definition.spec.md` §2 now defines a workspace as *"a named store location … so the same
server reads and writes a **different location** depending on which workspace the request named"* —
several stores, one switching server. Its own §2.0 point 3 then requires mandatory scope at the
storage seam and points at ERD 1's `workspace_id` in the primary key — **one** store, partitioned.
A document cannot be built from both. Neither statement is marked as the one that governs.

This is not a drafting slip to be tidied. It is the same disagreement, still live, now inside one
file: **is a workspace a place the server switches to, or a partition inside the place it is already
in?** Nobody has answered that, and every correction so far has been made without answering it.

### The requester's own account of the day

Recorded because a status file that reads more settled than the person it reports to is not a status
file:

> *"it's pretty much like we did some bullshit today … I want that to be reflected in respected
> words."*

> *"or if that's not a failure, and this is why I wanna leave it there, it's… I don't understand, uh,
> and I don't think my feeling is really… it's not gonna serve us."*

**Whether this is a failure is left open, at the requester's instruction.** Not softened into a
recovery, not hardened into a verdict. What is not in dispute is narrower: the word *workspace* was
specified at length before it was agreed, by two agents and a person who each meant something
different, and none of them checked. Eleven documents, three statements of the requirement, two
corrections, and the definition is still open.

### For whoever reads this next

Do not read §§1–7 as a corrected plan. Read them as the record of two attempts that each believed
they had understood. The next move is not another correction of this folder — it is agreeing what a
workspace is, with the requester, before anything else is written. `jgwill/medicine-wheel#136` `G4`
is the evidence to start from: the six cards in `components/workspaces-panel.tsx` are two tiers, and
they were sitting in the code the whole time.

---

## 1. The requirement, as recorded on the first correction

**One running Medicine Wheel serves several workspaces. You choose one, and that same server reads
and writes that workspace's location on disk. Agents on the network connect to the same app and say
which workspace they are in.**

Stated in conversation on 2026-09-06:

> *"So we start one service And depending on which workspace I choose, it reads and it writes on
> different location on disk?"*

and, when the answer came back as "no":

> *"The whole logic doesn't work. I mean, we have a server. and it needs to work with different
> workspaces."*

---

## 2. It was knowable from the beginning

`rispecs/docker-containerized-app.kin.md` was quoted in this folder as the origin of the definition.
The full sentence:

> *"the goal is that on the network, we are capable to **connect all agent to the medicine-wheel
> app** and potentially have many of them **opened in different workspace (project location)**."*

Both halves are in one sentence. **One app. Many workspaces open at once.** This folder quoted the
parenthesis — *(project location)* — and read it as *one server per location*, which is the opposite
of what the first half of the same sentence says.

---

## 3. What was built instead

A named binding, one process per location, each holding its store for the life of the process.
Switching inside one server was reclassified as "Slice 3", described as expensive, and explicitly not
planned. So the requirement was not overlooked — it was renamed the expensive part, and a cheaper
thing shipped in its place.

## 4. The worst part of the divergence

**`workspace-scope-and-access.spec.md` — the document this folder superseded — already had the right
server model.** Scoped routes (`/api/workspaces/:workspaceId/nodes`), an active workspace context
above the router, one provider seam taking a scope per operation: that is one server serving many
workspaces. It is the requirement.

Its actual fault was leading with memberships, `subject_id`, capabilities and bilateral acceptance —
an identity model that cannot be built yet. The revision was right to defer those, **and then threw
out the server model along with them**, replacing it with one-process-per-location on the strength of
prior art about client-side context switching (kubectl, VS Code, Compose). Those are tools where a
*client* picks among many servers. This is a server that must serve many stores. Wrong analogy,
correctly applied.

---

## 5. Where the work actually is

```
lib/store.ts:32       const store = getJsonlStore();
mcp/src/store.ts:49   export const store = createStore();
```

Module-level. Location resolves once at import, held until the process exits, and no request can
change it. Every route, MCP tool and CLI call downstream inherits that one store.

**Making the store resolve per request, from a workspace named in the request, is the feature.** Three
questions follow from it, and they are the next work:

1. How does a request name its workspace — path, header, or session?
2. How does the server hold several open stores at once without reopening files on every call?
3. What happens to those two constants and everything importing them?

---

## 6. What survives, and what is corrected

| | Verdict |
| --- | --- |
| `workspace-prior-art.research.md` | **Sources hold.** The kubectl/Terraform/Postgres/MCP findings were verified. What was wrong is the conclusion drawn from them — see §4 |
| `workspace-scope-and-access.spec.md` | **Restored in standing.** Its server model is the requirement. Its identity model stays deferred. The supersession banner overreached |
| `workspace-erd-internal.md` (ERD 1) | **Closer to right than the revision.** Mandatory scope at the storage seam is exactly what per-request resolution needs. `UNCLASSIFIED_COLLECTION` is still the required exercise |
| `workspace-erd-services.md` (ERD 3) | **Half right.** Ports, drift and reconciliation are real for several *hosts*. The one-process-per-binding premise is corrected |
| `workspace-definition.spec.md` | **Definition corrected** — see §2 of that file |
| `workspace-configuration.spec.md` | **Slice order corrected.** Per-request scope was third; it is first |
| `workspace-display-analysis.md` | **Now applies.** It assumed a server that redraws on switch — which is the requirement, not a deferred slice |
| `GOAL.md` | **Rewritten.** Its "several fires" described several servers |

---

## 7. Also unresolved, from review

`jgwill/medicine-wheel#135` and `#136` (Mia, 2026-09-06) reviewed this folder against the tree and
against the two `INPUT` files. Those findings stand and are not superseded by this record. `G4` in
particular is untouched by it: the six hardcoded cards encode two tiers — four repositories, and two
`#fragment` subjects on one repository — and no document here read that data before proposing to
replace it.

🌸: Recorded rather than reverted. The folder is the evidence of the divergence, and the correction is only legible next to it.
