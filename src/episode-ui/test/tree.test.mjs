/**
 * The folders of an episode: the order the paths are grouped in, and the
 * workspace drawing them — every folder open by default, a folder that closes
 * and opens, a filter that is never hidden by a closed folder, and a file
 * opened from a link or an address that shows the folders it sits in.
 *
 * Same browser rule as images.test.mjs: the browser tests are skipped with the
 * reason where no Chrome starts.
 */
import { test, afterAll as after } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { ancestorFolders, buildFileTree, folderPaths } from "../dist/index.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const bundle = readFileSync(path.join(here, "..", "dist", "browser", "episode-files.js"), "utf8")
const css = readFileSync(path.join(here, "..", "src", "episode-ui.css"), "utf8")

const view = (relativePath, kind = "text", extra = {}) => ({
  relativePath,
  name: relativePath.split("/").pop(),
  kind,
  size: 10,
  modifiedAt: "t",
  previewable: kind === "text",
  editable: false,
  guidance: false,
  ...extra,
})

// The shape of the ledger that asked for this: a root with README, chapters,
// and folders two deep, listed by the vessel in its own flat order.
const LEDGER = [
  view("README.md"),
  view("chapter-10-the-last.md"),
  view("chapter-2-the-board.md"),
  view("context-setting.md"),
  view("AGENTS.md", "text", { guidance: true }),
  view("downloads/ep044-perplexity.md"),
  view("foundations/miaco-decompose/README.md"),
  view("foundations/miaco-decompose/context-layer.md"),
  view("foundations/overview.md"),
  view("images/room.png", "image"),
  view("images/map.png", "image"),
]

const shape = (folder) =>
  folder.children.map((node) => (node.type === "folder" ? { [node.name + "/"]: shape(node) } : node.name))

test("files are grouped under the folders their paths name", () => {
  const tree = buildFileTree(LEDGER)
  assert.deepEqual(shape(tree), [
    "README.md",
    { "downloads/": ["ep044-perplexity.md"] },
    { "foundations/": [{ "miaco-decompose/": ["README.md", "context-layer.md"] }, "overview.md"] },
    { "images/": ["map.png", "room.png"] },
    "chapter-2-the-board.md",
    "chapter-10-the-last.md",
    "context-setting.md",
    "AGENTS.md",
  ])
})

test("each folder counts every file beneath it, at any depth", () => {
  const tree = buildFileTree(LEDGER)
  const folder = (...names) => names.reduce((at, name) => at.children.find((node) => node.type === "folder" && node.name === name), tree)
  assert.equal(tree.fileCount, LEDGER.length)
  assert.equal(folder("foundations").fileCount, 3)
  assert.equal(folder("foundations", "miaco-decompose").fileCount, 2)
  assert.equal(folder("foundations", "miaco-decompose").path, "foundations/miaco-decompose")
  assert.equal(folder("downloads").fileCount, 1)
})

test("a path listed twice is kept once, and an empty list is an empty root", () => {
  const tree = buildFileTree([view("a/x.md"), view("a/x.md")])
  assert.equal(tree.fileCount, 1)
  assert.deepEqual(shape(tree), [{ "a/": ["x.md"] }])
  assert.deepEqual(buildFileTree([]).children, [])
})

test("ancestorFolders and folderPaths name the folders, outermost first", () => {
  assert.deepEqual(ancestorFolders("a/b/c.md"), ["a", "a/b"])
  assert.deepEqual(ancestorFolders("c.md"), [])
  assert.deepEqual(folderPaths(buildFileTree(LEDGER)), [
    "downloads",
    "foundations",
    "foundations/miaco-decompose",
    "images",
  ])
})

let browser = null
let skip = false
try {
  const { chromium } = await import("@playwright/test")
  browser = await chromium
    .launch({ channel: "chrome", headless: true })
    .catch(() => chromium.launch({ headless: true }))
} catch (error) {
  skip = `no browser to drive: ${String(error?.message ?? error).split("\n")[0]}`
}
after(async () => {
  await browser?.close()
})

const ORIGIN = "http://episode.test"
const PAGE = `<!doctype html><html><head><style>${css}</style></head><body><div id="files"></div>
<script type="module">
  import { mountEpisodeFiles } from "${ORIGIN}/episode-files.js"
  window.mountWith = (files, extra) => {
    const service = {
      read: async () => ({ content: "# Hello", contentType: ".md", size: 1, revision: { sha256: "r1", modifiedAt: "t", bytes: 1 } }),
      save: async () => ({ ok: false }),
      mediaUrl: (file) => "${ORIGIN}/media/" + file.relativePath,
    }
    window.handle = mountEpisodeFiles(document.getElementById("files"), { files, service, capabilities: { read: true }, confirmDiscard: () => true, ...extra })
  }
  window.ready = true
</script></body></html>`

let page
async function fresh(files, extra) {
  page = await browser.newPage()
  await page.route(`${ORIGIN}/**`, (route) => {
    const url = route.request().url()
    if (url.endsWith("/episode-files.js")) return route.fulfill({ contentType: "text/javascript", body: bundle })
    if (url.includes("/media/")) return route.fulfill({ contentType: "image/png", body: Buffer.from([0x89, 0x50]) })
    return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE })
  })
  await page.goto(`${ORIGIN}/`)
  await page.waitForFunction(() => window.ready === true)
  await page.evaluate(([f, e]) => window.mountWith(f, e), [files, extra ?? {}])
}

const paths = () => page.evaluate(() => [...document.querySelectorAll(".episode-files-open")].map((n) => n.dataset.path))
const folders = () =>
  page.evaluate(() =>
    [...document.querySelectorAll(".episode-files-folder-toggle")].map((n) => [n.dataset.folder, n.getAttribute("aria-expanded")]),
  )
const fold = () => page.evaluate(() => document.querySelector(".episode-files-fold").textContent)

test("every folder is open by default and a file's folder is the one it sits in", { skip }, async () => {
  await fresh(LEDGER)
  assert.deepEqual(await folders(), [
    ["downloads", "true"],
    ["foundations", "true"],
    ["foundations/miaco-decompose", "true"],
    ["images", "true"],
  ])
  assert.equal((await paths()).length, LEDGER.length, "no file is hidden")
  const nested = await page.evaluate(() => {
    const row = document.querySelector('.episode-files-open[data-path="foundations/miaco-decompose/context-layer.md"]')
    return {
      says: row.querySelector(".episode-files-path").textContent,
      title: row.title,
      inside: [...document.querySelectorAll(".episode-files-folder")]
        .filter((folder) => folder.contains(row))
        .map((folder) => folder.querySelector(".episode-files-folder-toggle").dataset.folder),
    }
  })
  assert.equal(nested.says, "context-layer.md", "the row says the name")
  assert.equal(nested.title, "foundations/miaco-decompose/context-layer.md", "the whole path is its tooltip")
  assert.deepEqual(nested.inside, ["foundations", "foundations/miaco-decompose"])
  const meta = await page.evaluate(() => document.querySelector('[data-folder="foundations"] .episode-files-meta').textContent)
  assert.equal(meta, "3 files")
})

test("a folder closes and opens, and the keyboard stays on it", { skip }, async () => {
  await fresh(LEDGER)
  await page.locator('[data-folder="foundations"]').click()
  assert.deepEqual(
    (await folders()).find(([folder]) => folder === "foundations"),
    ["foundations", "false"],
  )
  const shown = await paths()
  assert.ok(!shown.some((p) => p.startsWith("foundations/")), "its files are not drawn while it is closed")
  assert.ok(shown.includes("downloads/ep044-perplexity.md"), "another folder is untouched")
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.folder), "foundations", "focus did not fall to the page")
  await page.keyboard.press("Enter")
  assert.equal((await paths()).length, LEDGER.length)
})

test("Collapse all closes every folder and Expand all opens them again", { skip }, async () => {
  await fresh(LEDGER)
  assert.equal(await fold(), "Collapse all")
  await page.locator(".episode-files-fold").click()
  assert.deepEqual(await folders(), [
    ["downloads", "false"],
    ["foundations", "false"],
    ["images", "false"],
  ], "a closed folder draws none of its own folders")
  assert.deepEqual(
    (await paths()).sort(),
    ["AGENTS.md", "README.md", "chapter-10-the-last.md", "chapter-2-the-board.md", "context-setting.md"],
    "only the root's own files remain",
  )
  assert.equal(await fold(), "Expand all")
  await page.locator(".episode-files-fold").click()
  assert.equal((await paths()).length, LEDGER.length)
  assert.equal(await fold(), "Collapse all")
})

test("a filter shows its matches in their folders, whatever was closed", { skip }, async () => {
  await fresh(LEDGER)
  await page.locator(".episode-files-fold").click()
  await page.fill(".episode-files-filter", "context")
  assert.deepEqual((await paths()).sort(), ["context-setting.md", "foundations/miaco-decompose/context-layer.md"])
  assert.deepEqual(await folders(), [
    ["foundations", "true"],
    ["foundations/miaco-decompose", "true"],
  ])
  assert.equal(await page.evaluate(() => document.querySelector(".episode-files-fold").disabled), true, "fold rests while filtering")
  await page.locator('[data-path="foundations/miaco-decompose/context-layer.md"]').click()
  await page.waitForFunction(
    () => document.querySelector(".episode-files-name")?.textContent === "foundations/miaco-decompose/context-layer.md",
  )
  await page.fill(".episode-files-filter", "")
  assert.equal(await page.evaluate(() => document.querySelector(".episode-files-fold").disabled), false)
  assert.equal((await paths()).length, 5, "the folders closed before the filter are still closed")
})

test("a file the host asks for opens its folders", { skip }, async () => {
  await fresh(LEDGER)
  await page.locator(".episode-files-fold").click()
  await page.evaluate(() => window.handle.update({ open: { path: "foundations/miaco-decompose/context-layer.md", reveal: false } }))
  await page.waitForFunction(() => document.querySelector(".episode-files-name")?.textContent === "foundations/miaco-decompose/context-layer.md")
  assert.deepEqual(await folders(), [
    ["downloads", "false"],
    ["foundations", "true"],
    ["foundations/miaco-decompose", "true"],
    ["images", "false"],
  ])
  assert.equal(
    await page.evaluate(() => document.querySelector('[data-path="foundations/miaco-decompose/context-layer.md"]').getAttribute("aria-current")),
    "true",
  )
})

test('listing "flat" keeps the old list: whole paths, no folders, no fold button', { skip }, async () => {
  await fresh(LEDGER, { listing: "flat" })
  assert.equal(await page.locator(".episode-files-folder-toggle").count(), 0)
  assert.equal(await page.evaluate(() => document.querySelector(".episode-files-fold").hidden), true)
  assert.deepEqual(
    await page.evaluate(() => [...document.querySelectorAll(".episode-files-path")].map((n) => n.textContent).sort()),
    LEDGER.map((file) => file.relativePath).sort(),
  )
})

test("a list with no folder looks as it did: no fold button", { skip }, async () => {
  await fresh([view("a.md"), view("b.md")])
  assert.equal(await page.locator(".episode-files-folder-toggle").count(), 0)
  assert.equal(await page.evaluate(() => document.querySelector(".episode-files-fold").hidden), true)
  assert.deepEqual(await paths(), ["a.md", "b.md"])
})
