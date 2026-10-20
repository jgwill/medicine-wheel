/**
 * The ceremony workspace inside a vessel: `ceremonies/<uuid>/`.
 *
 * Guillaume chose this shape on 2026-09-18 (ep349). It was then implemented
 * twice — `gmtermux:web/pixel/episodes/store.js` in JS and
 * `jgwill/Miadi:lib/chronicle-vessel.ts` in TS, the second one saying in its own
 * header that it was copying the first. This module is the single writer.
 *
 * Two files live there:
 *
 * - `notes.md`  — what was said and what remains. Free text, 64 KiB.
 * - `files.json` — which artefacts of THIS vessel the ceremony was held about.
 *
 * The medicine wheel stays the authority on the ceremony record itself; this
 * package never talks to it. The vessel is what survives a wheel that is
 * offline, and it is what travels with the episode folder into git.
 */

import fs from "node:fs"
import path from "node:path"
import { EpisodeConflictError, EpisodePathError, type FileRevision } from "./errors.js"
import { isContained, resolveEpisodeDir, resolveEpisodeFile, type VesselOptions } from "./paths.js"
import { fileKind, revisionOf } from "./files.js"

/**
 * A ceremony id, in either form the wheel actually emits.
 *
 * Measured against the live wheel on 2026-09-19: of the ceremonies it holds,
 * some carry a UUID (`603bfaa1-958d-42a1-bbdf-a25fc2cfdaae`) and some carry a
 * minted id (`ceremony:1789863312388:mgj2x`). gmtermux accepted only the first
 * (`store.js:22`, *"Ceremony must be one Medicine Wheel UUID"*) and Miadi only
 * a loose `/^[a-z0-9:._-]+$/i` (`lib/chronicle-vessel.ts:17`). Taking either
 * one as the law would have made half the wheel's ceremonies unwritable.
 *
 * So: both forms, and the safety that actually matters is that the id becomes
 * a directory name. It may not traverse, hide, or escape.
 */
const CEREMONY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CEREMONY_MINTED = /^ceremony:[0-9a-z]+:[0-9a-z]+$/i
const MAX_CEREMONY_NOTE_BYTES = 64 * 1024
const MAX_ATTACHMENTS = 50

export function assertCeremonyId(value: string): string {
  if (typeof value !== "string" || (!CEREMONY_UUID.test(value) && !CEREMONY_MINTED.test(value))) {
    throw new EpisodePathError(
      "Ceremony must be a Medicine Wheel UUID or a minted ceremony:<time>:<token> id",
      "INVALID_CEREMONY",
    )
  }
  // Belt and braces: the id is about to be a path segment.
  if (value.includes("/") || value.includes("\\") || value.includes("\0") || value.startsWith(".")) {
    throw new EpisodePathError("Ceremony id is not a safe directory name", "INVALID_CEREMONY")
  }
  return value.toLowerCase()
}

interface CeremonyPaths {
  id: string
  episodeDir: string
  directory: string
  notesPath: string
  filesPath: string
  notesRelative: string
  filesRelative: string
}

function ceremonyPaths(episodePath: string, ceremonyId: string, options: VesselOptions = {}): CeremonyPaths {
  const { dir } = resolveEpisodeDir(episodePath, options)
  const id = assertCeremonyId(ceremonyId)
  const directory = path.join(dir, "ceremonies", id)
  return {
    id,
    episodeDir: dir,
    directory,
    notesPath: path.join(directory, "notes.md"),
    filesPath: path.join(directory, "files.json"),
    notesRelative: `ceremonies/${id}/notes.md`,
    filesRelative: `ceremonies/${id}/files.json`,
  }
}

/** Create `ceremonies/<id>/`, proving at each level that it stays in the vessel. */
function ensureCeremonyDirectory(resolved: CeremonyPaths): void {
  const ceremoniesDir = path.dirname(resolved.directory)
  fs.mkdirSync(resolved.directory, { recursive: true })
  for (const directory of [ceremoniesDir, resolved.directory]) {
    const stat = fs.lstatSync(directory)
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new EpisodePathError("Ceremony workspace must be a real episode directory")
    }
    if (!isContained(resolved.episodeDir, fs.realpathSync(directory))) {
      throw new EpisodePathError("Ceremony workspace escapes its episode")
    }
  }
}

/** Write via a sibling temp file and rename, so no reader sees a half file. */
function atomicWrite(directory: string, target: string, content: string, mode = 0o644): void {
  const temporary = path.join(directory, `.${path.basename(target)}-${process.pid}-${Date.now()}.tmp`)
  try {
    fs.writeFileSync(temporary, content, { encoding: "utf8", flag: "wx", mode })
    fs.renameSync(temporary, target)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
}

export interface CeremonyNote {
  ceremonyId: string
  relativePath: string
  content: string
  exists: boolean
  bytes?: number
  updatedAt?: string
  /** Present when the note exists — the guard a later write must carry. */
  revision?: FileRevision
}

export function readCeremonyNote(
  episodePath: string,
  ceremonyId: string,
  options: VesselOptions = {},
): CeremonyNote {
  const resolved = ceremonyPaths(episodePath, ceremonyId, options)
  if (!fs.existsSync(resolved.notesPath)) {
    return { ceremonyId: resolved.id, relativePath: resolved.notesRelative, content: "", exists: false }
  }
  const stat = fs.lstatSync(resolved.notesPath)
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > MAX_CEREMONY_NOTE_BYTES) {
    throw new EpisodePathError("Ceremony note is not a safe readable file")
  }
  const real = fs.realpathSync(resolved.notesPath)
  if (!isContained(resolved.episodeDir, real)) {
    throw new EpisodePathError("Ceremony note escapes its episode")
  }
  const content = fs.readFileSync(real, "utf8")
  return {
    ceremonyId: resolved.id,
    relativePath: resolved.notesRelative,
    content,
    exists: true,
    bytes: stat.size,
    updatedAt: stat.mtime.toISOString(),
    revision: revisionOf(content, stat),
  }
}

/**
 * Seed a ceremony's note when it is opened. Write-once, by design.
 *
 * This is Miadi's verb (`lib/chronicle-vessel.ts`): a minted record of who
 * opened the ceremony, with what intention, in which circle. If the circle has
 * already written into the file, it is NOT overwritten — the reason comes back
 * instead, and a correction goes beside it, never over it.
 */
export function seedCeremonyNote(
  episodePath: string,
  ceremonyId: string,
  markdown: string,
  options: VesselOptions = {},
): { written: boolean; relativePath: string; reason?: string } {
  const resolved = ceremonyPaths(episodePath, ceremonyId, options)
  if (fs.existsSync(resolved.notesPath)) {
    return {
      written: false,
      relativePath: resolved.notesRelative,
      reason: "a note already exists; corrections go beside, never over",
    }
  }
  ensureCeremonyDirectory(resolved)
  atomicWrite(resolved.directory, resolved.notesPath, markdown, 0o600)
  return { written: true, relativePath: resolved.notesRelative }
}

/**
 * Save the circle's working notes.
 *
 * This is gmtermux's verb: a textarea a person edits and saves repeatedly. It
 * overwrites — that is the whole point — but never blindly. Once the file
 * exists, the caller must carry the revision it was shown, exactly as an
 * ordinary vessel text file does. gmtermux's original had no guard, so two
 * people writing notes on the same circle silently lost one of them.
 */
export function writeCeremonyNote(
  episodePath: string,
  ceremonyId: string,
  content: string,
  options: VesselOptions & { expectedRevision?: string } = {},
): CeremonyNote {
  if (typeof content !== "string") throw new EpisodePathError("Ceremony note content must be text")
  if (Buffer.byteLength(content, "utf8") > MAX_CEREMONY_NOTE_BYTES) {
    throw new EpisodePathError("Ceremony note must be 64 KiB or smaller", "TOO_LARGE")
  }
  const resolved = ceremonyPaths(episodePath, ceremonyId, options)

  if (fs.existsSync(resolved.notesPath)) {
    const stat = fs.lstatSync(resolved.notesPath)
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new EpisodePathError("Ceremony note must be a regular file")
    }
    const currentRevision = revisionOf(fs.readFileSync(resolved.notesPath, "utf8"), stat)
    if (!options.expectedRevision) {
      throw new EpisodeConflictError(
        "These notes already exist. Read them and save with their revision, so nobody's writing is lost.",
        currentRevision,
      )
    }
    if (currentRevision.sha256 !== options.expectedRevision.toLowerCase()) {
      throw new EpisodeConflictError(
        "These notes changed since you opened them. Your draft was preserved; reload before saving.",
        currentRevision,
      )
    }
  }

  ensureCeremonyDirectory(resolved)
  atomicWrite(resolved.directory, resolved.notesPath, content, 0o600)
  return readCeremonyNote(episodePath, resolved.id, options)
}

/** One artefact of this vessel, named as having been on the table. */
export interface CeremonyAttachment {
  /** Vessel-relative path, the same string `listEpisodeFiles` returns. */
  relativePath: string
  /** Who attached it — a person id, name, or agent label. The host decides. */
  attachedBy: string
  /** ISO timestamp. */
  attachedAt: string
  /** Optional one line on why it was on the table. */
  note?: string
}

export interface CeremonyFiles {
  ceremonyId: string
  relativePath: string
  attachments: CeremonyAttachment[]
  /** False when nothing has ever been attached. */
  exists: boolean
}

function readAttachments(resolved: CeremonyPaths): CeremonyAttachment[] {
  if (!fs.existsSync(resolved.filesPath)) return []
  const stat = fs.lstatSync(resolved.filesPath)
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new EpisodePathError("Ceremony file list must be a regular file")
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(resolved.filesPath, "utf8"))
  } catch {
    throw new EpisodePathError("Ceremony file list is not valid JSON", "INVALID_JSON")
  }
  const raw = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { attachments?: unknown }).attachments)
      ? (parsed as { attachments: unknown[] }).attachments
      : []
  return raw.filter((item): item is CeremonyAttachment => {
    const candidate = item as CeremonyAttachment
    return Boolean(candidate && typeof candidate.relativePath === "string")
  })
}

export function listCeremonyFiles(
  episodePath: string,
  ceremonyId: string,
  options: VesselOptions = {},
): CeremonyFiles {
  const resolved = ceremonyPaths(episodePath, ceremonyId, options)
  return {
    ceremonyId: resolved.id,
    relativePath: resolved.filesRelative,
    attachments: readAttachments(resolved),
    exists: fs.existsSync(resolved.filesPath),
  }
}

/**
 * Attach an artefact of this vessel to a ceremony held in it.
 *
 * The file must already exist inside the same episode and be of a kind the
 * vessel recognises — a ceremony cannot be told it was held about something
 * that is not there. Attaching twice updates the existing entry rather than
 * growing a second one.
 */
export function attachFileToCeremony(
  episodePath: string,
  ceremonyId: string,
  relativeFile: string,
  attachedBy: string,
  options: VesselOptions & { note?: string } = {},
): CeremonyFiles {
  const resolved = ceremonyPaths(episodePath, ceremonyId, options)
  const file = resolveEpisodeFile(episodePath, relativeFile, options)
  if (!fileKind(file.path)) {
    throw new EpisodePathError("That file is not an artefact this vessel recognises")
  }
  if (relativeFile.startsWith("ceremonies/")) {
    throw new EpisodePathError("A ceremony's own workspace cannot be attached to it")
  }
  if (typeof attachedBy !== "string" || !attachedBy.trim()) {
    throw new EpisodePathError("An attachment must name who made it")
  }

  const attachments = readAttachments(resolved).filter((item) => item.relativePath !== relativeFile)
  if (attachments.length >= MAX_ATTACHMENTS) {
    throw new EpisodePathError(`A ceremony holds at most ${MAX_ATTACHMENTS} attachments`, "TOO_MANY")
  }
  attachments.push({
    relativePath: relativeFile,
    attachedBy: attachedBy.trim().slice(0, 200),
    attachedAt: new Date().toISOString(),
    ...(options.note ? { note: String(options.note).slice(0, 500) } : {}),
  })

  ensureCeremonyDirectory(resolved)
  atomicWrite(
    resolved.directory,
    resolved.filesPath,
    `${JSON.stringify({ ceremony_id: resolved.id, attachments }, null, 2)}\n`,
  )
  return listCeremonyFiles(episodePath, resolved.id, options)
}

export function detachFileFromCeremony(
  episodePath: string,
  ceremonyId: string,
  relativeFile: string,
  options: VesselOptions = {},
): CeremonyFiles {
  const resolved = ceremonyPaths(episodePath, ceremonyId, options)
  const attachments = readAttachments(resolved).filter((item) => item.relativePath !== relativeFile)
  ensureCeremonyDirectory(resolved)
  atomicWrite(
    resolved.directory,
    resolved.filesPath,
    `${JSON.stringify({ ceremony_id: resolved.id, attachments }, null, 2)}\n`,
  )
  return listCeremonyFiles(episodePath, resolved.id, options)
}
