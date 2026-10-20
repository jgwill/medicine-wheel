/**
 * The one place in this package that reaches the network.
 *
 * Both hosts answer the same way: GET a text file returns
 * `{ content, contentType, size, revision }`, PUT `{ content, expectedRevision }`
 * returns the new state or 409 with `currentRevision`. POST of an image's bytes
 * creates it and returns `{ file }`, or 409 when the name is taken. Only the URLs and the
 * credential differ, so the host passes those and nothing else.
 */

import type { EpisodeFilesService, SaveOutcome, UploadOutcome } from "./episode-files.js"
import type { EpisodeFileView, EpisodeTextView, MediaRecordView } from "./types.js"

export interface HttpEpisodeFilesOptions {
  /** Where a text file is read (GET) and written (PUT). */
  fileUrl: (file: EpisodeFileView) => string
  /** Where media and documents are streamed. Defaults to `fileUrl`. */
  mediaUrl?: (file: EpisodeFileView) => string
  /** Extra request headers, read on every call (a token that can change). */
  headers?: () => Record<string, string>
  /**
   * Where a new image is POSTed, its bytes as the body. Omitted, the service
   * has no `upload` and "Add images" is never offered: a host turns uploads on
   * by naming the URL its own route answers.
   */
  uploadUrl?: (relativePath: string) => string
  /** Where an image's record is read (GET) and written (PUT). Omitted, the viewer shows images without records. */
  recordUrl?: (relativePath: string) => string
  /** Where the cover is named (PUT `{ path }`). Omitted, "Use as cover" is never offered. */
  coverUrl?: string
}

function reason(payload: Record<string, unknown>, status: number): string {
  const text = payload.message ?? payload.error
  return typeof text === "string" && text ? text : `HTTP ${status}`
}

async function json(response: Response): Promise<Record<string, unknown>> {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) throw new Error(reason(payload, response.status))
  return payload
}

export function httpEpisodeFiles({
  fileUrl,
  mediaUrl = fileUrl,
  headers,
  uploadUrl,
  recordUrl,
  coverUrl,
}: HttpEpisodeFilesOptions): EpisodeFilesService {
  const recordView = (payload: Record<string, unknown>): MediaRecordView => ({
    record: (payload.record as MediaRecordView["record"]) ?? null,
    revision: typeof payload.revision === "string" ? payload.revision : null,
    credit: typeof payload.credit === "string" ? payload.credit : null,
  })
  const records = recordUrl
    ? {
        readRecord: async (file: EpisodeFileView) =>
          recordView(await json(await fetch(recordUrl(file.relativePath), { headers: headers?.(), cache: "no-store" }))),
        saveRecord: async (file: EpisodeFileView, record: MediaRecordView["record"], expectedRevision: string | null) =>
          recordView(
            await json(
              await fetch(recordUrl(file.relativePath), {
                method: "PUT",
                headers: { "content-type": "application/json", ...headers?.() },
                body: JSON.stringify({ record, expectedRevision }),
              }),
            ),
          ),
      }
    : {}
  const cover = coverUrl
    ? {
        setCover: async (file: EpisodeFileView) => {
          await json(
            await fetch(coverUrl, {
              method: "PUT",
              headers: { "content-type": "application/json", ...headers?.() },
              body: JSON.stringify({ path: file.relativePath }),
            }),
          )
        },
      }
    : {}
  const upload = uploadUrl
    ? async (relativePath: string, image: Blob): Promise<UploadOutcome> => {
        const response = await fetch(uploadUrl(relativePath), {
          method: "POST",
          headers: { "content-type": image.type || "application/octet-stream", ...headers?.() },
          body: image,
        })
        const payload = await response.json().catch(() => ({}))
        if (response.ok && payload.file) return { ok: true, file: payload.file as EpisodeFileView }
        return { ok: false, exists: response.status === 409, message: reason(payload, response.status) }
      }
    : undefined
  return {
    mediaUrl,
    ...(upload ? { upload } : {}),
    ...records,
    ...cover,
    async read(file) {
      const response = await fetch(fileUrl(file), { headers: headers?.(), cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) throw new Error(reason(payload, response.status))
      return payload as EpisodeTextView
    },
    async save(file, content, expectedRevision): Promise<SaveOutcome> {
      const response = await fetch(fileUrl(file), {
        method: "PUT",
        headers: { "content-type": "application/json", ...headers?.() },
        body: JSON.stringify({ content, expectedRevision }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.ok && payload.success !== false) return { ok: true, loaded: payload as EpisodeTextView }
      if (response.status === 409 && payload.currentRevision) {
        return { ok: false, conflict: { currentRevision: payload.currentRevision }, message: payload.message }
      }
      return { ok: false, message: reason(payload, response.status) }
    },
  }
}
