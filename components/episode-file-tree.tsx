/**
 * The folders of an episode, drawn — every one open to begin with, so a file's
 * folder is plain to see. Presentational: the panel owns which folders are
 * closed and how a file's own row looks.
 *
 * @see lib/episode-file-tree.ts — how the paths are grouped and in what order
 */

import type { ReactNode } from "react";
import type { FileTreeFolder, TreeableFile } from "@/lib/episode-file-tree";

export interface EpisodeFileTreeProps<T extends TreeableFile> {
  tree: FileTreeFolder<T>;
  /** Paths of the folders the reader closed. Any folder not here is open. */
  collapsed: ReadonlySet<string>;
  onToggleFolder: (path: string) => void;
  /** One file's row, and whatever opens beneath it. `name` is the path's last segment. */
  renderFile: (file: T, name: string) => ReactNode;
}

export function EpisodeFileTree<T extends TreeableFile>({
  tree,
  collapsed,
  onToggleFolder,
  renderFile,
}: EpisodeFileTreeProps<T>) {
  return (
    <ul className="space-y-1">
      {tree.children.map((node) => {
        if (node.type === "file") {
          return <li key={node.path}>{renderFile(node.file, node.name)}</li>;
        }
        const isOpen = !collapsed.has(node.path);
        return (
          <li key={node.path} data-folder={node.path}>
            <button
              type="button"
              onClick={() => onToggleFolder(node.path)}
              aria-expanded={isOpen}
              title={node.path}
              className="w-full p-2 flex items-baseline gap-2 text-left text-sm font-semibold hover:underline"
            >
              <span aria-hidden="true" className="text-muted-foreground w-[1ch]">
                {isOpen ? "▾" : "▸"}
              </span>
              <span aria-hidden="true">{isOpen ? "📂" : "📁"}</span>
              <span className="font-mono break-all">{node.name}</span>
              <span className="ml-auto text-xs font-normal text-muted-foreground shrink-0">
                {node.fileCount} {node.fileCount === 1 ? "file" : "files"}
              </span>
            </button>
            {isOpen && (
              <div className="ml-4 pl-2 border-l">
                <EpisodeFileTree
                  tree={node}
                  collapsed={collapsed}
                  onToggleFolder={onToggleFolder}
                  renderFile={renderFile}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
