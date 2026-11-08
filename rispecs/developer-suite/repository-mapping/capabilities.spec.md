# Capabilities

A capability is something the platform can do for someone: publish a prototype to an episode, register a service on the wheel, follow a wheel's events from a clone. This layer names each capability once, says in a few words what it does, and records which repositories and services give it, so that a repository mapping can say which capability a feature realizes and a reader can see where the same capability was built twice.

## Desired Outcome

A reader opens one list and sees what the platform can do, which repositories and services give each capability, which capabilities more than one repository gives, and who said so from what evidence.

## Data

### Capability
A row naming one capability.
- `nodeId`: `capability:<kebab-case-slug>`. The id of a `knowledge` node carrying `metadata.kind: 'capability'`, direction west (it is what executes and is offered, the reason a service is west).
- `name`: a short title.
- `statement`: what it does, at most 55 words. Required when `status` is `clear` or `unclear`.
- `status`: one of `clear`, `unclear`, `undefinable`, `needs-resolution`.
  - `clear`: the statement fits the limit and the evidence read supports it.
  - `unclear`: a statement exists but the evidence does not settle it.
  - `undefinable`: what is there cannot be stated as one thing.
  - `needs-resolution`: a statement was attempted and did not fit, or two sources disagree and a person has to settle it.
- `providedBy`: repository or service node ids.
- `metis`: the operator knowledge `@medicine-wheel/infra`'s `MetisHold` carries (exceptions, invisible work, notes, who holds it). Optional.
- The attribution fields below.

### Attribution
Carried by every row of this layer and of the repository mapping.
- `statedBy`: a model id, an agent seat or a person.
- `statedAt`: ISO 8601 with a zone.
- `grounding`: what was read, at least one entry: file paths, commits, URLs, `owner/repo#n`.
- `revision`: `pending` (written, nobody has read it since), `revised` (a later reading corrected it) or `affirmed` (a person read it and stands behind it). A row a model writes starts `pending`.
- `revisedBy`, `revisedAt`: required once `revision` is `revised` or `affirmed`.

### The word limit
A statement holds at least one word and at most 55. A word is a whitespace-separated token holding a letter or a digit, so a dash is not a word and a hyphenated word is one. A writer whose statement does not fit stops, records the row `needs-resolution` without a statement, and moves to the next row. The refusal message says exactly that.

### CapabilityClaim and SharedCapability
- A claim pairs a capability with one provider. Claims come from a capability's `providedBy`, from a feature that realizes it (claimed for the feature's repository, `via` naming the feature), and from a `provides` relation.
- A shared capability is one claimed by two or more distinct providers. It is reported as a relation to name between them (one may have grown from the other, or the same intent was explored twice), never as a conflict. Providers are listed distinct and sorted; a provider claiming the same capability through two of its features counts once.

## Behavior

- **Behavior:** Rows are validated at the boundary where a model's reading becomes a row others trust. Objects are strict: an unknown key is refused, because in model-written rows it is far more often a misspelling than a new field.
- **Behavior:** Nothing in this layer reads files, the network or the clock.

## A repository's own capability file

A repository keeps what it provides in `.miadi/capabilities.jsonl`, committed with the code, so whoever clones it knows what it offers with no registry and no Factory.

- The first line says what the file is: `{"schema":"medicine-wheel/repository-capabilities","version":1,"repository":"<owner>/<name>"}`.
- Each other line is one capability: `kind` (`package`, `cli`, `skill`), `name`, `address` (`miadi-capability://<owner>/<repo>/<kind>/<name>`), `statement` when there is one of at most 55 words, `status`, `package` for a CLI (the package that ships it), and the attribution of every row, with `grounding` holding the files that say so, relative to the repository.
- Versions and dependency ranges are not in the file, because every release would make them stale. A reader takes them from each `package.json` at the commit it reads.
- The commit is not in the file, because a committed file cannot name its own commit. A reader adds the commit it read, and the registry's grounding reads `<owner>/<name>@<commit>:<path>`.

**Behaviors.**

- `mw-repomap capabilities scan [<clone>] --write` reads the clone at HEAD from git objects and keeps the file in its working tree. It commits nothing. `--check` writes nothing and exits 1 when the file would change.
- A rescan keeps what a person wrote. A row whose `statedBy` is not `mw-repomap scan` keeps its words and its attribution, and so does a statement added by hand to a row the scan could not state. A row the scan wrote stays as it is while its statement stays the same, and goes back to `pending` when the statement changes. A rescan of unchanged files changes nothing in the file, dates included.
- `mw-repomap capabilities state <kind>/<name> "<statement>" --by <who>` is a person stating a row, held to 55 words. Without a statement it affirms what is there.
- A reader takes the file first and merges it with what the commit's files say by the rule a rescan uses, so a file behind its repository still answers everything the commit provides.
- `mw-repomap capabilities map` goes through clones (named, `--root <dir>`, or `--list <file>`), reads each one's file, or its files when it has none, and answers one map: what each repository provides, and which package consumes which across them. `--out` writes the rows a host reads through `MIADI_REPOSITORY_CAPABILITIES`. A clone that cannot be read is reported and the others are still read.

Ground: William, 2026-11-07 and 2026-11-08, Episode 568's Capability Registry (`miadi-chronicle://568`).

## Creative Advancement Scenario

**Creative Advancement Scenario**: Seeing a capability built twice
**User Intent**: Know which repositories give "draw a specification" before starting a third.
**Current Reality**: Two repositories each have a feature that draws state machines; nothing says they realize the same capability.
**Natural Progression Steps**:
  1. The meta hub's `capabilities.jsonl` names `capability:draw-a-specification` once.
  2. Each owner hub's feature rows say `realizes: capability:draw-a-specification`.
  3. The shared-capability reading names both repositories.
**Achieved Outcome**: The reader sees the two repositories side by side and can write `grew-into` or `consumes` between them.
**Supporting Features**: `CapabilityFacet`, `realizes`, shared capabilities.

## Implementation Evidence Appendix

`@medicine-wheel/capabilities` (`src/capabilities/`): `CapabilityFacet`, `Attribution`, `StatementStatus`, `RevisionState`, `STATEMENT_WORD_LIMIT`, `countWords`, `checkStatement`, `capabilityNodeId`, `CapabilityFacetSchema`, `attributionShape`, `refineAttribution`, `refineStatementPresence`, `capabilityClaims`, `findSharedCapabilities`. Tests: `tests/capabilities.test.ts`.
