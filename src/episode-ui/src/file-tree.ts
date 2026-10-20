/**
 * The folders of an episode, read from the flat list the vessel returns.
 *
 * `listEpisodeFiles` hands over files, each with the path it sits at, and no
 * folders. The workspace used to print those paths one under another, so a
 * reader could not tell which folder a file was in without reading every
 * path. This builds the folders back from the paths, so a host can draw them.
 *
 * No I/O, no DOM, no framework: gmtermux's no-bundler page and Miadi's React
 * app draw the same tree from the same function.
 *
 * Order, at every level:
 *
 *  1. a `README.md`, as the vessel lists it first;
 *  2. the folders, by name;
 *  3. the files, in the vessel's own order (text, documents, guidance, images,
 *     media), then by name.
 *
 * Names compare numerically, so `chapter-2` comes before `chapter-10`.
 */

import type { EpisodeFileView } from "./types.js"

export interface FileTreeFile {
  type: "file"
  /** The last segment of the path. */
  name: string
  /** The path from the episode root, the same string the vessel lists. */
  path: string
  file: EpisodeFileView
}

export interface FileTreeFolder {
  type: "folder"
  /** The last segment of the path. Empty for the root. */
  name: string
  /** The path from the episode root. Empty for the root. */
  path: string
  children: FileTreeNode[]
  /** Every file beneath this folder, at any depth. */
  fileCount: number
}

export type FileTreeNode = FileTreeFile | FileTreeFolder

const compareNames = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }) || (left < right ? -1 : left > right ? 1 : 0)

/** The vessel's own order: README, text, documents, guidance, images, media. */
function rank(file: EpisodeFileView): number {
  if (/^README\.md$/i.test(file.name)) return 0
  if (file.guidance) return 3
  if (file.kind === "text") return 1
  if (file.kind === "document") return 2
  if (file.kind === "image") return 4
  return 5
}

function order(folder: FileTreeFolder): void {
  const folders = folder.children.filter((node): node is FileTreeFolder => node.type === "folder")
  const files = folder.children.filter((node): node is FileTreeFile => node.type === "file")
  folders.sort((left, right) => compareNames(left.name, right.name))
  files.sort((left, right) => rank(left.file) - rank(right.file) || compareNames(left.name, right.name))
  const readmes = files.filter((node) => rank(node.file) === 0)
  folder.children = [...readmes, ...folders, ...files.filter((node) => rank(node.file) !== 0)]
  for (const child of folders) order(child)
}

/**
 * Group `files` into folders by path. A path listed twice is kept once. A
 * folder exists only because a file is beneath it: an empty folder is not
 * listed by the vessel, so it is not drawn.
 */
export function buildFileTree(files: readonly EpisodeFileView[]): FileTreeFolder {
  const root: FileTreeFolder = { type: "folder", name: "", path: "", children: [], fileCount: 0 }
  const folders = new Map<string, FileTreeFolder>([["", root]])
  const seen = new Set<string>()

  const folderAt = (path: string): FileTreeFolder => {
    const known = folders.get(path)
    if (known) return known
    const cut = path.lastIndexOf("/")
    const parent = folderAt(cut === -1 ? "" : path.slice(0, cut))
    const created: FileTreeFolder = {
      type: "folder",
      name: cut === -1 ? path : path.slice(cut + 1),
      path,
      children: [],
      fileCount: 0,
    }
    folders.set(path, created)
    parent.children.push(created)
    return created
  }

  for (const file of files) {
    if (seen.has(file.relativePath)) continue
    seen.add(file.relativePath)
    const cut = file.relativePath.lastIndexOf("/")
    const parent = folderAt(cut === -1 ? "" : file.relativePath.slice(0, cut))
    parent.children.push({
      type: "file",
      name: cut === -1 ? file.relativePath : file.relativePath.slice(cut + 1),
      path: file.relativePath,
      file,
    })
    for (let path = parent.path; ; path = path.slice(0, Math.max(path.lastIndexOf("/"), 0))) {
      folders.get(path)!.fileCount += 1
      if (!path) break
    }
  }

  order(root)
  return root
}

/** The folders above a file, outermost first: `a/b/c.md` is under `a` and `a/b`. */
export function ancestorFolders(path: string): string[] {
  const parts = path.split("/").slice(0, -1)
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"))
}

/** Every folder path in the tree, outermost first. The root is not one. */
export function folderPaths(tree: FileTreeFolder): string[] {
  const paths: string[] = []
  const walk = (folder: FileTreeFolder) => {
    for (const child of folder.children) {
      if (child.type !== "folder") continue
      paths.push(child.path)
      walk(child)
    }
  }
  walk(tree)
  return paths
}
