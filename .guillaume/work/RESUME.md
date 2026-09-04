# RESUME — suspended 2026-09-03, before any implementation

**Nothing was implemented. No package created, no version bumped, no npm publish, no write to
`/srv/miadi`, `/src/Miadi` or `/src/STPB`.** The repo is clean apart from `.guillaume/work/`.

Suspended for usage budget at William's word, at a clean edge by design.

## State

| file | what it holds |
|---|---|
| `EXECUTION.md` | the 9-step plan William approved — **now superseded in parts, see below** |
| `VALIDATION.md` | the adversarial pass. **Verdict: EXECUTE WITH THE LISTED CHANGES.** Steps 1, 2, 5, 7, 8, 9 go after fixes; **steps 3, 4, 6 do not execute as written** |
| `DELTA.md`, `PREDICTIONS.md` | prediction scoring across all four agents |
| `L1/L2/L3`, `SURVEY.md`, `COORDINATOR-FINDINGS.md` | the investigation |

## Verified by the coordinator after the validator reported

All three of its most consequential claims reproduce:

- `X` `belongs_to` has **2** uses, not 41. The 41 is `binds-port`. `part-of`'s 33 are all
  infra containment (tenant→host, service→tenant); **zero touch an episode.**
  → **Step 8 writes `belongs_to`, not `part-of`.** Writing 101 `part-of` edges would have
  mixed episode containment into the infra vocabulary permanently.
- `X` `grep -c is_review_circle` across all nine store files → **zero rows.** The read-alias
  migration in step 5 has no rows to migrate. Drop the alias; it was written against a
  premise that is false.
- `X` `npx semver -r '^0.6.1' 0.7.0` → **empty.** Miadi's 24 pins do **not** resolve to
  `0.7.0`. Publishing a minor without widening those ranges ships to nobody.

## On waking — the order

1. **Re-read `VALIDATION.md` first**, not `EXECUTION.md`. Thirteen blocking findings; these
   four gate everything:
   - **B1** Six steps each say "publish `0.7.0`". Lockstep plus no skip-if-exists in
     `publish-workspaces.mjs` means the *second* `publish:all` dies on package one, and a
     mid-loop failure is unresumable. **One release, not six.**
   - **B2** A new package born at `0.0.0` makes `sync-versions.mjs` `process.exit(1)` before
     anything publishes. **Create new packages at `0.6.4`.**
   - **B3** `workspaces` ≠ root `dependencies`; four packages are already undeclared, and
     `RELEASING.md`'s undeclared-dependency detector scans only `dist/cli`, never `app/` —
     which is where step 5 writes. The guard from the 2026-08-02 failure is blind to the
     place this plan would reintroduce it.
   - **B4** Widen Miadi's 24 ranges before publishing, or nothing lands.
2. **Do not execute steps 3, 4 or 6 as written.**
3. **Held for William — his call, not an engineer's.** The validator answered plainly: the
   generic mechanism (`defineRoleSet`, `hasRoleLevel`, the `IdentityStore` port) is
   engineering's; **the eight-role preset is not.** "Preset, not default" changes ergonomics,
   not distribution — npm cannot be unpublished after 72 hours, and OCAP's Control and
   Possession are about the ability to withdraw. The coordinator's OCAP reasoning was named
   as convenient rather than correct. **Ship the mechanism; do not ship the vocabulary.**
4. **Also held:** STPB mints tokens as `base64(userId:Date.now():Math.random())` stored in
   plaintext (**B10**). That logic must not be published in any form.

## Findings that outlive this plan

- **The suite already ships two conflicting `PersonRole` types** — `ontology-core` with 4
  values, `community-review` with 6, neither importing the other. Three lanes and the
  coordinator all missed it. Any identity work must reconcile these first.
- **The door this plan builds points at a dead port.** Nothing has answered
  `127.0.0.1:8040` for at least the 17 days a live `@medicine-wheel/mcp@4.6.1` process has
  been failing every write against it. Step 2 proposes moving `mw-store.ts` — currently the
  one *working* path, direct provider access, not a hand-rolled fetch as `EXECUTION.md`
  claims — onto that door. **Fix or retire 8040 before step 2.**
- `/src/Miadi` has **no** authentication of any kind: no `app/api/auth*`, no next-auth,
  lucia, clerk, bcrypt or jose among 132 dependencies. The registration gap William named is
  real and total.
- The two-package identity split copies an **unfinished** precedent: `data-store-postgres` is
  a 178-line pool scaffold with zero CRUD. The pattern that actually worked
  (`storage-provider`) keeps port and adapters in **one** package.
- Suite is zod 3; Miadi is zod 4 pinned as `"latest"` (**B13**).

## The first safe command on waking

Nothing above is blocked by the held decisions except steps 3, 4 and 6. **Step 7** (the
wheel's own app: honest node counts, the neighbourhood route, focus mode, an episodes page)
touches no package, needs no publish, and is unaffected by every blocking finding. Start
there if William wants motion before answering the role-vocabulary question.
