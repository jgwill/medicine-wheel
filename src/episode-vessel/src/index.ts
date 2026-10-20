/**
 * @medicine-wheel/episode-vessel — the file law of a chronicle episode folder.
 *
 * One implementation of: what an episode folder contains, which of it may be
 * read, which of it may be written, and how a write is guarded. No HTTP, no
 * React, no service URL, no medicine-wheel client — so a phone process
 * (`miadisabelle/gmtermux`), a Next.js route handler (`jgwill/Miadi`) and a
 * test all open the same vessel the same way.
 *
 * Provenance: lifted from `gmtermux:web/pixel/episodes/store.js`, the one place
 * this law had ever been written and proven, and from `Miadi:lib/chronicle-vessel.ts`,
 * which had copied half of it by hand. Ref jgwill/Miadi#644 for the same
 * measurement applied to captures.
 *
 * Role capabilities live at the `./permissions` subpath so a browser bundle can
 * take them without pulling `node:fs` in.
 */

export {
  EpisodePathError,
  EpisodeConflictError,
  type FileRevision,
} from "./errors.js"

export {
  EPISODE_FOLDER,
  configuredChronicleRoot,
  resolveChronicleRoot,
  isContained,
  parseEpisodeFolder,
  assertEpisodePath,
  assertRelativeFile,
  resolveEpisodeDir,
  resolveEpisodeFile,
  type EpisodeFolder,
  type VesselOptions,
  type ResolvedEpisodeDir,
  type ResolvedFile,
} from "./paths.js"

export {
  TEXT_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  MEDIA_EXTENSIONS,
  IMAGE_EXTENSIONS,
  IMAGES_FOLDER,
  MAX_IMAGE_BYTES,
  GUIDANCE_DOCUMENTS,
  MAX_TEXT_BYTES,
  MAX_FILES,
  MAX_DEPTH,
  fileKind,
  isEpisodeTextEditable,
  listEpisodeFiles,
  readEpisodeText,
  writeEpisodeText,
  isEpisodeImageWritable,
  imageSignatureMatches,
  writeEpisodeImage,
  writeEpisodeMediaRecord,
  setEpisodeCover,
  MAX_RECORD_BYTES,
  revisionOf,
  type FileKind,
  type EpisodeFile,
  type EpisodeText,
  type ListFilesOptions,
  type WriteImageOptions,
} from "./files.js"

export {
  assertCeremonyId,
  readCeremonyNote,
  writeCeremonyNote,
  seedCeremonyNote,
  listCeremonyFiles,
  attachFileToCeremony,
  detachFileFromCeremony,
  type CeremonyNote,
  type CeremonyAttachment,
  type CeremonyFiles,
} from "./ceremony.js"

export {
  EPISODE_AUDIENCES,
  audienceOf,
  isEpisodeAudience,
  readEpisodeAudience,
  writeEpisodeAudience,
  type EpisodeAudience,
} from "./audience.js"

export {
  parseEpisodeManifest,
  readEpisodeSummary,
  listEpisodes,
  issueUrl,
  type EpisodeManifest,
  type EpisodeSummary,
} from "./manifest.js"

export { IN_THE_ROOM_UNDER_CAPTURES, OUTSIDE_THE_ROOM, isOutsideTheRoom } from "./room.js"

export {
  MIADI_IGNORE_FILE,
  loadVesselIgnore,
  type VesselIgnore,
} from "./ignore.js"

export {
  MAX_SEARCH_HITS,
  MAX_HIT_LINE_CHARS,
  hasRipgrep,
  searchVessels,
  type SearchEngine,
  type SearchOptions,
  type SearchResult,
  type VesselHit,
} from "./search.js"

export type { EpisodeCapabilities } from "./permissions.js"
