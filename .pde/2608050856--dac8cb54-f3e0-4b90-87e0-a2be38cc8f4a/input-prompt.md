# Input prompt — verbatim

Received 2026-08-05, session `mw-infra-mcp`, from William (ava@jgwill.com), spoken/transcribed.

> that's pretty great we really are on the way to do exactly that so I want you to implement
> everything test everything make sure the skills that tells users about the infrastructure
> apology or also upgraded so there is a not infrastructure apology but infrastructure topology,
> I'm expecting all the packages to be upgraded published tested and you'll use at least one sub
> agent to review your work and suggest I recommend things that you need to to fix and make it
> more robust and when you complete your mission your print out some recommendations for creating
> a new user interface with one stub in ./rispecs using RISE framework that will convey your whole
> user interface and this is going to be committed as well (given that it will be in relationship
> to everything that you did so far, you'll be well placed to do that). At that moment you will
> upgrade the artefact with one more section that presents the user interface that you envisioned
> to create or more likely upgrade or whatever present infrastructure topologies and their
> relation to a ceremony as well as per hosts (many perspectives)). if you need to draft something
> right away to remember well when I'm asking you to do you'll do that right away and then you'll
> start working on the lowest layers that supports that

## Prior turn this builds on

The artefact published at `https://claude.ai/code/artifact/7f8534b8-60c1-4db8-b62a-e910a6d298c4`
— *"@medicine-wheel/infra — the vocabulary and the missing door"* — which established, measured
against the working tree on 2026-08-05:

- `@medicine-wheel/infra@0.5.7` ships 409 lines, 3 facets, 1 pure function, 11 Zod schemas.
- **Zero consumers.** `infra` is absent from `mcp/package.json` dependencies (16 `@medicine-wheel/*`
  deps declared, not this one). The CLI names it twice, both as prose inside a skill record.
- `detectPortConflicts` is reachable from `tests/infra-port-conflicts.test.ts` and from no agent,
  no tool, no route.
- The artefact proposed **6 new MCP actions and 5 upgrades** to shipped tools.

A voice tour of that artefact was published as message `cf66ab5d-18ec-4913-adc6-c6e6189e0ac7`
(persona `nyro`, 3:25) — binding `unresolved`, no episode.

## Transcription note

"infrastructure apology" is a transcription artefact for **infrastructure topology**. The
correction is itself part of the ask: the `infra-monitor` skill record currently describes a
capability that does not exist (it claims systemd monitoring; `cli/skills.ts` defines it as a
document with no runtime). Read plainly: *the skills must stop apologising for infrastructure
and start describing its topology.*
