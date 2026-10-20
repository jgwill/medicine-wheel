/**
 * What an episode room shows, and what it does not (jgwill/Miadi#712,
 * jgwill/Miadi#680), stated once for every surface that opens a vessel: the
 * web room, its file routes, `/v`, and the terminal browser.
 *
 * A ceremony's notes (circle, intention, participants) under `ceremonies/` and
 * capture bundles (recordings) under `captures/` are not part of the room. Nor
 * is an Author's Desk under `desk/`: an author's unpublished drafts, their
 * revisions and the crossing they ran stay private until the author puts
 * something behind the story (jgwill/Miadi#780). A listing leaves them out,
 * and a reader who cannot write there is refused them.
 */

import path from "node:path"

export const OUTSIDE_THE_ROOM: readonly string[] = ["captures/", "ceremonies/", "desk/"]

/**
 * Two kinds of file under `captures/` are not recordings, and the room shows
 * them under the episode's own access rules:
 *
 * - a notebook's media, made from the episode's reviews and their public videos
 *   (`captures/notebook-<id>/`, Episode 550, the T6 production pipeline's step 8);
 * - a screenwalk's record (`captures/screenwalk-<id>/screenwalk.json`), which
 *   `GET /api/chronicle/episodes/<ref>/screenwalks` already answers publicly.
 *
 * The transcripts, seat ledgers and audio takes beside them stay outside.
 */
export const IN_THE_ROOM_UNDER_CAPTURES: readonly RegExp[] = [
  /^captures\/notebook-[^/]+\/[^/].*$/,
  /^captures\/screenwalk-[^/]+\/screenwalk\.json$/,
]

/** True for a path, relative to the episode folder, that the room does not show. */
export function isOutsideTheRoom(relativePath: string): boolean {
  // Judge the normalized path: `captures/notebook-x/../screenwalk-y/…` is a screenwalk's file.
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, "/")).replace(/^\.\//, "")
  if (IN_THE_ROOM_UNDER_CAPTURES.some((pattern) => pattern.test(normalized))) return false
  return OUTSIDE_THE_ROOM.some((prefix) => normalized.startsWith(prefix))
}
