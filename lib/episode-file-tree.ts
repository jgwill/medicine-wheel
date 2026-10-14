/**
 * An episode's files, grouped into the folders their paths name.
 *
 * `listEpisodeFiles` returns files with the path each sits at, and no folders,
 * so the Files section printed whole paths one under another and a reader could
 * not tell which folder a file was in. This builds the folders back from the
 * paths, so the panel can draw them.
 *
 * This is layout, not a rule about what an episode shows — those live in
 * `@miadi/episode-vessel` and in `lib/episode-files.ts`, and nothing here
 * decides what may be listed or read. The same grouping is drawn in Miadi's room
 * by `@miadi/episode-ui` (`buildFileTree`); the wheel keeps its own small copy
 * until it takes that package, and the two are meant to agree on order:
 *
 *  1. a `README.md`;
 *  2. the folders, by name;
 *  3. the files — text, documents, guidance, then media — by name.
 *
 * Names compare numerically, so `chapter-2` comes before `chapter-10`.
 */

/** The part of a listed file the grouping reads. Any richer shape passes through untouched. */
export interface TreeableFile {
  relativePath: string;
  name: string;
  kind: string;
  guidance: boolean;
}

export interface FileTreeFile<T extends TreeableFile> {
  type: "file";
  /** The last segment of the path. */
  name: string;
  path: string;
  file: T;
}

export interface FileTreeFolder<T extends TreeableFile> {
  type: "folder";
  /** The last segment of the path. Empty for the root. */
  name: string;
  /** The path from the episode root. Empty for the root. */
  path: string;
  children: FileTreeNode<T>[];
  /** Every file beneath this folder, at any depth. */
  fileCount: number;
}

export type FileTreeNode<T extends TreeableFile> = FileTreeFile<T> | FileTreeFolder<T>;

const compareNames = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }) ||
  (left < right ? -1 : left > right ? 1 : 0);

function rank(file: TreeableFile): number {
  if (/^README\.md$/i.test(file.name)) return 0;
  if (file.guidance) return 3;
  if (file.kind === "text") return 1;
  if (file.kind === "document") return 2;
  return 4;
}

function order<T extends TreeableFile>(folder: FileTreeFolder<T>): void {
  const folders = folder.children.filter((n): n is FileTreeFolder<T> => n.type === "folder");
  const files = folder.children.filter((n): n is FileTreeFile<T> => n.type === "file");
  folders.sort((a, b) => compareNames(a.name, b.name));
  files.sort((a, b) => rank(a.file) - rank(b.file) || compareNames(a.name, b.name));
  folder.children = [
    ...files.filter((n) => rank(n.file) === 0),
    ...folders,
    ...files.filter((n) => rank(n.file) !== 0),
  ];
  folders.forEach(order);
}

/**
 * Group `files` into folders by path. A path listed twice is kept once, and a
 * folder exists only because a file is beneath it.
 */
export function buildFileTree<T extends TreeableFile>(files: readonly T[]): FileTreeFolder<T> {
  const root: FileTreeFolder<T> = { type: "folder", name: "", path: "", children: [], fileCount: 0 };
  const folders = new Map<string, FileTreeFolder<T>>([["", root]]);
  const seen = new Set<string>();

  const folderAt = (path: string): FileTreeFolder<T> => {
    const known = folders.get(path);
    if (known) return known;
    const cut = path.lastIndexOf("/");
    const parent = folderAt(cut === -1 ? "" : path.slice(0, cut));
    const created: FileTreeFolder<T> = {
      type: "folder",
      name: cut === -1 ? path : path.slice(cut + 1),
      path,
      children: [],
      fileCount: 0,
    };
    folders.set(path, created);
    parent.children.push(created);
    return created;
  };

  for (const file of files) {
    if (seen.has(file.relativePath)) continue;
    seen.add(file.relativePath);
    const cut = file.relativePath.lastIndexOf("/");
    const parent = folderAt(cut === -1 ? "" : file.relativePath.slice(0, cut));
    parent.children.push({
      type: "file",
      name: cut === -1 ? file.relativePath : file.relativePath.slice(cut + 1),
      path: file.relativePath,
      file,
    });
    for (let path = parent.path; ; path = path.slice(0, Math.max(path.lastIndexOf("/"), 0))) {
      folders.get(path)!.fileCount += 1;
      if (!path) break;
    }
  }

  order(root);
  return root;
}

/** Every folder path in the tree, outermost first. The root is not one. */
export function folderPaths<T extends TreeableFile>(tree: FileTreeFolder<T>): string[] {
  const paths: string[] = [];
  const walk = (folder: FileTreeFolder<T>) => {
    for (const child of folder.children) {
      if (child.type !== "folder") continue;
      paths.push(child.path);
      walk(child);
    }
  };
  walk(tree);
  return paths;
}
