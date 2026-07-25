# @medicine-wheel/data-store-postgres

Minimal PostgreSQL/Neon scaffold for the Medicine Wheel workspace.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

What it gives the local agent:
- a workspace package placeholder for a Postgres backend
- a shared `pg` Pool helper keyed by effective connection options
- a typed seam that reuses `ontology-core` records
- SSL only when explicitly requested via options, connection-string parameters, or `PGSSLMODE=require|verify-ca|verify-full`

Convergence note:
- the selected long-term provider abstraction lives in `src/storage-provider`
- this package remains a small Postgres scaffold, not the primary backend-selection surface

What it does not do yet:
- no tables
- no migrations
- no CRUD beyond pool management
- no app wiring

