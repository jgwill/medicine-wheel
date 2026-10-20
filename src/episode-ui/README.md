# @medicine-wheel/episode-ui

Browse, read and edit the files of a Miadi episode in the browser.

In the Miadi stack, an episode is the folder a piece of work is filed under, and this package
is how a person opens one: browse its files, read one, preview its markdown, edit it in
CodeMirror, go full screen with only Save and Back, and survive a conflict without losing the
draft. It also has React components for a ceremony's working notes, its attachments, and the
episode shelf. It is the browser half of `@medicine-wheel/episode-vessel`, which holds the rules for
the folder on the server side.

## Where it lives

Up to 0.6.0 (jgwill/Miadi e4e1b141) this package was `@miadi/episode-ui`, published from jgwill/Miadi. It moved to
jgwill/medicine-wheel in 0.25.0 so that dependencies run one way: the medicine-wheel suite is
the foundation, and Miadi consumes it. From 0.7.0, `@miadi/episode-ui` re-exports this package with the
same entry points, so code that imports it keeps working. Ref jgwill/medicine-wheel#166.

```bash
npm i @medicine-wheel/episode-ui
```

## One files workspace, two kinds of host

`mountEpisodeFiles` is framework-free, so a plain page and a React app mount the
same implementation.

React:

```jsx
import { EpisodeFiles, httpEpisodeFiles } from "@medicine-wheel/episode-ui"
import "@medicine-wheel/episode-ui/styles.css"

const service = httpEpisodeFiles({ fileUrl: (file) => `/api/files/${file.relativePath}` })
<EpisodeFiles files={files} capabilities={capabilities} service={service} />
```

A page with no bundler: serve `dist/browser/episode-files.js`
(CodeMirror, marked and DOMPurify inlined) and `src/episode-ui.css`.

```html
<div id="files"></div>
<script type="module">
  import { mountEpisodeFiles, httpEpisodeFiles } from "/vendor/episode-ui/episode-files.js"
  mountEpisodeFiles(document.getElementById("files"), {
    files,
    service: httpEpisodeFiles({
      fileUrl: (file) => `/api/episode-file?file=${encodeURIComponent(file.relativePath)}`,
      mediaUrl: (file) => `/api/episode-media?file=${encodeURIComponent(file.relativePath)}`,
    }),
  })
</script>
```

## What it does

- A filterable file tree: the folders the paths name, every one open, so a file's
  folder is plain to see. Guidance files are dimmed and media and documents marked.
- Markdown opens in a sanitised preview (`marked` + DOMPurify); `Source` shows CodeMirror.
- CodeMirror 6 with markdown, JSON and YAML colouring, undo, search (Ctrl/Cmd-F),
  line wrapping, and Ctrl/Cmd-S to save.
- `⛶` opens the viewer full screen with only the file name, its state, Save and `×`.
  Esc returns.
- Audio and video play inline; images show inline; documents are a download.
- A markdown preview shows the episode's own images: `![](images/still.png)` is
  resolved from the file's folder and shown from the host's `mediaUrl`.
- **Add images** (button, or drop files on the workspace) appears when the
  capabilities include `upload` and the service has `upload` (`httpEpisodeFiles`
  has it only when the host passes `uploadUrl`). Each image is sent
  to `images/<name>`, the name reduced to safe characters and suffixed `-2`, `-3`
  when taken; the new files are listed at once, `onFilesAdded` tells the host, and
  the last one opens.
- An open image shows the record beside it: caption, role and, at the bottom, the
  credit (`service.readRecord`). A role holding `edit` gets **Describe** (role,
  caption, alt text, origin, tool, made by, chosen by; `service.saveRecord` over
  the revision read) and **Use as cover** (`service.setCover`). `httpEpisodeFiles`
  offers them when the host passes `recordUrl` and `coverUrl`.
- Leaving a file or the page with unsaved changes asks first.

## The folders

The vessel lists files, each with its path, and no folders. The workspace builds
the folders from the paths and draws them as a tree:

- Every folder is open to begin with. A folder closes and opens from its row, and
  **Collapse all** / **Expand all** does every folder at once. Only a closed folder
  is remembered, so a folder that arrives later opens.
- A row says the file's name; its whole path is the row's tooltip, and
  `data-path` carries it for a host or a test.
- At each level a `README.md` comes first, then the folders by name, then the
  files in the vessel's order (text, documents, guidance, images, media). Names
  compare numerically: `chapter-2` comes before `chapter-10`.
- A folder shows how many files are beneath it, at any depth.
- Typing in the filter shows each match in its folders, every one open whatever was
  closed before; clearing it brings back the folders as the reader left them.
- A file opened from a link or an address opens the folders it sits in.
- A list with no folder in it looks as it always did.

`listing="flat"` keeps the old list of whole paths, for a host that wants it.

The grouping is also exported, framework-free, for a host that draws its own:
`buildFileTree(files)` returns the root folder (`children`, each a `file` or a
`folder` with its `path` and `fileCount`), `ancestorFolders(path)` names the
folders above a file and `folderPaths(tree)` every folder in the tree.

## The open file as an address

The workspace holds no URL, so a host that wants the open file in its address
passes `open` and listens to `onSelectionChange`:

```jsx
<EpisodeFiles
  files={files}
  service={service}
  open={{ path: "notes.md", mode: "source" }}   // from the address; null closes
  onSelectionChange={(selection, { push }) => {
    // selection: { path, mode? } or null. mode is "preview" | "source" for a text file.
    // push is true when a person opened another file, or kept a draft instead of
    // following the address: add a history entry. Otherwise replace the current one.
  }}
/>
```

- A requested path waits for `files` to arrive and for the right to read, then
  opens and scrolls the viewer into view. `open={{ path, reveal: false }}` opens
  it without scrolling, for a room that opens on its script by default and should
  not carry a phone past its header. A file a person clicks still scrolls into
  view on a narrow screen.
- `open` is acted on only when its value changes, so re-rendering with the same
  one does nothing, and a click the address has not caught up with is kept.
- A path the episode does not hold, or a file too large to open, says so. A
  mode that does not fit the file is corrected, and the corrected selection is
  reported back.
- An unsaved draft is never dropped by an address change: the person is asked.
  A refusal reports the file still shown with `push`, so the entry Back or
  Forward moved to is kept rather than overwritten.
- A relative link in a markdown preview is read from that file's folder. A plain
  click on a link to another file of the episode opens it here in preview, with
  `push`. Pass `fileHref={(selection) => url}` and those links also carry the
  file's address, so a new tab or a copied link lands on the same file. A link
  that leaves the episode (a scheme, a root path, a climb above the root) is
  left as written. `episodeLinkTarget(fromPath, href)` is the same resolution.

The address rule is also exported on its own: `selectionFromSearch(search)`
reads `?file=&mode=`, `addressWithSelection(href, selection)` writes it into an
address and keeps every other parameter, and `writeSelectionToAddress(selection,
{ push })` writes it into the browser's history. In React, one hook does all of it:

```jsx
const address = useEpisodeFilesAddress()            // or { search: useSearchParams().toString() } in Next.js
<EpisodeFiles {...address} files={files} service={service} />
```

## The room's masthead, lineage and source issues

`EpisodeMasthead`, `LineageList` and `SourceIssueList` draw the top of an
episode room. They hold no state and fetch nothing, so a server page renders them
and passes a link callback:

```jsx
<EpisodeMasthead numberLabel="551" title={summary.title} goal={summary.goal}
  date={summary.date} status={summary.status} type={summary.type}
  direction={{ label: "West", oj: "Epangishmok", glyph: "🌊", color: "#5b78b4" }}
  coverUrl={coverUrl} theme={CHRONICLE_THEME} />
<LineageList edges={await readEpisodeLineage(root, episode)} href={(folder) => `/episodes/${folder}`} />
<SourceIssueList issues={summary.references.map((ref) => ({ ref, url: issueUrl(ref) }))} />
```

An edge whose number two folders claim lists both, each linked.

## The chronicle theme

`@medicine-wheel/episode-ui/chronicle-theme` is the Chronicle's dark surface as data:
`CHRONICLE_PALETTE`, `CHRONICLE_THEME` (an `EpisodeUITheme`, which
`@miadi/attention-ui`'s panel also takes), `DIRECTIONS` (the four directions with
their names, colours and glyphs), `FONT_SANS` and `FONT_MONO`. Every text colour
of `CHRONICLE_THEME` reads at 4.5:1 or better on its background and its card.

## One file, no folder

A host that opens a single file it names itself, such as Miadi's `/e` editor, passes
that file in `files` and in `open` with `layout: "single"`: the list, filter and
count are hidden and the viewer takes the width. `outsideFileHref(path)` gives a
link in the preview to a file the workspace does not hold an address of its own;
without it, such a link says the file is not here.

## The conflict path

A save carries the revision the file was read at. When someone else wrote in
between, the host answers 409 with `currentRevision`: the draft stays in the
editor, the message says what is on disk now, and Reload is a choice the person
makes. **A save is never retried automatically.**

## The contract

No component holds a URL or a token, knows a chronicle root, or decides what a
person is allowed to do. The host passes a `service`; `httpEpisodeFiles` is the
one module that fetches, and only from URLs the host gives it. The host resolves
capabilities (`@medicine-wheel/episode-vessel/permissions`) and stays the authority; a
capability here decides only what is offered. A test holds this contract.

| export | what it is for |
|---|---|
| `mountEpisodeFiles(el, options)` | the files workspace; returns `{ update, destroy }` |
| `EpisodeFiles` | the same, as a React component |
| `httpEpisodeFiles({ fileUrl, mediaUrl?, headers?, uploadUrl?, recordUrl?, coverUrl? })` | the service for a host that answers GET/PUT JSON; with `uploadUrl` it POSTs a new image's bytes, with `recordUrl` it reads and writes an image's record, with `coverUrl` it names the cover |
| `imageUploadPath(name, type, taken)` | the `images/` path a chosen image is added at |
| `CeremonyNoteEditor` | a ceremony's working notes (React) |
| `CeremonyAttachments` | what a circle was held about (React) |
| `EpisodeShelfFilter` | find an episode by number, title or slug (React) |

## Styling

One stylesheet of plain class names over CSS custom properties, set from an
`EpisodeUITheme`. Touch targets are 44px because the first surface this runs on
is a phone.
