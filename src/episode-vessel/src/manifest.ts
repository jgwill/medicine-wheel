/**
 * `episode.yaml` — what a vessel says it is.
 *
 * A deliberately small reader: the handful of scalar keys a shelf needs, the
 * three string lists a room needs, and no YAML dependency. A vessel whose
 * manifest is missing or unparseable still appears, named from its folder —
 * one unreadable manifest must never hide an episode from the shelf.
 */

import fs from "node:fs"
import path from "node:path"
import { parseEpisodeFolder, resolveChronicleRoot, resolveEpisodeDir, assertEpisodePath, type VesselOptions } from "./paths.js"
import { audienceOf, type EpisodeAudience } from "./audience.js"

const MANIFEST_KEYS = new Set(["episode", "title", "slug", "date", "series", "status", "type", "goal", "audience", "cover"])

/**
 * The string lists a room reads. `issue_refs` is the hand-written spelling and
 * `references` is what mkepisode writes; both are the same claim.
 */
const LIST_KEYS = new Set(["issue_refs", "references", "source_paths"] as const)
type ListKey = "issue_refs" | "references" | "source_paths"

const isListKey = (key: string): key is ListKey => LIST_KEYS.has(key as ListKey)

export interface EpisodeManifest {
  episode?: number | string
  title?: string
  slug?: string
  date?: string
  series?: string
  status?: string
  type?: string
  goal?: string
  audience?: string
  /** The cover image, vessel-relative (jgwill/Miadi#743). */
  cover?: string
  issue_refs?: string[]
  references?: string[]
  source_paths?: string[]
}

/**
 * Cut a trailing comment: from the first `#` that follows whitespace (or, with
 * `atStart`, that opens the text). One pass, so no input can make it slow.
 */
function stripComment(text: string, atStart = false): string {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "#" && (i === 0 ? atStart : /\s/.test(text[i - 1]!))) return text.slice(0, i).trimEnd()
  }
  return text
}

/** `stripComment` for one line of a flow collection, where a `#` inside quotes is text. */
function stripFlowComment(line: string): string {
  let quote: string | null = null
  for (let i = 0; i < line.length; i++) {
    const char = line[i]!
    if (quote) {
      if (char === "\\" && quote === '"') i++
      else if (char === quote) quote = null
    } else if (char === '"' || char === "'") quote = char
    else if (char === "#" && (i === 0 || /\s/.test(line[i - 1]!))) return line.slice(0, i).trimEnd()
  }
  return line
}

const YAML_ESCAPES: Record<string, string> = {
  "0": "\0", a: "\x07", b: "\b", t: "\t", "\t": "\t", n: "\n", v: "\v", f: "\f", r: "\r", e: "\x1b",
  " ": " ", '"': '"', "/": "/", "\\": "\\", N: "\x85", _: "\xa0", L: "\u2028", P: "\u2029",
}

/** The body of a YAML double-quoted scalar, its escapes applied; null when one is malformed. */
function unescapeDoubleQuoted(body: string): string | null {
  let out = ""
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!
    if (char !== "\\") {
      out += char
      continue
    }
    const code = body[++i]
    if (code === undefined) return null
    const width = code === "x" ? 2 : code === "u" ? 4 : code === "U" ? 8 : 0
    if (width) {
      const hex = body.slice(i + 1, i + 1 + width)
      if (hex.length !== width || !/^[0-9A-Fa-f]+$/.test(hex)) return null
      const point = Number.parseInt(hex, 16)
      if (point > 0x10ffff) return null
      out += String.fromCodePoint(point)
      i += width
    } else if (code in YAML_ESCAPES) {
      out += YAML_ESCAPES[code]
    } else {
      return null
    }
  }
  return out
}

function unquoteYamlScalar(value: string): string {
  const trimmed = String(value || "").trim()
  if (trimmed.length > 1 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return unescapeDoubleQuoted(trimmed.slice(1, -1)) ?? trimmed.slice(1, -1)
  }
  if (trimmed.length > 1 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'")
  }
  return stripComment(trimmed).trim()
}

const QUOTED_ITEM = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*')\s*(?:#.*)?$/

/** True when a double-quoted line ends in an escaped line break (an odd run of `\`). */
function escapesLineBreak(text: string): boolean {
  let run = 0
  for (let i = text.length - 1; i >= 0 && text[i] === "\\"; i--) run++
  return run % 2 === 1
}

/**
 * Fold a scalar written over several lines, as YAML does: a line break between
 * two lines is one space, an empty line is a newline, and inside double quotes
 * a `\` at the end of a line joins the two lines with nothing between them.
 */
function foldLines(lines: string[], doubleQuoted: boolean): string {
  let text = lines[0].trim()
  let newlines = 0
  for (const raw of lines.slice(1)) {
    const line = raw.trim()
    if (!line) {
      newlines++
      continue
    }
    if (doubleQuoted && newlines === 0 && escapesLineBreak(text)) text = text.slice(0, -1) + line
    else text = `${text}${newlines ? (doubleQuoted ? "\\n" : "\n").repeat(newlines) : " "}${line}`
    newlines = 0
  }
  return text
}

/**
 * One list item as a string, or null when it is not a string: a map entry
 * (`- user: jgi`), a nested collection, or an empty item opening a block.
 * `lines[0]` is what follows the dash; the rest are the item's continuation lines.
 */
function listItem(lines: string[]): string | null {
  const first = lines[0].trim()
  if (!first || first.startsWith("#")) return null
  if (first.startsWith('"') || first.startsWith("'")) {
    const quoted = QUOTED_ITEM.exec(foldLines(lines, first.startsWith('"')))
    return quoted ? unquoteYamlScalar(quoted[1]) || null : null
  }
  const withoutComment = stripComment(first)
  // A nested collection, a block scalar, an anchor, an alias, a tag, a nested
  // sequence (`- - a`), a complex key (`? a`), or a map entry: none is a string.
  if (/^[[{|>&*!]/.test(withoutComment) || /^[-?](\s|$)/.test(withoutComment)) return null
  if (/^[^:]*:(\s|$)/.test(withoutComment)) return null
  // A plain scalar ends at a comment, so lines after one are not part of it.
  const plain: string[] = []
  for (const line of lines) {
    const kept = stripComment(line, true)
    plain.push(kept)
    if (kept !== line) break
  }
  const text = foldLines(plain, false).trim()
  // YAML reads these plain words as null, not as text.
  return !text || /^(?:~|null|Null|NULL)$/.test(text) ? null : text
}

/**
 * Where a flow collection opened at `text[0]` closes, or -1 while it is still
 * open. Quotes are honoured, and a nested `[...]` or `{...}` counts as one item.
 */
function flowEnd(text: string): number {
  let depth = 0
  let quote: string | null = null
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (quote) {
      if (char === "\\" && quote === '"') i++
      else if (char === quote) quote = null
    } else if (char === '"' || char === "'") quote = char
    else if (char === "[" || char === "{") depth++
    else if (char === "]" || char === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * `[a, "b, c", 'd']` → its string items, possibly written over several lines;
 * null when the value is not a whole flow list. Nested collections are skipped.
 */
function flowList(raw: string): string[] | null {
  const text = raw.trim()
  if (!text.startsWith("[")) return null
  const end = flowEnd(text)
  if (end < 0 || stripComment(text.slice(end + 1), true).trim()) return null
  const items: string[] = []
  let current = ""
  let depth = 0
  let quote: string | null = null
  const body = text.slice(1, end)
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!
    if (quote) {
      current += char
      if (char === "\\" && quote === '"') current += body[++i] ?? ""
      else if (char === quote) quote = null
    } else if (char === '"' || char === "'") {
      quote = char
      current += char
    } else if (char === "[" || char === "{") {
      depth++
      current += char
    } else if (char === "]" || char === "}") {
      depth--
      current += char
    } else if (char === "," && depth === 0) {
      items.push(current)
      current = ""
    } else {
      current += char
    }
  }
  items.push(current)
  return items.map((item) => listItem([item.replace(/\s+/g, " ")])).filter((item): item is string => item !== null)
}

export function parseEpisodeManifest(source: string): EpisodeManifest {
  const parsed: Record<string, string | number | string[]> = {}
  let activeKey: string | null = null
  let listKey: ListKey | null = null
  // The block list item being read: its dash's column and its lines so far.
  let item: { indent: number; lines: string[] } | null = null
  // A flow list still open at the end of its key's line, and its text so far.
  let flow: { key: ListKey; text: string } | null = null

  const closeItem = () => {
    if (item && listKey) {
      const value = listItem(item.lines)
      if (value !== null) (parsed[listKey] as string[]).push(value)
    }
    item = null
  }

  for (const line of String(source || "").split(/\r?\n/)) {
    if (flow) {
      flow.text += ` ${stripFlowComment(line)}`
      if (flowEnd(flow.text) >= 0) {
        parsed[flow.key] = flowList(flow.text) ?? []
        flow = null
      }
      continue
    }
    if (listKey) {
      const indent = line.length - line.trimStart().length
      // Blank lines and lines indented past the dash belong to the item.
      if (item && (!line.trim() || indent > item.indent)) {
        item.lines.push(line)
        continue
      }
      if (!line.trim() || /^\s*#/.test(line)) continue
      const dash = /^(\s*)-(?:\s+(.*))?$/.exec(line)
      if (dash) {
        closeItem()
        item = { indent: dash[1].length, lines: [dash[2] ?? ""] }
        continue
      }
      closeItem()
      // Anything else indented is nested under the key, not a list item.
      if (/^\s/.test(line)) continue
      listKey = null
    }

    const top = /^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/.exec(line)
    if (top && isListKey(top[1])) {
      activeKey = null
      const rest = (top[2] || "").trim()
      const items = flowList(rest)
      parsed[top[1]] = items ?? []
      if (items === null && rest.startsWith("[") && flowEnd(rest) < 0) flow = { key: top[1], text: stripFlowComment(rest) }
      // A list key with a scalar value is not a list; it stays empty.
      listKey = items === null && (!rest || rest.startsWith("#")) ? top[1] : null
      continue
    }
    if (top) {
      activeKey = MANIFEST_KEYS.has(top[1]) ? top[1] : null
      if (activeKey) parsed[activeKey] = unquoteYamlScalar(top[2] || "")
      continue
    }
    if (activeKey && /^\s{2,}\S/.test(line) && !/^\s*-\s/.test(line)) {
      const continuation = unquoteYamlScalar(line)
      if (continuation && continuation !== ">-" && continuation !== "|-") {
        parsed[activeKey] = `${parsed[activeKey] || ""} ${continuation}`.trim()
      }
    } else if (line.trim()) {
      activeKey = null
    }
  }
  closeItem()

  if (parsed.episode !== undefined && /^\d+$/.test(String(parsed.episode))) {
    parsed.episode = Number.parseInt(String(parsed.episode), 10)
  }
  return parsed as EpisodeManifest
}

function titleFromSlug(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export interface EpisodeSummary {
  episodePath: string
  date: string
  number: number
  numberLabel: string
  slug: string
  title: string
  goal: string
  status: string
  type: string
  series?: string
  /** Who the episode is for (`./audience.ts`); `public` unless the manifest says `community`. */
  audience: EpisodeAudience
  /** The cover image named in `episode.yaml`, vessel-relative. */
  cover?: string
  /**
   * What the episode came from: `issue_refs` then `references`, in that order,
   * each item once. `owner/repo#n` items resolve through `issueUrl`.
   */
  references: string[]
  /** `source_paths`, as the manifest lists them. */
  sourcePaths: string[]
  hasManifest: boolean
}

const ISSUE_REF = /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)#(\d+)$/

/** `owner/repo#n` → its GitHub issue URL; null for any other reference. */
export function issueUrl(ref: string): string | null {
  const match = ISSUE_REF.exec(String(ref ?? "").trim())
  return match ? `https://github.com/${match[1]}/issues/${match[2]}` : null
}

export function readEpisodeSummary(episodePath: string, options: VesselOptions = {}): EpisodeSummary {
  const folder = assertEpisodePath(episodePath)
  const { dir } = resolveEpisodeDir(episodePath, options)
  const manifestPath = path.join(dir, "episode.yaml")
  let manifest: EpisodeManifest = {}
  let manifestSource = ""
  if (fs.existsSync(manifestPath) && fs.lstatSync(manifestPath).isFile()) {
    manifestSource = fs.readFileSync(manifestPath, "utf8")
    manifest = parseEpisodeManifest(manifestSource)
  }

  const number = typeof manifest.episode === "number" ? manifest.episode : folder.number
  return {
    ...folder,
    number,
    numberLabel: String(number).padStart(3, "0"),
    title: manifest.title || titleFromSlug(folder.slug),
    goal: manifest.goal || "",
    status: manifest.status || (manifestSource ? "present" : "manifest missing"),
    type: manifest.type || "chronicle-episode",
    date: manifest.date || folder.date,
    ...(manifest.series ? { series: manifest.series } : {}),
    audience: audienceOf(manifest.audience),
    ...(typeof manifest.cover === "string" && manifest.cover ? { cover: manifest.cover } : {}),
    references: [...new Set([...(manifest.issue_refs ?? []), ...(manifest.references ?? [])])],
    sourcePaths: [...(manifest.source_paths ?? [])],
    hasManifest: Boolean(manifestSource),
  }
}

/** Every vessel on the shelf, newest first. */
export function listEpisodes(options: VesselOptions = {}): EpisodeSummary[] {
  const root = resolveChronicleRoot(options.root)
  const episodes: EpisodeSummary[] = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !parseEpisodeFolder(entry.name)) continue
    try {
      episodes.push(readEpisodeSummary(entry.name, { root }))
    } catch {
      // One unreadable vessel must not hide the shelf.
    }
  }
  return episodes.sort(
    (left, right) =>
      String(right.date).localeCompare(String(left.date)) ||
      right.number - left.number ||
      left.title.localeCompare(right.title),
  )
}
