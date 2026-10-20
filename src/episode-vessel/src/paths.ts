/**
 * Containment. Every other module in this package resolves through here.
 *
 * Two laws, and they are the reason this package exists rather than each
 * surface writing its own:
 *
 *  1. An episode is ONE folder name directly beneath the chronicle root. It is
 *     never a path, never a traversal, never a symlink.
 *  2. A file inside it is a relative path with no `.`, `..` or dot-prefixed
 *     segment, resolving (after symlink resolution) to a real file still inside
 *     that folder.
 */

import fs from "node:fs"
import path from "node:path"
import { EpisodePathError } from "./errors.js"

/** `2026-09-17-episode-349-miadi-conducts-a-ceremony-its-circle-can-enter` */
export const EPISODE_FOLDER = /^(\d{4}-\d{2}-\d{2})-episode-(\d+)-(.+)$/i

export interface EpisodeFolder {
  episodePath: string
  date: string
  number: number
  numberLabel: string
  slug: string
}

export interface VesselOptions {
  /** The chronicle root. Defaults to `MIADI_CHRONICLE_ROOT`. */
  root?: string
}

/**
 * The configured chronicle root. `MIADI_CHRONICLE_ROOT` is the one name for it
 * across the stack; a host with a different layout passes `root` explicitly
 * rather than teaching this package a second variable.
 */
export function configuredChronicleRoot(): string {
  const raw = process.env.MIADI_CHRONICLE_ROOT?.trim()
  if (!raw) {
    throw new EpisodePathError(
      "No chronicle root: set MIADI_CHRONICLE_ROOT or pass { root }",
      "NO_ROOT",
    )
  }
  return raw.replace(/\/+$/, "")
}

export function resolveChronicleRoot(root?: string): string {
  const absolute = path.resolve(root ?? configuredChronicleRoot())
  let real: string
  try {
    real = fs.realpathSync(absolute)
  } catch {
    throw new EpisodePathError(`Chronicle root does not exist: ${absolute}`, "NO_ROOT")
  }
  if (!fs.statSync(real).isDirectory()) {
    throw new EpisodePathError(`Chronicle root is not a directory: ${absolute}`, "NO_ROOT")
  }
  return real
}

export function isContained(root: string, target: string): boolean {
  const relative = path.relative(root, target)
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  )
}

export function parseEpisodeFolder(name: string): EpisodeFolder | null {
  const match = EPISODE_FOLDER.exec(name)
  if (!match) return null
  return {
    episodePath: name,
    date: match[1],
    number: Number.parseInt(match[2], 10),
    numberLabel: match[2].padStart(3, "0"),
    slug: match[3],
  }
}

export function assertEpisodePath(value: string): EpisodeFolder {
  if (
    typeof value !== "string" ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    throw new EpisodePathError("Episode must be one chronicle folder name")
  }
  const parsed = parseEpisodeFolder(value)
  if (!parsed) throw new EpisodePathError(`Episode folder name is not valid: ${value}`)
  return parsed
}

export interface ResolvedEpisodeDir {
  root: string
  dir: string
}

export function resolveEpisodeDir(episodePath: string, options: VesselOptions = {}): ResolvedEpisodeDir {
  assertEpisodePath(episodePath)
  const root = resolveChronicleRoot(options.root)
  const candidate = path.join(root, episodePath)
  let stat: fs.Stats
  try {
    stat = fs.lstatSync(candidate)
  } catch {
    const error = new EpisodePathError(`Episode not found: ${episodePath}`, "ENOENT")
    throw error
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new EpisodePathError("Episode must be a real directory beneath the chronicle root")
  }
  const real = fs.realpathSync(candidate)
  if (!isContained(root, real)) {
    throw new EpisodePathError("Episode path escapes the chronicle root")
  }
  return { root, dir: real }
}

/**
 * A file reference inside a vessel. Rejects absolute paths, backslashes, NULs,
 * and any `.`/`..`/dot-prefixed segment — which also keeps `.mw-registration.json`
 * and other vessel bookkeeping out of every browser.
 */
export function assertRelativeFile(value: string): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    value.includes("\0") ||
    path.isAbsolute(value)
  ) {
    throw new EpisodePathError("File must be a safe relative episode path")
  }
  if (value.split("/").some((part) => !part || part === "." || part === ".." || part.startsWith("."))) {
    throw new EpisodePathError("File path contains a forbidden segment")
  }
  return value
}

export interface ResolvedFile {
  /** The real absolute path on disk. */
  path: string
  stat: fs.Stats
  /** The episode directory it was resolved inside. */
  dir: string
}

export function resolveEpisodeFile(
  episodePath: string,
  relativeFile: string,
  options: VesselOptions = {},
): ResolvedFile {
  const { dir } = resolveEpisodeDir(episodePath, options)
  assertRelativeFile(relativeFile)
  const segments = relativeFile.split("/")
  // Every folder on the way is checked, not only the file: a folder that is a
  // symlink would carry a path spelt under one part of the vessel into another
  // (`captures/x -> ../ceremonies`), past any rule judged on the spelling.
  let candidate = dir
  for (const segment of segments.slice(0, -1)) {
    candidate = path.join(candidate, segment)
    let folder: fs.Stats
    try {
      folder = fs.lstatSync(candidate)
    } catch {
      throw new EpisodePathError(`Episode file not found: ${relativeFile}`, "ENOENT")
    }
    if (folder.isSymbolicLink()) throw new EpisodePathError("Episode file path passes through a symlink")
    if (!folder.isDirectory()) throw new EpisodePathError(`Episode file not found: ${relativeFile}`, "ENOENT")
  }
  candidate = path.join(candidate, segments[segments.length - 1]!)
  let stat: fs.Stats
  try {
    stat = fs.lstatSync(candidate)
  } catch {
    throw new EpisodePathError(`Episode file not found: ${relativeFile}`, "ENOENT")
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new EpisodePathError("Episode file is not a regular file")
  }
  const real = fs.realpathSync(candidate)
  if (!isContained(dir, real)) throw new EpisodePathError("Episode file escapes its vessel")
  return { path: real, stat, dir }
}
