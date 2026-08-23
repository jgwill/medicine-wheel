# capture-registry — RISE Specification

> A queryable registry of captures — records and URIs only, never bytes —
> so chronicle surfaces can ask "what was captured for this episode?" without
> touching the device or filesystem that holds the take.

**Version:** 0.2.0 (renamed from recording-registry 0.1.0 under the registry
noun ruling, capture-vocabulary.spec.md §8 — executed before merge, while the
family had zero external consumers)
**Package boundary:** `@medicine-wheel/storage-provider` and `@medicine-wheel/app`
**Related producer:** `@miadi/capture` and the gmtermux capture edge
**Related consumer:** `miadisabelle/forgewright` chronicle surfaces
**Vocabulary kin:** `@miadi/episodic-memory-schema` (`ARTIFACT_KINDS`, `ARTIFACT_ORIGINS`, `CaptureProvenance`)
**Vocabulary law:** `capture-vocabulary.spec.md` (jgwill/Miadi rispecs)

---

## Desired Outcome

A capture made anywhere in the ecosystem — a take captured on a belt device
through gmtermux, a MIDI file derived from it, a melody authored in a
musical-composition folder — is registered into Medicine Wheel as a
`CaptureRecord` and becomes queryable by episode, composition, kind, origin,
device, and filename through the same storage-provider and REST surfaces every
other record family uses.

The registry stores **records and URIs, never bytes**. The bytes stay behind
the capture service that made them: capture is owned by the `@miadi/capture`
package and the gmtermux edge, and this registry holds only the pointer
(`uri`) plus what the capture observed about itself. What the registry adds is
visibility — captures become queryable for chronicle surfaces (forgewright
episode views) from Medicine Wheel data alone.

## Creative Intent

**What this enables:** A forgewright episode page can list the takes that
belong to its episode — with device, duration, and origin — without scanning a
device, an episode folder, or a capture manifest. A composition surface can
ask for every capture of a slug. A cleanup process can distinguish an
unrepeatable `captured` take from a `derived` render it may rebuild.

**Structural Tension:** Current reality: captures exist as files behind the
gmtermux capture edge and as manifest entries owned by `@miadi/capture`;
Medicine Wheel — the index chronicle surfaces already read — cannot answer a
single question about them. Desired state: every capture has a registered
projection in Medicine Wheel, upserted by a stable id, filterable along the
axes consumers actually ask about. The tension resolves by projection, not
transfer of authority: the capture service keeps the bytes and the authoring
semantics, Medicine Wheel becomes the serving index — the same resolution the
inquiry-weave and plan-perspective registrations already established.

## Types

Vocabulary aligns with `@miadi/episodic-memory-schema`'s artifact axes —
`origin` carries the same three values with the same meaning (`captured` is
unrepeatable: a device, an instant, one chance; `derived` is regenerable from
a source still held; `authored` was written rather than captured or generated)
— but nothing is imported across repos. Kinds and origins are published as
value arrays (`CAPTURE_KINDS`, `CAPTURE_ORIGINS`) with types derived from
them, because the gmtermux edge is plain JavaScript and a TypeScript union it
cannot import is a contract it cannot check.

```typescript
const CAPTURE_KINDS = ['audio', 'video', 'midi', 'other'] as const;
type CaptureKind = (typeof CAPTURE_KINDS)[number];

const CAPTURE_ORIGINS = ['captured', 'derived', 'authored'] as const;
type CaptureOrigin = (typeof CAPTURE_ORIGINS)[number];

interface CaptureRecord {
  // Upsert key: `capture:<episode_path>:<filename>` when episode-bound,
  // `capture:<filename>` otherwise — captureRecordId() composes it,
  // mirroring @miadi/inquiry-weave's weaveRecordId. The derived convention
  // applies only when no id is sent; the id assigned at first registration
  // is permanent (capture-vocabulary.spec.md §6).
  id: string;
  filename: string;
  kind: CaptureKind;
  origin: CaptureOrigin;
  // Where the bytes live — a URI or path the capture service answers for.
  uri: string;

  // Capture provenance — observed, not demanded. An absent field is an
  // absence, not an error, and must not be filled in with a guess.
  device?: string;
  started_at?: string;        // ISO 8601
  stopped_at?: string;        // ISO 8601
  duration_seconds?: number;
  bytes?: number;             // a count, never the bytes themselves
  sha256?: string;
  mimetype?: string;

  // Associations — the belonging algebra (capture-vocabulary.spec.md §5):
  // 0, 1, or 2 belongings, at most declared, never demanded. No xor, no
  // refinement. A take with neither belonging is an INBOX take — whole,
  // waiting for a choice, not for a repair.
  episode_path?: string;      // episode directory path under the chronicle root
  episode_number?: number;
  composition?: string;       // musical-composition slug
  source_artifact?: string;   // for derived captures: what this was made from

  registered_at: string;      // first registration's stamp survives upserts
  source?: string;            // origin of registration, e.g. '@miadi/capture', 'gmtermux'
}

interface CaptureFilters {
  episode_path?: string;
  episode_number?: number;
  composition?: string;
  kind?: CaptureKind;
  origin?: CaptureOrigin;
  device?: string;
  filename?: string;
}
```

### Shared semantics (`capture-records.ts`)

Both backends reuse one module so jsonl and neon cannot drift on what a
capture means:

- `captureRecordId(filename, episodePath?)` — id composition.
- `matchesCaptureFilters(record, filters)` — every provided filter must hold.
- `filterAndOrderCaptures(rows, filters)` — drops rows that did not survive
  the read (an unparseable Postgres payload arrives as null), orders newest
  registration first.
- `mergeCaptureRecords(existing, incoming)` — upsert merge: the incoming
  record wins wherever it speaks, the existing record fills wherever it stays
  silent (a later registration that learned less must not erase provenance an
  earlier one knew), and the first `registered_at` survives.

## API

### Storage surface

`StorageProvider` grows the register/get/list triplet every family carries:

```typescript
registerCapture(record: CaptureRecord): Promise<CaptureRecord>;
getCapture(id: string): Promise<CaptureRecord | null>;
listCaptures(filters?: CaptureFilters): Promise<CaptureRecord[]>;
```

JSONL maps the family to `captures.jsonl` in the data dir. Neon lazily
ensures a `captures` table (id + JSONB payload + projected filter columns)
with indexes on `episode_path`, `episode_number`, `composition`, and `kind`;
`scripts/001-create-medicine-wheel-tables.sql` carries the same table.

### REST surface

`/api/captures` is CANONICAL:

```text
POST /api/captures
GET  /api/captures?episode_path=<path>
GET  /api/captures?episode_number=<n>
GET  /api/captures?composition=<slug>
GET  /api/captures?kind=<audio|video|midi|other>
GET  /api/captures?origin=<captured|derived|authored>
GET  /api/captures?device=<name>
GET  /api/captures?filename=<name>
```

GET answers `{ captures, recordings, provider, count }`, echoing `filters`
only when filtering. `recordings` is a DEPRECATED echo of the same array —
forgewright's `fetchRecordingRecords` reads that key fail-closed (a mismatch
lands as silent empty enrichment), and nothing may fail quiet. An unknown
query param — or an unanswerable value like `?kind=holograph` — is a 400
naming what IS accepted, never a silently unfiltered payload. POST validates
with Zod (filename, kind, origin, and uri required), derives a missing `id`
via `captureRecordId`, stamps a missing `registered_at`, preserves unknown
future fields, and answers `{ success, capture, provider }` with 201. Errors
answer `{ error }`.

### Deprecated alias

`/api/recordings` answers as a deprecated alias re-exporting the canonical
handlers — same functions, never a copy, so the paths cannot drift apart.
This is deliberate strangler design for the §8 coupling points. Remove the
alias (and the `recordings` echo key) when forgewright's
`fetchRecordingRecords` targets `/api/captures` (coupling point,
capture-vocabulary.spec.md).

## Quality Criteria

- Registering the same id twice yields one record; provenance known to the
  first registration survives a second that omits it, and `registered_at`
  keeps the first stamp.
- `origin` is never guessed or defaulted: a record without a valid origin is
  refused at the door (400), never stored as `derived`.
- No byte content, blob, or base64 payload is ever stored — `uri` and `bytes`
  (a count) are the only traces of the file's body.
- Filtered listings are exact: an empty result with `count: 0` is a real
  answer, and a filter the route cannot apply is a 400, not a shrug.
- Both backends return identical result sets for identical stores — the shared
  semantics module is the single definition of matching, ordering, and merge.
- Unknown future fields registered by producers survive storage and retrieval.
- The alias and the canonical route serve the same handler objects — verified
  by identity in tests, not by parallel implementations.

### Out of scope

- Capture, upload, playback, or byte storage of any kind — owned by
  `@miadi/capture` and the gmtermux edge.
- MCP tools for captures (deferred, owned elsewhere).
- New `ontology-core` node kinds — the NodeType enum stays closed.
- Migration of existing capture manifests into the registry.
