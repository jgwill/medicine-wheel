# recording-registry — RISE Specification

> A queryable registry of recordings — records and URIs only, never bytes —
> so chronicle surfaces can ask "what was captured for this episode?" without
> touching the device or filesystem that holds the take.

**Version:** 0.1.0
**Package boundary:** `@medicine-wheel/storage-provider` and `@medicine-wheel/app`
**Related producer:** `@miadi/recording` and the gmtermux capture edge
**Related consumer:** `miadisabelle/forgewright` chronicle surfaces
**Vocabulary kin:** `@miadi/episodic-memory-schema` (`ARTIFACT_KINDS`, `ARTIFACT_ORIGINS`, `CaptureProvenance`)

---

## Desired Outcome

A recording made anywhere in the ecosystem — a take captured on a belt device
through gmtermux, a MIDI file derived from it, a melody authored in a
composition folder — is registered into Medicine Wheel as a `RecordingRecord`
and becomes queryable by episode, composition, kind, origin, device, and
filename through the same storage-provider and REST surfaces every other
record family uses.

The registry stores **records and URIs, never bytes**. The bytes stay behind
the capture service that made them: capture is owned by the `@miadi/recording`
package and the gmtermux edge, and this registry holds only the pointer
(`uri`) plus what the capture observed about itself. What the registry adds is
visibility — recordings become queryable for chronicle surfaces (forgewright
episode views) from Medicine Wheel data alone.

## Creative Intent

**What this enables:** A forgewright episode page can list the takes that
belong to its episode — with device, duration, and origin — without scanning a
device, an episode folder, or a capture manifest. A composition surface can
ask for every recording of a slug. A cleanup process can distinguish an
unrepeatable `captured` take from a `derived` render it may rebuild.

**Structural Tension:** Current reality: recordings exist as files behind the
gmtermux capture edge and as manifest entries owned by `@miadi/recording`;
Medicine Wheel — the index chronicle surfaces already read — cannot answer a
single question about them. Desired state: every recording has a registered
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
value arrays (`RECORDING_KINDS`, `RECORDING_ORIGINS`) with types derived from
them, because the gmtermux edge is plain JavaScript and a TypeScript union it
cannot import is a contract it cannot check.

```typescript
const RECORDING_KINDS = ['audio', 'video', 'midi', 'other'] as const;
type RecordingKind = (typeof RECORDING_KINDS)[number];

const RECORDING_ORIGINS = ['captured', 'derived', 'authored'] as const;
type RecordingOrigin = (typeof RECORDING_ORIGINS)[number];

interface RecordingRecord {
  // Upsert key: `recording:<episode_path>:<filename>` when episode-bound,
  // `recording:<filename>` otherwise — recordingRecordId() composes it,
  // mirroring @miadi/inquiry-weave's weaveRecordId.
  id: string;
  filename: string;
  kind: RecordingKind;
  origin: RecordingOrigin;
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

  // Associations
  episode_path?: string;      // episode directory path under the chronicle root
  episode_number?: number;
  composition?: string;       // composition slug
  source_artifact?: string;   // for derived recordings: what this was made from

  registered_at: string;      // first registration's stamp survives upserts
  source?: string;            // origin of registration, e.g. '@miadi/recording', 'gmtermux'
}

interface RecordingFilters {
  episode_path?: string;
  episode_number?: number;
  composition?: string;
  kind?: RecordingKind;
  origin?: RecordingOrigin;
  device?: string;
  filename?: string;
}
```

### Shared semantics (`recording-records.ts`)

Both backends reuse one module so jsonl and neon cannot drift on what a
recording means:

- `recordingRecordId(filename, episodePath?)` — id composition.
- `matchesRecordingFilters(record, filters)` — every provided filter must hold.
- `filterAndOrderRecordings(rows, filters)` — drops rows that did not survive
  the read (an unparseable Postgres payload arrives as null), orders newest
  registration first.
- `mergeRecordingRecords(existing, incoming)` — upsert merge: the incoming
  record wins wherever it speaks, the existing record fills wherever it stays
  silent (a later registration that learned less must not erase provenance an
  earlier one knew), and the first `registered_at` survives.

## API

### Storage surface

`StorageProvider` grows the register/get/list triplet every family carries:

```typescript
registerRecording(record: RecordingRecord): Promise<RecordingRecord>;
getRecording(id: string): Promise<RecordingRecord | null>;
listRecordings(filters?: RecordingFilters): Promise<RecordingRecord[]>;
```

JSONL maps the family to `recordings.jsonl` in the data dir. Neon lazily
ensures a `recordings` table (id + JSONB payload + projected filter columns)
with indexes on `episode_path`, `episode_number`, `composition`, and `kind`;
`scripts/001-create-medicine-wheel-tables.sql` carries the same table.

### REST surface

```text
POST /api/recordings
GET  /api/recordings?episode_path=<path>
GET  /api/recordings?episode_number=<n>
GET  /api/recordings?composition=<slug>
GET  /api/recordings?kind=<audio|video|midi|other>
GET  /api/recordings?origin=<captured|derived|authored>
GET  /api/recordings?device=<name>
GET  /api/recordings?filename=<name>
```

GET answers `{ recordings, provider, count }`, echoing `filters` only when
filtering. An unknown query param — or an unanswerable value like
`?kind=holograph` — is a 400 naming what IS accepted, never a silently
unfiltered payload. POST validates with Zod (filename, kind, origin, and uri
required), derives a missing `id` via `recordingRecordId`, stamps a missing
`registered_at`, preserves unknown future fields, and answers
`{ success, recording, provider }` with 201. Errors answer `{ error }`.

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

### Out of scope

- Capture, upload, playback, or byte storage of any kind — owned by
  `@miadi/recording` and the gmtermux edge.
- MCP tools for recordings (deferred, owned elsewhere).
- New `ontology-core` node kinds — the NodeType enum stays closed.
- Migration of existing capture manifests into the registry.
