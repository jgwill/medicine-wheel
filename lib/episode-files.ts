/**
 * An episode's folder, opened from the wheel — read-only.
 *
 * Every `chronicle_episode` node is registered under `chronicle:<folder>` and
 * carries an artefact reference: `metadata.root` names `MIADI_CHRONICLE_ROOT`
 * and `metadata.relative_path` the episode's `episode.yaml` beneath it. The
 * wheel has always recorded where the work is and never opened it, so the
 * Episodes tab could show an episode's name and nothing it contains.
 *
 * The rules for what an episode folder holds and what may be read from it are
 * not written here. They live in `@miadi/episode-vessel`, published from
 * jgwill/Miadi and used by every other surface that opens a vessel — the Miadi
 * room and its file routes, the terminal browser, the phone. A second copy of
 * them here is how two surfaces come to disagree about what is private.
 *
 * Two of those rules decide what the wheel shows. Both are applied as for a
 * visitor, because the wheel has no signed-in reader:
 *
 *  - **the room rule**: `ceremonies/` (a circle's notes and participants) and
 *    `captures/` (recordings) are not part of the room. The listing leaves them
 *    out and a read refuses them.
 *  - **the audience rule**: an episode whose `episode.yaml` says
 *    `audience: community` is closed to a visitor — no listing, no read.
 *
 * So the wheel shows no more of a folder than Miadi's public room already does.
 * Nothing here writes. Ref jgwill/medicine-wheel#153.
 */

import path from "node:path";
import {
  EpisodePathError,
  isOutsideTheRoom,
  listEpisodeFiles,
  parseEpisodeFolder,
  readEpisodeAudience,
  readEpisodeText,
  resolveEpisodeDir,
  resolveEpisodeFile,
  type EpisodeFile,
  type FileRevision,
} from "@miadi/episode-vessel";

export type { EpisodeFile };

export interface EpisodeRootOptions {
  /** The chronicle root. Defaults to `MIADI_CHRONICLE_ROOT`. */
  root?: string;
}

/** Why a folder could not be opened. Each one is a different thing to tell a reader. */
export type EpisodeRoomClosed =
  /** This host was given no chronicle root, or the one it names does not exist. */
  | { state: "no-root" }
  /** The chronicle on this host has no folder by that name. */
  | { state: "absent"; episode_path: string }
  /** The episode is for the community signed in, and the wheel has no signed-in reader. */
  | { state: "community"; episode_path: string };

export type EpisodeRoom =
  | { state: "open"; episode_path: string; files: EpisodeFile[] }
  | EpisodeRoomClosed;

export type EpisodeRoomText =
  | {
      state: "open";
      episode_path: string;
      path: string;
      content: string;
      contentType: string;
      size: number;
      revision: FileRevision;
    }
  /** Under `ceremonies/` or `captures/`: not part of the room. */
  | { state: "outside-the-room"; episode_path: string; path: string }
  | EpisodeRoomClosed;

const ID_PREFIX = "chronicle:";

/**
 * `chronicle:<folder>` → `<folder>`, or null when the id does not name exactly
 * one episode folder.
 *
 * `parseEpisodeFolder` accepts any slug, `/.` included, and `<folder>/.`
 * resolves to the same directory on disk while reading as a different name to
 * the manifest reader — the hole that opened a community room in Miadi
 * (jgwill/Miadi#712). A bare name is this module's own test.
 */
export function episodeFolderOf(id: string): string | null {
  const value = id.trim();
  if (!value.startsWith(ID_PREFIX)) return null;
  const folder = value.slice(ID_PREFIX.length);
  if (!folder || /[\\/]/.test(folder) || folder.startsWith(".")) return null;
  return parseEpisodeFolder(folder) ? folder : null;
}

function rootOf(options: EpisodeRootOptions): string | null {
  const root = options.root ?? process.env.MIADI_CHRONICLE_ROOT;
  return root?.trim() ? root.trim() : null;
}

/** The gate both a listing and a read pass through, in the same order. */
function gate(folder: string, root: string | null): EpisodeRoomClosed | null {
  if (!root) return { state: "no-root" };
  try {
    resolveEpisodeDir(folder, { root });
  } catch (error) {
    if (error instanceof EpisodePathError && error.code === "NO_ROOT") return { state: "no-root" };
    if (error instanceof EpisodePathError && error.code === "ENOENT") {
      return { state: "absent", episode_path: folder };
    }
    throw error;
  }
  if (readEpisodeAudience(folder, { root }) === "community") {
    return { state: "community", episode_path: folder };
  }
  return null;
}

/** The files of one episode's room: everything the vessel lists except what is outside the room. */
export function openEpisodeRoom(folder: string, options: EpisodeRootOptions = {}): EpisodeRoom {
  const root = rootOf(options);
  const closed = gate(folder, root);
  if (closed) return closed;
  const files = listEpisodeFiles(folder, {
    root: root!,
    // Applied before a file consumes the listing cap, so a hundred capture
    // files cannot push an ordinary artefact off the end.
    include: (relativePath) => !isOutsideTheRoom(relativePath),
  });
  return { state: "open", episode_path: folder, files };
}

/**
 * One text file of the room, whole.
 *
 * Throws `EpisodePathError` for what the vessel refuses — an unsafe path
 * (`INVALID_PATH`), a missing file (`ENOENT`), text too large to read whole
 * (`TOO_LARGE`), or a file that is not text. The HTTP edge maps those once.
 */
export function readEpisodeRoomText(
  folder: string,
  relativePath: string,
  options: EpisodeRootOptions = {},
): EpisodeRoomText {
  const root = rootOf(options);
  const closed = gate(folder, root);
  if (closed) return closed;

  // Validates the path (no `.`, `..`, empty or dot-prefixed segment) and
  // refuses a symlinked file, but a linked *directory* partway down still
  // resolves. The room rule is asked of both the name the caller gave and the
  // file it really is, so `notes/<id>/notes.md` through a link to
  // `ceremonies/` cannot read a ceremony's notes under another name.
  const resolved = resolveEpisodeFile(folder, relativePath, { root: root! });
  const real = path.relative(resolved.dir, resolved.path).split(path.sep).join("/");
  if (isOutsideTheRoom(relativePath) || isOutsideTheRoom(real)) {
    return { state: "outside-the-room", episode_path: folder, path: relativePath };
  }

  const text = readEpisodeText(folder, relativePath, { root: root! });
  return {
    state: "open",
    episode_path: folder,
    path: relativePath,
    content: text.content,
    contentType: text.contentType,
    size: text.size,
    revision: text.revision,
  };
}
