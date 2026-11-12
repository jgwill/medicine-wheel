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

**Two meanings of capability.** The rows above (`capability:<slug>`, "something the platform can do for someone") are platform capabilities. The rows of a repository's file are what the repository provides: its packages, the commands they ship, its skills (`capability:<kind>-<slug>`). A provided capability says which platform capabilities it serves with `realizes`, and that join is what makes the inventory a map.

**The file, format version 1.** JSON Lines. The JSON Schema of one line ships with the package at `schema/repository-capabilities.v1.schema.json` (`https://unpkg.com/@medicine-wheel/developer-repository-mapping/schema/repository-capabilities.v1.schema.json`); the header's `schema` and `version` name it.

- The first line says what the file is: `{"schema":"medicine-wheel/repository-capabilities","version":1,"repository":"<owner>/<name>"}`.
- Each other line is one capability: `kind` (`package`, `cli`, `skill`), `name`, `address` (`miadi-capability://<repository>/<kind>/<name>`), `statement` when there is one of at most 55 words, `status`, `package` for a CLI (the package that ships it), `realizes` (each entry a platform capability with who said so and when), and the attribution of every row, with `grounding` holding the files that say so, relative to the repository.
- Versions and dependency ranges are not in the file, because every release would make them stale. A reader takes them from each `package.json` at the commit it reads.
- The commit is not in the file, because a committed file cannot name its own commit. A reader adds the commit it read, and the registry's grounding reads `<owner>/<name>@<commit>:<path>`.
- The statement a scan takes from a file is that file's description with each run of whitespace read as one space. A description that is still not printable, is longer than 1200 characters, or is over 55 words gives the row no statement and the status `needs-resolution`. A name, a path or a shipping package that is not printable is reported and not read. The scan and `capabilities state` never write a file their own reader refuses.
- A private package (`"private": true`) is never published, so it is read for what consumes what and not listed as something the repository provides.
- Everything a row holds is printable: no control character, bidirectional control, or line or paragraph separator. Lengths count code points: a name at most 214, a statement at most 1200, an address at most 600, a person's name at most 200. Times are RFC 3339 with their seconds. The header's repository is `owner/name` as an address names it, never ending in `.git`. A row for the same kind and name appears once.

**Readers and writers.**

- A reader of version 1 reads a file of a later version and skips what it does not know (a key, a kind, a header field, a higher version), each said as a warning. A writer of version 1 refuses to rewrite such a file, because the rewrite would lose what it does not know.
- A reader computes each address from the header's repository, the kind and the name, and warns when a row says otherwise.
- A reader reads a row only when the commit provides that capability: a row naming a package, a command or a skill the commit does not hold is the file's claim, reported and never read, so a repository cannot speak for another.
- A fork, a mirror or a remote spelled in another case keeps the repository the file was written for: its addresses stay, and a rescan with unchanged files changes nothing. `--repository <owner/name>` adopts the file for another repository.

**Behaviors.**

- `mw-repomap capabilities scan [<clone>] --write` reads the clone at HEAD from git objects and keeps the file in its working tree. It commits nothing. `--check` writes nothing and exits 1 when the file would change. It refuses to write when a `package.json` it should read is not JSON, because that package's rows would be removed, and it warns when the repository's ignore rules match the file.
- A rescan keeps what a person wrote: a row whose `statedBy` is not `mw-repomap scan` keeps its words, its status and its attribution. A hand edit is a person's when it puts the person's name in `statedBy`; `capabilities state` does that. A row the scan wrote stays as it is while its statement stays the same, and goes back to `pending` when the statement changes or the files stop making one. `realizes` is never the scan's to say and stays through every rescan. A row a person wrote, or one carrying what a person said it realizes, stays in the file when the commit no longer provides it; a reader reports it and does not read it. A rescan of unchanged files changes nothing in the file, dates included.
- `mw-repomap capabilities state <kind>/<name> "<statement>" --by <who>` is a person stating a row, held to 55 words; without a statement it affirms what is there. `--realizes capability:<slug>[,…]` adds what the row serves, each entry signed by `--by`. The scan's own name never signs a statement.
- `mw-repomap capabilities show [<clone>]` reads HEAD, the repository's own file first, merged with what the commit's files say by the rule a rescan uses, so a file behind its repository still answers everything the commit provides.
- `mw-repomap capabilities map` goes through clones (named, `--root <dir>`, or `--list <file>`), reads each one's default branch as last fetched, its file or its files when it has none, and answers one map: what each repository provides, which package consumes which, and what each capability realizes. `--out` writes the rows a host reads through `MIADI_REPOSITORY_CAPABILITIES`, `--packages` the package readings it reads through `MIADI_REPOSITORY_PACKAGES`. Each repository speaks for what it provides: two repositories with a capability of the same kind and name (a fork and its upstream, or one command name in two tools) are two rows with one id, each with its own words and attribution, reported as an id several repositories provide. A package consumes the package of that name in its own repository, else the only repository holding one; when several do and none is its own, the edge is drawn to each and marked ambiguous. A clone or a folder that cannot be read is reported and the others are still read; two names that make one id are reported.
- Each subcommand takes only its own flags. Exit 0 on success and for `--help`, 1 when a file holds an error, a clone or a `--root` cannot be read, or `--check` finds the file behind, 2 for a wrong command or what a person typed that cannot be written (no such row, words that do not fit).

Ground: William, 2026-11-07 and 2026-11-08, Episode 568's Capability Registry (`miadi-chronicle://568`). Revised 2026-11-12 from a verification of those fixes (N1–N7), and 2026-11-11 from a code review and a design review checked against Backstage's descriptor format, Security Insights, publiccode.yml's fork rule, MCP's server.json, the Agent Skills format, purl and JSON Lines.

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
