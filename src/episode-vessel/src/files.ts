/**
 * What is in a vessel, what may be read, and what may be written.
 *
 * ## The extension decision (recorded, not inherited)
 *
 * The two lineages disagreed and the disagreement was invisible until both were
 * measured on the same folder (2026-09-19, ep349):
 *
 * - gmtermux `TEXT_EXTENSIONS` = md, txt, yaml, yml, json
 * - Miadi `app/chronicle/lib/episodeRoom.ts` `TEXT_EXT` = md, txt
 * - neither admitted `.html`, and the three largest artefacts of ep349
 *   (~106 KB of agent-written HTML) appeared on no surface at all
 *
 * This package admits all three groups and separates *readable as text* from
 * *safe to render inline*:
 *
 * - `text` — md, txt, yaml, yml, json. Previewable, and editable unless the
 *   path says otherwise.
 * - `document` — html, htm, pdf, csv. **Listed and downloadable, never
 *   previewed inline and never editable.** A vessel's HTML is written by
 *   agents; serving it into a page's own origin would make every artefact a
 *   script the reader did not ask for. A host that wants to show it does so in
 *   a sandbox of its choosing, deliberately.
 * - `media` — the audio/video/midi set, served by byte range.
 * - `image` — png, jpg, jpeg, webp, gif, avif. Shown inline: a raster image
 *   cannot run script. SVG is not here: it can, so it stays a `document`
 *   (jgwill/Miadi#735).
 *
 * ## AGENTS.md
 *
 * gmtermux hid it; Miadi's episode room listed it first. Hiding a file that
 * exists is the worse error, so it is listed, marked `guidance: true`, and is
 * not editable through a file browser. A surface may de-emphasise it; none has
 * to pretend it is absent.
 */

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { EpisodeConflictError, EpisodePathError, type FileRevision } from "./errors.js"
import { loadVesselIgnore } from "./ignore.js"
import {
  assertRelativeFile,
  isContained,
  resolveEpisodeDir,
  resolveEpisodeFile,
  type VesselOptions,
} from "./paths.js"

export const TEXT_EXTENSIONS = new Set([".md", ".txt", ".yaml", ".yml", ".json"])
export const DOCUMENT_EXTENSIONS = new Set([".html", ".htm", ".pdf", ".csv", ".svg"])
export const MEDIA_EXTENSIONS = new Set([
  ".m4a", ".mp3", ".wav", ".opus", ".aac", ".amr",
  ".mp4", ".webm", ".mov", ".mid", ".ogg",
])
export const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"])

/** The one folder a browser or another host may add images to. */
export const IMAGES_FOLDER = "images"
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024

/** Agent and host instructions that live in a vessel but are not its content. */
export const GUIDANCE_DOCUMENTS = new Set(["AGENTS.md", "CLAUDE.md", "CLAUDE.local.md", "GEMINI.md"])

export const MAX_TEXT_BYTES = 512 * 1024
export const MAX_FILES = 200
export const MAX_DEPTH = 3

export type FileKind = "text" | "document" | "media" | "image"

export interface EpisodeFile {
  relativePath: string
  name: string
  kind: FileKind
  size: number
  modifiedAt: string
  /** Text small enough to read whole. */
  previewable: boolean
  /** May be written through `writeEpisodeText`. */
  editable: boolean
  /** Agent/host instructions rather than episode content. */
  guidance: boolean
}

export function fileKind(filename: string): FileKind | null {
  const extension = path.extname(filename).toLowerCase()
  if (TEXT_EXTENSIONS.has(extension)) return "text"
  if (DOCUMENT_EXTENSIONS.has(extension)) return "document"
  if (MEDIA_EXTENSIONS.has(extension)) return "media"
  if (IMAGE_EXTENSIONS.has(extension)) return "image"
  return null
}

/**
 * The one place that says what a browser may change.
 *
 * Never: the manifest (`episode.yaml` is the vessel's identity), guidance
 * documents, anything under `captures/` (bundles are written by
 * `@miadi/episode-capture` with verified digests) or under `ceremonies/`
 * (those have their own verbs below).
 */
export function isEpisodeTextEditable(relativeFile: string): boolean {
  try {
    assertRelativeFile(relativeFile)
    const parts = relativeFile.split("/")
    const basename = parts[parts.length - 1]
    if (parts[0] === "captures" || parts[0] === "ceremonies") return false
    if (basename === "episode.yaml" || GUIDANCE_DOCUMENTS.has(basename)) return false
    return TEXT_EXTENSIONS.has(path.extname(basename).toLowerCase())
  } catch {
    return false
  }
}

export interface ListFilesOptions extends VesselOptions {
  /**
   * The host's visibility boundary, applied BEFORE a file consumes the listing
   * cap — so a hundred capture files cannot hide an ordinary artefact.
   */
  include?: (relativePath: string, kind: FileKind) => boolean
  maxFiles?: number
  /**
   * Honour `.miadiignore` at the chronicle root and in the vessel (default
   * true). An ignored folder is not walked at all.
   */
  respectIgnore?: boolean
}

export function listEpisodeFiles(episodePath: string, options: ListFilesOptions = {}): EpisodeFile[] {
  const { root, dir } = resolveEpisodeDir(episodePath, options)
  const include = typeof options.include === "function" ? options.include : () => true
  const ignored = options.respectIgnore === false ? () => false : loadVesselIgnore(root, dir)
  const cap = options.maxFiles ?? MAX_FILES
  // Images and media fill their own share, so a folder of two hundred stills
  // walked before `script.md` cannot push the script out of the listing.
  const primary: EpisodeFile[] = []
  const secondary: EpisodeFile[] = []
  const full = () => primary.length >= cap && secondary.length >= cap

  const walk = (current: string, depth: number): void => {
    if (depth > MAX_DEPTH || full()) return
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      if (full() || entry.name.startsWith(".")) continue
      const absolute = path.join(current, entry.name)
      if (entry.isSymbolicLink()) continue
      const relativePath = path.relative(dir, absolute).split(path.sep).join("/")
      if (entry.isDirectory()) {
        if (!ignored(`${relativePath}/`)) walk(absolute, depth + 1)
        continue
      }
      if (!entry.isFile() || entry.name === "episode.yaml") continue
      const kind = fileKind(entry.name)
      if (!kind) continue
      if (ignored(relativePath) || !include(relativePath, kind)) continue
      const share = kind === "image" || kind === "media" ? secondary : primary
      if (share.length >= cap) continue
      const stat = fs.statSync(absolute)
      share.push({
        relativePath,
        name: entry.name,
        kind,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        previewable: kind === "text" && stat.size <= MAX_TEXT_BYTES,
        editable: kind === "text" && isEpisodeTextEditable(relativePath),
        guidance: GUIDANCE_DOCUMENTS.has(entry.name),
      })
    }
  }

  walk(dir, 0)

  // README first, then content, then guidance, then images, then media — the
  // order a reader opening an unfamiliar vessel wants.
  const rank = (file: EpisodeFile): number => {
    if (/(^|\/)README\.md$/i.test(file.relativePath)) return 0
    if (file.guidance) return 3
    if (file.kind === "text") return 1
    if (file.kind === "document") return 2
    if (file.kind === "image") return 4
    return 5
  }
  return [...primary, ...secondary]
    .sort((left, right) => rank(left) - rank(right) || left.relativePath.localeCompare(right.relativePath))
    .slice(0, cap)
}

export interface EpisodeText {
  content: string
  /** The file's extension, lowercased, e.g. `.md`. */
  contentType: string
  size: number
  revision: FileRevision
}

export function revisionOf(content: string, stat: fs.Stats): FileRevision {
  return {
    sha256: crypto.createHash("sha256").update(content, "utf8").digest("hex"),
    modifiedAt: stat.mtime.toISOString(),
    bytes: Buffer.byteLength(content, "utf8"),
  }
}

export function readEpisodeText(
  episodePath: string,
  relativeFile: string,
  options: VesselOptions = {},
): EpisodeText {
  const resolved = resolveEpisodeFile(episodePath, relativeFile, options)
  const kind = fileKind(resolved.path)
  if (kind !== "text") throw new EpisodePathError("Episode file is not readable text")
  if (resolved.stat.size > MAX_TEXT_BYTES) {
    throw new EpisodePathError("Episode text is too large to read whole", "TOO_LARGE")
  }
  const content = fs.readFileSync(resolved.path, "utf8")
  return {
    content,
    contentType: path.extname(relativeFile).toLowerCase(),
    size: resolved.stat.size,
    revision: revisionOf(content, resolved.stat),
  }
}

/**
 * Write text over a file the caller has already read.
 *
 * `expectedRevision` is the sha256 the caller was shown. If the file has moved
 * since, nothing is written and `EpisodeConflictError` carries what is on disk
 * now — the caller still holds the draft, and no version of this function
 * discards it.
 *
 * The write is atomic: a sibling temp file created with `wx`, the revision
 * re-checked, then `rename`. A reader never observes a half-written artefact.
 */
export function writeEpisodeText(
  episodePath: string,
  relativeFile: string,
  content: string,
  expectedRevision: string,
  options: VesselOptions = {},
): EpisodeText {
  if (!isEpisodeTextEditable(relativeFile)) {
    throw new EpisodePathError("Episode file is not editable through the file browser", "NOT_EDITABLE")
  }
  if (typeof content !== "string") throw new EpisodePathError("Episode file content must be text")
  if (Buffer.byteLength(content, "utf8") > MAX_TEXT_BYTES) {
    throw new EpisodePathError("Episode text must be 512 KiB or smaller", "TOO_LARGE")
  }
  if (typeof expectedRevision !== "string" || !/^[0-9a-f]{64}$/i.test(expectedRevision)) {
    throw new EpisodePathError("A valid expected file revision is required", "NO_REVISION")
  }
  if (path.extname(relativeFile).toLowerCase() === ".json") {
    try {
      JSON.parse(content)
    } catch {
      throw new EpisodePathError("JSON must be valid before it can be saved", "INVALID_JSON")
    }
  }

  const resolved = resolveEpisodeFile(episodePath, relativeFile, options)
  if (fileKind(resolved.path) !== "text") throw new EpisodePathError("Episode file is not editable text")
  if (resolved.stat.size > MAX_TEXT_BYTES) {
    throw new EpisodePathError("Episode text is too large to edit", "TOO_LARGE")
  }
  const current = fs.readFileSync(resolved.path, "utf8")
  const currentRevision = revisionOf(current, resolved.stat)
  if (currentRevision.sha256 !== expectedRevision.toLowerCase()) {
    throw new EpisodeConflictError(
      "This file changed on disk. Your draft was preserved; reload before saving.",
      currentRevision,
    )
  }

  const temporary = path.join(
    path.dirname(resolved.path),
    `.${path.basename(resolved.path)}-${process.pid}-${Date.now()}.tmp`,
  )
  try {
    fs.writeFileSync(temporary, content, {
      encoding: "utf8",
      flag: "wx",
      mode: resolved.stat.mode & 0o777,
    })
    const latest = fs.readFileSync(resolved.path, "utf8")
    const latestRevision = revisionOf(latest, fs.statSync(resolved.path))
    if (latestRevision.sha256 !== currentRevision.sha256) {
      throw new EpisodeConflictError(
        "This file changed while saving. Your draft was preserved; reload before saving.",
        latestRevision,
      )
    }
    fs.renameSync(temporary, resolved.path)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
  return readEpisodeText(episodePath, relativeFile, options)
}

/**
 * May a browser or another host add an image at this path?
 *
 * Only under `images/`, at most two folders deep (the listing walks three), with
 * an image extension. Every other file in a vessel is written by its own verb or
 * by an agent working in the folder.
 */
export function isEpisodeImageWritable(relativeFile: string): boolean {
  try {
    assertRelativeFile(relativeFile)
    const parts = relativeFile.split("/")
    if (parts[0] !== IMAGES_FOLDER || parts.length < 2 || parts.length > 3) return false
    return IMAGE_EXTENSIONS.has(path.extname(parts[parts.length - 1]!).toLowerCase())
  } catch {
    return false
  }
}

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end))

/**
 * Do these bytes begin the way an image of this extension begins? A name is
 * a claim; the first bytes are the evidence. A file that says `.png` and is
 * HTML is refused.
 */
export function imageSignatureMatches(bytes: Uint8Array, extension: string): boolean {
  const ext = extension.toLowerCase()
  if (ext === ".png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)
  }
  if (ext === ".jpg" || ext === ".jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (ext === ".gif") return ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))
  if (ext === ".webp") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP"
  if (ext === ".avif") {
    if (ascii(bytes, 4, 8) !== "ftyp") return false
    const boxSize = Math.min(bytes.length, ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0)
    for (let at = 8; at + 4 <= boxSize; at += 4) {
      if (["avif", "avis"].includes(ascii(bytes, at, at + 4))) return true
    }
    return false
  }
  return false
}

/**
 * Add a new image to a vessel. Never replaces one: a name already taken is
 * refused with `EXISTS`, so a second person adding `cover.png` cannot erase
 * the first one's.
 *
 * Atomic and create-only: the bytes go to a sibling temp file, which is then
 * hard-linked to its name. The link fails if the name exists, so no reader sees
 * half an image and no race overwrites one.
 */
/**
 * Create a new file at `relativeFile` inside the vessel, never over an existing
 * one. Each folder on the way is created or must already be a real folder (a
 * symlinked `images/` would carry the write out of the vessel). The bytes go to
 * a sibling temp file that is hard-linked to its name, so the name is claimed
 * atomically, and where it landed is checked after the link.
 */
function createVesselFile(dir: string, relativeFile: string, bytes: Uint8Array | string): string {
  const parts = relativeFile.split("/")
  let folder = dir
  for (const segment of parts.slice(0, -1)) {
    folder = path.join(folder, segment)
    try {
      const stat = fs.lstatSync(folder)
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new EpisodePathError(`${path.relative(dir, folder)} is not a folder of this vessel`, "NOT_WRITABLE")
      }
    } catch (error) {
      if (error instanceof EpisodePathError) throw error
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      try {
        fs.mkdirSync(folder)
      } catch (made) {
        // Another writer made it first: it is checked like any existing folder below.
        if ((made as NodeJS.ErrnoException).code !== "EEXIST") throw made
      }
      const stat = fs.lstatSync(folder)
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new EpisodePathError(`${path.relative(dir, folder)} is not a folder of this vessel`, "NOT_WRITABLE")
      }
    }
  }
  const target = path.join(folder, parts[parts.length - 1]!)
  if (!isContained(dir, fs.realpathSync(folder))) throw new EpisodePathError("Path escapes its vessel")

  const temporary = path.join(folder, `.${parts[parts.length - 1]}-${crypto.randomUUID()}.tmp`)
  try {
    fs.writeFileSync(temporary, bytes, { flag: "wx", mode: 0o644 })
    try {
      fs.linkSync(temporary, target)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new EpisodePathError(`${relativeFile} already exists in this episode`, "EXISTS")
      }
      throw error
    }
    if (!isContained(dir, fs.realpathSync(target))) {
      fs.unlinkSync(target)
      throw new EpisodePathError("Path escapes its vessel")
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
  return target
}

/** The largest record text a vessel accepts beside a media file. */
export const MAX_RECORD_BYTES = 64 * 1024

function assertRecordText(text: unknown): asserts text is string {
  if (typeof text !== "string") throw new EpisodePathError("A record must be text")
  if (Buffer.byteLength(text, "utf8") > MAX_RECORD_BYTES) {
    throw new EpisodePathError("A record must be 64 KiB or smaller", "TOO_LARGE")
  }
}

export interface WriteImageOptions extends VesselOptions {
  /**
   * The text of the record written beside the image, `<image>.yaml`, in the
   * same call. The host serialises it; the vessel holds no YAML.
   */
  recordText?: string
}

export function writeEpisodeImage(
  episodePath: string,
  relativeFile: string,
  bytes: Uint8Array,
  options: WriteImageOptions = {},
): EpisodeFile {
  if (!isEpisodeImageWritable(relativeFile)) {
    throw new EpisodePathError(
      `Images are added under ${IMAGES_FOLDER}/ with one of ${[...IMAGE_EXTENSIONS].join(", ")}`,
      "NOT_WRITABLE",
    )
  }
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    throw new EpisodePathError("The image is empty", "EMPTY")
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new EpisodePathError(`An image must be ${MAX_IMAGE_BYTES / 1024 / 1024} MiB or smaller`, "TOO_LARGE")
  }
  const extension = path.extname(relativeFile).toLowerCase()
  if (!imageSignatureMatches(bytes, extension)) {
    throw new EpisodePathError(`The bytes are not a ${extension.slice(1)} image`, "NOT_AN_IMAGE")
  }
  if (options.recordText !== undefined) assertRecordText(options.recordText)

  const { root, dir } = resolveEpisodeDir(episodePath, options)
  if (loadVesselIgnore(root, dir)(relativeFile)) {
    throw new EpisodePathError("That path is ignored by this vessel", "NOT_WRITABLE")
  }
  const recordFile = `${relativeFile}.yaml`
  // A record left behind by an image that was removed would describe the new one wrongly.
  if (options.recordText !== undefined && fs.existsSync(path.join(dir, ...recordFile.split("/")))) {
    throw new EpisodePathError(`${recordFile} already exists in this episode`, "EXISTS")
  }
  const parts = relativeFile.split("/")
  const target = createVesselFile(dir, relativeFile, bytes)
  if (options.recordText !== undefined) {
    try {
      createVesselFile(dir, recordFile, options.recordText)
    } catch (error) {
      // The image was created by this call: it does not stay without its record.
      fs.unlinkSync(target)
      throw error
    }
  }

  const stat = fs.statSync(target)
  return {
    relativePath: relativeFile,
    name: parts[parts.length - 1]!,
    kind: "image",
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    previewable: false,
    editable: false,
    guidance: false,
  }
}

/**
 * Write the record beside an image under `images/`: `<image>.yaml`. With
 * `expectedRevision` null the record is created and an existing one is never
 * replaced (`EXISTS`); otherwise it is replaced only over the revision the
 * writer was shown, as `writeEpisodeText` does.
 */
export function writeEpisodeMediaRecord(
  episodePath: string,
  mediaFile: string,
  text: string,
  expectedRevision: string | null,
  options: VesselOptions = {},
): EpisodeText {
  assertRelativeFile(mediaFile)
  const parts = mediaFile.split("/")
  if (parts[0] !== IMAGES_FOLDER || fileKind(mediaFile) !== "image") {
    throw new EpisodePathError(`Records are kept beside images under ${IMAGES_FOLDER}/`, "NOT_WRITABLE")
  }
  // The image itself must exist, so a record never describes nothing.
  resolveEpisodeFile(episodePath, mediaFile, options)
  assertRecordText(text)
  const recordFile = `${mediaFile}.yaml`
  if (expectedRevision === null) {
    const { dir } = resolveEpisodeDir(episodePath, options)
    createVesselFile(dir, recordFile, text)
    return readEpisodeText(episodePath, recordFile, options)
  }
  return writeEpisodeText(episodePath, recordFile, text, expectedRevision, options)
}

/**
 * Name an image under `images/` as the episode's cover, or clear it with null.
 * Only the top-level `cover:` line of `episode.yaml` changes; every other line
 * is kept as written. The write is a temp file and a rename.
 */
export function setEpisodeCover(
  episodePath: string,
  mediaFile: string | null,
  options: VesselOptions = {},
): { cover: string | null } {
  if (mediaFile !== null) {
    assertRelativeFile(mediaFile)
    if (mediaFile.split("/")[0] !== IMAGES_FOLDER || fileKind(mediaFile) !== "image") {
      throw new EpisodePathError(`A cover is an image under ${IMAGES_FOLDER}/`, "NOT_WRITABLE")
    }
    resolveEpisodeFile(episodePath, mediaFile, options)
  }
  const { dir } = resolveEpisodeDir(episodePath, options)
  const manifestPath = path.join(dir, "episode.yaml")
  let source: string
  try {
    const stat = fs.lstatSync(manifestPath)
    if (!stat.isFile()) throw new Error("not a file")
    source = fs.readFileSync(manifestPath, "utf8")
  } catch {
    throw new EpisodePathError("This episode has no episode.yaml to name a cover in", "NO_MANIFEST")
  }
  const lines = source.split("\n")
  const at = lines.findIndex((line) => /^cover:/.test(line))
  // A value written over several lines (`cover: >-` then indented lines) is one value.
  let span = 1
  if (at !== -1) while (at + span < lines.length && /^\s+\S/.test(lines[at + span]!)) span++
  // A path is written bare when it is plain, quoted otherwise.
  const value = mediaFile && /^[A-Za-z0-9._/-]+$/.test(mediaFile) ? mediaFile : JSON.stringify(mediaFile)
  if (mediaFile === null) {
    if (at === -1) return { cover: null }
    lines.splice(at, span)
  } else if (at !== -1) {
    lines.splice(at, span, `cover: ${value}`)
  } else {
    if (lines.length && lines[lines.length - 1] === "") lines.splice(lines.length - 1, 0, `cover: ${value}`)
    else lines.push(`cover: ${value}`, "")
  }
  const temporary = path.join(dir, `.episode.yaml-${crypto.randomUUID()}.tmp`)
  try {
    fs.writeFileSync(temporary, lines.join("\n"), { encoding: "utf8", flag: "wx", mode: fs.statSync(manifestPath).mode & 0o777 })
    // Another writer (a lineage edit, a mint) changed the manifest meanwhile: keep theirs, say so.
    if (fs.readFileSync(manifestPath, "utf8") !== source) {
      throw new EpisodeConflictError("episode.yaml changed while the cover was being set. Nothing was written; try again.", revisionOf(fs.readFileSync(manifestPath, "utf8"), fs.statSync(manifestPath)))
    }
    fs.renameSync(temporary, manifestPath)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
  return { cover: mediaFile }
}
