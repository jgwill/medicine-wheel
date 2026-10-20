import { test } from "vitest"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import {
  EpisodeConflictError,
  EpisodePathError,
  attachFileToCeremony,
  detachFileFromCeremony,
  imageSignatureMatches,
  isEpisodeImageWritable,
  isEpisodeTextEditable,
  listCeremonyFiles,
  listEpisodeFiles,
  listEpisodes,
  readCeremonyNote,
  readEpisodeSummary,
  seedCeremonyNote,
  readEpisodeText,
  writeCeremonyNote,
  writeEpisodeImage,
  writeEpisodeMediaRecord,
  setEpisodeCover,
  writeEpisodeText,
} from "../dist/index.js"
import { capabilitiesFor, CAPABILITY_BY_VERB } from "../dist/permissions.js"

const EPISODE = "2026-09-17-episode-349-miadi-conducts-a-ceremony-its-circle-can-enter"
const CEREMONY = "603bfaa1-958d-42a1-bbdf-a25fc2cfdaae"

/** A throwaway chronicle root shaped like the real one. */
function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "episode-vessel-"))
  const dir = path.join(root, EPISODE)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, "episode.yaml"),
    "episode: 349\ntitle: Miadi conducts a ceremony its circle can enter\ndate: 2026-09-17\nstatus: open\ngoal: prove the circle can enter\n",
  )
  fs.writeFileSync(path.join(dir, "README.md"), "# The room\n")
  fs.writeFileSync(path.join(dir, "notes.md"), "first\n")
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "host instructions\n")
  fs.writeFileSync(path.join(dir, "proposal.html"), "<script>alert(1)</script>")
  fs.writeFileSync(path.join(dir, ".mw-registration.json"), "{}")
  fs.mkdirSync(path.join(dir, "held"))
  fs.writeFileSync(path.join(dir, "held", "kept.md"), "held\n")
  return { root, dir }
}

test("a vessel names itself from its manifest", () => {
  const { root } = makeRoot()
  const summary = readEpisodeSummary(EPISODE, { root })
  assert.equal(summary.number, 349)
  assert.equal(summary.numberLabel, "349")
  assert.equal(summary.title, "Miadi conducts a ceremony its circle can enter")
  assert.equal(summary.goal, "prove the circle can enter")
  assert.equal(summary.hasManifest, true)
  assert.equal(listEpisodes({ root }).length, 1)
})

test("listing classifies kinds, hides dotfiles and the manifest, and ranks README first", () => {
  const { root } = makeRoot()
  const files = listEpisodeFiles(EPISODE, { root })
  const byPath = Object.fromEntries(files.map((f) => [f.relativePath, f]))

  assert.equal(files[0].relativePath, "README.md")
  assert.ok(!byPath["episode.yaml"], "the manifest is identity, not content")
  assert.ok(!byPath[".mw-registration.json"], "dotfiles stay out of every browser")

  assert.equal(byPath["notes.md"].kind, "text")
  assert.equal(byPath["notes.md"].editable, true)
  assert.equal(byPath["held/kept.md"].kind, "text", "nested files are listed")

  assert.equal(byPath["proposal.html"].kind, "document")
  assert.equal(byPath["proposal.html"].previewable, false, "vessel HTML is never rendered inline")
  assert.equal(byPath["proposal.html"].editable, false)

  assert.equal(byPath["AGENTS.md"].guidance, true)
  assert.equal(byPath["AGENTS.md"].editable, false, "guidance is shown, never edited from a browser")
})

test("a path may not leave its vessel", () => {
  const { root } = makeRoot()
  for (const bad of ["../etc/passwd", "/etc/passwd", "held/../../escape.md", ".hidden/x.md"]) {
    assert.throws(() => readEpisodeText(EPISODE, bad, { root }), EpisodePathError, `allowed: ${bad}`)
  }
  assert.throws(() => readEpisodeText("../..", "x.md", { root }), EpisodePathError)
  assert.throws(() => readEpisodeText("not-an-episode-folder", "x.md", { root }), EpisodePathError)
})

test("a symlink out of the vessel is refused", () => {
  const { root, dir } = makeRoot()
  const outside = path.join(root, "outside.md")
  fs.writeFileSync(outside, "secret\n")
  fs.symlinkSync(outside, path.join(dir, "link.md"))

  assert.throws(() => readEpisodeText(EPISODE, "link.md", { root }), EpisodePathError)
  assert.ok(
    !listEpisodeFiles(EPISODE, { root }).some((f) => f.relativePath === "link.md"),
    "a symlink is not listed either",
  )
})

test("a write needs the revision the writer was shown", () => {
  const { root, dir } = makeRoot()
  const before = readEpisodeText(EPISODE, "notes.md", { root })

  const after = writeEpisodeText(EPISODE, "notes.md", "second\n", before.revision.sha256, { root })
  assert.equal(after.content, "second\n")
  assert.notEqual(after.revision.sha256, before.revision.sha256)

  // Someone else writes between the read and the save.
  fs.writeFileSync(path.join(dir, "notes.md"), "third\n")
  let conflict
  try {
    writeEpisodeText(EPISODE, "notes.md", "mine\n", after.revision.sha256, { root })
  } catch (error) {
    conflict = error
  }
  assert.ok(conflict instanceof EpisodeConflictError, "a stale revision must conflict")
  assert.equal(conflict.code, "FILE_CHANGED")
  assert.equal(conflict.status, 409)
  assert.equal(conflict.currentRevision.sha256.length, 64)
  assert.equal(fs.readFileSync(path.join(dir, "notes.md"), "utf8"), "third\n", "the other write stands")
})

test("a write leaves no temp file behind, and invalid JSON never lands", () => {
  const { root, dir } = makeRoot()
  fs.writeFileSync(path.join(dir, "data.json"), '{"a":1}')
  const read = readEpisodeText(EPISODE, "data.json", { root })

  assert.throws(
    () => writeEpisodeText(EPISODE, "data.json", "{not json", read.revision.sha256, { root }),
    /JSON must be valid/,
  )
  assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), '{"a":1}')

  writeEpisodeText(EPISODE, "data.json", '{"a":2}\n', read.revision.sha256, { root })
  assert.deepEqual(
    fs.readdirSync(dir).filter((name) => name.includes(".tmp")),
    [],
  )
})

test("what a browser may not change", () => {
  assert.equal(isEpisodeTextEditable("notes.md"), true)
  assert.equal(isEpisodeTextEditable("held/kept.md"), true)
  assert.equal(isEpisodeTextEditable("episode.yaml"), false)
  assert.equal(isEpisodeTextEditable("AGENTS.md"), false)
  assert.equal(isEpisodeTextEditable("captures/abc/capture.json"), false)
  assert.equal(isEpisodeTextEditable("ceremonies/x/notes.md"), false)
  assert.equal(isEpisodeTextEditable("proposal.html"), false)
})

test("a ceremony keeps its note in the vessel", () => {
  const { root, dir } = makeRoot()
  assert.equal(readCeremonyNote(EPISODE, CEREMONY, { root }).exists, false)

  const written = writeCeremonyNote(EPISODE, CEREMONY, "what was said\n", { root })
  assert.equal(written.exists, true)
  assert.equal(written.relativePath, `ceremonies/${CEREMONY}/notes.md`)
  assert.equal(fs.readFileSync(path.join(dir, written.relativePath), "utf8"), "what was said\n")
  assert.equal(written.revision.sha256.length, 64)

  assert.throws(() => writeCeremonyNote(EPISODE, "not-a-uuid", "x", { root }), EpisodePathError)
})

test("both ceremony id forms the wheel emits are accepted", () => {
  const { root } = makeRoot()
  // Measured on the live wheel 2026-09-19: UUIDs and minted ids both exist.
  for (const id of [CEREMONY, "ceremony:1789863312388:mgj2x"]) {
    const note = writeCeremonyNote(EPISODE, id, `held ${id}\n`, { root })
    assert.equal(note.exists, true)
    assert.equal(readCeremonyNote(EPISODE, id, { root }).content, `held ${id}\n`)
  }
  for (const bad of ["../escape", "ceremony:a/b:c", ".hidden", "ceremony", ""]) {
    assert.throws(() => writeCeremonyNote(EPISODE, bad, "x", { root }), EpisodePathError, `allowed: ${bad}`)
  }
})

test("notes are seeded once and then overwritten only with their revision", () => {
  const { root } = makeRoot()

  // Miadi's verb: mint the opening record.
  const seeded = seedCeremonyNote(EPISODE, CEREMONY, "# Ceremony opened\n", { root })
  assert.equal(seeded.written, true)

  // The circle writes into it. A second seed must not clobber that.
  const first = readCeremonyNote(EPISODE, CEREMONY, { root })
  const edited = writeCeremonyNote(EPISODE, CEREMONY, "# Ceremony opened\n\nwhat we said\n", {
    root,
    expectedRevision: first.revision.sha256,
  })
  assert.match(edited.content, /what we said/)

  const again = seedCeremonyNote(EPISODE, CEREMONY, "# Ceremony opened\n", { root })
  assert.equal(again.written, false)
  assert.match(again.reason, /beside, never over/)
  assert.match(readCeremonyNote(EPISODE, CEREMONY, { root }).content, /what we said/)

  // gmtermux's verb without a guard, on a file that exists, is a conflict.
  let blind
  try {
    writeCeremonyNote(EPISODE, CEREMONY, "mine only\n", { root })
  } catch (error) {
    blind = error
  }
  assert.ok(blind instanceof EpisodeConflictError, "an unguarded overwrite must be refused")
  assert.match(readCeremonyNote(EPISODE, CEREMONY, { root }).content, /what we said/)

  // A stale guard is refused too.
  let stale
  try {
    writeCeremonyNote(EPISODE, CEREMONY, "mine\n", { root, expectedRevision: first.revision.sha256 })
  } catch (error) {
    stale = error
  }
  assert.ok(stale instanceof EpisodeConflictError)
})

test("a ceremony holds the files it was held about", () => {
  const { root } = makeRoot()
  assert.deepEqual(listCeremonyFiles(EPISODE, CEREMONY, { root }).attachments, [])

  const one = attachFileToCeremony(EPISODE, CEREMONY, "proposal.html", "guillaume", {
    root,
    note: "the proposal on the table",
  })
  assert.equal(one.attachments.length, 1)
  assert.equal(one.attachments[0].relativePath, "proposal.html")
  assert.equal(one.attachments[0].attachedBy, "guillaume")
  assert.equal(one.attachments[0].note, "the proposal on the table")

  // Attaching twice updates rather than duplicates.
  const again = attachFileToCeremony(EPISODE, CEREMONY, "proposal.html", "mia", { root })
  assert.equal(again.attachments.length, 1)
  assert.equal(again.attachments[0].attachedBy, "mia")

  // A file that is not in the vessel cannot have been on the table.
  assert.throws(() => attachFileToCeremony(EPISODE, CEREMONY, "absent.md", "mia", { root }), EpisodePathError)
  assert.throws(
    () => attachFileToCeremony(EPISODE, CEREMONY, `ceremonies/${CEREMONY}/notes.md`, "mia", { root }),
    EpisodePathError,
  )

  assert.deepEqual(detachFileFromCeremony(EPISODE, CEREMONY, "proposal.html", { root }).attachments, [])
})

test("role capabilities are data, and every verb maps to one", () => {
  assert.equal(capabilitiesFor("participant").edit, false)
  assert.equal(capabilitiesFor("participant").read, true)
  assert.equal(capabilitiesFor("admin").edit, true)
  assert.equal(capabilitiesFor("ceremony_facilitator").attachToCeremony, true)
  assert.equal(capabilitiesFor(null).read, true, "the room is public; the browser must not refuse what the page shows")
  assert.equal(capabilitiesFor(null).edit, false)
  assert.equal(capabilitiesFor("unknown_role").edit, false)

  // A community config may narrow or widen a role without a code change.
  assert.equal(capabilitiesFor("participant", { grants: { participant: { edit: true } } }).edit, true)

  for (const capability of Object.values(CAPABILITY_BY_VERB)) {
    assert.ok(capability in capabilitiesFor("admin"), `${capability} is not a real capability`)
  }
})

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46])

test("an image is listed as an image, and an svg stays a download", () => {
  const { root, dir } = makeRoot()
  fs.mkdirSync(path.join(dir, "images"))
  fs.writeFileSync(path.join(dir, "images", "cover.png"), PNG)
  fs.writeFileSync(path.join(dir, "images", "diagram.svg"), "<svg><script>alert(1)</script></svg>")
  const byPath = Object.fromEntries(listEpisodeFiles(EPISODE, { root }).map((f) => [f.relativePath, f]))
  assert.equal(byPath["images/cover.png"].kind, "image")
  assert.equal(byPath["images/cover.png"].editable, false)
  assert.equal(byPath["images/diagram.svg"].kind, "document", "svg can carry script, so it is never inline")
})

test("an image is added under images/, never over another, and only when its bytes say so", () => {
  const { root, dir } = makeRoot()
  const added = writeEpisodeImage(EPISODE, "images/still-01.png", PNG, { root })
  assert.equal(added.kind, "image")
  assert.equal(added.size, PNG.length)
  assert.deepEqual(new Uint8Array(fs.readFileSync(path.join(dir, "images", "still-01.png"))), PNG)
  writeEpisodeImage(EPISODE, "images/screenwalk-2610061207/frame.jpg", JPEG, { root })
  assert.ok(fs.existsSync(path.join(dir, "images", "screenwalk-2610061207", "frame.jpg")), "one sub-folder is allowed")

  assert.throws(
    () => writeEpisodeImage(EPISODE, "images/still-01.png", PNG, { root }),
    (error) => error instanceof EpisodePathError && error.code === "EXISTS",
  )
  assert.throws(
    () => writeEpisodeImage(EPISODE, "images/fake.png", new TextEncoder().encode("<html>"), { root }),
    (error) => error.code === "NOT_AN_IMAGE",
  )
  assert.throws(() => writeEpisodeImage(EPISODE, "images/empty.png", new Uint8Array(), { root }), (error) => error.code === "EMPTY")
  for (const bad of ["cover.png", "script.md", "images/x.svg", "images/../cover.png", "images/a/b/c.png", "captures/x.png", ".images/x.png"]) {
    assert.equal(isEpisodeImageWritable(bad), false, `writable: ${bad}`)
    assert.throws(() => writeEpisodeImage(EPISODE, bad, PNG, { root }), EpisodePathError, `written: ${bad}`)
  }
  for (const folder of ["images", "images/screenwalk-2610061207"]) {
    assert.deepEqual(
      fs.readdirSync(path.join(dir, folder)).filter((name) => name.endsWith(".tmp")),
      [],
      `no temp file is left behind in ${folder}`,
    )
  }
})

test("a folder full of images cannot push the README, the script or the guidance out of the listing", () => {
  const { root, dir } = makeRoot()
  fs.writeFileSync(path.join(dir, "script.md"), "# Script\n")
  fs.mkdirSync(path.join(dir, "images"))
  for (let n = 0; n < 12; n++) fs.writeFileSync(path.join(dir, "images", `still-${String(n).padStart(3, "0")}.png`), PNG)
  const files = listEpisodeFiles(EPISODE, { root, maxFiles: 8 })
  const paths = files.map((f) => f.relativePath)
  assert.equal(files.length, 8)
  assert.equal(paths[0], "README.md")
  for (const kept of ["script.md", "notes.md", "held/kept.md", "proposal.html", "AGENTS.md"]) {
    assert.ok(paths.includes(kept), `${kept} was crowded out by images`)
  }
  assert.deepEqual(paths.slice(-2), ["images/still-000.png", "images/still-001.png"], "images fill what is left")
})

test("a symlinked images folder does not carry a write out of the vessel", () => {
  const { root, dir } = makeRoot()
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-images-"))
  fs.symlinkSync(outside, path.join(dir, "images"))
  assert.throws(() => writeEpisodeImage(EPISODE, "images/x.png", PNG, { root }), EpisodePathError)
  assert.deepEqual(fs.readdirSync(outside), [])
})

test("image signatures", () => {
  assert.equal(imageSignatureMatches(PNG, ".png"), true)
  assert.equal(imageSignatureMatches(PNG, ".jpg"), false)
  assert.equal(imageSignatureMatches(JPEG, ".JPEG"), true)
  assert.equal(imageSignatureMatches(new TextEncoder().encode("GIF89a...."), ".gif"), true)
  assert.equal(imageSignatureMatches(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "), ".webp"), true)
  const avif = Uint8Array.from([0, 0, 0, 0x1c, ...new TextEncoder().encode("ftypavif"), 0, 0, 0, 0, ...new TextEncoder().encode("avifmif1miaf")])
  assert.equal(imageSignatureMatches(avif, ".avif"), true)
  assert.equal(imageSignatureMatches(avif, ".png"), false)
})

test("an image can arrive with its record, and the record is never written over by a new image", () => {
  const { root, dir } = makeRoot()
  writeEpisodeImage(EPISODE, "images/map.png", PNG, { root, recordText: "media: map.png\nrole: map\n" })
  assert.equal(fs.readFileSync(path.join(dir, "images", "map.png.yaml"), "utf8"), "media: map.png\nrole: map\n")
  fs.unlinkSync(path.join(dir, "images", "map.png"))
  assert.throws(
    () => writeEpisodeImage(EPISODE, "images/map.png", PNG, { root, recordText: "media: map.png\n" }),
    (error) => error.code === "EXISTS",
    "a stale record would describe the new image wrongly",
  )
  assert.equal(fs.existsSync(path.join(dir, "images", "map.png")), false, "the image is not left without its record")
})

test("a record is created once, then replaced only over the revision the writer saw", () => {
  const { root } = makeRoot()
  writeEpisodeImage(EPISODE, "images/still.png", PNG, { root })
  const created = writeEpisodeMediaRecord(EPISODE, "images/still.png", "media: still.png\n", null, { root })
  assert.equal(created.content, "media: still.png\n")
  assert.throws(() => writeEpisodeMediaRecord(EPISODE, "images/still.png", "x", null, { root }), (error) => error.code === "EXISTS")
  const replaced = writeEpisodeMediaRecord(EPISODE, "images/still.png", "media: still.png\nrole: still\n", created.revision.sha256, { root })
  assert.match(replaced.content, /role: still/)
  assert.throws(() => writeEpisodeMediaRecord(EPISODE, "images/still.png", "y", created.revision.sha256, { root }), EpisodeConflictError)
  assert.throws(() => writeEpisodeMediaRecord(EPISODE, "images/none.png", "z", null, { root }), (error) => error.code === "ENOENT")
  assert.throws(() => writeEpisodeMediaRecord(EPISODE, "notes.md", "z", null, { root }), (error) => error.code === "NOT_WRITABLE")
})

test("the cover is one line of episode.yaml, set, moved and cleared without touching the rest", () => {
  const { root, dir } = makeRoot()
  writeEpisodeImage(EPISODE, "images/a.png", PNG, { root })
  writeEpisodeImage(EPISODE, "images/b b.png", PNG, { root })
  const before = fs.readFileSync(path.join(dir, "episode.yaml"), "utf8")
  setEpisodeCover(EPISODE, "images/a.png", { root })
  assert.equal(readEpisodeSummary(EPISODE, { root }).cover, "images/a.png")
  assert.equal(fs.readFileSync(path.join(dir, "episode.yaml"), "utf8"), before + "cover: images/a.png\n")
  setEpisodeCover(EPISODE, "images/b b.png", { root })
  assert.equal(readEpisodeSummary(EPISODE, { root }).cover, "images/b b.png")
  setEpisodeCover(EPISODE, null, { root })
  assert.equal(fs.readFileSync(path.join(dir, "episode.yaml"), "utf8"), before)
  assert.throws(() => setEpisodeCover(EPISODE, "notes.md", { root }), (error) => error.code === "NOT_WRITABLE")
  assert.throws(() => setEpisodeCover(EPISODE, "images/missing.png", { root }), (error) => error.code === "ENOENT")
})

test("a cover written over several lines is replaced whole, and an image never stays without its record", () => {
  const { root, dir } = makeRoot()
  writeEpisodeImage(EPISODE, "images/a.png", PNG, { root })
  const manifest = path.join(dir, "episode.yaml")
  fs.writeFileSync(manifest, fs.readFileSync(manifest, "utf8") + "cover: >-\n  images/old\n  name.png\nseries: x\n")
  setEpisodeCover(EPISODE, "images/a.png", { root })
  assert.match(fs.readFileSync(manifest, "utf8"), /cover: images\/a\.png\nseries: x\n$/)
  setEpisodeCover(EPISODE, null, { root })
  assert.doesNotMatch(fs.readFileSync(manifest, "utf8"), /cover|old|name\.png/)

  fs.mkdirSync(path.join(dir, "images", "b.png.yaml"))
  assert.throws(() => writeEpisodeImage(EPISODE, "images/b.png", PNG, { root, recordText: "media: b.png\n" }))
  assert.equal(fs.existsSync(path.join(dir, "images", "b.png")), false, "the image went with its failed record")
})

test("a folder that is a symlink inside the vessel is not a way to a file", () => {
  const { root, dir } = makeRoot()
  fs.mkdirSync(path.join(dir, "ceremonies", "c1"), { recursive: true })
  fs.writeFileSync(path.join(dir, "ceremonies", "c1", "notes.md"), "held in the circle\n")
  fs.mkdirSync(path.join(dir, "captures"))
  fs.symlinkSync(path.join(dir, "ceremonies"), path.join(dir, "captures", "x"))
  fs.symlinkSync("held", path.join(dir, "alias"))

  for (const file of ["captures/x/c1/notes.md", "alias/kept.md"]) {
    assert.throws(() => readEpisodeText(EPISODE, file, { root }), (error) => error instanceof EpisodePathError && /symlink/.test(error.message), file)
  }
  assert.equal(readEpisodeText(EPISODE, "held/kept.md", { root }).content, "held\n", "the real path still reads")
  assert.throws(() => readEpisodeText(EPISODE, "notes.md/x.md", { root }), (error) => error.code === "ENOENT", "a file is not a folder")

  const before = readEpisodeText(EPISODE, "held/kept.md", { root })
  assert.throws(() => writeEpisodeText(EPISODE, "alias/kept.md", "changed\n", before.revision.sha256, { root }), /symlink/)
  assert.equal(fs.readFileSync(path.join(dir, "held", "kept.md"), "utf8"), "held\n")
})
