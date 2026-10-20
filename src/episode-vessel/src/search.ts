/**
 * Full-text search across vessels (jgwill/Miadi#706).
 *
 * One function, two engines that must agree: ripgrep when it is on PATH, a
 * Node walk otherwise (a phone without rg, a test). Both read the same files:
 * the `TEXT_EXTENSIONS` set, at most `MAX_TEXT_BYTES` each, no dot-entries, no
 * symlinks, nothing a `.miadiignore` hides, and binary files and any encoding
 * read as UTF-8 bytes. Both walk each vessel depth-first in byte order, so a
 * capped result is the same first N hits from either one.
 *
 * The query is literal text, matched case-insensitively, one line at a time.
 * Measured 2026-09-27 on gaia: rg over the whole chronicle's text took 0.165 s,
 * so there is no index to keep fresh.
 */

import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { EpisodePathError } from "./errors.js"
import { MAX_TEXT_BYTES, TEXT_EXTENSIONS } from "./files.js"
import { MIADI_IGNORE_FILE, loadVesselIgnore, type VesselIgnore } from "./ignore.js"
import { parseEpisodeFolder, resolveChronicleRoot, type VesselOptions } from "./paths.js"

export const MAX_SEARCH_HITS = 200
/** Longer lines are cut, so one minified JSON line cannot flood a screen. */
export const MAX_HIT_LINE_CHARS = 400

export type SearchEngine = "rg" | "node"

export interface VesselHit {
  /** The episode folder name. */
  episodePath: string
  /** Path inside the vessel, `/`-separated. */
  file: string
  /** 1-based. */
  line: number
  text: string
}

export interface SearchOptions extends VesselOptions {
  /** Stop after this many hits (default `MAX_SEARCH_HITS`). */
  limit?: number
  /** `auto` (default) uses rg when it is on PATH. */
  engine?: "auto" | SearchEngine
  /** Search only these vessels (folder names). Default: every vessel. */
  episodes?: readonly string[]
  /**
   * Which vessels come first. Folder names start with their date, so
   * `newest-first` makes a capped search keep the recent episodes.
   * Default `oldest-first`.
   */
  order?: "oldest-first" | "newest-first"
  /** Stops the search: rg is killed and the promise rejects with an AbortError. */
  signal?: AbortSignal
  /** A predicate on the path inside a vessel; a file it refuses is not read. */
  include?: (relativePath: string, episodePath: string) => boolean
}

export interface SearchResult {
  query: string
  hits: VesselHit[]
  /** More hits existed than `limit`. */
  truncated: boolean
  /** Some file or folder could not be read; the hits are what could be. */
  partial: boolean
  engine: SearchEngine
}

let ripgrepOnPath: boolean | undefined

export function hasRipgrep(): boolean {
  if (ripgrepOnPath === undefined) {
    ripgrepOnPath = spawnSync("rg", ["--version"], { stdio: "ignore", env: rgEnv() }).status === 0
  }
  return ripgrepOnPath
}

/**
 * rg runs with PATH and locale only. A user's RIPGREP_CONFIG_PATH would change
 * what it matches, and a token in the environment has no business in a child
 * process (jgwill/Miadi#706 security review, F7).
 */
function rgEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "" }
  for (const key of ["LANG", "LC_ALL", "LC_CTYPE", "HOME", "SYSTEMROOT"]) if (process.env[key]) env[key] = process.env[key]
  return env
}

/** Byte order of the UTF-8 encoding, which is the order rg sorts paths in. */
const byteOrder = (left: string, right: string): number => Buffer.compare(Buffer.from(left), Buffer.from(right))

/** Case-insensitive the way rg is for the cases JavaScript lowercases differently (final sigma). */
const fold = (text: string): string => text.toLowerCase().replace(/ς/g, "σ")

const dotSegment = (relativePath: string): boolean => relativePath.split("/").some((segment) => segment.startsWith("."))

function vesselsIn(root: string, only: readonly string[] | undefined, order: SearchOptions["order"]): string[] {
  const names = only
    ? [...only]
    : fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
        .map((entry) => entry.name)
  if (only) {
    for (const name of names) {
      if (!parseEpisodeFolder(name)) throw new EpisodePathError(`Not an episode folder: ${name}`)
      const stat = fs.lstatSync(path.join(root, name), { throwIfNoEntry: false })
      if (!stat || !stat.isDirectory()) throw new EpisodePathError(`Episode not found: ${name}`, "ENOENT")
    }
  }
  const sorted = names.filter((name) => parseEpisodeFolder(name) !== null).sort(byteOrder)
  return order === "newest-first" ? sorted.reverse() : sorted
}

function cut(text: string): string {
  const line = text.replace(/^﻿/, "").replace(/\r?\n$/, "").replace(/\r$/, "")
  return line.length > MAX_HIT_LINE_CHARS ? `${line.slice(0, MAX_HIT_LINE_CHARS)}…` : line
}

function abortError(): Error {
  const error = new Error("The search was stopped")
  error.name = "AbortError"
  return error
}

interface Found {
  hits: VesselHit[]
  truncated: boolean
  partial: boolean
}

function searchWithNode(
  root: string,
  vessels: string[],
  query: string,
  limit: number,
  ignoreFor: (vessel: string) => VesselIgnore,
  include: SearchOptions["include"],
  signal: AbortSignal | undefined,
): Found {
  const needle = fold(query)
  const hits: VesselHit[] = []
  let partial = false

  for (const vessel of vessels) {
    const dir = path.join(root, vessel)
    const ignored = ignoreFor(vessel)
    const walk = (current: string): boolean => {
      if (signal?.aborted) throw abortError()
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => byteOrder(a.name, b.name))
      } catch {
        partial = true
        return false
      }
      for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue
        const absolute = path.join(current, entry.name)
        const relative = path.relative(dir, absolute).split(path.sep).join("/")
        if (entry.isDirectory()) {
          if (!ignored(`${relative}/`) && walk(absolute)) return true
          continue
        }
        if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue
        if (ignored(relative) || (include && !include(relative, vessel))) continue
        let content: string
        try {
          if (fs.statSync(absolute).size > MAX_TEXT_BYTES) continue
          content = fs.readFileSync(absolute, "utf8")
        } catch {
          partial = true
          continue
        }
        const lines = content.split("\n")
        for (let index = 0; index < lines.length; index++) {
          if (!fold(lines[index]!).includes(needle)) continue
          if (hits.length >= limit) return true
          hits.push({ episodePath: vessel, file: relative, line: index + 1, text: cut(lines[index]!) })
        }
      }
      return false
    }
    if (walk(dir)) return { hits, truncated: true, partial }
  }
  return { hits, truncated: false, partial }
}

/** rg reports text as `text`, or as base64 `bytes` when it is not valid UTF-8. */
function decoded(field: { text?: string; bytes?: string } | undefined): string | undefined {
  if (!field) return undefined
  if (field.text !== undefined) return field.text
  if (field.bytes !== undefined) return Buffer.from(field.bytes, "base64").toString("utf8")
  return undefined
}

function searchWithRipgrep(
  root: string,
  vessels: string[],
  query: string,
  limit: number,
  ignoreFor: (vessel: string) => VesselIgnore,
  include: SearchOptions["include"],
  signal: AbortSignal | undefined,
): Promise<Found> {
  const args = [
    "--json",
    "--fixed-strings",
    "--ignore-case",
    // .gitignore decides what git keeps, not what a reader sees: only
    // .miadiignore hides anything here, exactly as in the Node walk.
    "--no-ignore",
    // Binary files and any encoding are read as bytes, as the Node walk reads them.
    "--text",
    "--encoding",
    "none",
    "--sort",
    "path",
    "--max-filesize",
    `${MAX_TEXT_BYTES / 1024}K`,
    "--glob-case-insensitive",
    ...[...TEXT_EXTENSIONS].flatMap((extension) => ["--glob", `*${extension}`]),
    // A positive glob overrides rg's own hidden-file rule, so dot-entries are
    // refused explicitly (they are never readable through the vessel).
    "--glob",
    "!.*",
  ]
  // The root file also goes to rg so it skips ignored folders instead of
  // reading them; every hit is still checked against both files below.
  if (fs.existsSync(path.join(root, MIADI_IGNORE_FILE))) args.push("--ignore-file", MIADI_IGNORE_FILE)
  args.push("--", query, ...vessels)

  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const child = spawn("rg", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: rgEnv() })
    const hits: VesselHit[] = []
    let truncated = false
    let pending = ""
    let stderr = ""
    let aborted = false
    const onAbort = () => {
      aborted = true
      child.kill()
    }
    signal?.addEventListener("abort", onAbort, { once: true })

    const take = (raw: string): void => {
      if (truncated || !raw) return
      let event: { type: string; data?: { path?: { text?: string; bytes?: string }; lines?: { text?: string; bytes?: string }; line_number?: number } }
      try {
        event = JSON.parse(raw)
      } catch {
        return
      }
      if (event.type !== "match") return
      const where = decoded(event.data?.path)
      const text = decoded(event.data?.lines)
      if (!where || text === undefined) return
      const [vessel, ...rest] = where.split("/")
      const file = rest.join("/")
      if (!vessel || dotSegment(file) || ignoreFor(vessel)(file) || (include && !include(file, vessel))) return
      if (hits.length >= limit) {
        truncated = true
        child.kill()
        return
      }
      hits.push({ episodePath: vessel, file, line: event.data?.line_number ?? 0, text: cut(text) })
    }

    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      pending += chunk
      let newline = pending.indexOf("\n")
      while (newline !== -1) {
        take(pending.slice(0, newline))
        pending = pending.slice(newline + 1)
        newline = pending.indexOf("\n")
      }
    })
    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", reject)
    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort)
      if (aborted) return reject(abortError())
      take(pending)
      // 0: matches, 1: none. 2 is an error: a file or folder that could not be
      // read is a partial result; anything else (a bad argument) is a failure.
      if (!truncated && code === 2) {
        const lines = stderr.split("\n").filter(Boolean)
        if (lines.length === 0 || lines.some((line) => !/os error \d+/.test(line))) {
          return reject(new Error(`rg failed: ${stderr.trim() || "exit 2"}`))
        }
        return resolve({ hits, truncated, partial: true })
      }
      resolve({ hits, truncated, partial: false })
    })
  })
}

/**
 * Search the text of every vessel (or of `options.episodes`) for `query`.
 * An empty query returns no hits; a query is one line (the first one).
 */
export async function searchVessels(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const root = resolveChronicleRoot(options.root)
  const limit = Number.isFinite(options.limit) ? Math.max(0, Math.floor(options.limit!)) : MAX_SEARCH_HITS
  const wanted = options.engine ?? "auto"
  const engine: SearchEngine = wanted === "auto" ? (hasRipgrep() ? "rg" : "node") : wanted
  const needle = (query.split(/\r?\n/)[0] ?? "").trim()
  if (!needle) return { query, hits: [], truncated: false, partial: false, engine }

  const vessels = vesselsIn(root, options.episodes, options.order)
  const rules = new Map<string, VesselIgnore>()
  const ignoreFor = (vessel: string): VesselIgnore => {
    let rule = rules.get(vessel)
    if (!rule) {
      rule = loadVesselIgnore(root, path.join(root, vessel))
      rules.set(vessel, rule)
    }
    return rule
  }

  const found =
    engine === "rg"
      ? await searchWithRipgrep(root, vessels, needle, limit, ignoreFor, options.include, options.signal)
      : searchWithNode(root, vessels, needle, limit, ignoreFor, options.include, options.signal)
  return { query, ...found, engine }
}
