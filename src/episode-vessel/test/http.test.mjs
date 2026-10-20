import { test } from "vitest"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { readEpisodeText } from "../dist/index.js"
import { ANONYMOUS_CAPABILITIES, capabilitiesFor } from "../dist/permissions.js"
import {
  DOCUMENT_TYPES,
  attachmentDisposition,
  IMAGE_TYPES,
  MEDIA_TYPES,
  episodeNotFoundResponse,
  fileResponse,
  listFilesResponse,
  noStoreJson,
  parseByteRange,
  resolveEpisodeRef,
  vesselErrorResponse,
  writeTextResponse,
} from "../dist/http.js"
import { EpisodeConflictError, EpisodePathError } from "../dist/index.js"

const EPISODE = "2026-10-10-episode-551-learning-between-sessions"
const TWIN_A = "2026-05-25-episode-016-issue-354-closure-shape"
const TWIN_B = "2026-05-28-episode-016-hawk-a2a-council-table-part-1"
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const AUDIO = Buffer.from(Array.from({ length: 100 }, (_, i) => i))

/** A throwaway chronicle with one room and two folders that claim one number. */
function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "episode-vessel-http-"))
  const dir = path.join(root, EPISODE)
  fs.mkdirSync(path.join(dir, "ceremonies"), { recursive: true })
  fs.mkdirSync(path.join(dir, "captures", "take-1"), { recursive: true })
  fs.mkdirSync(path.join(dir, "images"))
  fs.writeFileSync(path.join(dir, "episode.yaml"), "episode: 551\ntitle: Learning Between Sessions\ndate: 2026-10-10\n")
  fs.writeFileSync(path.join(dir, "script.md"), "# Script\n")
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "host instructions\n")
  fs.writeFileSync(path.join(dir, "proposal.html"), "<script>alert(1)</script>")
  fs.writeFileSync(path.join(dir, "Embedding of User Intent — chronicle·map.html"), "<p>agent-written</p>")
  fs.writeFileSync(path.join(dir, "images", "cover.png"), PNG)
  fs.writeFileSync(path.join(dir, "take.m4a"), AUDIO)
  fs.writeFileSync(path.join(dir, "data.bin"), "opaque")
  fs.writeFileSync(path.join(dir, "ceremonies", "note.md"), "held in the circle\n")
  fs.writeFileSync(path.join(dir, "captures", "take-1", "capture.json"), "{}")
  for (const twin of [TWIN_A, TWIN_B]) {
    fs.mkdirSync(path.join(root, twin))
    fs.writeFileSync(path.join(root, twin, "episode.yaml"), "episode: 16\n")
  }
  return { root, dir }
}

const get = (headers = {}) => new Request("http://vessel.test/", { headers })
const put = (body) =>
  new Request("http://vessel.test/", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
const WRITER = capabilitiesFor("admin")

test("a reference resolves from a folder name, a number or epNNN, and never to one of two claimants", () => {
  const { root } = makeRoot()
  assert.equal(resolveEpisodeRef(EPISODE, { root }), EPISODE)
  assert.equal(resolveEpisodeRef(encodeURIComponent(EPISODE), { root }), EPISODE)
  assert.equal(resolveEpisodeRef("551", { root }), EPISODE)
  assert.equal(resolveEpisodeRef("ep551", { root }), EPISODE)
  assert.equal(resolveEpisodeRef("episode-0551", { root }), EPISODE)
  assert.equal(resolveEpisodeRef("16", { root }), null, "two folders hold 16")
  assert.equal(resolveEpisodeRef("552", { root }), null)
  assert.equal(resolveEpisodeRef("2026-10-11-episode-552-not-here", { root }), null, "a well-formed folder must exist")
  assert.equal(resolveEpisodeRef("%E0%A4%A", { root }), null, "a malformed escape is not an error")
  assert.equal(resolveEpisodeRef("../etc", { root }), null)
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-the-chronicle-"))
  const probe = `2026-01-01-episode-1-x/../../${path.basename(outside)}`
  assert.ok(fs.statSync(path.join(root, probe)).isDirectory(), "the probe names a real folder outside the root")
  assert.equal(resolveEpisodeRef(probe, { root }), null, "a folder-shaped path never probes outside the root")
  assert.equal(resolveEpisodeRef(encodeURIComponent(probe), { root }), null)
  assert.equal(resolveEpisodeRef(`${EPISODE}\\x`, { root }), null)
  assert.equal(resolveEpisodeRef("", { root }), null)
})

test("a reference resolves against the shelf the host already holds", () => {
  const episodes = [{ episodePath: EPISODE, number: 551 }]
  assert.equal(resolveEpisodeRef("551", { episodes }), EPISODE)
  assert.equal(resolveEpisodeRef(EPISODE, { episodes }), EPISODE)
  assert.equal(resolveEpisodeRef("2026-05-25-episode-016-issue-354-closure-shape", { episodes }), null)
})

test("the listing shows the room, never ceremonies or captures, with the masthead and capabilities", async () => {
  const { root } = makeRoot()
  const response = listFilesResponse(EPISODE, { root, capabilities: ANONYMOUS_CAPABILITIES })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("cache-control"), "no-store")
  const body = await response.json()
  assert.deepEqual(body.episode, {
    path: EPISODE,
    number: 551,
    numberLabel: "551",
    title: "Learning Between Sessions",
    date: "2026-10-10",
  })
  const paths = body.files.map((file) => file.relativePath)
  assert.ok(paths.includes("script.md"))
  assert.ok(paths.includes("images/cover.png"))
  assert.ok(!paths.some((p) => p.startsWith("ceremonies/") || p.startsWith("captures/")), "outside the room")
  assert.equal(body.count, body.files.length)
  assert.deepEqual(body.capabilities, ANONYMOUS_CAPABILITIES)
})

test("a host may widen or narrow the listing", async () => {
  const { root } = makeRoot()
  const body = await listFilesResponse(EPISODE, {
    root,
    capabilities: ANONYMOUS_CAPABILITIES,
    include: (relativePath, kind) => kind === "text" && !relativePath.startsWith("captures/"),
  }).json()
  assert.ok(body.files.every((file) => file.kind === "text"))
  assert.ok(body.files.some((file) => file.relativePath === "ceremonies/note.md"))
})

test("a listing for a missing episode is 404", async () => {
  const { root } = makeRoot()
  const response = listFilesResponse("2026-10-11-episode-552-not-here", { root, capabilities: ANONYMOUS_CAPABILITIES })
  assert.equal(response.status, 404)
  assert.equal((await response.json()).error, "ENOENT")
})

test("text comes back as JSON with its revision and whether it may be edited", async () => {
  const { root } = makeRoot()
  const response = fileResponse(get(), EPISODE, "script.md", { root, capabilities: ANONYMOUS_CAPABILITIES })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.content, "# Script\n")
  assert.equal(body.revision.sha256.length, 64)
  assert.equal(body.editable, true)
  assert.equal(body.episode, EPISODE)
  assert.equal(body.file, "script.md")
  assert.deepEqual(body.capabilities, ANONYMOUS_CAPABILITIES)

  const guidance = await fileResponse(get(), EPISODE, "AGENTS.md", { root, capabilities: ANONYMOUS_CAPABILITIES }).json()
  assert.equal(guidance.editable, false)
})

test("a document is a download with nosniff, never inline", async () => {
  const { root } = makeRoot()
  const response = fileResponse(get(), EPISODE, "proposal.html", { root, capabilities: ANONYMOUS_CAPABILITIES })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "text/html")
  assert.equal(
    response.headers.get("content-disposition"),
    "attachment; filename=\"proposal.html\"; filename*=UTF-8''proposal.html",
  )
  assert.equal(response.headers.get("x-content-type-options"), "nosniff")
  assert.equal(await response.text(), "<script>alert(1)</script>")
})

test("a document named outside ASCII downloads under its exact name", async () => {
  const { root } = makeRoot()
  const name = "Embedding of User Intent — chronicle·map.html"
  const response = fileResponse(get(), EPISODE, name, { root, capabilities: ANONYMOUS_CAPABILITIES })
  assert.equal(response.status, 200)
  assert.equal(
    response.headers.get("content-disposition"),
    `attachment; filename="Embedding of User Intent _ chronicle_map.html"; filename*=UTF-8''${encodeURIComponent(name)}`,
  )
  assert.equal(await response.text(), "<p>agent-written</p>")
  assert.equal(
    attachmentDisposition(`it's "(x)*\\.pdf`),
    `attachment; filename="it's _(x)*_.pdf"; filename*=UTF-8''it%27s%20%22%28x%29%2A%5C.pdf`,
  )
})

test("an image is inline, sandboxed and held to its type", async () => {
  const { root } = makeRoot()
  const response = fileResponse(get(), EPISODE, "images/cover.png", { root, capabilities: ANONYMOUS_CAPABILITIES })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "image/png")
  assert.equal(response.headers.get("content-security-policy"), "default-src 'none'; sandbox")
  assert.equal(response.headers.get("x-content-type-options"), "nosniff")
  assert.equal(response.headers.get("content-length"), String(PNG.length))
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG)
})

test("media is served whole, by range, or refused a range it cannot satisfy", async () => {
  const { root } = makeRoot()
  const options = { root, capabilities: ANONYMOUS_CAPABILITIES }

  const whole = fileResponse(get(), EPISODE, "take.m4a", options)
  assert.equal(whole.status, 200)
  assert.equal(whole.headers.get("content-type"), "audio/mp4")
  assert.equal(whole.headers.get("accept-ranges"), "bytes")
  assert.equal((await whole.arrayBuffer()).byteLength, 100)

  const part = fileResponse(get({ range: "bytes=10-19" }), EPISODE, "take.m4a", options)
  assert.equal(part.status, 206)
  assert.equal(part.headers.get("content-range"), "bytes 10-19/100")
  assert.equal(part.headers.get("content-length"), "10")
  assert.deepEqual([...new Uint8Array(await part.arrayBuffer())], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19])

  const tail = fileResponse(get({ range: "bytes=-5" }), EPISODE, "take.m4a", options)
  assert.equal(tail.status, 206)
  assert.equal(tail.headers.get("content-range"), "bytes 95-99/100")
  await tail.arrayBuffer()

  const past = fileResponse(get({ range: "bytes=200-" }), EPISODE, "take.m4a", options)
  assert.equal(past.status, 416)
  assert.equal(past.headers.get("content-range"), "bytes */100")

  // A range the door does not read is ignored, and the whole file sent (RFC 9110 §14.2).
  for (const range of ["items=0-1", "bytes=0-1,4-5", "bytes=abc"]) {
    const ignored = fileResponse(get({ range }), EPISODE, "take.m4a", options)
    assert.equal(ignored.status, 200, range)
    assert.equal((await ignored.arrayBuffer()).byteLength, 100, range)
  }
})

test("a file of no kind the vessel serves is 415", async () => {
  const { root } = makeRoot()
  const response = fileResponse(get(), EPISODE, "data.bin", { root, capabilities: ANONYMOUS_CAPABILITIES })
  assert.equal(response.status, 415)
  assert.equal((await response.json()).error, "unreadable_kind")
})

test("ceremony notes and captures are read only by a caller the host lets outside the room", async () => {
  const { root } = makeRoot()
  const refused = fileResponse(get(), EPISODE, "ceremonies/note.md", { root, capabilities: ANONYMOUS_CAPABILITIES })
  assert.equal(refused.status, 404)
  const refusedBody = await refused.json()
  assert.equal(refusedBody.error, "not_in_the_room")

  // The same answer whether or not the file exists, and for a folder: nothing is learnt from outside.
  for (const probe of ["ceremonies/absent.md", "captures/take-1/capture.json", "captures/take-2/capture.json", "captures/take-1"]) {
    const answer = fileResponse(get(), EPISODE, probe, { root, capabilities: ANONYMOUS_CAPABILITIES })
    assert.equal(answer.status, 404, probe)
    assert.deepEqual(await answer.json(), refusedBody, probe)
  }

  const allowed = fileResponse(get(), EPISODE, "ceremonies/note.md", {
    root,
    capabilities: WRITER,
    mayReadOutsideRoom: true,
  })
  assert.equal(allowed.status, 200)
  assert.equal((await allowed.json()).content, "held in the circle\n")
})

test("a path that leaves the vessel, or names no file, is refused", async () => {
  const { root } = makeRoot()
  const options = { root, capabilities: ANONYMOUS_CAPABILITIES }
  assert.equal(fileResponse(get(), EPISODE, "../escape.md", options).status, 400)
  assert.equal(fileResponse(get(), EPISODE, ".mw-registration.json", options).status, 400)
  assert.equal(fileResponse(get(), EPISODE, "missing.md", options).status, 404)
  assert.equal(fileResponse(get(), EPISODE, "", options).status, 400)
})

test("a text write needs the gate, the capability and the revision the writer read", async () => {
  const { root, dir } = makeRoot()
  const before = readEpisodeText(EPISODE, "script.md", { root })
  const body = { content: "# Script, revised\n", expectedRevision: before.revision.sha256 }

  const gated = await writeTextResponse(put(body), EPISODE, "script.md", { root, capabilities: WRITER, mayWrite: false })
  assert.equal(gated.status, 403)
  assert.equal((await gated.json()).error, "forbidden")

  const reader = await writeTextResponse(put(body), EPISODE, "script.md", {
    root,
    capabilities: ANONYMOUS_CAPABILITIES,
    mayWrite: true,
  })
  assert.equal(reader.status, 403)
  assert.equal((await reader.json()).error, "not_permitted")

  assert.equal((await writeTextResponse(put("{"), EPISODE, "script.md", { root, capabilities: WRITER, mayWrite: true })).status, 400)
  assert.equal(
    (await writeTextResponse(put({ content: "x" }), EPISODE, "script.md", { root, capabilities: WRITER, mayWrite: true })).status,
    400,
  )

  const written = await writeTextResponse(put(body), EPISODE, "script.md", { root, capabilities: WRITER, mayWrite: true })
  assert.equal(written.status, 200)
  const saved = await written.json()
  assert.equal(saved.content, "# Script, revised\n")
  assert.equal(fs.readFileSync(path.join(dir, "script.md"), "utf8"), "# Script, revised\n")

  const stale = await writeTextResponse(put(body), EPISODE, "script.md", { root, capabilities: WRITER, mayWrite: true })
  assert.equal(stale.status, 409)
  const conflict = await stale.json()
  assert.equal(conflict.error, "FILE_CHANGED")
  assert.equal(conflict.currentRevision.sha256, saved.revision.sha256)

  const guidance = await writeTextResponse(
    put({ content: "x", expectedRevision: "y" }),
    EPISODE,
    "AGENTS.md",
    { root, capabilities: WRITER, mayWrite: true },
  )
  assert.equal(guidance.status, 400)
  assert.equal((await guidance.json()).error, "NOT_EDITABLE")
})

test("byte ranges", () => {
  assert.deepEqual(parseByteRange("bytes=0-9", 100), { start: 0, end: 9 })
  assert.deepEqual(parseByteRange("bytes=90-", 100), { start: 90, end: 99 })
  assert.deepEqual(parseByteRange("bytes=-10", 100), { start: 90, end: 99 })
  assert.deepEqual(parseByteRange("bytes=-500", 100), { start: 0, end: 99 })
  assert.deepEqual(parseByteRange("bytes=50-500", 100), { start: 50, end: 99 })
  assert.equal(parseByteRange("bytes=100-", 100), null)
  assert.equal(parseByteRange("bytes=9-3", 100), null)
  assert.equal(parseByteRange("bytes=-0", 100), null)
  assert.equal(parseByteRange("bytes=-", 100), null)
  assert.equal(parseByteRange("bytes=0-1,4-5", 100), null)
  assert.equal(parseByteRange("items=0-1", 100), null)
  assert.equal(parseByteRange(null, 100), null)
})

test("the error taxonomy maps onto HTTP once", async () => {
  assert.equal(vesselErrorResponse(new EpisodePathError("gone", "ENOENT")).status, 404)
  assert.equal(vesselErrorResponse(new EpisodePathError("no root", "NO_ROOT")).status, 404)
  assert.equal(vesselErrorResponse(new EpisodePathError("taken", "EXISTS")).status, 409)
  assert.equal(vesselErrorResponse(new EpisodePathError("bad")).status, 400)
  const conflict = vesselErrorResponse(
    new EpisodeConflictError("changed", { sha256: "a".repeat(64), modifiedAt: "x", bytes: 1 }),
  )
  assert.equal(conflict.status, 409)
  assert.equal((await conflict.json()).currentRevision.sha256, "a".repeat(64))

  const error = console.error
  const logged = []
  console.error = (...args) => logged.push(args)
  try {
    const failed = vesselErrorResponse(new Error("EACCES: permission denied, open '/srv/secret/locked.md'"))
    assert.equal(failed.status, 500)
    assert.deepEqual(await failed.json(), { error: "vessel_failed", message: "The vessel could not serve this request." })

    const noRoot = vesselErrorResponse(new EpisodePathError("Chronicle root does not exist: /srv/secret", "NO_ROOT"))
    assert.equal(noRoot.status, 404)
    assert.ok(!JSON.stringify(await noRoot.json()).includes("/srv/secret"), "no path on disk reaches the caller")
    assert.equal(logged.length, 2, "the detail is logged on the server")
  } finally {
    console.error = error
  }

  const missing = episodeNotFoundResponse("ep999")
  assert.equal(missing.status, 404)
  assert.equal((await missing.json()).message, "No episode answers to ep999")
  assert.equal(noStoreJson({ ok: true }, 201).status, 201)
})

test("the type tables carry the vessel's kinds", () => {
  assert.equal(MEDIA_TYPES[".m4a"], "audio/mp4")
  assert.equal(DOCUMENT_TYPES[".svg"], "image/svg+xml")
  assert.equal(IMAGE_TYPES[".webp"], "image/webp")
})

test("a predicate opens one part outside the room, judged on the spelling and on disk", async () => {
  const { root, dir } = makeRoot()
  const takesOnly = (relativePath) => relativePath.startsWith("captures/")
  const options = { root, capabilities: ANONYMOUS_CAPABILITIES, mayReadOutsideRoom: takesOnly }

  const take = fileResponse(get(), EPISODE, "captures/take-1/capture.json", options)
  assert.equal(take.status, 200, "a take's descriptor is served")
  assert.equal((await take.json()).content, "{}")
  fs.writeFileSync(path.join(dir, "captures", "take-1", "transcription_EN.txt"), "words")
  assert.equal((await fileResponse(get(), EPISODE, "captures/take-1/transcription_EN.txt", options).json()).content, "words")

  const note = fileResponse(get(), EPISODE, "ceremonies/note.md", options)
  assert.equal(note.status, 404)
  assert.equal((await note.json()).error, "not_in_the_room")

  // A folder under captures/ that links into ceremonies/ is refused before the disk answers.
  fs.symlinkSync(path.join(dir, "ceremonies"), path.join(dir, "captures", "linked"))
  const through = fileResponse(get(), EPISODE, "captures/linked/note.md", options)
  assert.equal(through.status, 400)
  assert.equal((await through.json()).error, "INVALID_PATH")

  assert.equal(fileResponse(get(), EPISODE, "script.md", { ...options, mayReadOutsideRoom: () => false }).status, 200, "the room itself needs no predicate")
})
