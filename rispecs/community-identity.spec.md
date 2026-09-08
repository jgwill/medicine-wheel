# community-identity — RISE Specification *(STUB)*

> Who is in a community, what standing they hold, and what a token of theirs may reach. The mechanism, not the vocabulary.

**Version:** 0.0.0 — **STUB, not yet specified**
**Package:** `@medicine-wheel/community-identity` *(does not exist)*
**Document ID:** rispec-community-identity-v0
**Last Updated:** 2026-09-08
**Status:** stub for reflection — one question in it is **not engineering's to answer**

---

## Why this stub exists

Measured 2026-09-03: **neither system can tell two people apart.**

- `@medicine-wheel/community-review`'s `Reviewer.id` is an opaque string with
  no authentication behind it (`src/community-review/src/types.ts`).
- The Miadi review service authenticates with **one shared bearer token**
  (`app/lib/auth-token.ts`, `timingSafeEqual` against `MIADI_REVIEW_TOKEN`) and
  has no identity column in its store.

So "the community chooses" currently has no subject. Any count either system
reported would be unbacked.

**The answer already exists in `/src/STPB`** — built and tested, not
speculative:

| what | where |
|---|---|
| scoped API tokens | `lib/auth-token.ts` — `api_tokens(user_id, token, scopes, expires_at)`, `TOKEN_SCOPES`, `validateApiToken(request) → AuthUser` |
| authenticated subject | `AuthUser { id, email?, name?, scopes? }` |
| role hierarchy | `lib/types/roles.ts` — 8 roles, levels 0–4, `story_keeper` **parallel** to `firekeeper` |
| role gates | `lib/auth/rbac-middleware.ts` — `requireRole`, `requireRoleLevel`, `hasRoleLevel` |
| circles | `lib/community/types.ts:54-97` — `StoryCircle` with participants, invited, capacity, agreements, visibility |
| routes | `api/auth/signup`, `api/user/tokens`, `api/community/circles`, `api/community/witness` |

---

## Desired Outcome *(draft)*

A community with **no application of its own** installs this package, supplies
its own role vocabulary, and has members, standing, circles and scoped tokens —
without inheriting anyone else's ceremonial progression.

---

## The load-bearing distinction: mechanism vs vocabulary

STPB's eight roles are `participant`, `emerging_guide`, `ceremony_facilitator`,
`firekeeper`, `story_keeper`, `lighthouse_admin`, `eva_ai`, `integration_ai` —
a specific Indigenous-wisdom progression with its own labels and ordering.

**Shipping those as a library default would be two failures at once:** a
reusability failure, because every other community inherits a progression that
was never theirs; and a cultural imposition, because a specific tradition's
naming becomes technical furniture in a published package.

So the proposal is:

- the package ships `RoleSet` as a **configurable structure** — ids, hierarchy
  map, labels — and functions over *any* `RoleSet`: `hasRoleLevel`,
  `canPerform`, circle-membership predicates;
- a community **supplies its own**;
- STPB's eight are a preset that community provides, never a built-in default.

Same treatment for `circle_type`'s eight values and `ShareScope`.

---

## Held — not engineering's call

**Does "preset, not default" actually resolve the concern?**

The adversarial review (`.guillaume/work/VALIDATION.md`) answered **no, and said
the counter-argument is convenient rather than correct**: preset-vs-default
changes *ergonomics*, not *distribution*. npm versions cannot be unpublished
after 72 hours, and OCAP's Control and Possession are about the ability to
withdraw.

The generic mechanism — `defineRoleSet`, `hasRoleLevel`, the `IdentityStore`
port — is engineering's call. **The eight-role preset is not.** This stub does
not resolve it, and no code should be written that assumes it resolved.

---

## Also held: the token model must not ship as written

`/src/STPB/lib/auth-token.ts` mints tokens as:

```ts
Buffer.from(`${userId}:${Date.now()}:${Math.random()}`).toString('base64')
```

stored and compared in **plaintext**. `Math.random()` is not cryptographic, and
two of the three inputs are often known.

Survivable inside one app nobody is deploying. **Publishing it distributes it to
every community that installs the package.** So: the port takes a *hash*
(`getTokenByHash`), minting uses `crypto.randomBytes(32)`, and the plaintext
token is returned to the caller once and never stored. That is a change to the
extraction, not a follow-up.

---

## Shape — sketch, not decided

Pure types, Zod schemas, and predicates. **Zero I/O**, matching
`community-review` and `consent-lifecycle`.

```typescript
interface CommunityMember { id: string; email?: string; name?: string; roles: string[]; scopes: string[] }
interface RoleSet { ids: readonly string[]; hierarchy: Record<string, number>; labels?: Record<string, string> }
interface Circle { id: string; name: string; facilitatorId: string; participants: string[]; invited: string[]; capacity?: number; circleType: string; agreements: string[]; isPublic: boolean; requiresInvitation: boolean; active: boolean }
type Visibility = 'private' | 'circle' | 'community' | 'public';
type RespondentRef =
  | { kind: 'member'; memberId: string }
  | { kind: 'anonymous'; token: string; source: string }
  | { kind: 'attributed'; recordedBy: string; note?: string };

interface IdentityStore { /* the port — persistence is the app's */ }
```

**What stays in the app:** the `sql`, next-auth, the `api_tokens` table, every
route handler. The wheel gets the vocabulary and the rules. That split is what
makes it installable by Miadi, which has neither.

---

## Open questions

1. **Does `MemberRole` reconcile with `PersonRole`?** The mapping is **total in
   neither direction** (`VALIDATION.md` B11). `firekeeper` is the only total
   pair. `elder` — which gates `approved-with-blessings` in
   `consensus.ts` — has no STPB source, and manufacturing one lets a platform
   role bless. `eva_ai` / `integration_ai` are AI accounts: mapping them to any
   `PersonRole` lets an AI into a consensus denominator.
2. **Two `PersonRole` types already ship**, in `ontology-core` (4) and
   `community-review` (6, now widening the first by reference). A third role
   concept must not become a third vocabulary.
3. **Does `RoleSet` being configurable cost compile-time safety?** The review
   said no — `const` type parameters — but named the DB boundary
   (`parseRole → R | null`) as the real hole.
4. **One package or two?** `data-store` / `data-store-postgres` is the local
   precedent and it is **unfinished** — the postgres half is a 178-line pool
   scaffold with zero CRUD. The pattern that worked (`storage-provider`) keeps
   port and adapters together.

---

## Related

- `.guillaume/work/EXECUTION.md` step 3
- `.guillaume/work/VALIDATION.md` — B10 (tokens), B11 (mapping), B12 (PersonRole)
- `rispecs/community-review.spec.md` — the circle whose reviewers this gives subjects to
- `rispecs/consent-lifecycle.spec.md` — a grant is not a response; see `community-choice`
