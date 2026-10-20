/**
 * The address contract, in a real browser against the no-bundler build: a host
 * passes `open`, the workspace shows it, and every change a person makes comes
 * back through `onSelectionChange` — with `push` only when they opened another file.
 *
 * Needs Playwright (the Miadi workspace root carries it) and a Chrome: the
 * installed one first, Playwright's own second. Where neither starts, these
 * tests are skipped with the reason; the rest of the suite still runs.
 */
import { test, afterAll as after } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const bundle = readFileSync(path.join(here, "..", "dist", "browser", "episode-files.js"), "utf8")
const css = readFileSync(path.join(here, "..", "src", "episode-ui.css"), "utf8")

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

const ORIGIN = "http://episode.test"
const PAGE = `<!doctype html><html><head><style>${css}</style></head><body><div id="files"></div>
<script type="module">
  import { mountEpisodeFiles } from "${ORIGIN}/episode-files.js"
  const text = {
    "notes.md": "# Notes\\n\\nhello",
    "other.md": "# Other",
    "data.json": "{\\"a\\": 1}",
    "rive-sud/refresh.md": "- [Chambly](field-report.md#chambly) visited\\n- [lost](gone.md)\\n- [away](https://example.org/x.md)",
    "rive-sud/field-report.md": "# Field report\\n\\n[up](../notes.md)",
  }
  window.events = []
  window.discard = true
  window.readDelay = 0
  window.saveGate = null
  window.mountWith = (open, capabilities) => {
    window.handle = mountEpisodeFiles(document.getElementById("files"), {
      files: [],
      capabilities,
      open,
      confirmDiscard: () => window.discard,
      onSelectionChange: (selection, change) => window.events.push({ selection, push: change.push }),
      fileHref: (selection) => "?file=" + encodeURIComponent(selection.path) + (selection.mode ? "&mode=" + selection.mode : ""),
      service: {
        read: async (file) => {
          await new Promise((resolve) => setTimeout(resolve, window.readDelay))
          return {
            content: text[file.relativePath],
            contentType: "text/plain",
            size: 1,
            revision: { sha256: "r1", modifiedAt: "t", bytes: 1 },
          }
        },
        save: async (file, content) => {
          if (window.saveGate) await window.saveGate
          return { ok: true, loaded: { content, contentType: "text/plain", size: 1, revision: { sha256: "r2", modifiedAt: "t", bytes: 1 } } }
        },
        mediaUrl: (file) => "${ORIGIN}/media/" + file.relativePath,
      },
    })
  }
  window.ready = true
</script></body></html>`

const FILES = [
  { relativePath: "notes.md", name: "notes.md", kind: "text", size: 20, modifiedAt: "t", previewable: true, editable: true, guidance: false },
  { relativePath: "data.json", name: "data.json", kind: "text", size: 8, modifiedAt: "t", previewable: true, editable: true, guidance: false },
  { relativePath: "take.m4a", name: "take.m4a", kind: "media", size: 900, modifiedAt: "t", previewable: false, editable: false, guidance: false },
  { relativePath: "other.md", name: "other.md", kind: "text", size: 7, modifiedAt: "t", previewable: true, editable: true, guidance: false },
  { relativePath: "huge.log", name: "huge.log", kind: "text", size: 9e9, modifiedAt: "t", previewable: false, editable: false, guidance: false },
  { relativePath: "rive-sud/refresh.md", name: "refresh.md", kind: "text", size: 90, modifiedAt: "t", previewable: true, editable: true, guidance: false },
  { relativePath: "rive-sud/field-report.md", name: "field-report.md", kind: "text", size: 30, modifiedAt: "t", previewable: true, editable: true, guidance: false },
]

let page

after(async () => {
  await browser?.close()
})

async function fresh(open, capabilities) {
  page = await browser.newPage()
  await page.route(`${ORIGIN}/**`, (route) => {
    const url = route.request().url()
    if (url.endsWith("/episode-files.js")) return route.fulfill({ contentType: "text/javascript", body: bundle })
    if (url.includes("/media/")) return route.fulfill({ contentType: "audio/mp4", body: "" })
    return route.fulfill({ contentType: "text/html", body: PAGE })
  })
  await page.goto(`${ORIGIN}/`)
  await page.waitForFunction(() => window.ready === true)
  await page.evaluate(([o, c]) => window.mountWith(o, c), [open, capabilities])
}

const events = () => page.evaluate(() => window.events.splice(0))
const update = (next) => page.evaluate((n) => window.handle.update(n), next)
const shown = () =>
  page.evaluate(() => ({
    viewer: !document.querySelector(".episode-files-viewer").hidden,
    name: document.querySelector(".episode-files-name").textContent,
    preview: !document.querySelector(".episode-files-preview").hidden,
    editor: !document.querySelector(".episode-files-editor").hidden,
    message: document.querySelector(".episode-files-message").hidden
      ? ""
      : document.querySelector(".episode-files-message").textContent,
  }))

test("a requested file waits for the list, then opens in the requested mode", { skip }, async () => {
  await fresh({ path: "notes.md", mode: "source" })
  assert.equal((await shown()).viewer, false, "nothing to open before the list arrives")
  await update({ files: FILES, open: { path: "notes.md", mode: "source" } })
  await page.waitForSelector(".episode-files-editor .cm-editor")
  const now = await shown()
  assert.deepEqual([now.viewer, now.name, now.editor, now.preview], [true, "notes.md", true, false])
  assert.deepEqual(await events(), [{ selection: { path: "notes.md", mode: "source" }, push: false }])
  await page.close()
})

test("a person's clicks come back: another file pushes, a mode switch replaces", { skip }, async () => {
  await fresh({ path: "notes.md" })
  await update({ files: FILES, open: { path: "notes.md" } })
  await page.waitForSelector(".episode-files-preview:not([hidden])")
  // No mode in the address: markdown opens in preview, and the host hears the mode to write.
  const first = await events()
  assert.deepEqual(first.at(-1), { selection: { path: "notes.md", mode: "preview" }, push: false })

  await page.getByRole("button", { name: "Source" }).click()
  assert.deepEqual(await events(), [{ selection: { path: "notes.md", mode: "source" }, push: false }])

  await page.getByRole("button", { name: /data\.json/ }).click()
  await page.waitForFunction(() => document.querySelector(".episode-files-name").textContent === "data.json")
  assert.deepEqual(await events(), [{ selection: { path: "data.json", mode: "source" }, push: true }])

  await page.getByRole("button", { name: /take\.m4a/ }).click()
  assert.deepEqual(await events(), [{ selection: { path: "take.m4a" }, push: true }], "media carries no mode")
  await page.close()
})

test("re-rendering with the same open is not a request, even when it lags a click", { skip }, async () => {
  await fresh({ path: "notes.md", mode: "preview" })
  await update({ files: FILES, open: { path: "notes.md", mode: "preview" } })
  await page.waitForSelector(".episode-files-preview:not([hidden])")
  await events()
  await page.getByRole("button", { name: /data\.json/ }).click()
  await events()
  // The host re-renders before its address caught up: the old `open` again.
  await update({ files: FILES, open: { path: "notes.md", mode: "preview" } })
  await update({ files: FILES, open: { path: "notes.md", mode: "preview" } })
  assert.equal((await shown()).name, "data.json", "a stale open undid the click")
  assert.deepEqual(await events(), [])
  await page.close()
})

test("Back to another file and back to no file", { skip }, async () => {
  await fresh(null)
  await update({ files: FILES, open: null })
  assert.equal((await shown()).viewer, false)
  await update({ open: { path: "data.json", mode: "source" } })
  await page.waitForSelector(".episode-files-editor .cm-editor")
  assert.equal((await shown()).name, "data.json")
  await update({ open: { path: "notes.md", mode: "preview" } })
  await page.waitForSelector(".episode-files-preview:not([hidden])")
  assert.equal((await shown()).name, "notes.md")
  await update({ open: { path: "notes.md", mode: "source" } })
  assert.equal((await shown()).editor, true, "the mode follows the address")
  await update({ open: null })
  assert.equal((await shown()).viewer, false)
  const all = await events()
  assert.ok(all.every((event) => event.push === false), "a host-driven change never pushes")
  assert.deepEqual(all.at(-1), { selection: null, push: false })
  await page.close()
})

test("a draft is never dropped by the address: a refusal pushes what is shown", { skip }, async () => {
  await fresh({ path: "data.json" })
  await update({ files: FILES, open: { path: "data.json" } })
  await page.waitForSelector(".episode-files-editor .cm-content")
  await page.click(".episode-files-editor .cm-content")
  await page.keyboard.type(" draft")
  await events()
  await page.evaluate(() => (window.discard = false))
  // Back moved the address to notes.md. Refused, the file shown gets a new entry so notes.md's is kept.
  await update({ open: { path: "notes.md", mode: "preview" } })
  assert.equal((await shown()).name, "data.json")
  assert.deepEqual(await events(), [{ selection: { path: "data.json", mode: "source" }, push: true }])
  await update({ open: null })
  assert.equal((await shown()).viewer, true, "closing asked first and was refused")
  assert.deepEqual(await events(), [{ selection: { path: "data.json", mode: "source" }, push: true }])
  await page.close()
})

test("a path not in the episode or too large says so; an unreadable one waits for sign-in", { skip }, async () => {
  await fresh({ path: "gone.md" })
  await update({ files: FILES, open: { path: "gone.md" } })
  assert.match((await shown()).message, /gone\.md is not in this episode/)
  await update({ open: null })
  assert.equal((await shown()).viewer, false, "the notice outlived its address")
  await update({ open: { path: "huge.log" } })
  assert.match((await shown()).message, /huge\.log is too large to open here/)

  await page.close()
  await fresh({ path: "notes.md" }, { read: false, edit: false })
  await update({ files: FILES, open: { path: "notes.md" } })
  assert.equal((await shown()).viewer, false, "opened without the right to read")
  await update({ capabilities: { read: true, edit: true } })
  await page.waitForSelector(".episode-files-preview:not([hidden])")
  assert.equal((await shown()).name, "notes.md")
  await page.close()
})

test("Preview pressed while a markdown file is still opening is kept", { skip }, async () => {
  await fresh({ path: "notes.md", mode: "source" })
  await update({ files: FILES, open: { path: "notes.md", mode: "source" } })
  await page.waitForSelector(".episode-files-editor .cm-editor")
  await page.evaluate(() => (window.readDelay = 600))
  await page.getByRole("button", { name: /other\.md/ }).click()
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll(".episode-files-mode")].map((node) => node.hidden),
  )
  assert.deepEqual(hidden, [true, true], "notes.md's mode buttons stayed up while other.md opens")
  // Whatever still reaches the buttons (a script, a stale focus) asks for a mode mid-read.
  await page.evaluate(() => document.querySelector(".episode-files-mode").click())
  await page.waitForSelector(".episode-files-preview:not([hidden])", { timeout: 3000 })
  assert.equal((await shown()).name, "other.md")
  const told = (await events()).filter((event) => event.selection?.path === "other.md")
  assert.deepEqual(told, [{ selection: { path: "other.md", mode: "preview" }, push: true }], "the address heard source")
  await page.close()
})

test("a save that lands after the person moved on stays with its own file", { skip }, async () => {
  await fresh({ path: "data.json" })
  await update({ files: FILES, open: { path: "data.json" } })
  await page.waitForSelector(".episode-files-editor .cm-content")
  await page.click(".episode-files-editor .cm-content")
  await page.keyboard.type(" draft")
  await page.evaluate(() => {
    window.saveGate = new Promise((resolve) => (window.releaseSave = resolve))
  })
  await page.getByRole("button", { name: /^Save/ }).click()
  await page.getByRole("button", { name: /notes\.md/ }).click()
  await page.waitForSelector(".episode-files-preview:not([hidden])")
  await page.evaluate(() => window.releaseSave())
  await page.waitForTimeout(100)
  await page.getByRole("button", { name: "Source" }).click()
  const status = await page.evaluate(() => document.querySelector(".episode-files-status").textContent)
  assert.equal(status, "Up to date", "the other file's save result was written into this one")
  await page.close()
})

test("a link in a preview opens the file it names, from that file's folder", { skip }, async () => {
  await fresh({ path: "rive-sud/refresh.md" })
  await update({ files: FILES, open: { path: "rive-sud/refresh.md" } })
  await page.waitForSelector(".episode-files-preview:not([hidden]) a")
  await events()
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll(".episode-files-preview a")].map((a) => a.getAttribute("href")),
  )
  assert.deepEqual(hrefs, ["?file=rive-sud%2Ffield-report.md&mode=preview", "gone.md", "https://example.org/x.md"])

  await page.getByRole("link", { name: "Chambly" }).click()
  await page.waitForFunction(() => document.querySelector(".episode-files-name").textContent === "rive-sud/field-report.md")
  assert.equal((await shown()).preview, true)
  assert.deepEqual(await events(), [{ selection: { path: "rive-sud/field-report.md", mode: "preview" }, push: true }])
  assert.equal(page.url(), `${ORIGIN}/`, "the page did not navigate")

  await page.getByRole("link", { name: "up" }).click()
  await page.waitForFunction(() => document.querySelector(".episode-files-name").textContent === "notes.md")
  assert.deepEqual(await events(), [{ selection: { path: "notes.md", mode: "preview" }, push: true }])

  await update({ open: { path: "rive-sud/refresh.md", mode: "preview" } })
  await page.waitForSelector(".episode-files-preview:not([hidden]) a")
  await page.getByRole("link", { name: "lost" }).click()
  assert.match((await shown()).message, /rive-sud\/gone\.md is not in this episode/)
  assert.equal((await shown()).name, "rive-sud/refresh.md")
  await page.close()
})

test("layout single shows only the viewer for the one file the host opened", { skip }, async () => {
  await fresh({ path: "notes.md" })
  await update({ files: [FILES[0]], open: { path: "notes.md" }, layout: "single" })
  await page.waitForSelector(".episode-files-preview:not([hidden])")
  const layout = await page.evaluate(() => {
    const visible = (selector) => {
      const node = document.querySelector(selector)
      return Boolean(node) && getComputedStyle(node).display !== "none"
    }
    return {
      single: document.querySelector(".episode-files").classList.contains("is-single"),
      list: visible(".episode-files-list"),
      head: visible(".episode-files-head"),
      filter: visible(".episode-files-filter"),
      viewer: visible(".episode-files-viewer"),
    }
  })
  assert.deepEqual(layout, { single: true, list: false, head: false, filter: false, viewer: true })
  // Back to the default: the list returns beside the viewer.
  await update({ layout: "workspace" })
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".episode-files-list")).display !== "none"), true)
  await page.close()
})

test("outsideFileHref sends a link to a file the workspace does not hold to the host's address", { skip }, async () => {
  await fresh({ path: "rive-sud/refresh.md" })
  // A function cannot cross page.evaluate's argument boundary, so it is set in the page.
  await page.evaluate(() => window.handle.update({ outsideFileHref: (target) => "/elsewhere?p=" + encodeURIComponent(target) }))
  await update({ files: FILES, open: { path: "rive-sud/refresh.md", mode: "preview" } })
  await page.waitForSelector(".episode-files-preview:not([hidden]) a")
  const links = await page.evaluate(() =>
    [...document.querySelectorAll(".episode-files-preview a")].map((a) => [a.getAttribute("href"), a.dataset.episodePath ?? null]),
  )
  assert.deepEqual(links, [
    ["?file=rive-sud%2Ffield-report.md&mode=preview", "rive-sud/field-report.md"],
    ["/elsewhere?p=rive-sud%2Fgone.md", null],
    ["https://example.org/x.md", null],
  ])
  await page.close()
})

test("a requested file opens where it stands when the host says reveal: false, even on a phone", { skip }, async () => {
  const scrolled = async (open) => {
    await fresh(open)
    await page.setViewportSize({ width: 390, height: 640 })
    await page.evaluate(() => {
      const spacer = document.createElement("div")
      spacer.style.height = "2400px"
      document.body.prepend(spacer)
      window.scrollTo(0, 0)
    })
    await update({ files: FILES, open })
    await page.waitForSelector(".episode-files-preview:not([hidden])")
    await page.waitForTimeout(50)
    const y = await page.evaluate(() => window.scrollY)
    const reported = await events()
    await page.close()
    return { y, reported }
  }

  const quiet = await scrolled({ path: "notes.md", mode: "preview", reveal: false })
  assert.equal(quiet.y, 0, "nothing scrolled")
  assert.deepEqual(quiet.reported.at(-1), { selection: { path: "notes.md", mode: "preview" }, push: false }, "reveal is not part of the selection")

  const revealed = await scrolled({ path: "notes.md", mode: "preview" })
  assert.ok(revealed.y > 0, `a requested file is still revealed by default (scrollY ${revealed.y})`)
})
