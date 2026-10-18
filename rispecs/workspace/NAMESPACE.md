# Namespace — The Model Is Already Running On Port 8133

**Date:** 2026-10-18
**State:** Recommendation. Written against `main` at `0.20.0`, after five packages landed that did not exist when this folder was written.
**Reads:** `STATUS.md` first — three statements of the requirement and a definition left deliberately unanswered.

---

## 0. The question `STATUS.md` left open is answered — by the requester, not by an agent

`5f10eaf` recorded the open question honestly:

> *Is a workspace a place the server switches to, or a partition inside the place it is already in?*

and declined to answer, because the three previous answers were agent guesses. Correct call. But the
answer is already in that same file, in the requester's own words:

> *"we want the storage to be in the **same location** and be capable of supporting **multiple
> workspaces**."*
>
> *"we load up the web page, and there are workspaces in there."*

**One storage location. Many workspaces inside it. One deployment. One web page that lists them.**

That is a partition inside one place, not a place the server switches to. So:

- `workspace-erd-internal.md` (ERD 1) — `workspace_id` in the primary key — **governs.**
- `workspace-definition.spec.md` §2 — "a named store location the server resolves per request" —
  **does not.** It is the second wrong answer, and §2.0 point 3 of the same file already contradicts
  it by requiring mandatory scope at the storage seam.

This is not a fourth guess. It is reading the sentence.

---

## 1. Stop designing the namespace. Copy the one in the stack.

`@medicine-wheel/honcho` shipped in `0.20.0` and the wheel now projects every beat, ceremony and
diary entry into [Honcho](https://honcho.dev) automatically. Honcho's data model is **exactly the
shape the requirement asks for**, and it is running on `eury:8133` today:

| Honcho | What it does |
| --- | --- |
| **Workspace** | Top-level container. "Complete isolation between different applications or environments… essentially serving as a namespace to keep different workloads separate" |
| **Peer** | A person, agent or entity — *"a unique identifier **within a workspace**"* |
| **Session** | A conversation context; many-to-many with peers |
| Selection | A **path segment**: `/v3/workspaces/{ws}/sessions/…`, `/v3/workspaces/{ws}/peers/{peer}/representation` |
| Creation | **Get-or-create**: `POST /v3/workspaces {id, metadata}` |
| Auth | Keys scope to workspace, peer or session; *"authorized by their narrowest claim and never widen to the whole workspace"* |
| Deployment | One server, one database, many workspaces |

**Four rules to adopt verbatim**, because they are proven and because the wheel already talks to a
server that enforces them:

1. **The namespace is in the path**, not a header, not a cookie, not client state. `/api/workspaces/:workspaceId/nodes`. A path segment cannot be forgotten by a caller or silently defaulted by a proxy.
2. **Ids are unique *within* the namespace** — `(workspace_id, id)`, which is ERD 1 unchanged. A bare record id stops naming a row, so no direct lookup can cross a workspace.
3. **Get-or-create on first write.** No separate provisioning step, no bootstrap ordering problem — which is `workspace-configuration.spec.md` §1's open question, closed by copying.
4. **Authorization narrows and never widens.** A credential for one workspace cannot answer for the deployment.

Honcho is the counter-example to this folder's own prior-art conclusion. Three sessions were spent on
kubectl, Terraform and Compose — tools where a *client* picks among servers — and the stack already
contained the right reference: **a server holding many namespaces in one database**, which is the
requirement.

---

## 2. The bug that exists right now

`src/honcho/src/index.ts:230–235`:

```ts
const workspace = options.workspace || DEFAULT_WORKSPACE;   // from HONCHO_WORKSPACE_ID
const ws = `/v3/workspaces/${encodeURIComponent(workspace)}`;
```

The Honcho workspace is **closed over at client creation, from one environment variable, once per
process** — and `honchoFromEnv()` reads `HONCHO_WORKSPACE_ID` with a single default,
`medicine-wheel`.

The river then projects **every** stored beat, ceremony and diary entry into that one Honcho
workspace, automatically, on write, with nothing filtered.

**So the moment the wheel holds two workspaces in one store, both project into one Honcho workspace.**
Honcho's deriver reasons across the union; `peers.representation` for a person blends every workspace
they appear in; and `askWithin` confines by *session*, which is per-ceremony — it has no workspace
axis to confine on.

This is the same mistake as `lib/store.ts:32`, one layer out — and it is worse in one specific way:
the store merely reads the wrong rows, while the deriver **forms conclusions about a person across
workspaces**, in the background, and a derived representation cannot be un-derived. Issue
[#148](https://github.com/jgwill/medicine-wheel/issues/148) already records the within-workspace
version of this (3.0.11's dialectic answering from every session in the workspace, listing intentions
from other circles).

**Recommended fix, and it is small:** the Honcho workspace becomes a function of the wheel workspace
(`medicine-wheel:<workspace_id>`), and the client is obtained per workspace rather than once from
env. Honcho's own `POST /v3/workspaces` is get-or-create, so there is nothing to provision.
`HONCHO_WORKSPACE_ID` becomes the prefix or the default for the deployment's own workspace, not the
identity of every projection.

This is worth doing **before** the wheel gains workspaces, not after. Afterwards the derived
representations are already mixed.

---

## 3. `@medicine-wheel/memory` already solved per-request scope — it is missing one axis

`MemoryScope` → `resolveReach` → an answer confined to that reach, with the discipline stated
outright:

> *"A scope with no field reaches nothing. The whole wheel is never the default."*

**That is the per-request scope resolution this folder spent three sessions failing to define.** It
shipped, for memory, with the right default (nothing) and the right shape (a scope on the request,
resolved by the server, enforced on every provider).

Its fields are `ceremonies`, `subject_id`, `circle_id`, `episode_path`, `participant`,
`exclude_ceremonies`. **There is no workspace axis**, so once workspaces exist a scope can reach
across them.

**Recommendation — do not add a `workspace_id` field.** Follow Honcho: resolve the scope *inside* a
workspace, so that crossing one is not expressible. `POST /api/workspaces/:ws/memory/ask` takes a
`MemoryScope` that cannot name anything outside `:ws`, and `resolveReach` intersects within it. A
field could be omitted; a path segment cannot.

---

## 4. `@medicine-wheel/community-identity` removes the reason the governance layer was deferred

ERD 2, the display analysis, memberships and capabilities were all deferred on one ground: *no
identity contract exists.* It exists now — `personNode`, `circleNode`, `membershipEdge`, the
`participant → emerging_guide → ceremony_facilitator → firekeeper → admin` role ladder,
`hasPermission`, `JsonlCredentialStore`, `JsonlInvitationStore`, and `rispecs/community-identity.spec.md`.

So the deferral in `workspace-definition.spec.md` §4 is stale. What remains true is that a workspace
must not *imply* membership — Honcho's narrowest-claim rule says the same thing in different words.

---

## 5. The one question left, and it is cheap

`circle` already does most of what this folder proposed to build:

| A workspace was to have | `circle` already has |
| --- | --- |
| A name and an identity | a `circle` node |
| Members with roles | `member_of` edges + the role ladder + `hasPermission` |
| Records that belong to it | ceremonies carry `circle_id` |
| A scope you can ask within | `MemoryScope.circle_id` |
| A way in | `JsonlInvitationStore`, codes that open one circle or several |
| A place it sits on the wheel | `circleNode({ intention, facilitator_id })`, `episode_path` |

**Is a workspace a circle?**

- **If yes** — namespace management is mostly built. What is missing is the storage seam
  (`circle_id` or `workspace_id` in the primary key, per ERD 1), the path segment, and the Honcho
  mapping in §2. The six hardcoded cards become circles, and `jgwill/medicine-wheel#136` `G4`'s two
  tiers (four repositories, two `#fragment` subjects) becomes a question about circle granularity
  rather than about store locations.
- **If no** — what does a workspace hold that a circle cannot?

**Not answered here.** That question has been answered wrong three times by an agent, and the whole
reason `STATUS.md` exists is that each wrong answer was delivered as a design. This one is for the
requester.

---

## 6. Branch state — `main`'s history was rewritten and this branch is stranded

Not a recommendation, a blocker found while pulling:

- `main`'s root commit is now `5b04b4b` *"chore: release v0.17.2 #154"*, dated **2026-10-03**. This branch's root is `a570e44`, dated 2026-03-05.
- `git merge-base HEAD origin/main` returns **nothing**. `git merge` refuses: *unrelated histories*.
- PR [#134](https://github.com/jgwill/medicine-wheel/pull/134) is still open against base `ac2c0c5`, a pre-rewrite `main`. It cannot merge.
- `main` still carries `rispecs/workspace-scope-and-access.spec.md` at its **old path**; the folder this branch created does not exist on `main` at all.

**This document is therefore written against `main` read directly (`git show origin/main:…`), not
against a merge.** Re-basing the folder onto the new `main` means re-creating the branch and
force-pushing a published PR branch — which needs an explicit word, so it has not been done.

---

## Sources

- [Honcho — Core concepts (v3)](https://honcho.dev/docs/v3/documentation/core-concepts)
- [Honcho — Architecture (v2)](https://honcho.dev/docs/v2/documentation/core-concepts/architecture)
- [Honcho — Platform reference (v3)](https://honcho.dev/docs/v3/documentation/reference/platform)
- `src/honcho/README.md`, `src/honcho/src/index.ts` (`0.20.0`, on `main`)
- `src/memory/README.md`, `src/community-identity/README.md` (`0.20.0`, on `main`)

🌸: The namespace did not need inventing. It was already answering HTTP on the same host, in a database the wheel writes to every time a beat lands.
