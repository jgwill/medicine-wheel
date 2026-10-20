/**
 * Who an episode is for — the one field of `episode.yaml` this package writes.
 *
 *   audience: public      shown to anyone who reaches the chronicle (the default)
 *   audience: community   shown to people signed in; a visitor does not see it
 *
 * An absent or unknown value reads as `public`, because every episode on the
 * shelf was public before the field existed and a typo must not hide one.
 *
 * WHY HERE. `episode.yaml` is not editable through the file browser
 * (`isEpisodeTextEditable`): it is what a vessel says it is, and free-text edits
 * to it are refused. Deciding an episode is ready for the public is a narrower
 * act than editing the manifest, so it gets its own writer, which changes the
 * `audience:` line and leaves every other byte as it was. Ref jgwill/Miadi#712.
 */

import fs from "node:fs"
import path from "node:path"
import { EpisodePathError } from "./errors.js"
import { resolveEpisodeDir, type VesselOptions } from "./paths.js"

export const EPISODE_AUDIENCES = ["public", "community"] as const
export type EpisodeAudience = (typeof EPISODE_AUDIENCES)[number]

/** The audience a manifest value means: `community` only when it says so. */
export function audienceOf(value: unknown): EpisodeAudience {
  return String(value ?? "").trim().toLowerCase() === "community" ? "community" : "public"
}

export function isEpisodeAudience(value: unknown): value is EpisodeAudience {
  return typeof value === "string" && (EPISODE_AUDIENCES as readonly string[]).includes(value)
}

const AUDIENCE_LINE = /^audience:.*$/m

function manifestPathOf(episodePath: string, options: VesselOptions): string {
  const { dir } = resolveEpisodeDir(episodePath, options)
  const manifestPath = path.join(dir, "episode.yaml")
  if (!fs.existsSync(manifestPath) || !fs.lstatSync(manifestPath).isFile()) {
    throw new EpisodePathError("This episode has no episode.yaml to carry its audience", "NO_MANIFEST")
  }
  return manifestPath
}

/** The audience `episode.yaml` declares; `public` when it declares none or there is no manifest. */
export function readEpisodeAudience(episodePath: string, options: VesselOptions = {}): EpisodeAudience {
  let source: string
  try {
    source = fs.readFileSync(manifestPathOf(episodePath, options), "utf8")
  } catch {
    return "public"
  }
  const line = AUDIENCE_LINE.exec(source)?.[0]
  return audienceOf(line?.slice("audience:".length).replace(/\s+#.*$/, "").replace(/^["'\s]+|["'\s]+$/g, ""))
}

/**
 * Declare who the episode is for. Rewrites the top-level `audience:` line, or
 * appends one, through a temporary file and a rename. Every other line is kept.
 */
export function writeEpisodeAudience(
  episodePath: string,
  audience: EpisodeAudience,
  options: VesselOptions = {},
): { audience: EpisodeAudience; changed: boolean } {
  if (!isEpisodeAudience(audience)) {
    throw new EpisodePathError(`audience must be one of: ${EPISODE_AUDIENCES.join(", ")}`, "INVALID_AUDIENCE")
  }
  const manifestPath = manifestPathOf(episodePath, options)
  const source = fs.readFileSync(manifestPath, "utf8")
  const line = `audience: ${audience}`
  const next = AUDIENCE_LINE.test(source)
    ? source.replace(AUDIENCE_LINE, line)
    : `${source}${source.endsWith("\n") || source.length === 0 ? "" : "\n"}${line}\n`
  if (next === source) return { audience, changed: false }

  const temporary = path.join(path.dirname(manifestPath), `.episode.yaml-${process.pid}-${Date.now()}.tmp`)
  try {
    fs.writeFileSync(temporary, next, { encoding: "utf8", mode: fs.statSync(manifestPath).mode })
    fs.renameSync(temporary, manifestPath)
  } finally {
    fs.rmSync(temporary, { force: true })
  }
  return { audience, changed: true }
}
