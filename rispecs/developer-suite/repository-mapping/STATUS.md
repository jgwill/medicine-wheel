# Repository mapping — status

## Phase one: implemented (suite 0.21.0, 2026-10-18)

| What | Where | Evidence |
|---|---|---|
| Developer kinds `repository`, `feature`, `capability` on `knowledge` nodes; `DeveloperRelation`; developer kinship edges `forked-from`, `grew-into`, `provides`, `realizes`, `consumes` with inverses | `src/ontology-core` | `tests/developer-repository-mapping.test.ts` |
| Capabilities layer: `CapabilityFacet`, attribution on every row, the 55-word limit, shared capabilities | `@medicine-wheel/capabilities` | `tests/capabilities.test.ts` |
| Mapping rows and their schemas, lifecycle state machine, activity and drift, hub checks, meta mapping, projection into the wheel | `@medicine-wheel/developer-repository-mapping` | `tests/developer-repository-mapping.test.ts` |
| Folder I/O, git readings, hub reading from a path or https, read-only web server and page | `@medicine-wheel/developer-repository-mapping/node` | `tests/developer-repository-mapping-node.test.ts` |
| `mw-repomap` CLI: init, validate, list, show, observe, move, hub, serve, wheel | `src/developer-repository-mapping/src/cli.ts` | installed and run from the registry, see the release commit |
| Specs, relational context, four drawings checked with stateloom `check_system` (0 errors, 0 warnings, 3 scenario paths replay) | this folder | `repository-mapping.sys.md` |

No owner hub holds a mapping yet. On 2026-10-18 the four hubs exist on GitHub, public, branch `main`, none with a `.miadi/` folder: `jgwill/jgwill`, `miadisabelle/miadisabelle`, `avadisabelle/avadisabelle`, `guillaumedescoteauxisabelle/guillaumedescoteauxisabelle`.

## Phase two: not done

| Code | What | Why it is not in phase one |
|---|---|---|
| P1 | Run the mapping of the connected repositories, owner by owner, starting with the two reference prototypes (author's desk, the Copilot Workspace recreation). The brief is `.pde/2610182156--872139f0-b71c-4e94-9781-a5546182e3c1/revised-prompt.md`. | A miadiRun launch, on its owner's word. It needs a seat (tmux name) and access to all the repositories. |
| P2 | Write `.miadi/repository-mapping/` into the four hubs (`mw-repomap init`, meta for `jgwill/jgwill`, `owners.jsonl` registering the other three) and push. | Writes into four public repositories. Part of P1, or done alone first. |
| P3 | Seed the meta hub's `capabilities.jsonl` with the platform's capabilities (the prototype seam, infra registration, event following, the review service, stateloom drawing…). | Needs a reading of the platform, which is P1's work. |
| P4 | `@miadi/relational-repository-mapper` in `jgwill/Miadi`: the mapping inside the Miadi app, prototypes linked to their episodes through the inquiry-weave seam. | Another agent is working in `jgwill/Miadi`; it waits for that work to finish. |
| P5 | Put 0.21.0 into production: the ilex wheel (`mw-fw-upgrade.sh`), the kit plugin's `@medicine-wheel/mcp` pin, global installs on other hosts. | Production integration waits for the Miadi agent too. |
| P6 | Register mappings in the wheel: MCP tools `register_repository` / `register_capability` beside `register_service`, deterministic ids, merge on re-register, built on `toWheelNodes` / `toWheelEdges`. | Writing into the live wheel is its owner's act. A data change there is a proposal first. |
| P7 | A statement file inside each repository (`.miadi/statement.json`), read when present. | Writes into every repository. The hub mapping comes first. |
| P8 | What the career-facing hub `guillaumedescoteauxisabelle/guillaumedescoteauxisabelle` shows: a curated subset (maintained repositories, chosen prototypes) rendered into its README from the mapping. | What a recruiter sees is Guillaume's choice. |
| P9 | A direction for `repository` and `feature`. | An ontology revision with its own issue, held for someone who carries that knowledge, like `jgwill/medicine-wheel#113`. |
| P10 | A tracking issue in `jgwill/medicine-wheel` for P1–P9. | Opening an issue needs consent. |
