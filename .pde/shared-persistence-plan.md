# Shared Persistence Layer — Plan

## Structural Tension
- **Desired Outcome**: A single relational memory where ceremonies, cycles, nodes, edges, beats, and charts created in any interface are queryable from all interfaces
- **Current Reality**: Three isolated in-memory stores (Web UI, MCP, Redis-backed) with zero data sharing. Terminal agents see empty results for data created in the Web UI.

## Strategy: JSON File Persistence (Zero Dependencies)

Replace both in-memory stores with a **shared JSON file** at `data/mw-store.json`. Both the Next.js server and MCP server read/write from the same file on disk.
* At least, the @etc/mcp-config-mw.json or how the MCP config can be configured would have to be adequatly setup with choice of mode (if that is a mode) to use REDIS or to use a JSONL file format (which is not a bad thing, we just need to make sure it is well documented and implementable also when we launch our Web-UI (that it would use the JSONL file when we launch it.)

**Why JSON file over Redis?**
- Zero infrastructure requirement (no Redis server needed for dev)
- Both processes run on the same machine in development
- Immediate visibility: write in one process, read in another
- Trivially inspectable (`cat data/mw-store.json`)
* MIA:: as we added in studying the .mw/ folders, the location of the file for that would be decided for the optimal ways of storing it
- Can migrate to Redis later for production via the existing `src/data-store`

---

## Tasks

### 0. relation of the whole work with `./packages/*`
* All the work done in subsequent task must take into account that we want reusability and flexibility when our communities will want to construct their own app, therefore, all changes and work will have to be, at least, with the RISE framework be part of the next upgrade planned and reflected in the `rispecs/<package spec>` so we can analyze all the work you will do and integrate that into modulable packages.  
* We might have new packages, your work will determine that.

### 1. Create shared file-based persistence module (`lib/shared-store.ts`)
- Single module that both Web UI and MCP server import
- Read JSON file on first access, write on every mutation
- Atomic writes: write to temp file, then rename (prevents corruption)
- File path configurable via `MW_DATA_DIR` env var, defaults to `data/`
- All entity types: nodes, edges, ceremonies, beats, cycles, charts, mmots
- Same API surface as current in-memory stores
- Auto-seed demo data if file doesn't exist

### 2. Rewire Web UI store (`lib/store.ts`) to use shared persistence
- Replace in-memory Maps with calls to shared-store
- Keep the same public API (getAllCeremonies, createCeremony, etc.)
- Seed data writes to file instead of memory
- API routes (app/api/*) unchanged — they already call lib/store functions

### 3. Rewire MCP store (`mcp/src/store.ts`) to use shared persistence
- Replace in-memory InMemoryStore class with file-backed store
- MCP server reads the same `data/mw-store.json`
- All discovery tools (list_ceremonies, list_cycles, etc.) now see Web UI data.  
* Validate that the MCP will be capable to have all create / edit tool for all that data also.
- All integration tools (log_ceremony_with_memory, etc.) write to shared file
- Path resolution: MCP runs from mcp/ dir, so resolve path relative to project root

### 4. Update rispecs (CEREMONIES.md, CYCLES.md, data-store.spec.md)
- Document the shared persistence architecture
- Update data-store.spec.md to reflect JSON-file layer alongside Redis
- CEREMONIES.md: Add persistence behavior (ceremonies survive restarts, visible across interfaces)
- CYCLES.md: Same persistence documentation

### 5. Build MCP server and test end-to-end
- Rebuild mcp/dist from updated sources
- Verify: Create ceremony in Web UI → list_ceremonies via MCP returns it
- Verify: Create cycle via MCP → visible in Web UI
- Verify: Data survives server restart

### 6. Present completion report


----
ADDITIONAL CONSIDERATION to enhance and probably upgrade the whole plan
----

## '.mw/' as a potential location for such JSONL data

* I had agents create manually a .mw/ when they worked, that is not really acceptable but that might give a good start, there is :`/workspace/repos/avadisabelle/ava-claw/.mw/` and `/home/mia/.openclaw/workspace/.mw/` that can be observed.

## Relation to `jgwill/coaia-visualizer` cloned in `/workspace/repos/jgwill/coaia-visualizer/`
* With its Dockerfile, the CLI published with npm, we can run something like 'coaia-visualizer --docker -M <memory file JSONL>' and it starts serving it.
* I dont know if what is in `/workspace/repos/jgwill/coaia-visualizer/mcp` that has the purpose of having an MCP that actually connects to the Web server that is launched with 'coaia-visualizer --docker -M <memory file JSONL>'  therefore give access to local network agents to that service on the port.
* * I think that we can learn from that ways of configuring the work, the idea of having a JSONL about the whole "Medicine-Wheel" app/packages offering gives flexibility and I dont know, you might help here define the values of that.  If I am doing "Ceremonial Technology Development", I can easiely picture myself in the main repo of the project having the main data of the ceremony enabling commit history and reducing the complexity of having to manage a REDIS (or other type of memories which we might want to think about that in our refactoring / enhancement of all packages....

## Github Issues
* Separate your work into adequate github issue and what you edit/create you commit that with the ref issue


