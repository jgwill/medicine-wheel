/**
 * Images in the workspace, in a real browser against the no-bundler build: an
 * image opens inline, a markdown preview shows the episode's own images, and a
 * role that may upload adds images that appear at once (jgwill/Miadi#735).
 *
 * Same browser rule as selection.test.mjs: skipped with the reason where no
 * Chrome starts.
 */
import { test, afterAll as after } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { httpEpisodeFiles, imageUploadPath } from "../dist/index.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const bundle = readFileSync(path.join(here, "..", "dist", "browser", "episode-files.js"), "utf8")
const css = readFileSync(path.join(here, "..", "src", "episode-ui.css"), "utf8")
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

test("a chosen image gets a safe, unused path under images/", () => {
  const taken = new Set(["images/still.png", "images/still-2.png"])
  const has = (p) => taken.has(p)
  assert.equal(imageUploadPath("still.png", "image/png", has), "images/still-3.png")
  assert.equal(imageUploadPath("Écran du 7 oct.JPG", "image/jpeg", has), "images/Ecran-du-7-oct.jpg")
  assert.equal(imageUploadPath("IMG_0042", "image/jpeg", has), "images/IMG_0042.jpg", "a name with no extension takes its type's")
  assert.equal(imageUploadPath("../../.ssh.png", "image/png", has), "images/ssh.png")
  assert.equal(imageUploadPath("...png", "image/png", has), "images/image.png")
  assert.equal(imageUploadPath("drawing.svg", "image/svg+xml", has), null, "svg is not taken")
  assert.equal(imageUploadPath("notes.txt", "text/plain", has), null)
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
  window.uploads = []
  window.added = []
  window.mountWith = (files, capabilities, withUpload) => {
    const service = {
      read: async () => ({
        content: "# Script\\n\\n![the room](images/room.png)\\n\\n![elsewhere](images/missing.png)",
        contentType: ".md",
        size: 1,
        revision: { sha256: "r1", modifiedAt: "t", bytes: 1 },
      }),
      save: async () => ({ ok: false }),
      mediaUrl: (file) => "${ORIGIN}/media/" + file.relativePath,
    }
    if (window.withRecords) {
      window.saved = []
      window.covers = []
      service.readRecord = async (file) => ({
        record: { media: file.name, role: "map", caption: "The Screenwalk Lifecycle", alt: "An infographic of the lifecycle", origin: { kind: "generated", tool: "Gemini Notebook infographic" } },
        revision: "r1",
        credit: "Generated with Gemini Notebook infographic · chosen by Guillaume",
      })
      service.saveRecord = async (file, record, expectedRevision) => {
        window.saved.push({ path: file.relativePath, record, expectedRevision })
        return { record, revision: "r2", credit: null }
      }
      service.setCover = async (file) => { window.covers.push(file.relativePath) }
    }
    if (withUpload) {
      service.upload = async (relativePath, image) => {
        window.uploads.push({ relativePath, size: image.size, type: image.type })
        if (relativePath.includes("taken")) return { ok: false, exists: true, message: "already exists" }
        return { ok: true, file: { relativePath, name: relativePath.split("/").pop(), kind: "image", size: image.size, modifiedAt: "t", previewable: false, editable: false, guidance: false } }
      }
    }
    window.handle = mountEpisodeFiles(document.getElementById("files"), {
      files,
      capabilities,
      service,
      confirmDiscard: () => true,
      onFilesAdded: (added) => window.added.push(...added.map((file) => file.relativePath)),
    })
  }
  window.ready = true
</script></body></html>`

const view = (relativePath, kind) => ({
  relativePath, name: relativePath.split("/").pop(), kind, size: 10, modifiedAt: "t",
  previewable: kind === "text", editable: false, guidance: false,
})
const FILES = [view("script.md", "text"), view("images/room.png", "image")]

let page
async function fresh(files, capabilities, withUpload) {
  page = await browser.newPage()
  await page.route(`${ORIGIN}/**`, (route) => {
    const url = route.request().url()
    if (url.endsWith("/episode-files.js")) return route.fulfill({ contentType: "text/javascript", body: bundle })
    if (url.includes("/media/")) return route.fulfill({ contentType: "image/png", body: PNG })
    return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE })
  })
  await page.goto(`${ORIGIN}/`)
  await page.waitForFunction(() => window.ready === true)
  await page.evaluate(([f, c, u]) => window.mountWith(f, c, u), [files, capabilities, withUpload])
}

// A tree row says only the file's name, so a row is found by the path it carries.
const openRow = (relativePath) => page.locator(`.episode-files-open[data-path="${relativePath}"]`).click()

test("an image opens inline from the host's media address", { skip }, async () => {
  await fresh(FILES, { read: true }, false)
  await openRow("images/room.png")
  const image = await page.evaluate(() => {
    const img = document.querySelector(".episode-files-media img")
    return img && { src: img.getAttribute("src"), alt: img.alt }
  })
  assert.deepEqual(image, { src: `${ORIGIN}/media/images/room.png`, alt: "images/room.png" })
})

test("a markdown preview shows the episode's own images and leaves the rest as written", { skip }, async () => {
  await fresh(FILES, { read: true }, false)
  await openRow("script.md")
  await page.waitForSelector(".episode-files-preview img")
  const sources = await page.evaluate(() =>
    [...document.querySelectorAll(".episode-files-preview img")].map((img) => img.getAttribute("src")),
  )
  assert.deepEqual(sources, [`${ORIGIN}/media/images/room.png`, "images/missing.png"])
})

test("Add images is offered only to a role that may upload, through a service that can", { skip }, async () => {
  const hidden = async () => page.evaluate(() => document.querySelector(".episode-files-add").hidden)
  await fresh(FILES, { read: true, upload: false }, true)
  assert.equal(await hidden(), true, "no upload capability")
  await fresh(FILES, { read: true, upload: true }, false)
  assert.equal(await hidden(), true, "no upload in the service")
  await fresh(FILES, { read: true, upload: true }, true)
  assert.equal(await hidden(), false)
})

test("a host re-rendering with its old list does not drop images just added", { skip }, async () => {
  await fresh(FILES, { read: true, upload: true }, true)
  await page.setInputFiles(".episode-files input[type=file]", [{ name: "late.png", mimeType: "image/png", buffer: PNG }])
  await page.waitForFunction(() => window.added.length === 1)
  const rows = () => page.evaluate(() => [...document.querySelectorAll(".episode-files-open")].map((n) => n.dataset.path))
  await page.evaluate((files) => window.handle.update({ files }), FILES)
  assert.ok((await rows()).includes("images/late.png"), "kept while the host's list lags")
  const refreshed = [...FILES, view("images/late.png", "image")]
  await page.evaluate((files) => window.handle.update({ files }), refreshed)
  assert.equal((await rows()).filter((p) => p === "images/late.png").length, 1, "listed once when the host catches up")
})

test("httpEpisodeFiles offers upload only when the host names its URL", () => {
  assert.equal(typeof httpEpisodeFiles({ fileUrl: () => "/f" }).upload, "undefined")
  assert.equal(typeof httpEpisodeFiles({ fileUrl: () => "/f", uploadUrl: (p) => "/f/" + p }).upload, "function")
})

test("chosen images are added one by one, listed at once, and the last one opens", { skip }, async () => {
  await fresh(FILES, { read: true, upload: true }, true)
  await page.setInputFiles(".episode-files input[type=file]", [
    { name: "room.png", mimeType: "image/png", buffer: PNG },
    { name: "taken.png", mimeType: "image/png", buffer: PNG },
    { name: "frame two.png", mimeType: "image/png", buffer: PNG },
  ])
  await page.waitForFunction(() => window.added.length === 2)
  const state = await page.evaluate(() => ({
    uploads: window.uploads.map((u) => u.relativePath),
    added: window.added,
    rows: [...document.querySelectorAll(".episode-files-open")].map((n) => n.dataset.path),
    open: document.querySelector(".episode-files-name").textContent,
    status: document.querySelector(".episode-files-add-status").textContent,
  }))
  assert.deepEqual(state.uploads, ["images/room-2.png", "images/taken.png", "images/frame-two.png"])
  assert.deepEqual(state.added, ["images/room-2.png", "images/frame-two.png"])
  assert.ok(state.rows.includes("images/frame-two.png"))
  assert.equal(state.open, "images/frame-two.png")
  assert.match(state.status, /taken\.png: already exists/)
})

test("an image shows its record and credit, and a writer describes it and makes it the cover", { skip }, async () => {
  page = await browser.newPage()
  await page.route(`${ORIGIN}/**`, (route) => {
    const url = route.request().url()
    if (url.endsWith("/episode-files.js")) return route.fulfill({ contentType: "text/javascript", body: bundle })
    if (url.includes("/media/")) return route.fulfill({ contentType: "image/png", body: PNG })
    return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE })
  })
  await page.goto(`${ORIGIN}/`)
  await page.waitForFunction(() => window.ready === true)
  await page.evaluate(([f]) => { window.withRecords = true; window.mountWith(f, { read: true, edit: true }, false) }, [FILES])
  await openRow("images/room.png")
  await page.waitForSelector(".episode-files-record .episode-files-credit")
  const shown = await page.evaluate(() => ({
    caption: document.querySelector(".episode-files-caption")?.textContent,
    role: document.querySelector(".episode-files-role")?.textContent,
    credit: document.querySelector(".episode-files-credit")?.textContent,
    alt: document.querySelector(".episode-files-image")?.alt,
  }))
  assert.deepEqual(shown, {
    caption: "The Screenwalk Lifecycle",
    role: "map",
    credit: "Generated with Gemini Notebook infographic · chosen by Guillaume",
    alt: "An infographic of the lifecycle",
  })
  await page.click(".episode-files-describe")
  await page.fill(".episode-files-describe-form input >> nth=0", "The lifecycle, drawn by Deep Diver")
  await page.click(".episode-files-describe-save")
  await page.waitForFunction(() => window.saved.length === 1)
  const saved = await page.evaluate(() => window.saved[0])
  assert.equal(saved.expectedRevision, "r1", "saved over the revision read")
  assert.equal(saved.record.caption, "The lifecycle, drawn by Deep Diver")
  assert.equal(saved.record.role, "map")
  assert.equal(saved.record.origin.tool, "Gemini Notebook infographic")
  await page.click(".episode-files-cover")
  await page.waitForFunction(() => window.covers.length === 1)
  assert.deepEqual(await page.evaluate(() => window.covers), ["images/room.png"])
})

test("a reader sees the record but no way to change it", { skip }, async () => {
  await fresh(FILES, { read: true, edit: false }, false)
  await page.evaluate(() => { window.withRecords = true })
  await page.evaluate(([f]) => window.mountWith(f, { read: true, edit: false }, false), [FILES])
  await openRow("images/room.png")
  await page.waitForSelector(".episode-files-credit")
  assert.equal(await page.locator(".episode-files-describe").count(), 0)
  assert.equal(await page.locator(".episode-files-cover").count(), 0)
})
