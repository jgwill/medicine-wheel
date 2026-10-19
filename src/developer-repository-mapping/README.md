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
