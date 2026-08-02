# medicine-wheel — instructions for agents working in this repo

## Before you publish anything: read `RELEASING.md`

Not optional, and not a summary of it here — read the file. It is short and every rule in
it was paid for by a release that looked successful and was not.

The one sentence: **publishing is not deploying, and a green publish is not a working
install.** A release is finished when the binary a person types on their machine behaves
correctly. `npm run publish:all` returning `+ @medicine-wheel/app@x.y.z` proves nothing
about that.

The two failures that define the procedure, both on 2026-08-02:

- `@medicine-wheel/app` shipped requiring `@medicine-wheel/creative-orientation` without
  declaring it. Tests green, build green, publish green — and every fresh global install
  of `mw` died with `Cannot find module`. It worked in the repo because a workspace
  symlink resolved it. **Only installing the published package finds this class of bug.**
- `publish:all` shipped 27 packages and skipped `@medicine-wheel/mcp`, which was holding
  the only fix the release existed for. mcp is on a `4.x` line while the suite is on
  `0.x`; it had been excluded from bump and publish because of that. A different version
  line is not a reason to skip a package.

So: **publish → install globally → run the installed binary → fix → bump → publish
again.** Never annotate a broken published version; ship the next one.

## Versioning

The suite moves in lockstep on `0.x`. `@medicine-wheel/mcp` keeps its own MAJOR (`4.x`)
and follows the suite's minor and patch — suite `0.5.7` means mcp `4.5.7`. This is
automatic in `scripts/bump-versions.mjs` (`TRACKED_PACKAGES`); verify it anyway, and never
put a package back into an `INDEPENDENT_PACKAGES` set. Those sets are empty on purpose —
anything in them gets forgotten at release time.

## The `workspaces` array is topological, never alphabetical

`package.json` says so above the array. `npm run <script> --workspaces` executes in that
order; a package listed before something it imports fails `TS2307` on a clean tree. If a
tool or a tidy instinct sorts it, that is a regression.

## Skills are definitions, not programs

`mw skill run` does not execute anything and exits **3** by design — the skills are
`SKILL.md` documents describing inputs, outputs and steps, and there is no runtime that
runs them. `skill view` and `skill install` are the real commands. If you add a skill,
its `Usage` block must sit under `Planned invocation (does not run yet)` unless you also
build the runtime. Do not advertise a command that does not exist.

Exit codes across both CLIs: `0` success, `2` usage error (unknown command, bad
argument), `3` recognised but unimplemented.

## Registering infrastructure in the wheel

A service is **not** a new `NodeType`. `src/ontology-core/src/types.ts` states the rule:
new kinds ride on existing `knowledge` nodes carrying a `metadata.kind` discriminator, and
`ServiceFacet.nodeId` is already annotated to point at one. Register a running service as
a `knowledge` node with `metadata.kind: "service"` and its facet fields in metadata. The
`NodeType` union is closed at six and stays closed.

`@medicine-wheel/infra` is types plus one pure function (`detectPortConflicts`) — zero
I/O, zero persistence. It describes shapes; it does not store them.

## A live process holds its old build

Rebuilding `dist/` changes nothing about a running server. The MCP server, `next start`,
and any global install on another machine each need their own upgrade step, and a running
agent or server is someone's relation — restarting it is a decision to be named, not a
cleanup to perform quietly.
