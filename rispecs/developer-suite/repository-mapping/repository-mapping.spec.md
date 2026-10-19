# Repository mapping

An owner keeps, in one repository named after them (`<owner>/<owner>`), rows that say what each of their repositories is: what it has done, what it might do, which fields of study it stands in, whether it is a prototype or something distributed and maintained, which features it holds, and how it relates to other repositories. One hub, the meta hub (`jgwill/jgwill`), registers the other hubs and reads them where they live. A CLI and a small web page read the rows, so a person, a recruiter or an agent can navigate them without reading 114 READMEs.

## Desired Outcome

Each owner hub holds a mapping that tools validate and a person can browse: every repository classified from evidence, its purpose in at most 55 words, its git activity read and compared with what is declared, a prototype's three core features named, relations to other repositories named with their evidence, and every row marked with who wrote it and whether a person has read it. The meta hub shows all hubs on one page without holding a copy of any of them.

## Current Reality this resolves

Repositories are the owner's own, their agents', or community forks. Many were written with earlier models, and at least a quarter are prototypes. What each one is lives in READMEs of uneven truth, or nowhere. Markdown lists of them cannot be processed by any tool.

## Data

The rows and their links are drawn in `repository-mapping.erdf.json`. All row ids are deterministic, so a second reading of a repository lands on the same row.

### The folder
`<owner>/<owner>/.miadi/repository-mapping/` holds:
- `manifest.json`: `schema` = `medicine-wheel/repository-mapping`, `version` = 1, `owner` (GitHub login), `hub` = `<owner>/<owner>` (anything else is refused), `kind` = `owner` or `meta`, optional `description`. Required; a folder without it is not a mapping.
- `repositories.jsonl`, `features.jsonl`, `capabilities.jsonl`, `relations.jsonl`: one JSON row per line. An absent file is an empty one.
- `owners.jsonl`: meta hubs only.
Rows are written sorted (by node id; relations by `from type to`), keys in a fixed order (identity first, attribution last), so a second writer produces a reviewable diff. `owners.jsonl` keeps the order it was written in, because that is the order hubs are read in. A writer checks every row against its rules before writing anything, and replaces each file whole, so a folder is never left half rewritten or holding a row that would not read back. A file saved with a UTF-8 byte-order mark reads the same as one without.

### Repository
- `nodeId`: `repository:<owner>/<name>`, keeping GitHub's case. GitHub names are case-insensitive, so two ids that differ only in case are one repository. A name of only `.` or `..` is refused. A `knowledge` node with `metadata.kind: 'repository'` and no direction: like a host, it is the ground its features stand on.
- `origin`: `own`, `agent` (a companion's account) or `community-fork`.
- `lifecycle`: `unclassified`, `prototype`, `implementation`, `maintained` (distributed and kept current) or `archived`. Declared, and moved only by the lifecycle events.
- `purpose`: what it is and has done, at most 55 words. Required when `status` is `clear` or `unclear`.
- `horizon`: what it might do, at most 55 words. Optional.
- `status`: of the purpose, the four statement statuses of `capabilities.spec.md`.
- `fields`: `research-field:<slug>` ids, the academic kind the wheel already holds.
- `prototypes`: `prototype:<slug>` ids of the Miadi prototype seam, whose nodes hold the public address; the editing address is never written in a row.
- `holder`: the wheel's `human` or `agent` node for whoever holds it. Optional.
- `observed`: the latest activity reading. Optional.
- Attribution (`capabilities.spec.md`).
A hub holds only its own owner's repositories.

### ActivityReading
A reading of a clone's checked-out branch, taken by someone at a moment: `observedBy`, `observedAt`, `commits`, `commitsLast90Days` (relative to `observedAt`), `firstCommitAt`, `lastCommitAt` (the latest commit date, not the first line of the log), `tags`, `branch`, `head`. Reading never fetches or pulls. Only lines that are commit dates count, so a git configured to show signatures reads the same as one that is not, and a history of any length reads.

### Feature
- `nodeId`: `feature:<owner>/<name>#<kebab-slug>`; the id must name the row's `repository`.
- `repository`, `name`, `statement` (at most 55 words, required when `clear` or `unclear`), `status`, `realizes` (a capability id, optional), attribution.
- The repository must be in the same hub. A prototype is read for its three core features; a fourth is reported as a warning.

### Relation
`from`, `to`, `type`, optional `description` (at most 55 words), attribution. The first five types are governed kinship edges and `field-aligns-with` is the academic relation; endpoints are checked per type. A service is any namespaced node id outside the mapping's own prefixes (`repository:`, `feature:`, `capability:`, `research-field:`, `prototype:`).
| type | joins | inverse reading |
|---|---|---|
| `forked-from` | repository → repository | `forked-into` |
| `grew-into` | repository → repository | `grew-from` |
| `consumes` | repository → repository | `consumed-by` |
| `provides` | repository or service → capability | `provided-by` |
| `realizes` | feature → capability | `realized-by` |
| `field-aligns-with` | repository → research-field | (academic relation) |
A relation never joins a node to itself, and one `from type to` appears once. A relation is its starting repository's owner's word (or the owner of the feature's repository), so it lives in that owner's hub. A feature realizes a capability through its `realizes` field or a `realizes` relation; both count.

### OwnerRegistration
`owner`, `hub` (must be `<owner>/<owner>`), optional `source` (a local path relative to the meta hub's mapping folder, or an http(s) URL of the folder; absent means `https://raw.githubusercontent.com/<hub>/HEAD/.miadi/repository-mapping/`), optional `holder`, `registeredBy`, `registeredAt`. A remote file that takes more than 15 seconds leaves its hub reported unread.

## Behavior

### Lifecycle
Drawn in `repository-lifecycle.smdf.json`. The moves:
| from | event | to |
|---|---|---|
| unclassified | explore | prototype |
| unclassified | implement | implementation |
| unclassified | release | maintained |
| unclassified, prototype, implementation, maintained | archive | archived |
| prototype | concretize | implementation |
| implementation | release | maintained |
| archived | reopen | unclassified |
- **Behavior:** Any other move is refused with the events the state accepts.
- **Behavior:** `concretize` is for the same repository becoming the implementation. When the intent continued in another repository, the prototype keeps its state and a `grew-into` relation says where it went.
- **Behavior:** A move is a new statement: it sets `statedBy` (required), `statedAt` and `revision: pending`, and clears `revisedBy` and `revisedAt`.

### Activity and drift
- **Behavior:** Activity is measured from the reading's own `observedAt`: `active` when the last commit is at most 90 days before it, `quiet` at most 365, `dormant` beyond, `empty` with no commit.
- **Behavior:** The declared lifecycle is compared with the reading. `unobserved`: no reading. `undeclared`: a reading of an `unclassified` repository. `drifted`, only where both cannot be true: `maintained` and `dormant` or `empty`, `archived` and `active`, `prototype` or `implementation` and `empty`. Everything else is `converged`; a quiet maintained package is not drift. Each comparison carries one sentence a person can check.
- **Behavior:** Drift is reported, never corrected automatically.

### Reading and checking a hub
- **Behavior:** JSONL is read line by line. A line that is not JSON, or that fails its row's rules, becomes an error naming the file, line and node id, and the lines around it are still read.
- **Behavior:** Errors: a node id held twice (case folded), a repository of another owner, a relation starting from another owner's repository or feature, owners registered in an owner hub, a feature of a repository the hub does not hold, a relation repeated, a hub registered twice.
- **Behavior:** Warnings: a reference to a repository, feature or capability the hub does not hold (it may live in another hub), a prototype with more than three features.

### The meta mapping
Drawn in `meta-mapping.sqdf.json`.
- **Behavior:** A meta hub reads its own folder, then each registered hub from its source, in `owners.jsonl` order. Nothing is copied into the meta hub.
- **Behavior:** Each hub is checked on its own. A hub that cannot be read, or whose manifest names another hub, is reported and the others are still read.
- **Behavior:** A repository is read only from its owner's hub, and so are its features and the relations starting from it or from its features; such a row found elsewhere is skipped and reported. The first hub (the meta hub) speaks for a capability, and for a relation starting from a service; a different definition elsewhere is reported. Each row keeps the hub it came from.

### Projection into the wheel
- **Behavior:** Repositories, features and capabilities become `knowledge` nodes with `metadata.kind` and the facet's fields; a capability carries direction west. Timestamps come from the row's attribution.
- **Behavior:** Relations become edges named by their type, plus `part-of` (feature → repository), `realizes` (feature → capability), `provides` (each capability provider) and `field-aligns-with` (each field). Obligations come from the kinship registry's defaults. One edge per directional pair; the first is kept.
- **Behavior:** Producing the projection writes nothing. Writing it into a wheel is a separate act by the wheel's owner.

## Screens

### CLI `mw-repomap`
- `init [<hub-dir>] --owner <login> [--meta] [--description <text>]`: makes an empty folder; refuses a folder that holds any mapping file.
- `validate [<path>] [--local] [--json]`: every issue as `severity file:line node — message`, then a count line. Exit 1 on any error.
- `list [<path>] [--lifecycle] [--drift] [--revision] [--field] [--local] [--json]`: one line per repository: id, lifecycle, activity and days, drift, revision, purpose.
- `show <owner/name> [<path>] [--local] [--json]`: a repository with its git comparison, features, relations, evidence, attribution and source hub.
- `observe <clone>... [--dir <path>] [--by <observer>] [--write]`: prints one JSON line per clone; with `--write`, stores the reading on the matching repository row. A clone not in the mapping is reported, not added.
- `move <owner/name> <event> [<path>] --by <who> [--grounding <evidence>]`.
- `hub [<path>] [--json]`: one line per hub read: repositories, errors, warnings, source. Exit 1 when a hub could not be read.
- `serve [<path>] [--port 3967] [--host 127.0.0.1] [--local]`.
- `wheel [<path>] [--local]`: prints the projection.
- **Behavior:** `<path>` is a hub clone holding `.miadi/repository-mapping/` (looked for first, so a clone's own `manifest.json` is never mistaken for a mapping) or a mapping folder, the current directory when absent. A meta hub reads every hub it registers unless `--local`. `<repository>` matches case-insensitively.
- **Behavior:** `observe --write` and `move` rewrite the folder, and refuse while any row fails to parse, because a row that did not parse would not be written back.
- **Behavior:** Each command takes only its own flags; an unknown flag, a flag without a value, or an empty value is a usage error.
- **Behavior:** Exit codes: 0 done, 1 errors or a failed read, 2 usage error.

### Web page
- **Behavior:** `GET /` serves one page with no external script; `GET /api/mapping` serves the merged reading, its summary and every issue; `GET /api/health`. Anything but GET or HEAD answers 405, a request path that does not parse answers 400, and nothing a request sends stops the server. The hub is read again on every request, so rows can change while a person reads.
- **Behavior:** Bound to a loopback address, the server answers only the Host names `localhost`, `127.0.0.1` and `[::1]` (421 otherwise), so a web page that rebinds its own name to the loopback address cannot read the mapping. Bound to another address, it answers every Host.
- **Layout:** A header with the hub and counts (repositories, features, capabilities, relations, drifted, unobserved, pending revision, errors). Tabs: Repositories, Capabilities, Hubs, Issues.
- **Behavior:** Repositories can be searched (purpose, features, ids) and filtered by lifecycle, drift, revision, field and owner. Selecting one opens its detail beside the list (below it on a phone) and puts its id in the address, so a link opens it (a malformed link opens the list): purpose, horizon, git comparison, fields, prototypes, features, relations (linked to the other repositories), evidence, attribution, source hub, and a link to GitHub.
- **Behavior:** Capabilities list every capability defined or claimed, its statement, its providers, and a mark when shared. A capability claimed but defined in no hub read says so.
- **Styling:** Plain, light and dark by the reader's system setting, readable at phone width.

## Creative Advancement Scenarios

**Creative Advancement Scenario**: Mapping one owner
**User Intent**: miadisabelle's repositories stated in rows a person can browse.
**Current Reality**: Clones on a host, READMEs of uneven truth, no hub folder.
**Natural Progression Steps**:
  1. `mw-repomap init` makes the folder in `miadisabelle/miadisabelle`.
  2. `mw-repomap observe <clones>` prints each clone's git reading for the agent to read.
  3. The agent classifies each repository from evidence, states the purpose in 55 words or records `needs-resolution`, names a prototype's three core features, writes relations with their evidence. Every row is `pending`.
  4. `mw-repomap observe <clones> --write` stores each reading on its repository row.
  5. `mw-repomap validate` reports 0 errors.
**Achieved Outcome**: A mapping folder that `list`, `show` and `serve` read.
**Supporting Features**: init, observe, the row rules, validate.

**Creative Advancement Scenario**: One page for every hub
**User Intent**: See every owner's mapping from `jgwill/jgwill`.
**Current Reality**: Owner hubs each hold their own folder.
**Natural Progression Steps**:
  1. `owners.jsonl` in the meta hub registers each hub.
  2. `mw-repomap serve` in `jgwill/jgwill` reads each hub from GitHub on each request.
  3. The page shows the hubs, the drift and the rows pending revision.
**Achieved Outcome**: A person affirms the rows that hold, in the owner hub, and the page shows them affirmed.
**Supporting Features**: the meta mapping, the page, attribution.

## Implementation Evidence Appendix

`@medicine-wheel/developer-repository-mapping` (`src/developer-repository-mapping/`). Pure entry: ids, schemas, `transition`, `classifyActivity`, `reconcileLifecycle`, `parseJsonl`, `readMapping`, `checkMapping`, `mergeMappings`, `summarize`, `toWheelNodes`, `toWheelEdges`. Node entry `./node`: `readMappingDir`, `writeMappingDir`, `initMappingDir`, `findMappingDir`, `readActivity`, `originRepository`, `readMappingSource`, `readHub`, `createMappingServer`. Binary `mw-repomap` (`src/cli.ts`). Tests: `tests/developer-repository-mapping.test.ts`, `tests/developer-repository-mapping-node.test.ts`. Kinds and edges: `DEVELOPER_ENTITY_BINDING`, `DeveloperRelation` and the developer edges of `KINSHIP_EDGE_TYPES` in `src/ontology-core`.
