import { test } from "vitest"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { issueUrl, listEpisodes, parseEpisodeManifest, readEpisodeSummary } from "../dist/index.js"

const EPISODE = "2026-07-20-episode-291-chronicle-into-miadi"

function roomWith(manifest) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "episode-vessel-lists-"))
  fs.mkdirSync(path.join(root, EPISODE))
  if (manifest !== undefined) fs.writeFileSync(path.join(root, EPISODE, "episode.yaml"), manifest)
  return root
}

test("issue_refs and references are one claim: issue_refs first, each item once", () => {
  const root = roomWith(
    [
      "episode: 291",
      "title: Chronicle into Miadi",
      "issue_refs:",
      "  - jgwill/Miadi#505    # workspace:* publish bug: healed this episode",
      "  - jgwill/Miadi#506    # design: bring the chronicle into the app",
      "references:",
      '  - "jgwill/Miadi#506"',
      '  - "miadi-review:abb8fe26-70f5-4dc0-bc8b-63211a606233"',
      "  - https://github.com/jgwill/miadi-passages/issues/9",
      "source_paths:",
      "  - /srv/miadi/episodes/miadi-chronicle/",
      "lineage:",
      "  continues_from:",
      "    - episode: 290",
      "",
    ].join("\n"),
  )
  const summary = readEpisodeSummary(EPISODE, { root })
  assert.deepEqual(summary.references, [
    "jgwill/Miadi#505",
    "jgwill/Miadi#506",
    "miadi-review:abb8fe26-70f5-4dc0-bc8b-63211a606233",
    "https://github.com/jgwill/miadi-passages/issues/9",
  ])
  assert.deepEqual(summary.sourcePaths, ["/srv/miadi/episodes/miadi-chronicle/"])
  assert.equal(summary.title, "Chronicle into Miadi", "scalars still read")
})

test("an episode with no lists, or no manifest, has empty lists", () => {
  const bare = readEpisodeSummary(EPISODE, { root: roomWith("title: Bare\n") })
  assert.deepEqual(bare.references, [])
  assert.deepEqual(bare.sourcePaths, [])

  const none = readEpisodeSummary(EPISODE, { root: roomWith() })
  assert.equal(none.hasManifest, false)
  assert.deepEqual(none.references, [])
  assert.deepEqual(none.sourcePaths, [])

  assert.deepEqual(listEpisodes({ root: roomWith("references:\n  - a/b#1\n") })[0].references, ["a/b#1"])
})

test("a quoted item may run over several lines, folded as YAML folds it", () => {
  const manifest = parseEpisodeManifest(
    [
      "references:",
      '  - "/data/srv/miadi-chronicle/2026-07-13-\\',
      '    episode-128-gmtermux-cloudflare"',
      '  - "jgwill/veritas @ c550ca4, branch feat/stc-live',
      '    (STC live surface)"',
      "  - 'it''s single-quoted",
      "    and folded'",
      '  - "two\\tescapes \\u00e9"',
      "title: after the list",
    ].join("\n"),
  )
  assert.deepEqual(manifest.references, [
    "/data/srv/miadi-chronicle/2026-07-13-episode-128-gmtermux-cloudflare",
    "jgwill/veritas @ c550ca4, branch feat/stc-live (STC live surface)",
    "it's single-quoted and folded",
    "two\tescapes é",
  ])
  assert.equal(manifest.title, "after the list")
})

test("a plain item may run over several lines and ends at a comment", () => {
  const manifest = parseEpisodeManifest(
    ["references:", "  - chart_1785633806340 in", "    the seat review chart # why", "    not this", "  - next"].join("\n"),
  )
  assert.deepEqual(manifest.references, ["chart_1785633806340 in the seat review chart", "next"])
})

test("map items, nested lists and block scalars are not strings, and are skipped", () => {
  const manifest = parseEpisodeManifest(
    [
      "references:",
      "  - kind: issue",
      "    ref: jgwill/Miadi#1",
      "  - user: jgi",
      "  - [nested, list]",
      "  - |",
      "    a block",
      "  -",
      "    - deeper",
      "  - kept/repo#2",
    ].join("\n"),
  )
  assert.deepEqual(manifest.references, ["kept/repo#2"])
})

test("a flow list is read, and a list key holding a scalar stays empty", () => {
  const flow = parseEpisodeManifest('issue_refs: [jgwill/Miadi#1, "a, b", \'c\']  # three\nsource_paths: []\n')
  assert.deepEqual(flow.issue_refs, ["jgwill/Miadi#1", "a, b", "c"])
  assert.deepEqual(flow.source_paths, [])

  const scalar = parseEpisodeManifest("references: jgwill/Miadi#1\n")
  assert.deepEqual(scalar.references, [])
})

test("a list at the key's own column, with comments and blank lines inside it", () => {
  const manifest = parseEpisodeManifest(
    ["references:", "- a/b#1", "", "# a comment", "- a/b#2", "status: open"].join("\n"),
  )
  assert.deepEqual(manifest.references, ["a/b#1", "a/b#2"])
  assert.equal(manifest.status, "open")
})

test("nested sequences, nested flow collections and null words are not strings", () => {
  const block = parseEpisodeManifest(["references:", "  - - a", "  - b", "  - ~", "  - null", "  - ? a", "  - -", "  - kept"].join("\n"))
  assert.deepEqual(block.references, ["b", "kept"])
  assert.deepEqual(parseEpisodeManifest("references: [a, [b, c], {d: e}, f]\n").references, ["a", "f"])
})

test("a flow list may run over several lines, with comments outside its quotes", () => {
  const manifest = parseEpisodeManifest(
    ["references: [  # opening", "  a,  # first", '  "b # not a comment",', "  c", "]", "title: after"].join("\n"),
  )
  assert.deepEqual(manifest.references, ["a", "b # not a comment", "c"])
  assert.equal(manifest.title, "after")
})

test("YAML escapes in double quotes are applied", () => {
  const manifest = parseEpisodeManifest('references:\n  - "caf\\xe9 \\U0001F600 a\\ b \\u2014"\n')
  assert.deepEqual(manifest.references, ["café 😀 a b —"])
})

test("a long run of spaces before a comment-like character reads in linear time", () => {
  const source = `references:\n  - a${" ".repeat(40000)}b\ntitle: x${" ".repeat(40000)}y\n`
  const started = performance.now()
  const manifest = parseEpisodeManifest(source)
  assert.ok(performance.now() - started < 1000, "0.4.0 took seconds on this input")
  assert.equal(manifest.references[0].length, 40002)
})

test("issueUrl links owner/repo#n and nothing else", () => {
  assert.equal(issueUrl("jgwill/Miadi#766"), "https://github.com/jgwill/Miadi/issues/766")
  assert.equal(issueUrl("  miadisabelle/gmtermux#33 "), "https://github.com/miadisabelle/gmtermux/issues/33")
  assert.equal(issueUrl("jgwill/miadi-orchestration-kit#53"), "https://github.com/jgwill/miadi-orchestration-kit/issues/53")
  assert.equal(issueUrl("#766"), null)
  assert.equal(issueUrl("jgwill/Miadi#766 and more"), null)
  assert.equal(issueUrl("https://github.com/jgwill/Miadi/issues/766"), null)
  assert.equal(issueUrl("miadi-review:abb8fe26"), null)
  assert.equal(issueUrl(undefined), null)
})
