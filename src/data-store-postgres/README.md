# medicine-wheel-data-store-postgres

Minimal PostgreSQL/Neon scaffold for the Medicine Wheel workspace.

What it gives the local agent:
- a workspace package placeholder for a Postgres backend
- a shared `pg` Pool helper
- a typed seam that reuses `ontology-core` records

Convergence note:
- the selected long-term provider abstraction lives in `src/storage-provider`
- this package remains a small Postgres scaffold, not the primary backend-selection surface

What it does not do yet:
- no tables
- no migrations
- no CRUD beyond pool management
- no app wiring
