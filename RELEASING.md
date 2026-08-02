# Releasing medicine-wheel

**Read this before publishing anything from this repo.** Every rule below was paid for by
a release that looked successful and was not. Dates are given so you can find the commit.

The one sentence that matters: **publishing is not deploying, and a green publish is not a
working install.** A release is finished when the thing a person types on their machine
behaves correctly — not when npm accepts a tarball.

---

## The loop — publish, install, verify, fix, publish again

This is the whole procedure. Do not stop at step 4.

```bash
# 1. bump — mcp tracks the suite automatically now; check it anyway
node scripts/bump-versions.mjs patch      # or minor / major
node scripts/sync-versions.mjs
node -e "const f=p=>require('./'+p+'/package.json').version; \
  console.log('suite', f('src/ontology-core'), '| mcp', f('mcp'), '| root', f('package.json'.replace('package.json','.')))"

# 2. build EVERYTHING, then test
npm run build:packages
npm run build:cli
npx vitest run                            # must be green before anything leaves the machine

# 3. verify the BUILT ARTIFACT, not the source
node dist/cli/mw.js skill view   >/dev/null 2>&1; echo "skill view -> $?   (expect 0)"
node dist/cli/mw.js skill run foo >/dev/null 2>&1; echo "skill run  -> $?   (expect 3)"
node dist/cli/mw.js bogus-command >/dev/null 2>&1; echo "unknown    -> $?   (expect 2)"

# 4. publish
npm run publish:dry                       # read the output; confirm mcp is in the list
npm run publish:all                       # workspaces + mcp + root

# 5. CONFIRM THE REGISTRY, cache-busted. `npm view` lies from cache for minutes.
curl -s https://registry.npmjs.org/@medicine-wheel%2Fapp | \
  python3 -c "import json,sys;print('app', json.load(sys.stdin)['dist-tags']['latest'])"
curl -s https://registry.npmjs.org/@medicine-wheel%2Fmcp | \
  python3 -c "import json,sys;print('mcp', json.load(sys.stdin)['dist-tags']['latest'])"

# 6. INSTALL GLOBALLY — this is the step that catches packaging defects
npm i -g @medicine-wheel/app@<version> @medicine-wheel/mcp@<version> --prefer-online

# 7. RUN THE INSTALLED BINARY. Not the built one. The installed one.
mw skill view    >/dev/null 2>&1; echo "installed mw skill view -> $?   (expect 0)"
mw skill run foo >/dev/null 2>&1; echo "installed mw skill run  -> $?   (expect 3)"
mw bogus         >/dev/null 2>&1; echo "installed mw unknown    -> $?   (expect 2)"
mwsrv serve      >/dev/null 2>&1; echo "installed mwsrv serve   -> $?   (expect 2)"

# 8. if step 7 fails: FIX, BUMP AGAIN, AND REPEAT FROM 1.
#    A broken published version stays broken. Ship the fix; do not annotate it.
```

**Step 7 is not optional and cannot be replaced by step 3.** They test different things.
Step 3 proves the code compiles and behaves. Step 7 proves the *package manifest* is
complete — that everything the binary requires at runtime is actually declared and
therefore actually installed on someone else's machine.

---

## What step 7 has caught

**2026-08-02 — `@medicine-wheel/app` shipped a runtime dependency it never declared.**
`dist/cli/orientation.js` requires `@medicine-wheel/creative-orientation`, which was
missing from `dependencies` (22 `@medicine-wheel/*` deps were declared; that one was not).
Every fresh global install of `mw` died with:

```
Error: Cannot find module '@medicine-wheel/creative-orientation'
```

Tests were green. The build was green. The publish was green. `node dist/cli/mw.js` worked
*in the repo*, because the workspace symlink resolved it. It only broke where it mattered:
on a machine that installed from the registry. Nothing but installing the published
package would have found it.

**Detect this class of defect before publishing:**

```bash
python3 - <<'PY'
import json,re,os
decl=set(json.load(open('package.json')).get('dependencies',{}))
used=set()
for root,_,files in os.walk('dist/cli'):
    for f in files:
        if f.endswith('.js'):
            t=open(os.path.join(root,f)).read()
            used|={m.group(1) for m in re.finditer(r'require\(["\'](@medicine-wheel/[^"\']+)["\']\)',t)}
            used|={m.group(1) for m in re.finditer(r'from\s+["\'](@medicine-wheel/[^"\']+)["\']',t)}
missing=sorted(u for u in used if '/'.join(u.split('/')[:2]) not in decl)
print('MISSING from dependencies:', missing or 'none')
PY
```

---

## `@medicine-wheel/mcp` — its own major, never its own release

mcp is on a **4.x** line while the suite is on **0.x**. A suite at `0.5.7` means mcp at
`4.5.7`: same minor and patch, different major.

**A different version line is not a reason to skip a package.** Until 2026-08-02 mcp was
listed in `INDEPENDENT_PACKAGES` in both `bump-versions.mjs` and `publish-workspaces.mjs`,
which meant `npm run publish:all` pushed 27 packages to `0.5.6` and left mcp at `4.5.5` —
**holding the only fix the release existed to ship.** It was found by reading the registry
by hand afterwards, not by any check.

Now: `bump-versions.mjs` has `TRACKED_PACKAGES`, which preserves mcp's major and applies
the suite's minor.patch; `publish-workspaces.mjs` publishes it with everything else. Both
`INDEPENDENT_PACKAGES` sets are empty **on purpose** — anything in them can be forgotten
at release time.

**Trap inside that fix, also paid for:** the tracked version must be computed from a
package that was *just bumped*, not from the root manifest. The root does not move during
`npm version --workspace`, so reading it yields the previous version and the tracked
package lands one patch behind — silently, since it still looks bumped.

---

## Other traps, each measured

- **`npm view` serves stale cache for minutes after a publish.** It reported `4.5.5`
  immediately after `+ @medicine-wheel/mcp@4.5.6` succeeded. `npm i -g` then failed
  `ETARGET` for a version that genuinely existed. Confirm with a direct
  `curl https://registry.npmjs.org/<pkg>`, and pass `--prefer-online` when installing a
  just-published version.
- **`npm i -g` is atomic across its arguments.** One bad spec and *nothing* installs —
  including the packages that were fine. If an install fails, assume none of it landed.
- **The `workspaces` array in `package.json` is TOPOLOGICAL, not alphabetical.** The
  comment above it says so. `npm run <script> --workspaces` runs in that order; a package
  listed before something it imports fails `TS2307` on a clean tree. Never sort it.
- **A running server holds its old build in memory.** Rebuilding `dist` does not change a
  live process. The MCP server and any `next start` must be restarted to pick up a
  release — and a live process is someone's relation, so restarting it is a decision, not
  a cleanup.

---

## After the release

Publishing to npm is one of three places the new version has to reach. Say explicitly
which ones you did:

1. **the registry** — `curl` confirmed, per step 5;
2. **global installs on this host** — step 6, and *proven* by step 7;
3. **running processes and other machines** — the MCP server, any Android/Termux device,
   any other host with a global install. None of these update themselves.

Reporting "published" when only (1) is done is the failure this document exists to
prevent. Name what you did not do.
