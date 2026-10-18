# Which Memory Workspace Does A Record Go Into?

**Date:** 2026-10-18
**State:** Design. Nothing here changes the running projection; it specifies the key so that when the wheel gains a second workspace, the memory does not blend.
**Reads:** `HIERARCHY.md` for workspace → circle → ceremony. `NAMESPACE.md` §2 for the per-process binding.

---

## 0. The observation

> *"everything from the medicine wheel goes into the same workspace… we chose that because it was,
> we need the first integration point… it doesn't feel right that everything goes in the same
> workspace… there could be a correlation between what we have inside of the medicine wheel and in
> which memory workspace does that go… we don't want that memory to have everything."*

Correct on every count. `honchoFromEnv()` reads one `HONCHO_WORKSPACE_ID`, defaulting to
`medicine-wheel`; `createHonchoClient` closes it over at construction; the river projects every beat,
ceremony and diary entry into it. One workspace, everything, by deliberate choice as the first
integration point.

The question is the right one: **what inside the wheel should decide the target workspace?**

---

## 1. First, a correction to what I said last turn

I wrote that a blended representation *"cannot be un-derived."* **That is too strong, and the code
says so.** `supportsSessionFilters()` is documented as *"whether the server confines **chat and
representation** to `filters.session_id`"*, and `peers.representation(id, opts)` takes those options.
From Honcho **3.0.12** a representation can be read confined to a set of sessions.

What is actually true is narrower and more useful:

| | Confined by a reach? |
| --- | --- |
| `client.search` | **yes** — `filters.session_id` honoured on every version |
| `peers.chat` (the dialectic) | **only ≥ 3.0.12**; below that the filter is accepted and ignored |
| `peers.representation` | **only ≥ 3.0.12** |
| peer **id space** | **no** — a peer id is unique *within a workspace*, always |
| the semantic search **index** | **no** — `search` is *"across the workspace's messages"*, then filtered |

And `askWithin` already guards the dangerous case properly: if `supportsSessionFilters()` is false it
returns `mode: 'search'` with messages only and **never asks the dialectic**. That is the right
behaviour and it is already shipped.

---

## 2. The rule that decides workspace vs reach

Two mechanisms, two different guarantees, and the difference is who has to remember:

> **A reach confines an answer for a caller who passes it. A workspace isolates regardless of how
> anyone asks.**
>
> **Separate workspaces when a leak must be impossible. Use a reach when confinement is enough and
> the wheel is the one asking.**

A reach is caller discipline: `MemoryScope` → `resolveReach` → `session_id: { in: … }`, and the
wheel's own path is disciplined by default — *"a scope with no field reaches nothing. The whole wheel
is never the default."* But anything that calls `peers.chat` or `representation` **without** filters
gets the whole workspace, and nothing structural stops it.

Which means the honest grain is not a preference. It follows from what must survive a forgetful
caller.

---

## 3. So the key is the workspace tier — not the circle

Per `HIERARCHY.md`: workspace → circle → ceremony, where a circle is **a set of sessions** and a
ceremony **is** a session.

**Route on the workspace tier:**

```
HONCHO_WORKSPACE_ID  →  medicine-wheel:<workspace_id>     one per wheel workspace
circle               →  a reach inside it (sessionsForReach)
ceremony             →  a session inside it
person, agent        →  a peer inside it
```

**Do not route on the circle tier**, and the reason is a hard constraint in Honcho rather than taste:

1. **There is no cross-workspace dialectic.** `askWithin` confines by `session_id` *within one
   workspace*. Make each circle its own workspace and *"what is still unresolved across the circles I
   sit in"* — which `MemoryScope.participant` and `circlesOf()` exist to answer — becomes
   unaskable, because no single call can span workspaces.
2. **A peer representation is per workspace.** A person in three circles-as-workspaces has three
   unrelated representations of themselves and no way to read across them. In one workspace they have
   one representation, and sessions can be filtered. The whole value of a peer-centric memory is that
   it accumulates about a *being*; splitting the being to get isolation destroys the thing being
   isolated.
3. **Circles are many and short-lived.** `circle_type` is `ongoing | seasonal | one_time`. A
   `one_time` circle would mint a workspace that outlives its purpose.

So circles get **reaches**, which is already built, already the default-deny, and already what
`resolveReach` does. Workspaces get **workspaces**.

### What this means operationally

The wheel has exactly one workspace today, so **routing on the workspace tier changes nothing now** —
which is what makes it safe to specify and defer, as asked. The work is only:

- derive the Honcho workspace from the wheel workspace instead of reading one env var once per
  process (`NAMESPACE.md` §2);
- keep `HONCHO_WORKSPACE_ID` as the deployment's prefix or its single workspace's id, not as the
  identity of every projection;
- `POST /v3/workspaces` is get-or-create, so a new wheel workspace needs no provisioning step.

---

## 4. What to do now, before tier 1 exists

Three things, none of which needs the workspace definition settled.

### 4.1 The `honcho_*` MCP tools are the current unconfined path

`honcho_recall` is documented as *"representation, or a question"* and the `honcho_*` tools *"remain
for one release for existing callers."* They talk to Honcho directly, so they do not go through
`MemoryScope`, `resolveReach` or `askWithin` — which means **they are the one path today by which the
memory does have everything**, and an agent using them gets a whole-workspace answer with no reach.

That is the concrete version of *"we don't want that memory to have everything."* Either retire them
on schedule, or give them a required scope. The `memory_*` tools already do the right thing.

### 4.2 Pin the Honcho version, or the reach is advisory for the dialectic

Below 3.0.12 the dialectic cannot be confined, so `askWithin` correctly declines to use it and the
experience degrades to search — *"a Honcho before 3.0.12 is asked for search only, with a note saying
why."* The deployed server was 3.0.11 when `src/honcho` was written, and #148 records the leak that
established the gate. **Verify what is running and upgrade it**, because the difference is whether the
chat experience exists at all, not merely whether it is tidy.

### 4.3 A conclusion projected back should carry the reach it came from

`memoryProjectionNode` writes a derived conclusion back into the wheel as a `knowledge` node,
`direction: 'west'`, carrying `peer_id`, `source_event_ids` and `derivedBy`. It does **not** carry the
reach the question was asked within.

So a conclusion drawn from an unconfined question becomes an ordinary node in the canonical store,
indistinguishable from one drawn from a single circle. That is contamination flowing *back* into the
record the wheel treats as true — and it is harder to notice than a leaky answer, because the answer
is transient and the node is not.

**Recommendation:** add the reach to that node's metadata — the scope, the resolved ceremony ids, and
whether the provider was confined. One field, written at projection time, and a blended conclusion
stays identifiable afterwards.

---

## 5. Open

1. Is the workspace tier the right grain, or is there a case for a workspace per **episode** (`episode_path`), which is longer-lived than a circle and already carries a folder?
2. Should a person's peer id be the wheel node id (stable, opaque) rather than ever a name? See `NAMESPACE.md` §5b — the collision risk is in the same id space.
3. When the wheel gains a second workspace, do the records already projected stay in `medicine-wheel`, or move? Honcho has no move; re-projection into the new workspace plus a note is the likely answer, and the pending ledger already knows how to re-send.

---

## Sources

- `src/honcho/src/index.ts` — `honchoFromEnv`, `createHonchoClient`, `askWithin`, `supportsSessionFilters`, `peers.representation`, `memoryProjectionNode`, `sessionsForReach`
- `src/honcho/README.md` — the river, the pending ledger, the 3.0.12 gate, the `honcho_*` deprecation
- `src/memory/README.md`, `src/memory/src/index.ts` — `MemoryScope`, `resolveReach`, default-deny
- `src/community-identity/src/circles.ts` — `circle_type`, `circlesOf`
- [Honcho — Core concepts (v3)](https://honcho.dev/docs/v3/documentation/core-concepts)
- [jgwill/medicine-wheel#148](https://github.com/jgwill/medicine-wheel/issues/148) — the dialectic leak that established the gate

🌸: A reach is a promise the asker keeps. A workspace is a wall. The memory should be asked inside a reach and kept behind a wall, and the two are not substitutes for each other.
