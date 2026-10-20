/**
 * `.miadiignore`: paths a vessel keeps on disk but no surface lists or
 * searches (jgwill/Miadi#706).
 *
 * Same syntax as `.gitignore`. Two places are read:
 *
 * - `<chronicle root>/.miadiignore`, matched against `<episode>/<path>`, so a
 *   bare `_sessiondata/` hides that folder in every vessel.
 * - `<episode>/.miadiignore`, matched against the path inside that vessel.
 *
 * Measured on 2026-09-27: of 97.1 MB of text in the chronicle, 80.5 MB was
 * `.jsonl` session and sensor logs under folders such as `_sessiondata/` and
 * `sensor_data/`. Those are what the root file names first.
 *
 * The file only hides. `resolveEpisodeFile` still opens an ignored path that
 * is asked for by name, since hiding is about noise, not access.
 */

import fs from "node:fs"
import path from "node:path"
import ignore from "ignore"
import { GUIDANCE_DOCUMENTS } from "./files.js"

export const MIADI_IGNORE_FILE = ".miadiignore"

/** True when a path inside the vessel is hidden. Directories end with `/`. */
export type VesselIgnore = (relativePath: string) => boolean

function readRules(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8")
  } catch {
    return null
  }
}

/**
 * The combined rule for one vessel. `root` and `dir` are real, resolved paths
 * (as `resolveEpisodeDir` returns them).
 */
export function loadVesselIgnore(root: string, dir: string): VesselIgnore {
  const rootRules = readRules(path.join(root, MIADI_IGNORE_FILE))
  const vesselRules = readRules(path.join(dir, MIADI_IGNORE_FILE))
  if (rootRules === null && vesselRules === null) return () => false

  const episode = path.relative(root, dir).split(path.sep).join("/")
  const atRoot = rootRules === null ? null : ignore().add(rootRules)
  const inVessel = vesselRules === null ? null : ignore().add(vesselRules)
  return (relativePath) =>
    !neverHidden(relativePath) &&
    ((atRoot !== null && atRoot.ignores(`${episode}/${relativePath}`)) ||
      (inVessel !== null && inVessel.ignores(relativePath)))
}

/**
 * What no `.miadiignore` hides: the manifest, the vessel's top-level README and
 * any guidance document. Hiding a file that exists is the worse error
 * (files.ts), and a vessel's own rule could otherwise empty its listing
 * (jgwill/Miadi#706 library review, F8).
 */
function neverHidden(relativePath: string): boolean {
  if (relativePath.endsWith("/")) return false
  if (relativePath === "episode.yaml" || /^README\.md$/i.test(relativePath)) return true
  const basename = relativePath.slice(relativePath.lastIndexOf("/") + 1)
  return GUIDANCE_DOCUMENTS.has(basename)
}
