/**
 * The open file as the page's address: `?file=<path>&mode=preview|source`.
 *
 * A reload, a shared link and Back all land on the same file because the
 * address carries it. These functions are that rule, with no framework: read a
 * selection from a query string, and write one into an address. Miadi's room
 * and eury's room each wrote them by hand; `useEpisodeFilesAddress` is the
 * React form.
 */

import type { EpisodeFileSelection, FileMode } from "./episode-files.js"

export const FILE_PARAM = "file"
export const MODE_PARAM = "mode"

const isMode = (value: string | null): value is FileMode => value === "preview" || value === "source"

/** The selection a query string names (`?file=&mode=`), or null when it names none. A mode it does not know is dropped. */
export function selectionFromSearch(search: string | URLSearchParams): EpisodeFileSelection | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search
  const path = params.get(FILE_PARAM)
  if (!path) return null
  const mode = params.get(MODE_PARAM)
  return isMode(mode) ? { path, mode } : { path }
}

/** A base for reading a relative href: no scheme a browser fetches, and a folder to strip off again. */
const RELATIVE_BASE = "address:/~/"

/**
 * `href` with the selection written into its query, every other parameter and
 * the fragment kept. `null` removes the file and its mode. The address keeps
 * its form: absolute stays absolute, `/episodes/551` stays rooted, and
 * `551?x=1`, `?x=1` or `#top` stay relative to the page.
 */
export function addressWithSelection(href: string, selection: EpisodeFileSelection | null): string {
  const absolute = /^[a-z][a-z0-9+.-]*:/i.test(href)
  const url = new URL(href, RELATIVE_BASE)
  if (selection) url.searchParams.set(FILE_PARAM, selection.path)
  else url.searchParams.delete(FILE_PARAM)
  if (selection?.mode) url.searchParams.set(MODE_PARAM, selection.mode)
  else url.searchParams.delete(MODE_PARAM)
  if (absolute) return url.href
  const rooted = href.startsWith("/")
  const path = !rooted && url.pathname.startsWith("/~/") ? url.pathname.slice(3) : url.pathname
  return `${path}${url.search}${url.hash}`
}

/**
 * Write the selection into the browser's address: a new history entry when
 * `push` (a person opened another file), otherwise a replacement. Nothing is
 * written when the address already says it.
 */
export function writeSelectionToAddress(selection: EpisodeFileSelection | null, { push }: { push: boolean }): void {
  if (typeof window === "undefined") return
  const next = addressWithSelection(window.location.href, selection)
  if (next === window.location.href) return
  // `null` state, as Next.js's app router documents for its own pushState sync.
  if (push) window.history.pushState(null, "", next)
  else window.history.replaceState(null, "", next)
}
