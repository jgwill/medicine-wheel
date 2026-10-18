# Workspace → Circle → Ceremony — And What The Menu Does

**Date:** 2026-10-18
**State:** Design, from the requester's own hierarchy, checked against `main` at `0.20.0`.
**Reads:** `NAMESPACE.md` for where the namespace model comes from. `STATUS.md` for why four definitions preceded this.

---

## 0. The hierarchy, as stated

> *"a workspace can have multiple circles that have to themselves one or many ceremonies."*

```
workspace                 the namespace — few, durable
 └── circle               a group that holds ceremony — many per workspace
      └── ceremony        one sitting — many per circle
```

Three levels, each a real thing with a real record. And it maps onto the memory bridge the wheel
already writes to, without inventing anything:

| Wheel | Honcho | Status |
| --- | --- | --- |
| **workspace** | **workspace** — top-level container, complete isolation | one, fixed per process (`HONCHO_WORKSPACE_ID`) |
| **circle** | *no primitive* — a **set of sessions** | `resolveReach(circle_id)` → ceremonies → `sessionsForReach` |
| **ceremony** | **session** | `sessionIdForCeremony` |
| person, agent | **peer** | `honchoIdFor` |

The middle row is the interesting one. **A circle is not a container in Honcho — it is a filter.** It
has no namespace of its own; it names a subset of one workspace's sessions. That is what makes the
hierarchy cheap: only the top level needs isolation machinery.

---

## 1. Does a circle have a folder? Sometimes — and it does not make it a workspace

The question was: *"when you have a circle, there's not a folder defined for your circle, or there
might be. And is it a workspace or not?"*

A circle **can** have a folder, and the field already exists. `community-identity`: *"a circle opened
for a chronicle episode carries the episode folder name in `episode_path`, the binding a ceremony
carries too."* `CeremonyLog.episode_path` is typed — *"the chronicle directory name
(`YYYY-MM-DD-episode-NNN-slug`)"* — and `MemoryScope.episode_path` resolves it.

So a folder is **an attribute a circle may carry**, not the thing that makes it a tier. The test is
not *does it have a path* but *does it have its own id space*:

| | Has a folder | Own id space | Tier |
| --- | --- | --- | --- |
| workspace | maybe | **yes** — records identified within it | namespace |
| circle | often (`episode_path`) | no — its ceremonies live in the workspace's | filter |

A circle with a folder is still a filter. Two circles in one workspace cannot both hold a node called
`node:human:abc`, because the id belongs to the workspace.

---

## 2. The six cards, decoded

The hardcoded menu has carried the answer since before this folder existed. `jgwill/medicine-wheel#136`
`G4` found the two tiers; the hierarchy names them:

| Card | Path | Reading |
| --- | --- | --- |
| `medicine-wheel` | `jgwill/medicine-wheel` | **workspace** |
| `iaip` | `jgwill/iaip` | **workspace** |
| `stc` | `jgwill/stcraft` | **workspace** |
| `tushell` | `jgwill/tushellplatform` | **workspace** |
| `articles` | `jgwill/medicine-wheel#articles` | **circle** in the `medicine-wheel` workspace |
| `pde` | `jgwill/medicine-wheel#pde` | **circle** in the `medicine-wheel` workspace |

Four repositories, two `#fragment` subjects on one of them. The `#` was the tier marker all along.
And the colours agree: the four take direction colours (`--mw-east`, `--mw-south`, `--mw-west`,
`--mw-north`), the two take node-type colours (`--mw-node-ancestor`, `--mw-node-spirit`) — a
different palette for a different kind of thing.

This is a reading, not a ruling: whether `articles` and `pde` are circles or something else is the
requester's call. But it is the first reading in this folder that explains **why the data looks the
way it does** instead of proposing to replace it.

---

## 3. A circle is a node — so the graph can already be filtered by one

The finding that makes this shippable. `NodeType` on `main` is **eight**, not six:

```ts
export type NodeType =
  | 'human' | 'land' | 'spirit' | 'ancestor' | 'future' | 'knowledge'
  | 'circle'   // Added 0.14.0
  | 'agent';   // Added 0.17.0 (#152)
```

So a circle is **in the graph**, not beside it:

- `circleNode()` creates a node of `type: 'circle'`
- `membershipEdge()` creates a `member_of` edge from a person to it
- `membersOf(circle_id, edges)` reads them back

Which means a circle already has a subgraph, and the machinery to show it already ships:

| Piece | Where | State |
| --- | --- | --- |
| Scope the graph to one node, N hops | `app/graph/page.tsx` — `scopeId`, `scopeDepth` | **ships** |
| The traversal behind it | `GET /api/nodes/:id/web?depth=N` (`depth`, `follow`, `direction`, `kind`, `type`, `hub`) | **ships** |
| List the circles | `GET /api/nodes` with a type filter | **ships** |
| Ceremonies of a circle | `GET /api/ceremonies?circle_id=…` | **ships** |
| Circle → its people | `member_of` edges, traversed by `/web` | **ships** |

**`/api/nodes/<circle_id>/web?depth=2` returns a circle's subgraph today.** Nothing was built for
workspaces and the filter is already there.

### The one real gap

A ceremony is **not** a node or an edge. It is a separate record carrying `circle_id`,
`subject_id`, `participants` and `relations_honored`. So graph traversal from the circle node reaches
its **members** (`member_of`) but not **what the circle has been working on** — the nodes its
ceremonies gathered around.

Closing that is one union, over two routes that both already answer:

```
circle C
 ├── /api/nodes/C/web?depth=2        → C, its members, their relations
 └── /api/ceremonies?circle_id=C     → ceremonies
      └── subject_id, participants, relations_honored  → node ids
                                                        → union into the scope
```

No new storage, no migration, no workspace definition required. `resolveReach` already performs the
first half of that traversal for memory (`circle_id` → ceremonies); this is the same traversal
carried one step further, into node ids, for the graph.

---

## 4. So what happens when you switch in the menu

> *"in that menu, what could happen when we switch from one thing that we can't really name to
> another? Would that be, we see the list of circles that are there… Would we be at least capable of
> filtering the graph by the different related element to a circle?"*

Yes — and in that order. Three steps, increasing in cost, and the first two need no storage change:

### Step 1 — the menu lists circles, and selecting one scopes the graph *(ships now)*

Replace the six hardcoded cards with the circles that exist (`GET /api/nodes` filtered to
`type=circle`). Selecting one sets `scopeId` to the circle's node id — the state the graph page
already has, feeding the `/web` route it already calls. The graph stops being everything at once and
becomes **this circle and what it touches**, which is the actual complaint:

> *"the graph is a mess, you know, when we actually try to see something and deal with something
> there, it doesn't work."*

**This is the change that fixes the complaint**, and it is a menu that reads a list plus a `setScopeId`
call. It does not need the word *workspace* decided.

### Step 2 — the scope includes what the circle's ceremonies touched *(small)*

Add the union in §3. Now a circle shows its people **and** its subjects: the nodes its ceremonies
gathered around. A circle with an `episode_path` also pulls its episode's sessions, which is how
`sessionsForReach` already behaves for memory.

### Step 3 — the menu's top level becomes workspaces *(the expensive one)*

Only this needs `(workspace_id, id)` at the storage seam, the path segment, and one Honcho workspace
per wheel workspace (`NAMESPACE.md` §2). Until it lands, the deployment is one workspace and the menu
has one top-level entry — which is the truth today, honestly displayed, instead of six cards implying
otherwise.

**The order matters.** Steps 1–2 are the visible fix and they are cheap. Step 3 is invisible to a
person looking at the graph and is the expensive one. Four attempts at this folder put step 3 first
and never reached step 1.

---

## 5. What this leaves open

1. **Granularity** — are `articles` and `pde` circles, as §2 reads them? The requester's call.
2. **Does a circle need a folder of its own**, separate from `episode_path`? Nothing today requires it.
3. **Does the graph ever show ceremonies as nodes?** Today it cannot; §3's union is the workaround. Making a ceremony a node would be an ontology change and is not needed for the filter.
4. **Several circles selected at once** — the scope mechanism is one root; a set of roots is a change to `/web` or a client-side union.

---

## 6. Correction carried into the rest of this folder

Seven places in these documents assert the `NodeType` union is **closed at six**. It has been
**eight** since `0.17.0` — `circle` (0.14.0) and `agent` (0.17.0), as the root `CLAUDE.md` now states.
Those assertions are corrected where they appear.

The invariant they were protecting still holds and still matters: **a workspace is not a NodeType.**
It is the namespace the nodes are identified within — one plane up, as ERD 1 draws it. `circle` and
`agent` were added by ontology revision, deliberately, with issue numbers. A workspace was never
proposed as a node and is not one now.

---

## Sources

- `src/ontology-core/src/types.ts` (`NodeType`, `CeremonyLog`), `CLAUDE.md` (repo root), on `main`
- `src/community-identity/src/circles.ts` (`circleNode`, `membershipEdge`, `membersOf`)
- `src/memory/src/index.ts` (`MemoryScope`, `resolveReach`, `CeremonyRef`)
- `src/honcho/src/index.ts` (`sessionIdForCeremony`, `sessionsForReach`, `honchoIdFor`)
- `app/graph/page.tsx` (`scopeId`, `scopeDepth`), `app/api/nodes/[id]/web/route.ts`, `app/api/ceremonies/route.ts`
- [Honcho — Core concepts (v3)](https://honcho.dev/docs/v3/documentation/core-concepts)

🌸: The menu was never empty. It was a hierarchy nobody had named, drawn in two colour palettes, waiting for someone to read it instead of replacing it.
