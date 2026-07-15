# inquiry-weave-registration - RISE Specification

> Spec-only registration contract for storing and serving Inquiry Weave records through Medicine Wheel so Forgewright episode views can render related inquiries from Medicine Wheel data.

**Version:** 0.1.0
**Status:** Spec only
**Package boundary:** `@medicine-wheel/app` and `@medicine-wheel/mcp`
**Related producer:** `@miadi/inquiry-weave`
**Related consumer:** `miadisabelle/forgewright` branch `4-plan-episode-visibility`

---

## Reverse Engineering

### Current Reality

Medicine Wheel already stores and serves chronicle and kinship data. The current storage vocabulary is centered on relational nodes, edges, ceremonies, narrative beats, cycles, structural tension charts, and MMOT records. The application exposes those records through REST routes, and the MCP server can either use local `.mw/store/` JSONL files or delegate to the running Medicine Wheel app when `MW_API_URL` is set.

The Miadi chronicle deployment already has an MCP configuration for this route:

```json
{
  "mcpServers": {
    "medicine-wheel-miadi-chronicle": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "${MWCV}"],
      "env": {
        "MW_API_URL": "http://192.168.2.30:3940"
      }
    }
  }
}
```

Inquiry Weave records do not yet participate in that shared Medicine Wheel surface. Their durable relation metadata exists only as `.weave.yaml` / `weave.yaml` files on disk, owned by the Miadi package `@miadi/inquiry-weave`. That package relates three identities:

- An inquiry artefact under the IAIP inquiry root.
- A GitHub issue written as `owner/repo#N`.
- A chronicle episode path and episode number under `/srv/miadi/episodes/miadi-chronicle/`.

The present Medicine Wheel service can expose kinship and chronicle-adjacent data, but it has no first-class Inquiry Weave record type, no registration surface, and no retrieval surface that Forgewright can call when rendering an episode view.

### Structural Tension

**Current Reality:** Inquiry Weave relation records are package-owned disk metadata. Forgewright can render Medicine Wheel data, but it cannot discover related inquiry artefacts from Medicine Wheel without scanning `.weave.yaml` files or duplicating `@miadi/inquiry-weave` filesystem knowledge.

**Desired State:** Medicine Wheel stores a projection of each Inquiry Weave relation as a queryable `WeaveRecord`, served through the existing app/API/MCP route so Forgewright can render related inquiries for an episode from Medicine Wheel data alone.

The tension resolves by making Medicine Wheel the serving index for Inquiry Weave relations while preserving `@miadi/inquiry-weave` as the owner of `.weave.yaml` authoring and sync semantics.

---

## Intent

Medicine Wheel stores and serves Inquiry Weave records so Forgewright can render them in episode views.

The registration is a projection, not a transfer of authority. Medicine Wheel does not generate inquiry content, rewrite `.weave.yaml`, decide `.hch` legacy policy, or own the IAIP artefact tree. It receives a normalized `WeaveRecord` from the package that owns the weave, persists that record idempotently, and returns it by episode identity for read-side consumers.

The desired user-facing result is simple: when a Forgewright episode page opens, its related inquiries are visible with their artefact identity, GitHub issue anchor, episode relation, and sync freshness, without the UI needing direct filesystem access to IAIP or chronicle metadata files.

---

## Specifications

### WeaveRecord Payload

`WeaveRecord` is the record Medicine Wheel stores and serves. It is the read-side projection exported by `@miadi/inquiry-weave`, not a replacement for `.weave.yaml`.

```typescript
type WeaveSyncState =
  | "never-synced"
  | "in-sync"
  | "stale"
  | "episode-copy-diverged";

interface WeaveRecord {
  id: string;                    // stable upsert key for one artefact-episode relation
  weave: 1;

  artefact: {
    id: string;                  // artefact directory identity
    path?: string;               // optional source path when safe to expose
  };

  issue: string;                 // owner/repo#N, e.g. miadisabelle/Etuaptmumk-RSM#245
  issue_url?: string;

  episode: {
    path: string;                // episode directory path relative to chronicle root
    number: number;
  };

  last_sync: {
    state: WeaveSyncState;
    at?: string;                 // ISO 8601 sync timestamp
    tree_sha256?: string;
    file_count?: number;
    bytes_total?: number;
  };

  source: {
    package: "@miadi/inquiry-weave";
    record_path?: string;        // .weave.yaml or inquiry/weave.yaml source path
    registered_at: string;
    updated_at: string;
  };
}
```

Minimum valid record:

```json
{
  "id": "inquiry-weave:2026-07-13-episode-126-mila-ai-indigenous-gathering:ep126-mila-ai-event-260715-b08218a8-0441-4596-a16e-47483d3ab57c",
  "weave": 1,
  "artefact": {
    "id": "ep126-mila-ai-event-260715-b08218a8-0441-4596-a16e-47483d3ab57c"
  },
  "issue": "miadisabelle/Etuaptmumk-RSM#245",
  "issue_url": "https://github.com/miadisabelle/Etuaptmumk-RSM/issues/245",
  "episode": {
    "path": "2026-07-13-episode-126-mila-ai-indigenous-gathering",
    "number": 126
  },
  "last_sync": {
    "state": "in-sync",
    "at": "2026-07-15T00:00:00Z",
    "tree_sha256": "sha256-of-source-tree",
    "file_count": 4,
    "bytes_total": 341001
  },
  "source": {
    "package": "@miadi/inquiry-weave",
    "record_path": "2026-07-13-episode-126-mila-ai-indigenous-gathering/inquiry/weave.yaml",
    "registered_at": "2026-07-15T00:00:00Z",
    "updated_at": "2026-07-15T00:00:00Z"
  }
}
```

### Storage Surface

Medicine Wheel needs a first-class Inquiry Weave collection. The storage provider should treat `WeaveRecord.id` as an upsert key so repeated registration updates the same relation instead of creating duplicates.

The collection is conceptually `inquiry-weaves`. In JSONL-backed deployments this can map to `.mw/store/inquiry-weaves.jsonl`; in other providers it maps to the provider-equivalent collection or table. The spec does not prescribe implementation mechanics beyond these behavior requirements:

- Persist the complete `WeaveRecord` payload.
- Upsert by `id`.
- Index or filter by `episode.path`, `episode.number`, `issue`, and `artefact.id`.
- Preserve unknown future fields for forward compatibility.
- Store relation metadata only; do not store inquiry content files.

### Retrieval Surface

Medicine Wheel should expose equivalent REST and MCP read paths so Forgewright can choose the transport already used in its episode visibility work.

REST shape:

```text
POST /api/inquiry-weaves
GET  /api/inquiry-weaves?episode_path=<path>
GET  /api/inquiry-weaves?episode_number=<number>
GET  /api/inquiry-weaves?issue=<owner/repo#N>
GET  /api/inquiry-weaves?artefact=<artefact-id>
GET  /api/inquiry-weaves/<id>
```

MCP shape:

```text
register_inquiry_weave(record: WeaveRecord) -> { success, record, provider }
list_inquiry_weaves(filters) -> { count, inquiry_weaves, provider }
get_inquiry_weave(id) -> { record | null, provider }
```

`episode.path` is the authoritative episode filter because episode numbers can be duplicated across chronicle history. `episode.number` remains useful for Forgewright route context, but number-only retrieval should return all matching records rather than silently choosing one episode.

### Acceptance Criteria From Forgewright Read Path

Forgewright's episode view is the acceptance boundary for this Medicine Wheel registration work.

- Given an episode view with `episode.path` and `episode.number`, Forgewright can request Inquiry Weaves from Medicine Wheel and receive every matching `WeaveRecord`.
- Given matching records, Forgewright can render the artefact identity, GitHub issue reference/link, episode path/number, and `last_sync.state` without reading `.weave.yaml`, `.hch`, IAIP artefact directories, or chronicle episode files directly.
- Given no matching records, Medicine Wheel returns an empty collection with `count: 0`, not an error.
- Given the same `WeaveRecord.id` registered more than once, Medicine Wheel updates the existing record and retrieval returns one current record.
- Given a record whose `last_sync.state` is `stale`, `never-synced`, or `episode-copy-diverged`, the state is preserved exactly so Forgewright can render freshness without recomputing sync status.
- Given records for the same episode number but different episode paths, path-filtered retrieval returns only the exact episode path and number-only retrieval returns all matching records.
- Given records with future fields emitted by `@miadi/inquiry-weave`, Medicine Wheel preserves those fields unless a later spec defines a migration.

### Sibling Specs

This spec is the Medicine Wheel side of a three-spec workstream:

- `packages/inquiry-weave/rispecs/medicine-wheel-registration.spec.md` in the Miadi repo specifies the producer side: future `inquiry-weave register`, `WeaveRecord` export from `index.ts`, and the `.hch` fate decision.
- `rispecs/09-inquiry-weave-visibility.spec.md` in `miadisabelle/forgewright` branch `4-plan-episode-visibility` specifies the consumer side: episode views render related Inquiry Weaves from Medicine Wheel data.

---

## Exportation

This file exports a future work contract only. It authorizes no implementation in this change.

The next Medicine Wheel implementation work can use this spec to add the storage provider methods, REST route, MCP tools, tests, and provider-compatible persistence for `WeaveRecord`. The next `@miadi/inquiry-weave` work can use it as the registration target. The next Forgewright work can use it as the read contract for episode visibility.

Out of scope for this spec:

- Implementing the REST route or MCP tools.
- Migrating existing `.weave.yaml` files into Medicine Wheel.
- Changing `@miadi/inquiry-weave` ownership of relation metadata.
- Rewriting chronicle `episode.yaml` files.
- Deciding the long-term fate of `.hch`.
- Rendering the Forgewright UI.
