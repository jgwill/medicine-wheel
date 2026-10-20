import { test } from "vitest"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { hasRipgrep, listEpisodeFiles, loadVesselIgnore, searchVessels } from "../dist/index.js"

const EP_A = "2026-09-17-episode-349-miadi-conducts-a-ceremony-its-circle-can-enter"
const EP_B = "2026-09-26-episode-352-the-annotator-leaves-the-cockpit"

function write(root, rel, content) {
  const file = path.join(root, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

/** A chronicle root with noise to hide, noise to skip, and real hits. */
function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "episode-vessel-search-"))
  write(root, `${EP_A}/episode.yaml`, "episode: 349\ntitle: Miadi conducts a ceremony its circle can enter\n")
  write(root, `${EP_A}/script.md`, "# Script\nOpen a talking circle for the episode.\nnothing here\n")
  write(root, `${EP_A}/ceremonies/603bfaa1/notes.md`, "# Ceremony 603bfaa1 — Talking Circle, east\r\n")
  write(root, `${EP_A}/_sessiondata/run/coordination.md`, "a talking circle inside session data\n")
  write(root, `${EP_A}/captures/1/transcription.txt`, "we opened the talking circle at noon\n")
  write(root, `${EP_A}/sensor.jsonl`, '{"talking circle": true}\n')
  write(root, `${EP_A}/README.MD`, "Upper-case extension, talking circle included\n")
  write(root, `${EP_A}/.hidden/notes.md`, "hidden talking circle\n")
  write(root, `${EP_A}/big.md`, `talking circle\n${"x".repeat(512 * 1024)}\n`)
  write(root, `${EP_B}/episode.yaml`, "episode: 352\ntitle: The annotator leaves the cockpit\n")
  write(root, `${EP_B}/status.md`, "no circle words here\n")
  write(root, `${EP_B}/drafts/old.md`, "a talking circle in a draft the vessel hides\n")
  write(root, `${EP_B}/drafts/keep.md`, "a talking circle the vessel keeps\n")
  write(root, `not-an-episode/notes.md`, "talking circle outside any vessel\n")
  write(root, ".miadiignore", "_sessiondata/\n")
  write(root, `${EP_B}/.miadiignore`, "drafts/*\n!drafts/keep.md\n")
  return root
}

const EXPECTED = [
  [EP_A, "README.MD", 1],
  [EP_A, "captures/1/transcription.txt", 1],
  [EP_A, "ceremonies/603bfaa1/notes.md", 1],
  [EP_A, "script.md", 2],
  [EP_B, "drafts/keep.md", 1],
]

const shape = (result) => result.hits.map((hit) => [hit.episodePath, hit.file, hit.line])

test("the Node engine reads text files only, skips hidden, oversized and ignored paths", async () => {
  const root = makeRoot()
  const result = await searchVessels("TALKING circle", { root, engine: "node" })
  assert.equal(result.engine, "node")
  assert.deepEqual(shape(result), EXPECTED)
  assert.equal(result.truncated, false)
  assert.equal(result.hits[2].text, "# Ceremony 603bfaa1 — Talking Circle, east")
})

test("rg and the Node engine return the same hits, and the same first N under a limit", { skip: !hasRipgrep() }, async () => {
  const root = makeRoot()
  const rg = await searchVessels("talking circle", { root, engine: "rg" })
  const node = await searchVessels("talking circle", { root, engine: "node" })
  assert.equal(rg.engine, "rg")
  assert.deepEqual(rg.hits, node.hits)

  const rgCapped = await searchVessels("talking circle", { root, engine: "rg", limit: 2 })
  const nodeCapped = await searchVessels("talking circle", { root, engine: "node", limit: 2 })
  assert.deepEqual(rgCapped.hits, nodeCapped.hits)
  assert.deepEqual(shape(rgCapped), EXPECTED.slice(0, 2))
  assert.equal(rgCapped.truncated, true)
  assert.equal(nodeCapped.truncated, true)
})

test("rg absent from PATH still searches, through the Node engine", async () => {
  const root = makeRoot()
  const saved = process.env.PATH
  try {
    process.env.PATH = "/nonexistent"
    const result = await searchVessels("talking circle", { root, engine: "node" })
    assert.deepEqual(shape(result), EXPECTED)
  } finally {
    process.env.PATH = saved
  }
})

test("a search can be held to named vessels, and an empty query finds nothing", async () => {
  const root = makeRoot()
  const only = await searchVessels("talking circle", { root, engine: "node", episodes: [EP_B] })
  assert.deepEqual(shape(only), [[EP_B, "drafts/keep.md", 1]])
  const empty = await searchVessels("   ", { root, engine: "node" })
  assert.deepEqual(empty.hits, [])
  await assert.rejects(searchVessels("x", { root, episodes: ["not-an-episode"] }), /Not an episode folder/)
})

test("listEpisodeFiles hides what .miadiignore names, at the root and in the vessel", () => {
  const root = makeRoot()
  const a = listEpisodeFiles(EP_A, { root }).map((file) => file.relativePath)
  assert.ok(!a.some((p) => p.startsWith("_sessiondata/")), a.join(","))
  assert.ok(a.includes("script.md"))
  const b = listEpisodeFiles(EP_B, { root }).map((file) => file.relativePath)
  assert.ok(b.includes("drafts/keep.md"))
  assert.ok(!b.includes("drafts/old.md"))
  const all = listEpisodeFiles(EP_A, { root, respectIgnore: false }).map((file) => file.relativePath)
  assert.ok(all.includes("_sessiondata/run/coordination.md"))
})

test("a vessel without any .miadiignore hides nothing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "episode-vessel-noignore-"))
  write(root, `${EP_A}/a.md`, "x\n")
  const ignored = loadVesselIgnore(root, path.join(root, EP_A))
  assert.equal(ignored("a.md"), false)
  assert.equal(ignored("_sessiondata/"), false)
})

// ── jgwill/Miadi#706 review fixes ─────────────────────────────────────────────

import { isOutsideTheRoom, OUTSIDE_THE_ROOM } from "../dist/index.js"

function makeOddRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "episode-vessel-odd-"))
  write(root, `${EP_A}/episode.yaml`, "episode: 349\n")
  write(root, `${EP_A}/nul.md`, "needle before nul\n\0\nneedle after nul\n")
  write(root, `${EP_A}/latin1.txt`, Buffer.from("café needle\n", "latin1"))
  write(root, `${EP_A}/bom.md`, "﻿needle at the start\n")
  write(root, `${EP_A}/.mw-attention.json`, '{"needle": true}\n')
  write(root, `${EP_A}/greek.md`, "ΟΔΟΣ\nοδος\n")
  write(root, `${EP_A}/Ａ.md`, "needle wide\n")
  write(root, `${EP_A}/😀.md`, "needle emoji\n")
  write(root, `${EP_B}/episode.yaml`, "episode: 352\n")
  write(root, `${EP_B}/status.md`, "needle in the newer one\n")
  return root
}

test("rg and Node agree on NUL bytes, Latin-1, a BOM, dot-files, Greek sigma and byte order", { skip: !hasRipgrep() }, async () => {
  const root = makeOddRoot()
  for (const query of ["needle", "σ", "Σ"]) {
    const rg = await searchVessels(query, { root, engine: "rg" })
    const node = await searchVessels(query, { root, engine: "node" })
    assert.deepEqual(rg.hits, node.hits, query)
  }
  const hits = (await searchVessels("needle", { root, engine: "node" })).hits
  assert.ok(!hits.some((hit) => hit.file.startsWith(".")), "a dot-file is never a hit")
  assert.equal(hits.find((hit) => hit.file === "bom.md").text, "needle at the start")
  assert.equal((await searchVessels("σ", { root, engine: "node" })).hits.length, 2)
  const first = await searchVessels("needle", { root, engine: "rg", limit: 1, episodes: [EP_A] })
  const firstNode = await searchVessels("needle", { root, engine: "node", limit: 1, episodes: [EP_A] })
  assert.deepEqual(first.hits, firstNode.hits)
})

test("newest-first puts the latest vessel's hits first, in both engines", { skip: !hasRipgrep() }, async () => {
  const root = makeOddRoot()
  const rg = await searchVessels("needle", { root, engine: "rg", order: "newest-first", limit: 1 })
  const node = await searchVessels("needle", { root, engine: "node", order: "newest-first", limit: 1 })
  assert.deepEqual(rg.hits, node.hits)
  assert.equal(rg.hits[0].episodePath, EP_B)
})

test("a bad limit is the default, a query is its first line, include refuses paths", async () => {
  const root = makeRoot()
  assert.equal((await searchVessels("talking circle", { root, engine: "node", limit: Number.NaN })).truncated, false)
  assert.equal((await searchVessels("talking circle\nanything", { root, engine: "node" })).hits.length, EXPECTED.length)
  const kept = await searchVessels("talking circle", { root, engine: "node", include: (file) => !isOutsideTheRoom(file) })
  assert.ok(!kept.hits.some((hit) => hit.file.startsWith("captures/") || hit.file.startsWith("ceremonies/")))
  assert.deepEqual([...OUTSIDE_THE_ROOM], ["captures/", "ceremonies/", "desk/"])
})

test("an unreadable file makes the result partial instead of failing it", { skip: process.getuid?.() === 0 }, async () => {
  const root = makeRoot()
  const locked = path.join(root, EP_A, "locked.md")
  fs.writeFileSync(locked, "talking circle locked\n")
  fs.chmodSync(locked, 0o000)
  try {
    const node = await searchVessels("talking circle", { root, engine: "node" })
    assert.equal(node.partial, true)
    if (hasRipgrep()) {
      const rg = await searchVessels("talking circle", { root, engine: "rg" })
      assert.equal(rg.partial, true)
      assert.deepEqual(rg.hits, node.hits)
    }
  } finally {
    fs.chmodSync(locked, 0o644)
  }
})

test("an aborted search stops with an AbortError", async () => {
  const root = makeRoot()
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(searchVessels("talking circle", { root, signal: controller.signal }), (error) => error.name === "AbortError")
})

test("no .miadiignore hides the manifest, the top-level README or a guidance document", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "episode-vessel-never-hidden-"))
  write(root, `${EP_A}/episode.yaml`, "episode: 349\n")
  write(root, `${EP_A}/README.md`, "# room\n")
  write(root, `${EP_A}/AGENTS.md`, "guidance\n")
  write(root, `${EP_A}/notes.md`, "x\n")
  write(root, `${EP_A}/.miadiignore`, "*\n")
  const listed = listEpisodeFiles(EP_A, { root }).map((file) => file.relativePath).sort()
  assert.deepEqual(listed, ["AGENTS.md", "README.md"])
})

// ── a notebook and a screenwalk record are in the room (Episode 550, T6 step 8) ──

test("under captures/, a notebook's media and a screenwalk's record are in the room, recordings are not", () => {
  for (const inside of [
    "captures/notebook-0ae51b4c-8ed2-4ee2-a641-2c7e88b7e2ea/README.md",
    "captures/notebook-0ae51b4c-8ed2-4ee2-a641-2c7e88b7e2ea/keep/overview.mp4",
    "captures/screenwalk-2610061207/screenwalk.json",
    "./captures/screenwalk-261005-001/screenwalk.json",
    "script.md",
  ]) assert.equal(isOutsideTheRoom(inside), false, inside)
  for (const outside of [
    "captures/screenwalk-2610061207/transcription-gemini.txt",
    "captures/screenwalk-2610061207/seat-miadi-review-upgrades-261006.md",
    "captures/screenwalk-2610061207/capture.json",
    "captures/2026-08-01-take/capture.json",
    "captures/notebook-x/../screenwalk-2610061207/transcription-gemini.txt",
    "captures/notebook-x/../../ceremonies/abc/notes.md",
    "captures/notebook-x/",
    "x/../captures/screenwalk-2610061207/transcription-gemini.txt",
    "ceremonies/abc/notes.md",
  ]) assert.equal(isOutsideTheRoom(outside), true, outside)
})

test("an Author's Desk is outside the room: its drafts and crossing are private writing (jgwill/Miadi#780)", () => {
  for (const outside of ["desk/abc.desk.json", "desk/abc.crossing.json", "./desk/x.desk.json", "notes/../desk/x.desk.json"]) {
    assert.equal(isOutsideTheRoom(outside), true, outside)
  }
  for (const inside of ["desk.md", "desks/readme.md", "script.md"]) assert.equal(isOutsideTheRoom(inside), false, inside)
})
