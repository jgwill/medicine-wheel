import { test } from "vitest"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { EpisodePathError, listEpisodes, readEpisodeAudience, readEpisodeSummary, writeEpisodeAudience } from "../dist/index.js"

const EPISODE = "2026-10-01-episode-999-ava-gesture-ceremony"
const MANIFEST = "episode: 999\ntitle: Ava Gesture Ceremony\nstatus: live-test\nlineage:\n  relates_to:\n    - episode: 339\n"

function makeRoot(manifest = MANIFEST) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "episode-audience-"))
  fs.mkdirSync(path.join(root, EPISODE))
  if (manifest !== null) fs.writeFileSync(path.join(root, EPISODE, "episode.yaml"), manifest)
  return root
}

test("an episode is public until its manifest says community", () => {
  const root = makeRoot()
  assert.equal(readEpisodeAudience(EPISODE, { root }), "public")
  assert.equal(readEpisodeSummary(EPISODE, { root }).audience, "public")
  fs.appendFileSync(path.join(root, EPISODE, "episode.yaml"), "audience: Communty\n")
  assert.equal(readEpisodeAudience(EPISODE, { root }), "public", "an unknown value does not hide an episode")
})

test("the writer changes the audience line and keeps every other byte", () => {
  const root = makeRoot()
  const file = path.join(root, EPISODE, "episode.yaml")
  assert.deepEqual(writeEpisodeAudience(EPISODE, "community", { root }), { audience: "community", changed: true })
  assert.equal(fs.readFileSync(file, "utf8"), `${MANIFEST}audience: community\n`)
  assert.equal(readEpisodeAudience(EPISODE, { root }), "community")
  assert.equal(listEpisodes({ root })[0].audience, "community")

  assert.deepEqual(writeEpisodeAudience(EPISODE, "community", { root }), { audience: "community", changed: false })
  writeEpisodeAudience(EPISODE, "public", { root })
  assert.equal(fs.readFileSync(file, "utf8"), `${MANIFEST}audience: public\n`)
  assert.deepEqual(fs.readdirSync(path.join(root, EPISODE)).filter((name) => name.endsWith(".tmp")), [])
})

test("the writer refuses an unknown audience and a vessel without a manifest", () => {
  assert.throws(() => writeEpisodeAudience(EPISODE, "everyone", { root: makeRoot() }), (error) => error instanceof EpisodePathError && error.code === "INVALID_AUDIENCE")
  const bare = makeRoot(null)
  assert.equal(readEpisodeAudience(EPISODE, { root: bare }), "public")
  assert.throws(() => writeEpisodeAudience(EPISODE, "community", { root: bare }), (error) => error.code === "NO_MANIFEST")
})
