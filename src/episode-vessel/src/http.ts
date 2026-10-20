/**
 * `@medicine-wheel/episode-vessel/http` — the vessel file door as Web-standard
 * `Request` → `Response` functions.
 *
 * A host's route handler resolves the episode reference, decides what this
 * caller may do (its capabilities, whether it may read outside the room,
 * whether it may write at all), and hands the rest here. No framework import:
 * a Next.js route, a plain Node server and a test call the same functions.
 *
 * What the door serves, by kind:
 *
 * - text: JSON with the file's content and revision;
 * - document: an attachment with `nosniff`, never inline, because a vessel's
 *   HTML is agent-written and rendered in the host's origin it would carry the
 *   reader's own authority;
 * - image: inline with `nosniff` and `default-src 'none'; sandbox`;
 * - media: the whole file, or one byte range (206), or 416 for a range the
 *   file cannot satisfy.
 *
 * Ceremony notes and capture bundles are outside the room: listed by nobody,
 * and read only by a caller the host lets read outside it.
 */

import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { EpisodeConflictError, EpisodePathError } from "./errors.js"
import {
  fileKind,
  isEpisodeTextEditable,
  listEpisodeFiles,
  readEpisodeText,
  writeEpisodeText,
  type FileKind,
} from "./files.js"
import { listEpisodes, readEpisodeSummary, type EpisodeSummary } from "./manifest.js"
import { parseEpisodeFolder, resolveChronicleRoot, resolveEpisodeFile, type VesselOptions } from "./paths.js"
import type { EpisodeCapabilities } from "./permissions.js"
import { isOutsideTheRoom } from "./room.js"

export const MEDIA_TYPES: Readonly<Record<string, string>> = {
  ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".opus": "audio/opus",
  ".aac": "audio/aac", ".amr": "audio/amr", ".ogg": "audio/ogg", ".mid": "audio/midi",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
}

export const DOCUMENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html", ".htm": "text/html", ".pdf": "application/pdf", ".csv": "text/csv",
  ".svg": "image/svg+xml",
}

export const IMAGE_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".avif": "image/avif",
}

/** A JSON response no cache keeps. */
export function noStoreJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } })
}

/** The answer to a reference nothing on the shelf holds. */
export function episodeNotFoundResponse(ref: string): Response {
  return noStoreJson({ error: "episode_not_found", message: `No episode answers to ${ref}` }, 404)
}

/** Map the vessel's error taxonomy onto HTTP, once. */
export function vesselErrorResponse(error: unknown): Response {
  if (error instanceof EpisodeConflictError) {
    return noStoreJson({ error: error.code, message: error.message, currentRevision: error.currentRevision }, 409)
  }
  if (error instanceof EpisodePathError) {
    if (error.code === "NO_ROOT") {
      // The message names the root on disk; the caller is told only that there is none.
      console.error("[episode-vessel/http]", error)
      return noStoreJson({ error: error.code, message: "No chronicle root is configured on this host." }, 404)
    }
    const status = error.code === "ENOENT" ? 404 : error.code === "EXISTS" ? 409 : 400
    return noStoreJson({ error: error.code, message: error.message }, status)
  }
  // Anything else may carry a path on disk: it is logged here and never sent.
  console.error("[episode-vessel/http]", error)
  return noStoreJson({ error: "vessel_failed", message: "The vessel could not serve this request." }, 500)
}

export interface ResolveEpisodeRefOptions extends VesselOptions {
  /**
   * The shelf, when the host already holds it. Without it a number is resolved
   * by reading the shelf once.
   */
  episodes?: readonly Pick<EpisodeSummary, "episodePath" | "number">[]
}

/**
 * A folder name, a number, or `epNNN` → the episode's folder name. Null when
 * nothing on the shelf answers, when the reference is not decodable, or when
 * two folders claim the number: the chronicle holds such collisions, and an
 * arbitrary pick would open the wrong room.
 */
export function resolveEpisodeRef(ref: string, options: ResolveEpisodeRefOptions = {}): string | null {
  let value: string
  try {
    value = decodeURIComponent(ref ?? "").trim()
  } catch {
    return null
  }
  if (!value) return null

  if (parseEpisodeFolder(value)) {
    // One folder name, never a path: a slash in the slug must not reach the disk.
    if (/[/\\\0]/.test(value)) return null
    if (options.episodes) return options.episodes.some((episode) => episode.episodePath === value) ? value : null
    const candidate = path.join(resolveChronicleRoot(options.root), value)
    try {
      const stat = fs.lstatSync(candidate)
      return stat.isDirectory() && !stat.isSymbolicLink() ? value : null
    } catch {
      return null
    }
  }

  const numeric = /^(?:ep(?:isode)?[-_ ]?)?0*(\d{1,5})$/i.exec(value)
  if (!numeric) return null
  const wanted = Number.parseInt(numeric[1], 10)
  const shelf = options.episodes ?? listEpisodes({ root: options.root })
  const matches = shelf.filter((episode) => episode.number === wanted)
  return matches.length === 1 ? matches[0]!.episodePath : null
}

export interface ListFilesResponseOptions extends VesselOptions {
  /** What this caller is offered; carried in the body for the client to render. */
  capabilities: EpisodeCapabilities
  /** The host's visibility boundary. Defaults to the room: nothing outside it is listed. */
  include?: (relativePath: string, kind: FileKind) => boolean
}

/**
 * GET the listing: names and kinds, never content, with the episode's
 * masthead and the caller's capabilities.
 */
export function listFilesResponse(episode: string, options: ListFilesResponseOptions): Response {
  try {
    const { capabilities, include, ...vessel } = options
    const summary = readEpisodeSummary(episode, vessel)
    const files = listEpisodeFiles(episode, {
      ...vessel,
      include: include ?? ((relativePath) => !isOutsideTheRoom(relativePath)),
    })
    return noStoreJson({
      episode: {
        path: summary.episodePath,
        number: summary.number,
        numberLabel: summary.numberLabel,
        title: summary.title,
        date: summary.date,
      },
      files,
      count: files.length,
      capabilities,
    })
  } catch (error) {
    return vesselErrorResponse(error)
  }
}

/**
 * `Range: bytes=a-b`, `bytes=a-` or `bytes=-n` → the inclusive byte span it
 * asks for, clamped to the file. Null for a header that is malformed, names
 * several ranges, or starts past the end.
 */
export function parseByteRange(header: string | null, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? "")
  if (!match || (!match[1] && !match[2])) return null
  let start: number
  let end: number
  if (!match[1]) {
    const suffix = Number.parseInt(match[2]!, 10)
    if (!Number.isInteger(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number.parseInt(match[1], 10)
    end = match[2] ? Number.parseInt(match[2], 10) : size - 1
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) return null
  return { start, end: Math.min(end, size - 1) }
}

/** RFC 6266: an ASCII `filename` for old clients, the exact name in `filename*`. */
export function attachmentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_")
  const exact = encodeURIComponent(name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${exact}`
}

const streamOf = (file: string, range?: { start: number; end: number }) =>
  Readable.toWeb(fs.createReadStream(file, range)) as ReadableStream<Uint8Array>

/** Where a resolved file sits inside its vessel, judged on disk rather than on its spelling. */
const insideVessel = (dir: string, file: string) => path.relative(dir, file).split(path.sep).join("/")

export interface FileResponseOptions extends VesselOptions {
  /** What this caller is offered; carried with a text file for the client to render. */
  capabilities: EpisodeCapabilities
  /**
   * May this caller read a file outside the room (ceremony notes, capture
   * bundles)? `true` opens both, `false` (the default) neither. A predicate
   * decides per path, for instance `(p) => p.startsWith("captures/")` to serve
   * takes and not ceremony notes; it is asked of the requested path and of the
   * path on disk, and both must pass.
   */
  mayReadOutsideRoom?: boolean | ((relativePath: string) => boolean)
}

/** GET one file of one vessel, by kind. `file` is vessel-relative, already decoded. */
export function fileResponse(request: Request, episode: string, file: string, options: FileResponseOptions): Response {
  try {
    if (!file) return noStoreJson({ error: "no_file", message: "name a file inside the episode" }, 400)
    const { capabilities, mayReadOutsideRoom = false, ...vessel } = options
    const mayRead = (relativePath: string) =>
      !isOutsideTheRoom(relativePath) ||
      (typeof mayReadOutsideRoom === "function" ? mayReadOutsideRoom(relativePath) === true : mayReadOutsideRoom === true)
    const notInTheRoom = () =>
      noStoreJson({ error: "not_in_the_room", message: "Ceremony notes and captures are not part of the episode room." }, 404)
    // Judged on the spelling first, so the answer is the same whether or not
    // the file exists: a caller outside the room learns nothing of what is there.
    if (!mayRead(file)) return notInTheRoom()
    const resolved = resolveEpisodeFile(episode, file, vessel)
    // And again on disk, where a path is what it resolves to.
    if (!mayRead(insideVessel(resolved.dir, resolved.path))) return notInTheRoom()
    const kind = fileKind(resolved.path)
    const extension = path.extname(resolved.path).toLowerCase()

    if (kind === "text") {
      const text = readEpisodeText(episode, file, vessel)
      return noStoreJson({ episode, file, ...text, editable: isEpisodeTextEditable(file), capabilities })
    }

    if (kind === "document") {
      return new Response(streamOf(resolved.path), {
        headers: {
          "content-type": DOCUMENT_TYPES[extension] ?? "application/octet-stream",
          "content-length": String(resolved.stat.size),
          "content-disposition": attachmentDisposition(path.basename(resolved.path)),
          "x-content-type-options": "nosniff",
          "cache-control": "no-store",
        },
      })
    }

    // A raster image cannot run script, so it is shown inline. nosniff holds
    // the browser to the type named here.
    if (kind === "image") {
      return new Response(streamOf(resolved.path), {
        headers: {
          "content-type": IMAGE_TYPES[extension] ?? "application/octet-stream",
          "content-length": String(resolved.stat.size),
          "x-content-type-options": "nosniff",
          "content-security-policy": "default-src 'none'; sandbox",
          "cache-control": "private, max-age=300",
        },
      })
    }

    if (kind !== "media") {
      return noStoreJson({ error: "unreadable_kind", message: "that file is not one this vessel serves" }, 415)
    }

    const size = resolved.stat.size
    const type = MEDIA_TYPES[extension] ?? "application/octet-stream"
    // One `bytes` range is served. Any other unit, or several ranges, is ignored
    // and the whole file sent (RFC 9110 §14.2); one range the file cannot hold is 416.
    const header = request.headers.get("range")
    if (!header || !/^bytes=(?:\d+-\d*|-\d+)$/.test(header.trim())) {
      return new Response(streamOf(resolved.path), {
        headers: {
          "content-type": type,
          "content-length": String(size),
          "accept-ranges": "bytes",
          "cache-control": "private, max-age=60",
        },
      })
    }
    const range = parseByteRange(header.trim(), size)
    if (!range) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } })
    return new Response(streamOf(resolved.path, range), {
      status: 206,
      headers: {
        "content-type": type,
        "content-range": `bytes ${range.start}-${range.end}/${size}`,
        "content-length": String(range.end - range.start + 1),
        "accept-ranges": "bytes",
        "cache-control": "private, max-age=60",
      },
    })
  } catch (error) {
    return vesselErrorResponse(error)
  }
}

export interface WriteTextResponseOptions extends VesselOptions {
  /** What this caller is offered. A write needs `edit`. */
  capabilities: EpisodeCapabilities
  /**
   * The host's write gate: may this request write at all? Separate from the
   * capability, which says whether this person's role may edit.
   */
  mayWrite: boolean
}

/**
 * PUT one text file: `{ content, expectedRevision }` in, the new revision out,
 * or 409 with what is on disk when the file changed since the caller read it.
 */
export async function writeTextResponse(
  request: Request,
  episode: string,
  file: string,
  options: WriteTextResponseOptions,
): Promise<Response> {
  try {
    const { capabilities, mayWrite, ...vessel } = options
    if (!file) return noStoreJson({ error: "no_file", message: "name a file inside the episode" }, 400)
    if (!mayWrite) return noStoreJson({ error: "forbidden", message: "this request may not write" }, 403)
    if (!capabilities.edit) {
      return noStoreJson({ error: "not_permitted", message: "your role does not edit episode files" }, 403)
    }

    let body: { content?: unknown; expectedRevision?: unknown }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return noStoreJson({ error: "invalid_json", message: "request body must be JSON" }, 400)
    }
    if (typeof body?.content !== "string" || typeof body?.expectedRevision !== "string") {
      return noStoreJson({ error: "invalid_body", message: "content and expectedRevision are required" }, 400)
    }

    const written = writeEpisodeText(episode, file, body.content, body.expectedRevision, vessel)
    return noStoreJson({ episode, file, ...written, editable: true, capabilities })
  } catch (error) {
    return vesselErrorResponse(error)
  }
}
