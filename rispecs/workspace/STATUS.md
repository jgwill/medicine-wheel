# DIVERGENCE — What Was Asked, What Was Built, and Where They Parted

**Date:** 2026-09-06
**State:** ⚠️ This folder diverged from the requirement. It is not reverted and not deleted — it is corrected here.
**Recorded by:** the authoring agent, at the requester's instruction, after the divergence was found in conversation.

---

## 1. The requirement

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
