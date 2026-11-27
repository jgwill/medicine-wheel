# @medicine-wheel/developer-repository-mapping

Repository mapping for the Medicine Wheel Developer Suite: an owner says what each of
their repositories is, in rows tools can read, and one hub reads the others.

Each owner keeps a folder in the repository named after them:

```
<owner>/<owner>/.miadi/repository-mapping/
  manifest.json        what the folder is: owner, hub, kind (owner | meta)
  repositories.jsonl   lifecycle, purpose and horizon in ≤ 55 words, fields, prototypes, git reading
  features.jsonl       features observed in a repository (a prototype's three core ones)
  capabilities.jsonl   platform capabilities (usually in the meta hub)
  relations.jsonl      forked-from, grew-into, consumes, provides, realizes, field-aligns-with
  owners.jsonl         meta hub only: the hubs it reads
```

Every row says who wrote it, when, from what evidence, and whether a person has read it
since. A row a model writes starts `pending`.

## Install

```bash
npm install -g @medicine-wheel/developer-repository-mapping   # for the mw-repomap CLI
npm install @medicine-wheel/developer-repository-mapping      # for the library
```

Node 19 or later. Depends on `@medicine-wheel/ontology-core`, `@medicine-wheel/capabilities` and `zod`.

## mw-repomap

```bash
mw-repomap init jgwill --owner jgwill --meta          # an empty folder in the jgwill/jgwill clone
mw-repomap observe ~/repos/jgwill/*                    # git readings, one JSON line per clone
mw-repomap observe ~/repos/jgwill/* --dir jgwill --write   # store them on the repository rows
mw-repomap validate jgwill                             # severity file:line node — message; exit 1 on errors
mw-repomap list jgwill --lifecycle prototype --drift drifted
mw-repomap show jgwill/smcraft jgwill
mw-repomap move jgwill/smcraft concretize jgwill --by Guillaume --grounding jgwill/smcraft#12
mw-repomap hub jgwill                                  # every registered hub, read or not
mw-repomap serve jgwill                                # http://127.0.0.1:3967/
mw-repomap wheel jgwill                                # the mapping as wheel nodes and edges
```

A meta hub reads every hub it registers (from a local path, or from GitHub by default)
unless `--local`. `observe --write` and `move` refuse to rewrite a folder while any row
fails to parse. Exit codes: 0 done, 1 errors or a failed read, 2 usage error.

## What a repository provides

Any git repository can keep what it provides in `.miadi/capabilities.jsonl`, committed with its code, so whoever clones it knows what it offers. Nothing else is needed: no account, no registry, no server.

```bash
npx @medicine-wheel/developer-repository-mapping capabilities scan --write   # in a clone: its packages, CLIs, skills, decisions and the apps its file names
git add .miadi/capabilities.jsonl && git commit -m "what this repository provides"

mw-repomap capabilities show <clone>                  # what a clone provides, from its own file first
mw-repomap capabilities state skill/greet "Says hello." --by Ava    # a person states a row (55 words at most)
mw-repomap capabilities scan --check                  # exit 1 when the file is behind the code
mw-repomap capabilities map --root ~/repos --out map.jsonl   # go through clones and answer one map
```

A skill or a decision defined in code rather than in a file of its own is read by a reader written for that repository and that file (`CODE_READERS`): the medicine wheel's `cli/skills.ts`, and Miadi's `packages/connector/src/claude-models.ts`, the decision of which model a mission runs on (`miadi-capability://jgwill/Miadi/decision/miadi.claude_model_routing`). A decision is one row per decision, named and stated by its file.

A rescan keeps what a person wrote and leaves the file alone when nothing changed. Versions come from each `package.json` at the commit read, so a release does not touch the file. A reader skips what a newer format adds and reads the rest; it never reads a row the commit does not provide. A fork keeps the file's repository until `--repository` adopts it. If the repository ignores `*.jsonl`, add `!.miadi/capabilities.jsonl` after that rule.

```bash
mw-repomap capabilities state package/@acme/tool --realizes capability:publish-a-prototype --by Ava   # which platform capability it serves
mw-repomap capabilities state package/@acme/tool --achieves "A team publishes a prototype in one step." --stage released --stage-grounding npm:@acme/tool@1.0.0 --issue acme/tool#12 --by Ava
mw-repomap capabilities state package/@acme/next "Plans the next release." --stage specified --specification rispecs/next.spec.md --by Ava   # written down before any code provides it
mw-repomap capabilities state app/acme-review --path apps/review --stage prototype --stage-grounding apps/AGENTS.md \
  --deployed-by "v0, on Vercel" --hosted-at https://acme-review.example.org --authored-in v0 \
  --change "A v0 prompt in apps/prompts/." --hosting-grounding apps/AGENTS.md --episode miadi-chronicle://340 --by Ava   # an application, where it runs and how a change reaches it
```

An application (`app`) is never guessed: a person names its folder with `--path`, and the scan reads the `package.json` there at every commit while its name is the app's. `hosting` says where a capability runs, who deploys it, where its code is written when not in this repository (`authoredIn`: the copy here is replaced at the next import) and how a change reaches it; `episodes` names the chronicle episodes that hold it. `capabilities show` prints both.

Name a plugin's folder to include it in the inventory. The scanner reads its install manifest and component files from the selected commit. Claude plugin skills retain their existing capability addresses. Agents, commands, hook events and MCP servers have names scoped to their plugin, such as `agent/example/assistant-editor`. A plugin lists its components, and each discovered component names the plugin that carries it.

```bash
mw-repomap capabilities state plugin/example --path claude/example --by Ava \
  --specification rispecs/example/SPEC.md \
  --system rise://acme/tools/rispecs/example/example.sysdf.json
mw-repomap capabilities scan --write
git add .miadi/capabilities.jsonl
```

`--system` accepts a comma-separated list of RISE system addresses on any capability. A revision may be appended with `@<commit>`. Use `--component` to associate additional capability addresses from the same repository with a plugin. `capabilities show` reads the committed inventory and prints the specification, system and component links.

The JSON Schema of a line ships at `schema/repository-capabilities.v4.schema.json`. Version 4 adds plugins, components and systems. Version 3 adds apps, hosting and episodes. Version 2 adds achieves, stage, specifications and issues. Files are written at the lowest version their rows need, and the previous schemas stay published. The format and its rules are in `rispecs/developer-suite/repository-mapping/capabilities.spec.md` of jgwill/medicine-wheel.

## Library

```ts
import { checkMapping, mergeMappings, reconcileLifecycle, transition, toWheelNodes } from '@medicine-wheel/developer-repository-mapping';
import { readHub, readActivity, createMappingServer } from '@medicine-wheel/developer-repository-mapping/node';
```

The main entry is pure: ids, schemas, the lifecycle state machine (`transition`), activity
and drift (`classifyActivity`, `reconcileLifecycle`), JSONL parsing that reports bad lines
by number, `checkMapping`, the meta mapping (`mergeMappings`), `summarize`, and the
projection into the wheel (`toWheelNodes`, `toWheelEdges`). `./node` holds file, git and
HTTP access.

## Lifecycle

`unclassified` → `explore` → `prototype` → `concretize` → `implementation` → `release` →
`maintained`, `archive` from any of them, `reopen` back to `unclassified`. How recently
anyone committed is read from git separately and compared with the declared lifecycle:
`converged`, `drifted`, `unobserved` or `undeclared`. Drift is reported, never corrected.

Spec, drawings and relational context: [`rispecs/developer-suite/repository-mapping/`](https://github.com/jgwill/medicine-wheel/tree/main/rispecs/developer-suite/repository-mapping).
