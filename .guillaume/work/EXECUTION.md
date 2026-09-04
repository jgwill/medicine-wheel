# EXECUTION — the plan William approved 2026-09-03

Supersedes the first draft of this file. Three of William's corrections reshaped it:

1. **The chooser is already built.** `/src/STPB` carries a full identity layer — users,
   scoped API tokens, hierarchical roles, and circles. No lane looked there, because the
   coordinator's briefs pointed them at review, exports and the graph. That was a dispatch
   failure, not a lane failure. **Q1 is closed: identity is extracted, not invented.**
2. **"Consume, no publish" was wrong.** If a thing is reusable it gets published, or it is
   not shareable with the community. Every reusable piece below ships to npm.
3. **A review must register *in* the wheel** as a node, not be cited from outside it.

Also: the `lib/medicine-wheel` git submodule has been removed from STPB (`X`, verified —
`.gitmodules` no longer names it and the directory is gone).

Current state: suite `0.6.4`, `@medicine-wheel/mcp` `4.6.4`.

---

## What STPB already holds (verified 2026-09-03)

This is the material for step 3. Every path below was read, not inferred.

| what | where | shape |
|---|---|---|
| scoped API tokens | `lib/auth-token.ts` | `api_tokens(user_id, token, scopes, expires_at)`; `TOKEN_SCOPES` const with `reference:read`, `circles:read/write`, `story-beats:*`, `wounds:*`, `admin:*`, `*`; `DEFAULT_SCOPES`; `validateApiToken(request) → AuthUser` |
| authenticated subject | `lib/auth-token.ts:17-22` | `AuthUser { id, email?, name?, scopes? }` |
| role hierarchy | `lib/types/roles.ts` | `UserRole` enum of 8 — `participant`, `emerging_guide`, `ceremony_facilitator`, `firekeeper`, `story_keeper`, `lighthouse_admin`, `eva_ai`, `integration_ai`; `roleHierarchy` levels 0–4 with story_keeper **parallel** to firekeeper, not above it; `roleLabels` |
| role gates | `lib/auth/rbac-middleware.ts` | `requireRole(request, allowedRoles[])`, `requireRoleLevel(request, minimumRole)`, `hasRoleLevel` |
| circles | `lib/community/types.ts:54-97` | `StoryCircle { id, name, facilitator_id, participants[], invited[], capacity, circle_type (8-enum), ceremony_schedule[], agreements[], commitment_rings[], is_public, requires_invitation, shared_stories[], collective_insights[], active }` |
| visibility | `lib/community/types.ts:6-12` | `ShareScope`, `StoryVisibility = private \| circle \| community \| public` |
| service | `lib/community/community-service.ts:17` | `class CommunityService` |
| routes | `app/api/` | `auth/signup`, `auth/generate-token`, `auth/[...nextauth]`, `user/tokens`, `user/role`, `community/circles`, `community/witness`, `community/share-story`, `community/lighthouse` |
| UI | `app/` | `register/`, `auth/login`, `auth/sign-up`, `community/`, `community/circles/[circleId]` |

**The alignment that makes this the right extraction, not a convenience:**
STPB's `UserRole` already contains `firekeeper`, `ceremony_facilitator` and `story_keeper`.
`@medicine-wheel/community-review`'s `PersonRole` is
`steward | contributor | elder | firekeeper | community-member | youth`
(`src/community-review/src/types.ts:17-23`). `firekeeper` is in both, and the wheel already
ships a whole `@medicine-wheel/fire-keeper` package. Two systems grew the same vocabulary
independently. Extracting it is recognising a shared ontology, not inventing one.

---

## Step 1 — UPGRADE `ontology-core` + `storage-provider`. Publish `0.7.0`.

**Why first:** additive, backward-compatible, nothing depends on it yet. It proves the
publish → global install → run path (`RELEASING.md`) while the blast radius is zero.

- `src/ontology-core/src/schemas.ts` gains Zod for `ProductionRelation` and
  `ProductionEntityKind`. The types are at `types.ts:501-506`, exported at `index.ts:46-47`,
  and `grep ProductionRelation schemas.ts` returns nothing today. **Closes issue #90** — the
  one film-production issue that survived checking (#86 and #87 are OPEN and already
  published at `0.6.4`).
- `src/storage-provider/package.json` gains an `exports` map (`./interface`, `./jsonl`,
  `./neon`). It is the only package in the suite without one; `ontology-core` has seven.

**Publish:** `0.7.0` / mcp `4.7.0`, per `scripts/bump-versions.mjs`.
**Install:** `/src/Miadi` already declares both at `^0.6.1` — a minor bump needs the range
widened to `^0.7.0`, then `npm i`.
**Consume:** `/src/Miadi/app/chronicle/lib/theme.ts` (105 lines) drops its redeclared
directions and imports `DIRECTIONS` / `DIRECTION_COLORS` from `@medicine-wheel/ontology-core`,
keeping its own `glyph` and `THEMES` which the wheel does not own. Ends the west-colour
split (`#5b78b4` vs `#1a1a2e`). `/src/Miadi/types/ceremony.ts:15-20` deletes its copied
`CeremonialPhase`.

> **Note, corrected against the L2 report:** `CeremonialPhase` *is* already re-exported at
> `src/storage-provider/src/index.ts:31`, and Miadi already imports that package in five
> files. So Miadi's copy was **not** forced by a missing export — it was reachable and
> copied anyway. The subpath map is still worth adding; it is not the cause of that copy.
> The Ojibwe five live in `src/ceremonial-diary/src/types.ts:71-75`, not in
> `storage-provider`.

## Step 2 — CREATE `@medicine-wheel/client`. Publish `0.7.0`.

**Why:** `grep -rln "fetch(" src/*/src/` is **empty**. Not one of the 26 packages can talk to
a wheel over HTTP. The only client is `mcp/src/http-store.ts` (745 lines), and
`@medicine-wheel/mcp@4.6.4` exports only `.`, `./all-tools`, `./types` — `http-store` is not
among them, and the manifest's `types` field is `undefined`. The repo's own code names the
cost at `app/api/nodes/route.ts:26-31`. **Nothing about "consume the wheel elsewhere" works
until this exists.**

**Built from:** `mcp/src/http-store.ts` + `mcp/src/store.ts:22-41` +
`app/lib/{ceremony,beat,cycle}-response.ts`. `mcp` is rewritten to depend on it.
**`workspaces` position:** after `src/ontology-core`, before `mcp`. The array is topological,
not alphabetical; a wrong position fails `TS2307` on a clean tree.
**Install:** `cd /src/Miadi && npm i @medicine-wheel/client@^0.7.0`
**Consume:** `/src/Miadi/lib/mw-store.ts` (30 hand-rolled lines) becomes a thin wrapper over
the typed client.

## Step 3 — CREATE `@medicine-wheel/community-identity`. Publish `0.7.0`.

**This is the step that changes what the platform is.** It answers the question the
coordinator wrongly held open: *what is a chooser?*

**Extracted from STPB**, as pure types + Zod schemas + pure predicate functions — zero I/O,
matching the discipline of `community-review` and `consent-lifecycle`:

- `CommunityMember` from `AuthUser` — `{ id, email?, name?, roles, scopes }`
- `MemberRole` from `UserRole` — the 8-value enum, `roleHierarchy`, `hasRoleLevel`,
  `roleLabels`. **Reconciled with `community-review`'s `PersonRole`**, which shares
  `firekeeper`: a mapping function both directions, not a silent merge.
- `Circle` from `StoryCircle` — generalised off "story": `{ id, name, facilitatorId,
  participants[], invited[], capacity, circleType, agreements[], isPublic,
  requiresInvitation, active }`. `shared_stories` / `collective_insights` stay in STPB;
  they are that app's payload, not the wheel's ontology.
- `Visibility` from `StoryVisibility` — `private | circle | community | public`
- `TokenScope` from `TOKEN_SCOPES` — the vocabulary and `DEFAULT_SCOPES`, **not** the
  database access. Scope *checking* is a pure function; scope *storage* is the app's.
- `RespondentRef` — the discriminated union step 4 needs:
  `{ kind: 'member', memberId }` | `{ kind: 'anonymous', token, source }` |
  `{ kind: 'attributed', recordedBy, note }`

**What is deliberately left in STPB:** the `sql` calls, `next-auth`, the `api_tokens` table,
every route handler. The wheel gets the *vocabulary and the rules*; STPB keeps the database.
This is what makes it installable by Miadi, which has neither that table nor next-auth.

**Install:** back into `/src/STPB` (`npm i @medicine-wheel/community-identity`, then
`lib/types/roles.ts` and `lib/community/types.ts` re-export from it rather than declaring),
and into `/src/Miadi`.
**Consume:** `/src/STPB/lib/auth/rbac-middleware.ts` keeps its `sql` lookup and imports
`hasRoleLevel` from the package. STPB stops being the only place these rules exist.

## Step 4 — CREATE `@medicine-wheel/community-choice`. Publish `0.7.0`. Depends on step 3.

**Why not extend `community-review`:** opposite directions. A `ReviewCircle` is bounded,
named and role-carrying, and its consensus *authorizes*; an audience poll has
loosely-identified participants, options authored in advance by the proposer, and a result
that authorizes nothing. `ReviewOutcomeType` is a closed five-enum, and every producer in
`outcomes.ts` returns *the circle's* decision carrying `elderBlessing` and `wilsonCheck` —
adding a poll would make an Elder's blessing apply to a Facebook audience. And
`seekConsensus` (`consensus.ts:26-33`) computes consensus as **all reviewers having
spoken** — attendance. For a named circle that is a defensible proxy; for an open audience
the denominator does not exist.

**Why not `consent-lifecycle`:** a poll response is not a grant. Modelling it there makes
"the audience chose B" readable as "the audience consented to B". It *is* the right owner of
the precondition — hence `consentGate`.

```ts
type ChoiceAuthority = 'influence-only' | 'advisory' | 'binding';   // default influence-only

interface SubjectRef {           // the seam — a reference, never a coupling
  kind: 'review' | 'episode' | 'node';
  service?: string;              // e.g. 'miadi-review'
  id: string; version?: number;
  url?: string; sha256?: string; // the receipt ep340 computes by hand today
}

interface ChoiceOption {
  id: string; label: string;
  consequence: string;           // REQUIRED — an option without a stated cost is a leading question
  deferral: boolean;             // at least one path must be "don't act yet"
}

interface ChoiceSet {
  id: string; subject: SubjectRef; question: string;
  options: ChoiceOption[];       // >= 2
  authority: ChoiceAuthority;
  boundaries: string[];          // REQUIRED, non-empty — what a response does NOT authorize
  consentGate?: string;          // ConsentRecord id that must be 'active' before opening
  state: 'draft' | 'open' | 'closed' | 'withdrawn';
  openedAt?: string; closesAt?: string;
  readingRef?: string;           // path to the packet holding layers 1-3
}

interface ChoiceResponse { choiceSetId: string; optionId: string; respondent: RespondentRef; at: string; }
interface ChoiceResult   { counts: Record<string,number>; total: number; byRespondentKind: Record<string,number>; unresolvedDivergence: string[]; }
```

**Two invariants in code**, taken from the two errors William caught by hand in the only
exercise that has ever run (`RETURN-TO-EP339.md`):

- `validateChoiceSet` rejects fewer than two options, any option missing `consequence`, and
  an empty `boundaries` array.
- `closeChoiceSet` returns a `ChoiceResult`, **never a permission.** `binding` authority
  requires an explicit `consentGate` resolved to `active`.

`byRespondentKind` exists so an anonymous Facebook tally can never be silently added to a
count of named members. **Facebook and other connectors report numbers; they never produce a
`kind: 'member'` respondent.** That boundary is what keeps step 3 honest.

**With tests**, which `community-review` has none of.
**`workspaces` position:** after `src/consent-lifecycle`.

## Step 5 — UPGRADE `storage-provider` + `app` + `mcp`. Publish `0.7.0` / `4.7.0`.

- `ChoiceSetRecord` / `ChoiceResponseRecord` in `src/storage-provider/src/interface.ts`,
  filter semantics in a sibling `choice-sets.ts`, jsonl + neon implementations. Copy
  `inquiry-weaves.ts` and `plan-perspectives.ts` exactly — they are the working template.
- `app/api/choice-sets/route.ts` + `[id]/route.ts` + `[id]/responses/route.ts`.
- **`ReviewRecord` and `mw_register_review`** — William's correction D. A review becomes a
  `knowledge` node in the wheel carrying `metadata.kind: "review"` and the
  `{ service, id, version, url, sha256 }` reference, so it can be a `ChoiceSet.subject`, an
  edge endpoint, and a graph citizen. The `NodeType` union stays closed at six
  (repo `CLAUDE.md`).
- **MCP verbs.** `mw_review_circle_open` exists in
  `mcp/src/tools/governance-transformation.ts` with **no** tool to add a reviewer, record a
  voice, or close a circle — a circle opened through MCP can never leave `gathering`. Add
  `mw_review_circle_add_reviewer`, `_voice`, `_close`; `mw_choice_set_open`,
  `mw_choice_respond`, `mw_choice_close`, `mw_choice_result`; and `mw_register_review`.
  Move review-circle persistence from `metadata.is_review_circle` to `metadata.kind` per this
  repo's own rule, keeping the old flag as a **read alias** — existing rows carry it.

## Step 6 — UPGRADE and publish `community-review`; install into Miadi and STPB.

Not a local edit — a published module, per correction 2.

- Bind it to `community-identity`'s `MemberRole` so a reviewer is a real subject.
- `/src/Miadi/lib/ceremonial-spiral.ts` (423 lines): its consensus and talking-circle logic
  (`:166` initialize consensus, `:187` update with a viewpoint, `:221-224` phase advance on
  participation rate) is replaced by `seekConsensus`, `talkingCircle`, `recordVoices`,
  `resolveDisagreement`. Redis stays as the storage adapter. Miadi has declared this package
  at `package.json:42-48` and imported it **zero** times.
- `/src/STPB/lib/ceremony/sacred-container.ts` hand-rolls sharing consent (`:192`, `:207`,
  `:216-226`) where `@medicine-wheel/consent-lifecycle` has six Zod schemas. Install and
  consume both packages there.

## Step 7 — the wheel's own app. No publish.

Repairs so the platform can be *seen* working. Not blocking, and not skipped.

1. The graph asks for all 205 nodes and 191 edges instead of accepting the storage layer's
   default of 100 (`jsonl.ts` `getAllNodes(limit = 100)`, `app/graph/page.tsx:167` sends no
   parameters). Report `total` beside `count`.
2. New `app/api/nodes/[id]/web/route.ts` calling `neighborhood()`
   (`src/relational-query/src/traversal.ts:217`) — a shipped function nothing imports.
3. Focus mode on the graph: select a node, mount only that neighbourhood, Escape restores.
   **Ships with 1**, never after it — at 205 nodes the wheel layout worsens (north 33 → 93
   in the same 90°, spacing 7.1px → 2.5px against a 25.6px disc).
4. `app/episodes/page.tsx` + `[id]/page.tsx` and an attention board, on `?kind=` and
   `?parent_id=` which `app/api/nodes/route.ts:38` already accepts and no page passes.

## Step 8 — data repair. No publish.

- **Materialise containment.** 106 nodes carry `metadata.parent_id`; exactly **5** have a
  matching edge. Write the other 101, at registration time so they cannot drift again.
  Measured: components 82 → 26, isolates 75 → 22, chronicle root degree 2 → 82.
  **Uses `part-of`** — already 33 uses against `belongs_to`'s 41, and `part-of` is the
  containment sense; `belongs_to` is in use for episode→chronicle membership and is left
  alone.
- **`metadata.occurred_at`** for episodes, from the `date:` already in each `episode.yaml`.
  `created_at` keeps meaning "when the wheel learned this" — 41 of 83 episodes disagree with
  their real date, and twelve May episodes all carry `2026-09-02`.
- **Backfill** ~170 `lineage:` entries (59 edges exist) and the 102 of 185 episode folders
  with no node.

## Step 9 — `LineageWeb` as a second layout. Publish with the next cycle.

`/src/Miadi/app/chronicle/components/LineageWeb.tsx:27-78` is ~50 lines of pure geometry —
x chronological, y direction band, relation arcs above the spine. It becomes `lineageLayout`
in `src/graph-viz/` beside `applyWheelLayout`, with a switch on `app/graph/page.tsx`.
**Depends on step 8's `occurred_at`** — run on `created_at` it would stack twelve May
episodes on one September pixel and look right while being wrong.

---

## Release discipline (`RELEASING.md`, not optional)

`npm run publish:all` → **global install** → run the installed `mw` binary → fix → bump →
publish again. A green publish proves nothing; only a fresh global install catches the
undeclared-dependency class of bug that shipped on 2026-08-02. `mcp` is **never** excluded
because it is on a different major line.

## Two hazards to fix on the way

1. **`src/_` publishes `medicine-wheel@1.0.5`** with `main: index.js`, and the folder holds
   only `package.json` and `README.md`. Outside `workspaces`, versioned above the suite,
   entry point does not exist.
2. **Five open issues describe shipped work** — #86, #87, #107 (claims zod is missing from
   root deps; it is there at `^3.23.0`), #116. Only #90, #103 and #83 survived checking.

## Authorization

William, 2026-09-03: update these files, have a subagent validate the plan, "then you'll
start the full implementation, publishing, and all that is needed to make it happen without
needing to come back to me." Publishing to npm is authorized for this plan. Q1 is closed by
his answer C. Q2 (canonical ceremony vocabulary) remains held and blocks **nothing above** —
`ceremony-protocol` persistence stays out of this plan.
