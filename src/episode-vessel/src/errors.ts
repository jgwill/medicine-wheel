/**
 * The error taxonomy an episode vessel raises.
 *
 * Kept as classes with stable `name` and `code` so an HTTP layer can map them
 * without matching on message text. Lifted from
 * `miadisabelle/gmtermux:web/pixel/episodes/store.js`, which is where this law
 * was first written and proven on a phone.
 */

export interface FileRevision {
  sha256: string
  modifiedAt: string
  bytes: number
}

/** A path, name or kind the vessel refuses. Maps to 400/404 at an HTTP edge. */
export class EpisodePathError extends Error {
  readonly code: string

  constructor(message: string, code = "INVALID_PATH") {
    super(message)
    this.name = "EpisodePathError"
    this.code = code
  }
}

/**
 * The file changed under the writer. The caller's draft is never discarded by
 * this package; it hands back the revision that is actually on disk so a
 * surface can say what happened.
 */
export class EpisodeConflictError extends EpisodePathError {
  readonly status = 409
  readonly currentRevision: FileRevision

  constructor(message: string, currentRevision: FileRevision) {
    super(message, "FILE_CHANGED")
    this.name = "EpisodeConflictError"
    this.currentRevision = currentRevision
  }
}
