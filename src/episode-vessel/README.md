# @medicine-wheel/episode-vessel

Read and write the files of a Miadi episode folder, safely.

In the Miadi stack, an episode is the folder a piece of work is filed under: the notes,
recordings, reviews and ceremony records that belong to it. This package holds the rules for
that folder: what it contains, what may be read, what may be written, and how a write is kept
from overwriting someone else's. It has no HTTP, no React and no service URL, so a phone
process, a Next.js route handler and a test open an episode the same way.

Works with:

- `@medicine-wheel/episode-ui`: the browser workspace for an episode's files, built on this package.
- `@miadi/episode-capture`: writes the `captures/` part of the folder, which this package
  lists but never edits.

## Where it lives

Up to 0.4.3 (jgwill/Miadi e4e1b141) this package was `@miadi/episode-vessel`, published from jgwill/Miadi. It moved to
jgwill/medicine-wheel in 0.25.0 so that dependencies run one way: the medicine-wheel suite is
the foundation, and Miadi consumes it. From 0.5.0, `@miadi/episode-vessel` re-exports this package with the
same entry points, so code that imports it keeps working. Ref jgwill/medicine-wheel#166.

```bash
npm i @medicine-wheel/episode-vessel
```

```js
import { listEpisodeFiles, readEpisodeText, writeEpisodeText, writeEpisodeImage } from "@medicine-wheel/episode-vessel"

// Episodes live under MIADI_CHRONICLE_ROOT, or pass { root }
const files = listEpisodeFiles("2026-09-17-episode-349-miadi-conducts-a-ceremony-its-circle-can-enter")
const note = readEpisodeText(episode, "review-claude-1-260918.md")
writeEpisodeText(episode, "review-claude-1-260918.md", edited, note.revision.sha256)
writeEpisodeImage(episode, "images/still-01.png", pngBytes)
```

The build is ESM. `require()` of it works on Node 24.

## What it guarantees

- **Containment.** An episode is one folder name directly beneath the chronicle
  root — never a path, never a traversal, never a symlink. A file inside it is a
  relative path with no `.`, `..` or dot-prefixed segment, with no symlink at any
  segment (a linked folder is refused as a linked file is), resolving to a real
  file still inside that folder.
- **A bounded listing.** Depth 3, 200 files, dotfiles and `episode.yaml`
  excluded. The host's `include(relativePath, kind)` hook runs *before* a file
  consumes the cap, so a hundred capture files cannot hide one artefact.
- **No lost write.** `writeEpisodeText` takes the sha256 the caller was shown.
  If the file moved, nothing is written and `EpisodeConflictError` carries the
  revision on disk. The write itself is a temp file created with `wx`, the
  revision re-checked, then `rename` — a reader never sees half a file.
- **An image is added, never replaced.** `writeEpisodeImage` writes only under
  `images/` (one sub-folder allowed), refuses a name already taken (`EXISTS`),
  refuses bytes that do not begin like the image their extension names
  (`NOT_AN_IMAGE`), and caps an image at 25 MiB. The bytes are hard-linked into
  place from a temp file, so the name is claimed atomically. `recordText` writes
  the record beside it (`<image>.yaml`) in the same call.
- **A record beside each image.** `writeEpisodeMediaRecord` creates `<image>.yaml`
  (never over an existing one) or replaces it over the revision the writer was
  shown. The host serialises the text; this package holds no YAML.
- **One line for the cover.** `setEpisodeCover` names an image under `images/`
  as `cover:` in `episode.yaml`, or clears it, and changes no other line.
  `readEpisodeSummary` returns it as `cover`.
- **What an episode came from.** `readEpisodeSummary` returns `references`
  (`issue_refs` then `references`, each item once) and `sourcePaths`
  (`source_paths`) from `episode.yaml`, block or flow lists, quoted items folded
  over several lines as YAML folds them. `issueUrl("owner/repo#n")` gives the
  GitHub issue URL, and null for any other reference.

## Kinds

| kind | extensions | previewed | editable |
|---|---|---|---|
| `text` | md, txt, yaml, yml, json | yes, to 512 KiB | yes, unless the path says otherwise |
| `document` | html, htm, pdf, csv, svg | **no** | no |
| `media` | m4a mp3 wav opus aac amr mp4 webm mov mid ogg | by byte range, by the host | no |
| `image` | png jpg jpeg webp gif avif | inline, by the host | no; added with `writeEpisodeImage` |

`document` is listed and downloadable but never rendered inline. A vessel's HTML
is written by agents; serving it into a page's own origin would make every
artefact a script the reader did not ask for. A host that wants to show it does
so in a sandbox of its own choosing, deliberately. SVG is a `document` for the
same reason: it can carry script. A raster `image` cannot, so a host may show it
inline.

Never editable through a browser: `episode.yaml` (the vessel's identity),
guidance documents (`AGENTS.md`, `CLAUDE.md`, …), anything under `captures/`
(bundles carry verified digests — that is `@miadi/episode-capture`'s work) and
anything under `ceremonies/` (which has its own verbs).

Guidance documents **are** listed, marked `guidance: true`. Hiding a file that
exists is the worse error.

## Ceremonies

`ceremonies/<id>/` holds two files, and the two verbs that write `notes.md` are
different on purpose:

- `seedCeremonyNote` — write-once. The minted record of who opened the ceremony.
  If the circle has already written, it is not overwritten; the reason comes
  back and a correction goes beside it.
- `writeCeremonyNote(content, { expectedRevision })` — the circle's working
  notes, overwritten under the same guard as any other text file.

`listCeremonyFiles` / `attachFileToCeremony` / `detachFileFromCeremony` keep
`files.json`: which artefacts of this vessel the ceremony was held about. The
file must already exist in the same vessel — a ceremony cannot be told it was
held about something that is not there.

A ceremony id is either form the wheel emits: a UUID
(`603bfaa1-958d-42a1-bbdf-a25fc2cfdaae`) or a minted id
(`ceremony:1789863312388:mgj2x`). Both are accepted.

## Permissions

`@medicine-wheel/episode-vessel/permissions` is a role → capability map as plain data. No
identity, no token, no session, no dependency.

```js
import { capabilitiesFor } from "@medicine-wheel/episode-vessel/permissions"
const can = capabilitiesFor(person.role, { grants: communityConfig.role_grants })
```

**The capability object decides what is offered. The host's gate decides what is
allowed.** A surface rendering an edit button for a role without `edit` is a
bug; a route writing because the client claimed a capability is a
vulnerability. Both checks exist and neither replaces the other.

## The file door over HTTP

`@medicine-wheel/episode-vessel/http` serves a vessel's files as Web-standard `Request` →
`Response` functions, with no framework import. The host resolves who is asking and
passes the answer in. The door applies the rules.

```ts
import { ANONYMOUS_CAPABILITIES } from "@medicine-wheel/episode-vessel/permissions"
import { episodeNotFoundResponse, fileResponse, listFilesResponse, resolveEpisodeRef } from "@medicine-wheel/episode-vessel/http"

// GET /episodes/:ref/files
const episode = resolveEpisodeRef(ref, { root })          // folder, number or epNNN
if (!episode) return episodeNotFoundResponse(ref)
return listFilesResponse(episode, { root, capabilities: ANONYMOUS_CAPABILITIES })

// GET /episodes/:ref/files/*path
return fileResponse(request, episode, file, { root, capabilities, mayReadOutsideRoom: false })
```

- `resolveEpisodeRef` returns null for a number two folders claim, and for a folder that
  does not exist. Pass `{ episodes }` when the host already holds the shelf.
- `listFilesResponse` lists the room: `ceremonies/` and `captures/` are left out unless
  the host passes its own `include`.
- `fileResponse` answers by kind. Text is JSON with its revision and `editable`. A
  document is an attachment with `nosniff`, never inline, under its exact name
  (`filename*`) with an ASCII fallback. An image is inline with `nosniff` and
  `content-security-policy: default-src 'none'; sandbox`. Media is the whole file, one
  `bytes` range (206), or 416 for a range the file cannot hold; any other unit, or
  several ranges, gets the whole file. Ceremony notes and captures are 404 unless
  `mayReadOutsideRoom` allows them, with the same answer whether or not the file
  exists. `mayReadOutsideRoom` is `true`, `false`, or a predicate asked of the
  requested path and of the path on disk, such as `(p) => p.startsWith("captures/")`
  to serve takes and not ceremony notes.
- `writeTextResponse(request, episode, file, { root, capabilities, mayWrite })` takes
  `{ content, expectedRevision }`. It needs both the host's gate (`mayWrite`) and the
  `edit` capability, and answers 409 with the revision on disk when the file changed.
- `vesselErrorResponse(error)` maps `EpisodePathError` and `EpisodeConflictError` to
  404, 409 or 400. Any other error is 500 with a fixed message, logged on the server, so
  no path on disk reaches the caller. `parseByteRange`, `attachmentDisposition`,
  `MEDIA_TYPES`, `DOCUMENT_TYPES` and `IMAGE_TYPES` are exported for hosts that serve
  more than this.

## Search and `.miadiignore`

`searchVessels(query, { root, limit, engine, episodes })` finds literal text,
case-insensitive, across every vessel's text files (the same extensions and
512 KiB cap as `listEpisodeFiles`). It uses `rg` when it is on PATH and a Node
walk otherwise. Both walk in the same order, so a capped result is the same
first N hits from either one.

```ts
const { hits, truncated, engine } = await searchVessels("talking circle", { root })
// hits: [{ episodePath, file, line, text }]
```

A `.miadiignore` at the chronicle root, and optionally one inside a vessel,
hides paths from `listEpisodeFiles` and `searchVessels`. Same syntax as
`.gitignore`. The root file is matched against `<episode>/<path>`, a vessel's
own file against the path inside it. An ignored file still opens when it is
asked for by name. `listEpisodeFiles(ep, { respectIgnore: false })` shows
everything.

## Configuration

| variable | used for |
|---|---|
| `MIADI_CHRONICLE_ROOT` | the folder that holds the episode folders. Every verb that opens an episode also takes `{ root }`. With neither, it throws `EpisodePathError` (`NO_ROOT`). |
