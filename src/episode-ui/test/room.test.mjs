import { test } from "vitest"
import assert from "node:assert/strict"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  EpisodeMasthead,
  LineageList,
  SourceIssueList,
  addressWithSelection,
  selectionFromSearch,
  useEpisodeFilesAddress,
  writeSelectionToAddress,
} from "../dist/index.js"
import { CHRONICLE_PALETTE, CHRONICLE_THEME, DIRECTIONS, FONT_MONO, FONT_SANS } from "../dist/chronicle-theme.js"

// ---------- E5: the chronicle theme ----------

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test("every text colour of the chronicle theme reads at 4.5:1 on its background and its card", () => {
  for (const role of ["text", "textDim", "muted", "accent", "success", "warning"]) {
    for (const surface of ["background", "card"]) {
      const ratio = contrast(CHRONICLE_THEME[role], CHRONICLE_THEME[surface])
      assert.ok(ratio >= 4.5, `${role} on ${surface}: ${ratio.toFixed(2)}:1`)
    }
  }
})

test("the chronicle theme is the palette, as the workspace and the attention panel take it", () => {
  assert.equal(CHRONICLE_THEME.background, "#151515")
  assert.equal(CHRONICLE_THEME.accent, "#d4a843")
  assert.equal(CHRONICLE_THEME.muted, CHRONICLE_PALETTE.faint)
  assert.equal(CHRONICLE_THEME.mono, FONT_MONO)
  assert.match(FONT_SANS, /Nunito/)
  for (const field of ["background", "card", "text", "textDim", "muted", "accent", "border", "success", "warning", "mono"]) {
    assert.equal(typeof CHRONICLE_THEME[field], "string", field)
  }
  assert.deepEqual(Object.keys(DIRECTIONS), ["east", "south", "west", "north"])
  assert.equal(DIRECTIONS.east.oj, "Waabinong")
  assert.equal(DIRECTIONS.west.color, "#5b78b4")
})

// ---------- E7: the address ----------

test("a selection is read from the address, and an unknown mode is dropped", () => {
  assert.deepEqual(selectionFromSearch("?file=script.md&mode=source"), { path: "script.md", mode: "source" })
  assert.deepEqual(selectionFromSearch("file=notes%2Fa%20b.md&mode=preview"), { path: "notes/a b.md", mode: "preview" })
  assert.deepEqual(selectionFromSearch("?file=script.md&mode=edit"), { path: "script.md" })
  assert.equal(selectionFromSearch("?attention=a1"), null)
  assert.equal(selectionFromSearch(""), null)
  assert.deepEqual(selectionFromSearch(new URLSearchParams({ file: "x.md" })), { path: "x.md" })
})

test("a selection is written into an address, keeping every other parameter and the fragment", () => {
  assert.equal(addressWithSelection("/episodes/551?attention=a1#files", { path: "script.md", mode: "preview" }), "/episodes/551?attention=a1&file=script.md&mode=preview#files")
  assert.equal(addressWithSelection("/episodes/551?file=old.md&mode=source", { path: "new.md" }), "/episodes/551?file=new.md")
  assert.equal(addressWithSelection("/episodes/551?file=old.md&mode=source&x=1", null), "/episodes/551?x=1")
  assert.equal(addressWithSelection("https://eury.test/episodes/551", { path: "a b/c.md" }), "https://eury.test/episodes/551?file=a+b%2Fc.md")
  assert.deepEqual(selectionFromSearch(new URL(addressWithSelection("https://eury.test/e", { path: "a b/c.md", mode: "source" })).search), { path: "a b/c.md", mode: "source" })
  // A relative address stays relative to the page.
  assert.equal(addressWithSelection("?attention=a1", { path: "a.md" }), "?attention=a1&file=a.md")
  assert.equal(addressWithSelection("551?x=1", { path: "a.md" }), "551?x=1&file=a.md")
  assert.equal(addressWithSelection("#top", { path: "a.md" }), "?file=a.md#top")
  assert.equal(addressWithSelection("", { path: "a.md" }), "?file=a.md")
  assert.equal(addressWithSelection("rooms/551", null), "rooms/551")
})

test("the hook's link to a file is the page's path and query, without its fragment", () => {
  let address
  const Probe = () => {
    address = useEpisodeFilesAddress({ search: "" })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  globalThis.window = { location: { pathname: "/chronicle/551", search: "?token=t&file=a.md", hash: "#attention-a1" } }
  try {
    assert.equal(address.fileHref({ path: "b.md", mode: "preview" }), "/chronicle/551?token=t&file=b.md&mode=preview")
  } finally {
    delete globalThis.window
  }
})

test("writing the address pushes a person's open and replaces anything else, and writes nothing that is already there", () => {
  const calls = []
  const location = { href: "https://eury.test/episodes/551?x=1" }
  globalThis.window = {
    location,
    history: {
      pushState: (state, _title, url) => (calls.push(["push", state, url]), (location.href = url)),
      replaceState: (state, _title, url) => (calls.push(["replace", state, url]), (location.href = url)),
    },
  }
  try {
    writeSelectionToAddress({ path: "script.md" }, { push: true })
    writeSelectionToAddress({ path: "script.md", mode: "source" }, { push: false })
    writeSelectionToAddress({ path: "script.md", mode: "source" }, { push: true })
    assert.deepEqual(calls, [
      ["push", null, "https://eury.test/episodes/551?x=1&file=script.md"],
      ["replace", null, "https://eury.test/episodes/551?x=1&file=script.md&mode=source"],
    ])
  } finally {
    delete globalThis.window
  }
  writeSelectionToAddress({ path: "a.md" }, { push: true }) // no window: nothing happens
})

test("the address hook opens what the host's search names", () => {
  let address
  const Probe = ({ search }) => {
    address = useEpisodeFilesAddress({ search })
    return null
  }
  renderToStaticMarkup(createElement(Probe, { search: "file=script.md&mode=preview" }))
  assert.deepEqual(address.open, { path: "script.md", mode: "preview" })
  assert.equal(typeof address.onSelectionChange, "function")
  assert.equal(address.fileHref({ path: "a.md" }), "/?file=a.md")

  renderToStaticMarkup(createElement(Probe, {}))
  assert.equal(address.open, null, "without a host search, nothing is open until the page has mounted")
})

// ---------- E8: the room's masthead, lineage and source issues ----------

const render = (component, props) => renderToStaticMarkup(createElement(component, props))

test("the masthead shows the number, title, goal and facts, with the direction's colour and the cover", () => {
  const html = render(EpisodeMasthead, {
    numberLabel: "551",
    title: "Learning Between Sessions",
    goal: "Keep a change only when the tasks still pass",
    date: "2026-10-08",
    status: "open",
    type: "chronicle-episode",
    series: "miadi-chronicle",
    direction: { label: "West", oj: "Epangishmok", glyph: "🌊", color: "#5b78b4" },
    readings: ["memory", "Book II · The Orchard"],
    coverUrl: "/api/episodes/551/files/images/cover.webp",
  })
  // React 19 hoists a preload for the cover in front of the header.
  assert.match(html, /^(<link rel="preload" as="image" href="[^"]+"\/>)?<header class="episode-masthead" data-episode-number="551" style="[^"]*--episode-direction:#5b78b4/)
  assert.match(html, /<div class="episode-masthead-number">E551<\/div>/)
  assert.match(html, /<h1 class="episode-masthead-title">Learning Between Sessions<\/h1>/)
  assert.match(html, /<p class="episode-masthead-goal">Keep a change only when the tasks still pass<\/p>/)
  assert.match(html, /2026-10-08 · open · chronicle-episode · miadi-chronicle · 🌊 West \(Epangishmok\) · memory · Book II · The Orchard/)
  assert.match(html, /<img class="episode-masthead-cover" src="\/api\/episodes\/551\/files\/images\/cover.webp" alt=""\/>/)
})

test("a bare masthead shows what it has and nothing else", () => {
  const html = render(EpisodeMasthead, { numberLabel: "005", title: "Script era", headingLevel: 2, status: " " })
  assert.match(html, /<h2 class="episode-masthead-title">Script era<\/h2>/)
  assert.doesNotMatch(html, /episode-masthead-goal|episode-masthead-facts|<img|--episode-direction/)
})

test("lineage links each edge to its room, offers both claimants of a shared number, and keeps the words why", () => {
  const html = render(LineageList, {
    href: (folder) => `/episodes/${encodeURIComponent(folder)}`,
    edges: [
      { kind: "related-to", label: "relates to", targetValue: "351", targetName: "2026-09-23-episode-351-a-benchmark", targetTitle: "A Benchmark", text: "351 is the score." },
      { kind: "related-to", label: "relates to", targetValue: "120", candidates: ["2026-07-10-episode-120-a", "2026-07-10-episode-120-b"] },
      { kind: "continues-from", label: "continues from", targetValue: "999" },
    ],
  })
  assert.match(html, /relates to <a href="\/episodes\/2026-09-23-episode-351-a-benchmark">A Benchmark<\/a><span class="episode-lineage-text"> · 351 is the score.<\/span>/)
  assert.match(html, /120, one of <span><a href="\/episodes\/2026-07-10-episode-120-a">2026-07-10-episode-120-a<\/a><\/span><span> or <a href="\/episodes\/2026-07-10-episode-120-b">/)
  assert.match(html, /continues from <span>999<\/span>/)
  assert.equal(render(LineageList, { edges: [], href: String }), "")
})

test("source issues link what has an address and show the rest as written", () => {
  const html = render(SourceIssueList, {
    issues: [
      { ref: "jgwill/Miadi#766", url: "https://github.com/jgwill/Miadi/issues/766" },
      { ref: "miadi-review:abb8fe26", url: null },
    ],
  })
  assert.match(html, /<li><a href="https:\/\/github.com\/jgwill\/Miadi\/issues\/766">jgwill\/Miadi#766<\/a><\/li><li><span>miadi-review:abb8fe26<\/span><\/li>/)
  assert.equal(render(SourceIssueList, { issues: [] }), "")
})
