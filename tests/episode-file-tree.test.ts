/**
 * An episode's files in their folders.
 *
 * The Files section on the episode page printed whole paths one under another,
 * so a reader could not tell which folder a file was in. What these tests hold:
 *
 *  1. the paths are grouped into folders, in one order — a README first, then
 *     the folders, then the files — and each folder counts what is beneath it;
 *  2. the tree is drawn with every folder open, a row says a file's name and keeps
 *     its path as the tooltip, and a closed folder draws none of its children.
 *
 * Grouping is layout only: what a visitor may be shown is decided in
 * `lib/episode-files.ts`, and tests/episode-files.test.ts holds that.
 *
 * @see lib/episode-file-tree.ts
 * @see components/episode-file-tree.tsx
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EpisodeFileTree } from "../components/episode-file-tree";
import { buildFileTree, folderPaths, type FileTreeFolder, type TreeableFile } from "../lib/episode-file-tree";

const file = (relativePath: string, kind = "text", guidance = false): TreeableFile => ({
  relativePath,
  name: relativePath.split("/").pop()!,
  kind,
  guidance,
});

// A flat listing, in the vessel's own order, as the route returns it.
const LISTING = [
  file("README.md"),
  file("chapter-10-the-last.md"),
  file("chapter-2-the-board.md"),
  file("AGENTS.md", "text", true),
  file("downloads/report.md"),
  file("foundations/miaco-decompose/README.md"),
  file("foundations/miaco-decompose/context-layer.md"),
  file("foundations/overview.md"),
  file("recording.m4a", "media"),
];

type Shape = string | { [folder: string]: Shape[] };
const shape = (folder: FileTreeFolder<TreeableFile>): Shape[] =>
  folder.children.map((node) => (node.type === "folder" ? { [`${node.name}/`]: shape(node) } : node.name));

describe("the grouping", () => {
  it("puts each file under the folders its path names, README first, then folders, then files", () => {
    expect(shape(buildFileTree(LISTING))).toEqual([
      "README.md",
      { "downloads/": ["report.md"] },
      { "foundations/": [{ "miaco-decompose/": ["README.md", "context-layer.md"] }, "overview.md"] },
      "chapter-2-the-board.md",
      "chapter-10-the-last.md",
      "AGENTS.md",
      "recording.m4a",
    ]);
  });

  it("counts every file beneath a folder, at any depth", () => {
    const tree = buildFileTree(LISTING);
    expect(tree.fileCount).toBe(LISTING.length);
    const foundations = tree.children.find((n) => n.type === "folder" && n.name === "foundations");
    expect(foundations?.type === "folder" && foundations.fileCount).toBe(3);
  });

  it("keeps a path listed twice once, and names the folders outermost first", () => {
    expect(buildFileTree([file("a/x.md"), file("a/x.md")]).fileCount).toBe(1);
    expect(folderPaths(buildFileTree(LISTING))).toEqual([
      "downloads",
      "foundations",
      "foundations/miaco-decompose",
    ]);
    expect(buildFileTree([]).children).toEqual([]);
  });
});

describe("the drawing", () => {
  const draw = (collapsed: string[] = []) =>
    renderToStaticMarkup(
      createElement(EpisodeFileTree, {
        tree: buildFileTree(LISTING),
        collapsed: new Set(collapsed),
        onToggleFolder: () => {},
        renderFile: (f: TreeableFile, name: string) =>
          createElement("span", { "data-file": f.relativePath, title: f.relativePath }, name),
      }),
    );

  it("opens every folder to begin with and draws every file", () => {
    const html = draw();
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(3);
    expect(html).not.toContain('aria-expanded="false"');
    for (const f of LISTING) expect(html).toContain(`data-file="${f.relativePath}"`);
  });

  it("says a file's name in its row and its path as the tooltip", () => {
    const html = draw();
    expect(html).toContain('title="foundations/miaco-decompose/context-layer.md">context-layer.md<');
    expect(html).toContain("3 files");
    expect(html).toContain("1 file<");
  });

  it("draws none of a closed folder's children, and leaves the others open", () => {
    const html = draw(["foundations"]);
    expect(html).not.toContain("data-file=\"foundations/");
    expect(html).toContain('data-file="downloads/report.md"');
    expect(html).toContain('data-folder="foundations"');
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(1);
  });
});
