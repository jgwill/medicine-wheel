# Namespace — The Model Is Already Running On Port 8133

**Date:** 2026-10-18
**State:** Recommendation, and now the source of the folder's definition. Written against `main` at `0.20.0`, after five packages landed that did not exist when this folder was written. `workspace-definition.spec.md` §2 inherits its definition from §1 and §5 here.
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

This is not a fourth guess. It is reading the sentence — and §1 and §5 below show the same shape already implemented in the wheel's own memory bridge, which is where `workspace-definition.spec.md` §2 now takes its definition from.

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

## 5. A circle is not a workspace — the bridge already says so

`NAMESPACE.md` previously left this open. The projection answers it, in code:

| Wheel concept | Honcho | Where |
| --- | --- | --- |
| **a wheel** | **workspace** | `HONCHO_WORKSPACE_ID` |
| a ceremony | session | `sessionIdForCeremony` → `honchoIdFor(ceremony.id)` |
| an episode | session | `chronicle:<path>` and `<path>` |
| a person, an agent | peer | `honchoIdFor` |
| **a circle** | **a set of sessions** | `resolveReach(scope.circle_id)` → ceremonies → `sessionsForReach` |

`resolveReach` turns `circle_id` into the ceremonies carrying it; `sessionsForReach` turns those into
session ids; `honchoMemoryProvider` confines every question to `session_id: { in: … }`. **A circle is
a filter over sessions inside one workspace.** The workspace is the layer above circles — so a
workspace is not a circle, and asking "within this circle" is already implemented as asking within a
subset of one workspace's sessions.

What stays open is **granularity, not shape**: which of the six catalog cards are workspaces, which
are circles, and which are neither (`jgwill/medicine-wheel#136` `G4` — four repositories, two
`#fragment` subjects on one). That is a product question about the six rows, not a definition
question.

### The name stays `workspace`

An earlier recommendation in this folder was to rename the concept `wheel`, to escape the npm
homonym, and §1 of `workspace-configuration.spec.md` spent its longest section on that homonym.
**Withdrawn.** The bridge already calls the outermost namespace a workspace, in shipped code, on a
live service the wheel writes to on every beat. Renaming buys tidier vocabulary and pays for it with
a translation at the only runtime seam where the word is real. The npm collision is a documentation
problem: qualify it in prose, keep `workspaceId` and `MW_WORKSPACE` out of build tooling.

## 5b. A second bridge finding: `honchoIdFor` can collide two beings into one peer

```ts
export function honchoIdFor(wheelId: string): string {
  const folded = wheelId.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const swapped = folded.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-{2,}/g, '-')…
```

Every run of non-alphanumerics collapses to a single `-`, so `node:human:abc` and `node-human-abc`
both become `node-human-abc`, and the doc comment shows a *name* used as a peer id
(`Guillaume Isabelle` → `Guillaume-Isabelle`). Peer ids are unique **within a workspace**, so a
collision does not error — it **merges two beings' representations**, and the deriver then reasons
about the merged peer.

Today one workspace holds one wheel, so the id space is small and the risk is low. It grows with
every workspace that shares a Honcho workspace — which is the §2 leak seen from the other side. The
fix in §2 (one Honcho workspace per wheel workspace) shrinks the shared id space back down; a
collision check on projection would close it.

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
