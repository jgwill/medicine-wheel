import { test } from "vitest"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  CeremonyAttachments,
  CeremonyNoteEditor,
  DEFAULT_THEME,
  EpisodeFiles,
  EpisodeShelfFilter,
  episodeLinkTarget,
  formatBytes,
  httpEpisodeFiles,
  iconFor,
  mountEpisodeFiles,
  themeVars,
} from "../dist/index.js"
import {
  capabilitiesFor,
  NO_CAPABILITIES,
} from "@medicine-wheel/episode-vessel/permissions"

const here = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(here, "..", "src")

test("every component is exported and is a function", () => {
  for (const [name, component] of Object.entries({
    EpisodeFiles,
    mountEpisodeFiles,
    httpEpisodeFiles,
    CeremonyNoteEditor,
    CeremonyAttachments,
    EpisodeShelfFilter,
  })) {
    assert.equal(typeof component, "function", `${name} is not exported as a component`)
  }
})

/**
 * The contract in one assertion: these components take data and callbacks, and
 * do not reach the network or the filesystem themselves. `http.ts` is the one
 * service module that fetches, and only from URLs the host passes it.
 */
test("no component fetches, holds a URL, or touches a filesystem", () => {
  const sources = readdirSync(srcDir)
    .filter((name) => (name.endsWith(".tsx") || name.endsWith(".ts")) && name !== "http.ts")
    .map((name) => [name, readFileSync(path.join(srcDir, name), "utf8")])

  for (const [name, source] of sources) {
    const code = source.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, "$1")
    for (const forbidden of ["fetch(", "XMLHttpRequest", "node:fs", "http://", "https://", "localhost", "process.env"]) {
      assert.ok(!code.includes(forbidden), `${name} contains ${forbidden}`)
    }
  }
})

test("the capability shape matches what the vessel package hands over", () => {
  // The UI re-declares EpisodeCapabilitiesView structurally so a browser bundle
  // takes no node dependency. If the vessel adds a capability, this fails until
  // the view type follows.
  const fromVessel = Object.keys(capabilitiesFor("admin")).sort()
  const viewType = readFileSync(path.join(srcDir, "types.ts"), "utf8")
  const declared = viewType
    .split("export interface EpisodeCapabilitiesView {")[1]
    .split("}")[0]
    .split("\n")
    .map((line) => line.trim().replace(/:.*$/, ""))
    .filter(Boolean)
    .sort()

  assert.deepEqual(declared, fromVessel, "EpisodeCapabilitiesView has drifted from EpisodeCapabilities")
  assert.deepEqual(Object.keys(NO_CAPABILITIES).sort(), fromVessel)
})

test("the helpers a host renders with", () => {
  assert.equal(formatBytes(512), "512 B")
  assert.equal(formatBytes(2048), "2.0 KB")
  assert.equal(formatBytes(3 * 1024 * 1024), "3.0 MB")
  assert.equal(iconFor({ name: "notes.md", kind: "text" }), "📘")
  assert.equal(iconFor({ name: "take.m4a", kind: "media" }), "🎙")
  assert.equal(iconFor({ name: "proposal.html", kind: "document" }), "🖼")
  assert.equal(iconFor({ name: "still.png", kind: "image" }), "🏞")

  const vars = themeVars(DEFAULT_THEME)
  assert.equal(vars["--episode-accent"], DEFAULT_THEME.accent)
  assert.ok(Object.keys(vars).every((key) => key.startsWith("--episode-")))
})

/**
 * Dimming is how this package says "this file is guidance, not content", and it
 * is the one place a theme can quietly go unreadable. `--episode-muted` carries
 * the 10.5px meta line and the guidance filename, so it is held to the 4.5:1
 * body-text floor against both surfaces it is drawn on.
 */
test("every muted value stays readable on both backgrounds", () => {
  const lin = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4))
  const L = (hex) => {
    const n = Number.parseInt(hex.slice(1), 16)
    return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  }
  const ratio = (a, b) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05)

  for (const surface of [DEFAULT_THEME.background, DEFAULT_THEME.card]) {
    for (const key of ["muted", "textDim", "text", "accent", "warning", "success"]) {
      const r = ratio(DEFAULT_THEME[key], surface)
      assert.ok(r >= 4.5, `${key} (${DEFAULT_THEME[key]}) is ${r.toFixed(2)}:1 on ${surface}, under the 4.5 floor`)
    }
  }
})

test("the stylesheet ships and keeps phone-sized touch targets", () => {
  const css = readFileSync(path.join(srcDir, "episode-ui.css"), "utf8")
  assert.ok(css.includes("min-height: 44px"), "touch targets smaller than 44px on a phone")
  assert.ok(!css.includes("min-height: 40px"), "a 40px target survived the raise to 44px")
  assert.ok(css.includes("var(--episode-accent)"), "the stylesheet does not read the theme")
  assert.ok(!css.includes("@import"), "the stylesheet pulls in another file")
})

test("the browser bundle is self-contained for a page with no bundler", () => {
  const bundle = readFileSync(path.join(here, "..", "dist", "browser", "episode-files.js"), "utf8")
  assert.ok(!/(^|[;\s])import\s*[{"'*\w]/.test(bundle.slice(0, 2000)), "the bundle imports another module")
  assert.ok(!bundle.includes('from"react"') && !bundle.includes("from 'react'"), "the bundle pulls React in")
  assert.ok(bundle.includes("mountEpisodeFiles") || /export\{/.test(bundle), "the bundle exports nothing")
})

test("the http service reads and saves, and a 409 keeps the conflict", async () => {
  const calls = []
  const replies = [
    { status: 200, body: { content: "a", contentType: ".md", size: 1, revision: { sha256: "r1", modifiedAt: "t", bytes: 1 } } },
    { status: 409, body: { error: "CONFLICT", message: "moved", currentRevision: { sha256: "r2", modifiedAt: "t2", bytes: 2 } } },
    { status: 500, body: { success: false, error: "boom" } },
  ]
  const original = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push([url, init?.method ?? "GET", init?.headers])
    const reply = replies.shift()
    return new Response(JSON.stringify(reply.body), { status: reply.status })
  }
  try {
    const service = httpEpisodeFiles({ fileUrl: (f) => `/files/${f.relativePath}`, headers: () => ({ "x-token": "t" }) })
    const file = { relativePath: "notes.md", name: "notes.md", kind: "text" }
    assert.equal((await service.read(file)).revision.sha256, "r1")
    const conflict = await service.save(file, "b", "r1")
    assert.equal(conflict.ok, false)
    assert.equal(conflict.conflict.currentRevision.sha256, "r2")
    assert.equal(conflict.message, "moved")
    const failed = await service.save(file, "b", "r1")
    assert.deepEqual([failed.ok, failed.message], [false, "boom"])
    assert.equal(calls[1][1], "PUT")
    assert.equal(calls[1][2]["x-token"], "t")
    assert.equal(service.mediaUrl(file), "/files/notes.md")
  } finally {
    globalThis.fetch = original
  }
})

test("a link resolves from its file's folder and stays inside the episode", () => {
  const from = "rive-sud/refresh-2026-09-28.md"
  assert.equal(episodeLinkTarget(from, "field-report-2026-09-26.md"), "rive-sud/field-report-2026-09-26.md")
  assert.equal(episodeLinkTarget(from, "./field-report.md#chambly"), "rive-sud/field-report.md")
  assert.equal(episodeLinkTarget(from, "../montreal/notes%20v2.md?x=1"), "montreal/notes v2.md")
  assert.equal(episodeLinkTarget("README.md", "rive-sud/README.md"), "rive-sud/README.md")
  for (const outside of ["../../etc/passwd", "../..", "#top", "/chronicle/x.md", "//host/x.md", "https://a.b/x.md", "mailto:a@b.c", ""]) {
    assert.equal(episodeLinkTarget(from, outside), null, outside)
  }
})
