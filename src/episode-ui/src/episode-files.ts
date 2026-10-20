/**
 * The episode files workspace: list, filter, read, edit, full screen.
 *
 * Framework-free on purpose. gmtermux serves plain pages on a phone with no
 * bundler; Miadi renders React. Both mount this same function (Miadi through
 * `<EpisodeFiles>` in `react.tsx`, gmtermux through `dist/browser/episode-files.js`),
 * so there is one implementation of the experience, not one per host.
 *
 * It holds no URL. Reading and saving go through the `service` the host passes
 * in; `httpEpisodeFiles` in `http.ts` is the ready-made one both hosts use.
 *
 * The editor is CodeMirror 6: syntax colour for markdown, JSON and YAML,
 * undo history, search (Ctrl/Cmd-F) and line wrapping that works on a phone.
 * Markdown preview is `marked`, sanitised by DOMPurify, so both hosts show the
 * same preview through the same sanitiser.
 *
 * The conflict rule is unchanged from the vessel: a save carries the revision
 * it was read at, a 409 keeps the draft and says so, and nothing is retried.
 */

import { EditorView, basicSetup } from "codemirror"
import { EditorState, type Extension } from "@codemirror/state"
import { keymap } from "@codemirror/view"
import { LanguageSupport, syntaxHighlighting } from "@codemirror/language"
import { markdownLanguage } from "@codemirror/lang-markdown"
import { json } from "@codemirror/lang-json"
import { yaml } from "@codemirror/lang-yaml"
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark"
import { marked } from "marked"
import DOMPurify from "dompurify"
import {
  DEFAULT_THEME,
  formatBytes,
  iconFor,
  themeVars,
  type EpisodeCapabilitiesView,
  type EpisodeFileView,
  type EpisodeTextView,
  type EpisodeUITheme,
  type FileRevisionView,
  type MediaRecordFieldsView,
  type MediaRecordView,
  MEDIA_ORIGIN_KINDS,
  MEDIA_ROLES,
} from "./types.js"
import { ancestorFolders, buildFileTree, folderPaths, type FileTreeFolder } from "./file-tree.js"

export interface SaveOutcome {
  ok: boolean
  /** What is on disk now, after a successful save. */
  loaded?: EpisodeTextView
  /** Present when the file moved under the writer. */
  conflict?: { currentRevision: FileRevisionView }
  message?: string
}

export interface UploadOutcome {
  ok: boolean
  /** The file as the vessel now lists it. */
  file?: EpisodeFileView
  /** The name was already taken; nothing was written. */
  exists?: boolean
  message?: string
}

/** How the workspace reaches the vessel. The host owns every URL and header. */
export interface EpisodeFilesService {
  read(file: EpisodeFileView): Promise<EpisodeTextView>
  save(file: EpisodeFileView, content: string, expectedRevision: string): Promise<SaveOutcome>
  /** Where the browser streams, shows or downloads a media file, an image or a document. */
  mediaUrl(file: EpisodeFileView): string
  /** Add a new image at `relativePath` (under `images/`). Absent, "Add images" is never offered. */
  upload?(relativePath: string, image: Blob): Promise<UploadOutcome>
  /** The record beside an image. Absent, the viewer shows the image alone. */
  readRecord?(file: EpisodeFileView): Promise<MediaRecordView>
  /** Save the record beside an image over the revision read (null creates it). */
  saveRecord?(file: EpisodeFileView, record: MediaRecordFieldsView, expectedRevision: string | null): Promise<MediaRecordView>
  /** Name this image the episode's cover. Absent, "Use as cover" is never offered. */
  setCover?(file: EpisodeFileView): Promise<void>
}

/** Which file is open, and whether a text file shows its preview or its source. */
export interface EpisodeFileSelection {
  path: string
  /** Set for a text file. Only markdown has a preview; every other text file is `source`. */
  mode?: FileMode
  /**
   * For `open` only: whether opening it brings the viewer into view. Omitted
   * or `true`, it does, which is how a reload or a shared link lands on the
   * file. `false` opens it where it stands, for a room that opens on its
   * script by default and should not carry every visit past its header on a
   * phone. A change of `reveal` alone is not a new request.
   */
  reveal?: boolean
}

export type FileMode = "preview" | "source"

export interface EpisodeFilesOptions {
  files: EpisodeFileView[]
  service: EpisodeFilesService
  /** Omitted capabilities default to read and edit, gmtermux's single-owner case. */
  capabilities?: Partial<EpisodeCapabilitiesView>
  theme?: EpisodeUITheme
  title?: string
  emptyLabel?: string
  /** Asked before a draft is dropped. Defaults to `window.confirm`. */
  confirmDiscard?: (message: string) => boolean
  /**
   * The file the host wants shown, usually read from its address. Omitted, the
   * workspace keeps its own selection. `null` closes the viewer. A path that is
   * not listed yet waits for the files to arrive. When it opens, the viewer is
   * scrolled into view: this is how a reload or a shared link lands on a file.
   * `reveal: false` opens it without scrolling.
   */
  open?: EpisodeFileSelection | null
  /**
   * Called when what is shown changes. `push` is true when a person opened a
   * different file, or refused to drop a draft for the file the host asked for:
   * the host adds a history entry, so the entry it moved to (Back, Forward) is
   * kept. Otherwise (a mode switch, a corrected mode) it replaces the current one.
   */
  onSelectionChange?: (selection: EpisodeFileSelection | null, change: { push: boolean }) => void
  /**
   * The address of a file in this episode, for a link in a markdown preview
   * that points at it. Omitted, the link keeps what the file wrote; a plain
   * click still opens the file here, a new tab does not.
   */
  fileHref?: (selection: EpisodeFileSelection) => string
  /**
   * `"workspace"` (the default) lists the files beside the viewer. `"single"`
   * shows only the viewer, at full width, for a host that opens one file it
   * names itself and has no folder to browse. Pass that one file in `files`
   * and in `open`.
   */
  layout?: "workspace" | "single"
  /**
   * `"tree"` (the default) draws the folders the paths name, every one open,
   * so a reader sees which folder a file is in. `"flat"` lists every path one
   * under another, as before.
   */
  listing?: "tree" | "flat"
  /**
   * The address of a file a markdown preview links to that `files` does not
   * hold, given its path resolved the same way (`episodeLinkTarget`). When it
   * returns a URL, the link goes there as an ordinary link. Omitted, or when it
   * returns null, a click on such a link says the file is not here.
   */
  outsideFileHref?: (path: string) => string | null
  /**
   * Called after images were added, with what the vessel now lists for them.
   * The workspace shows them at once; a host that owns the file list refreshes
   * it from here, so its next update does not drop them.
   */
  onFilesAdded?: (files: EpisodeFileView[]) => void
}

export interface EpisodeFilesHandle {
  update(options: Partial<EpisodeFilesOptions>): void
  destroy(): void
}

const AUDIO = ["m4a", "mp3", "wav", "opus", "aac", "amr", "ogg"]
const VIDEO = ["mp4", "webm", "mov"]
const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
}
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "avif"]

/**
 * The path a chosen image is added at: `images/<name>`, the name reduced to
 * letters, digits, `.`, `_` and `-`, and suffixed `-2`, `-3`… when `taken`
 * already holds it. Null when the file is not an image this vessel takes.
 */
export function imageUploadPath(name: string, type: string, taken: (path: string) => boolean): string | null {
  const given = extensionOf(name)
  const extension = IMAGE_EXTENSIONS.includes(given) ? given : IMAGE_TYPES[type]
  if (!extension) return null
  const stem =
    name
      .replace(/\.[^.]*$/, "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 80) || "image"
  for (let n = 1; ; n++) {
    const candidate = `images/${stem}${n === 1 ? "" : `-${n}`}.${extension}`
    if (!taken(candidate)) return candidate
  }
}

function extensionOf(name: string): string {
  return /\.([^.]+)$/.exec(name)?.[1]?.toLowerCase() ?? ""
}

function languageFor(name: string): Extension[] {
  const extension = extensionOf(name)
  if (extension === "md" || extension === "markdown") return [new LanguageSupport(markdownLanguage)]
  if (extension === "json" || extension === "jsonl") return [json()]
  if (extension === "yaml" || extension === "yml") return [yaml()]
  return []
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function button(label: string, className: string, onClick: () => void, title?: string): HTMLButtonElement {
  const node = el("button", className, label)
  node.type = "button"
  if (title) {
    node.title = title
    node.setAttribute("aria-label", title)
  }
  node.addEventListener("click", onClick)
  return node
}

const editorTheme = EditorView.theme(
  {
    "&": {
      color: "var(--episode-text)",
      backgroundColor: "var(--episode-bg)",
      fontSize: "13px",
      height: "100%",
    },
    ".cm-scroller": { fontFamily: "var(--episode-mono)", lineHeight: "1.55" },
    ".cm-content": { caretColor: "var(--episode-accent)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--episode-accent)" },
    ".cm-gutters": {
      backgroundColor: "var(--episode-card)",
      color: "var(--episode-muted)",
      borderRight: "1px solid var(--episode-border)",
    },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "rgba(255, 255, 255, 0.04)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(255, 215, 0, 0.22)",
    },
    ".cm-panels": { backgroundColor: "var(--episode-card)", color: "var(--episode-text)" },
    ".cm-searchMatch": { backgroundColor: "rgba(255, 215, 0, 0.25)" },
  },
  { dark: true },
)

type SaveState = "idle" | "saving" | "saved" | "conflict" | "error"

function keyOf(selection: EpisodeFileSelection | null): string {
  return selection ? `${selection.path}\u0000${selection.mode ?? ""}` : ""
}

/** Only markdown has a preview. Every other text file, and any unnamed mode, falls to what fits. */
function modeFor(file: EpisodeFileView, requested?: FileMode): FileMode {
  if (extensionOf(file.name) !== "md") return "source"
  return requested ?? "preview"
}

/**
 * The episode path a link in `fromPath` points at, resolved from that file's
 * folder the way the file's author wrote it. `null` when the link leaves the
 * episode: a scheme, a root or protocol-relative path, a bare fragment, or a
 * climb above the episode root.
 */
export function episodeLinkTarget(fromPath: string, href: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(href)) return null
  const bare = href.split(/[?#]/, 1)[0] ?? ""
  let decoded = bare
  try {
    decoded = decodeURIComponent(bare)
  } catch {
    // A stray % stays as written.
  }
  const parts = fromPath.split("/").slice(0, -1)
  for (const segment of decoded.split("/")) {
    if (segment === "" || segment === ".") continue
    if (segment !== "..") parts.push(segment)
    else if (parts.length) parts.pop()
    else return null
  }
  return parts.length ? parts.join("/") : null
}

/** Mount the workspace into `root`. Returns a handle to feed new files or tear down. */
export function mountEpisodeFiles(root: HTMLElement, initial: EpisodeFilesOptions): EpisodeFilesHandle {
  let options: EpisodeFilesOptions = initial
  let current: EpisodeFileView | null = null
  let loaded: EpisodeTextView | null = null
  let view: EditorView | null = null
  let mode: FileMode = "source"
  // The selection last told to the host, so it hears each change once.
  let reported = keyOf(null)
  // The `open` value last acted on. A re-render that passes the same one is not a request.
  let applied: string | undefined
  // A requested file that cannot be opened yet: the list has not arrived, or reading is not allowed yet.
  let waiting = false
  let saveState: SaveState = "idle"
  let query = ""
  // Folders the reader closed, by path. A tree opens fully; only a closed folder is remembered.
  const collapsed = new Set<string>()
  let fullscreen = false
  // Images added here that the host's list does not hold yet. A React host
  // re-renders with its old list before its refetch lands; these stay shown
  // until the host's list carries them.
  let addedHere: EpisodeFileView[] = []

  const capabilities = (): EpisodeCapabilitiesView => ({
    browse: true,
    read: true,
    edit: true,
    upload: false,
    attachCapture: false,
    writeCeremonyNote: false,
    attachToCeremony: false,
    ...options.capabilities,
  })
  const canEdit = () => Boolean(current?.editable && capabilities().edit)
  const canAdd = () => Boolean(capabilities().upload && options.service.upload) && options.layout !== "single"
  const draft = () => view?.state.doc.toString() ?? ""
  const dirty = () => Boolean(loaded && view && draft() !== loaded.content)
  const confirmDiscard = (message: string) =>
    options.confirmDiscard ? options.confirmDiscard(message) : window.confirm(message)
  const canOpen = (file: EpisodeFileView) => capabilities().read && !(file.kind === "text" && !file.previewable)
  const selection = (): EpisodeFileSelection | null =>
    current ? (current.kind === "text" ? { path: current.relativePath, mode } : { path: current.relativePath }) : null
  /** Tell the host what is shown. `force` repeats it when the host's address disagrees. */
  const report = (push: boolean, force = false) => {
    const next = selection()
    if (!force && keyOf(next) === reported) return
    reported = keyOf(next)
    options.onSelectionChange?.(next, { push })
  }

  // ---------- skeleton ----------
  const section = el("section", "episode-files")
  const head = el("header", "episode-files-head")
  const title = el("h3", "episode-files-title")
  const count = el("span", "episode-files-count")
  const addButton = button("Add images", "episode-files-add", () => picker.click(), "Add images to this episode")
  const picker = el("input")
  picker.type = "file"
  picker.multiple = true
  picker.accept = Object.keys(IMAGE_TYPES).join(",")
  picker.hidden = true
  const foldButton = button("Collapse all", "episode-files-fold", () => foldAll())
  head.append(title, count, foldButton, addButton, picker)
  const addStatus = el("p", "episode-files-add-status")
  addStatus.setAttribute("role", "status")
  addStatus.setAttribute("aria-live", "polite")
  addStatus.hidden = true
  const filter = el("input", "episode-files-filter")
  filter.type = "search"
  filter.placeholder = "Filter by name"
  filter.setAttribute("aria-label", "Filter files")
  const body = el("div", "episode-files-body")
  const list = el("ul", "episode-files-list")
  const notice = el("p", "episode-files-notice")

  const viewer = el("div", "episode-files-viewer")
  viewer.hidden = true
  const bar = el("div", "episode-files-bar")
  const name = el("span", "episode-files-name")
  const status = el("span", "episode-files-status")
  status.setAttribute("role", "status")
  status.setAttribute("aria-live", "polite")
  const tools = el("span", "episode-files-tools")
  const previewButton = button("Preview", "episode-files-mode", () => setMode("preview"))
  const sourceButton = button("Source", "episode-files-mode", () => setMode("source"))
  const saveButton = button("Save", "episode-files-save", () => void save(), "Save (Ctrl/Cmd-S)")
  const reloadButton = button("Reload", "episode-files-reload", () => reload(), "Discard my draft and reload from disk")
  const fullButton = button("⛶", "episode-files-full", () => setFullscreen(!fullscreen), "Full screen")
  tools.append(previewButton, sourceButton, saveButton, reloadButton, fullButton)
  bar.append(name, status, tools)
  const message = el("p", "episode-files-message")
  message.hidden = true
  const preview = el("div", "episode-files-preview")
  const editorHost = el("div", "episode-files-editor")
  const media = el("div", "episode-files-media")
  viewer.append(bar, message, preview, editorHost, media)

  body.append(list, viewer)
  section.append(head, addStatus, filter, body, notice)
  root.replaceChildren(section)

  // ---------- rendering ----------
  function renderShell() {
    Object.entries(themeVars(options.theme ?? DEFAULT_THEME)).forEach(([key, value]) =>
      section.style.setProperty(key, value),
    )
    const single = options.layout === "single"
    section.classList.toggle("is-single", single)
    head.hidden = single
    list.hidden = single
    title.textContent = options.title ?? "Files in this episode"
    const total = options.files.length
    count.textContent = `${total} ${total === 1 ? "file" : "files"}`
    notice.hidden = capabilities().read
    addButton.hidden = !canAdd()
    renderFold()
    notice.textContent = "Sign in to read these files. What is here is listed for everyone; what it says is not."
    renderList()
  }

  /**
   * One file as a row. In a tree it says its name and leaves the chevron's
   * place empty, so a file's icon stands under its folder's; in a flat list it
   * says the whole path.
   */
  function fileRow(file: EpisodeFileView, label: string, inTree: boolean): HTMLLIElement {
    const row = el("li", "episode-files-row")
    if (file.guidance) row.classList.add("is-guidance")
    const selected = current?.relativePath === file.relativePath
    if (selected) row.classList.add("is-selected")
    const open = el("button", "episode-files-open")
    open.type = "button"
    open.dataset.path = file.relativePath
    // A tree row says only the name; the whole path stays one hover away.
    open.title = file.relativePath
    open.disabled = !capabilities().read || (file.kind === "text" && !file.previewable)
    if (selected) open.setAttribute("aria-current", "true")
    const meta = [
      formatBytes(file.size),
      file.kind === "text" && !file.previewable ? "too large" : "",
      file.editable && capabilities().edit ? "editable" : "",
      file.kind === "document" ? "download" : "",
      file.kind === "image" ? "image" : "",
      file.guidance ? "guidance" : "",
    ].filter(Boolean)
    if (inTree) {
      const gap = el("span", "episode-files-chevron")
      gap.setAttribute("aria-hidden", "true")
      open.append(gap)
    }
    open.append(
      el("span", "episode-files-icon", iconFor(file)),
      el("span", "episode-files-path", label),
      el("span", "episode-files-meta", meta.join(" · ")),
    )
    open.addEventListener("click", () => {
      const push = current?.relativePath !== file.relativePath
      if (leave()) void openFile(file, { push })
    })
    row.append(open)
    return row
  }

  /**
   * A folder as a row with its children beneath it. While a filter is typed
   * every folder on the way to a match is open and the toggles rest, so the
   * matches are never hidden by a folder closed earlier.
   */
  function folderRow(folder: FileTreeFolder, filtering: boolean): HTMLLIElement {
    const isOpen = filtering || !collapsed.has(folder.path)
    const row = el("li", "episode-files-folder")
    row.classList.toggle("is-collapsed", !isOpen)
    const toggle = el("button", "episode-files-folder-toggle")
    toggle.type = "button"
    toggle.dataset.folder = folder.path
    toggle.title = folder.path
    toggle.setAttribute("aria-expanded", String(isOpen))
    if (filtering) toggle.setAttribute("aria-disabled", "true")
    const chevron = el("span", "episode-files-chevron", isOpen ? "▾" : "▸")
    chevron.setAttribute("aria-hidden", "true")
    toggle.append(
      chevron,
      el("span", "episode-files-icon", isOpen ? "📂" : "📁"),
      el("span", "episode-files-folder-name", folder.name),
      el("span", "episode-files-meta", `${folder.fileCount} ${folder.fileCount === 1 ? "file" : "files"}`),
    )
    toggle.addEventListener("click", () => {
      if (filtering) return
      if (!collapsed.delete(folder.path)) collapsed.add(folder.path)
      renderList()
      renderFold()
      // The list was drawn again: keep the keyboard where it was.
      list.querySelectorAll<HTMLElement>("[data-folder]").forEach((node) => {
        if (node.dataset.folder === folder.path) node.focus()
      })
    })
    row.append(toggle)
    if (isOpen) {
      const children = el("ul", "episode-files-children")
      appendNodes(children, folder, filtering)
      row.append(children)
    }
    return row
  }

  function appendNodes(parent: HTMLElement, folder: FileTreeFolder, filtering: boolean) {
    for (const node of folder.children) {
      parent.append(node.type === "folder" ? folderRow(node, filtering) : fileRow(node.file, node.name, true))
    }
  }

  const allFolders = () =>
    options.listing === "flat" || options.layout === "single" ? [] : folderPaths(buildFileTree(options.files))

  /** "Collapse all" until every folder is closed, then "Expand all". Rests while a filter is typed. */
  function renderFold() {
    const folders = allFolders()
    const allClosed = folders.length > 0 && folders.every((folder) => collapsed.has(folder))
    foldButton.hidden = folders.length === 0
    foldButton.disabled = Boolean(query.trim())
    foldButton.textContent = allClosed ? "Expand all" : "Collapse all"
    foldButton.title = allClosed ? "Open every folder" : "Close every folder"
    foldButton.setAttribute("aria-label", foldButton.title)
  }

  function foldAll() {
    const folders = allFolders()
    if (folders.every((folder) => collapsed.has(folder))) collapsed.clear()
    else folders.forEach((folder) => collapsed.add(folder))
    renderList()
    renderFold()
  }

  function renderList() {
    const needle = query.trim().toLowerCase()
    const shown = options.files.filter((file) => !needle || file.relativePath.toLowerCase().includes(needle))
    filter.hidden = options.files.length <= 6 || options.layout === "single"
    list.replaceChildren()
    if (options.files.length === 0 || shown.length === 0) {
      list.append(
        el(
          "li",
          "episode-files-empty",
          options.files.length === 0
            ? options.emptyLabel ?? "This episode folder holds no readable file yet."
            : "No file matches this filter.",
        ),
      )
      return
    }
    if (options.listing === "flat") {
      for (const file of shown) list.append(fileRow(file, file.relativePath, false))
      return
    }
    appendNodes(list, buildFileTree(shown), Boolean(needle))
  }

  function renderStatus() {
    const labels: Record<SaveState, string> = {
      idle: dirty() ? "Unsaved changes" : canEdit() ? "Up to date" : "Read only",
      saving: "Saving…",
      saved: "Saved",
      conflict: "Changed on disk",
      error: "Not saved",
    }
    const isText = current?.kind === "text" && loaded
    status.textContent = isText ? labels[saveState] : ""
    status.dataset.state = saveState === "idle" && dirty() ? "dirty" : saveState
    saveButton.hidden = !isText || !canEdit()
    saveButton.disabled = saveState === "saving" || !(dirty() || saveState === "conflict")
    reloadButton.hidden = saveState !== "conflict"
  }

  function say(text: string, tone: "info" | "warning" = "info") {
    message.textContent = text
    message.dataset.tone = tone
    message.hidden = !text
  }

  function setMode(next: FileMode) {
    if (current?.kind === "text" && !loaded) {
      // Still opening: keep what was asked, the read applies it when it lands.
      mode = modeFor(current, next)
      report(false)
      return
    }
    const isMarkdown = Boolean(current && extensionOf(current.name) === "md" && loaded)
    mode = next === "preview" && isMarkdown ? "preview" : "source"
    report(false)
    previewButton.hidden = !isMarkdown
    sourceButton.hidden = !isMarkdown
    previewButton.setAttribute("aria-pressed", String(mode === "preview"))
    sourceButton.setAttribute("aria-pressed", String(mode === "source"))
    preview.hidden = mode !== "preview"
    editorHost.hidden = mode !== "source" || !loaded
    if (mode === "preview" && loaded) {
      const html = marked.parse(draft() || loaded.content, { async: false }) as string
      preview.innerHTML = DOMPurify.sanitize(html)
      linkPreview()
      placeImages()
    }
    if (mode === "source") view?.focus()
  }

  /** A link to another file of the episode points at that file's address here. */
  function linkPreview() {
    if (!current) return
    for (const anchor of preview.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const target = episodeLinkTarget(current.relativePath, anchor.getAttribute("href") ?? "")
      if (!target) continue
      anchor.dataset.episodePath = target
      const file = options.files.find((candidate) => candidate.relativePath === target)
      if (file && options.fileHref) {
        anchor.href = options.fileHref(
          file.kind === "text" ? { path: target, mode: modeFor(file, "preview") } : { path: target },
        )
      } else if (!file) {
        const outside = options.outsideFileHref?.(target)
        if (outside) {
          anchor.href = outside
          delete anchor.dataset.episodePath
        }
      }
    }
  }

  /**
   * An image the markdown names by a path inside this episode is shown from
   * the vessel, wherever the host serves it. One that is not listed here is
   * left as written.
   */
  function placeImages() {
    if (!current) return
    for (const image of preview.querySelectorAll<HTMLImageElement>("img[src]")) {
      const target = episodeLinkTarget(current.relativePath, image.getAttribute("src") ?? "")
      const file = target ? options.files.find((candidate) => candidate.relativePath === target) : undefined
      if (file?.kind === "image") image.src = options.service.mediaUrl(file)
      image.loading = "lazy"
      image.decoding = "async"
    }
  }

  function followLink(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-episode-path]") : null
    const target = anchor?.dataset.episodePath
    if (!target) return
    event.preventDefault()
    const file = options.files.find((candidate) => candidate.relativePath === target)
    if (!file) return say(`${target} is not in this episode.`, "warning")
    if (!canOpen(file)) return say(`${target} is too large to open here.`, "warning")
    if (file === current || !leave()) return
    void openFile(file, { push: true, mode: "preview", reveal: true, expandAncestors: true })
  }

  function setFullscreen(open: boolean) {
    fullscreen = open
    viewer.classList.toggle("is-fullscreen", open)
    document.body.classList.toggle("episode-files-locked", open)
    fullButton.textContent = open ? "×" : "⛶"
    fullButton.title = open ? "Back to normal view (Esc)" : "Full screen"
    fullButton.setAttribute("aria-label", fullButton.title)
    fullButton.setAttribute("aria-pressed", String(open))
    if (mode === "source") view?.focus()
    else fullButton.focus()
  }

  function makeEditor(file: EpisodeFileView, content: string) {
    view?.destroy()
    const editable = canEdit()
    view = new EditorView({
      parent: editorHost,
      state: EditorState.create({
        doc: content,
        extensions: [
          keymap.of([
            {
              key: "Mod-s",
              preventDefault: true,
              run: () => {
                void save()
                return true
              },
            },
          ]),
          basicSetup,
          EditorView.lineWrapping,
          editorTheme,
          syntaxHighlighting(oneDarkHighlightStyle),
          EditorState.readOnly.of(!editable),
          EditorView.editable.of(editable),
          EditorView.contentAttributes.of({ "aria-label": `Contents of ${file.relativePath}` }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return
            if (saveState === "saved" || saveState === "error") saveState = "idle"
            renderStatus()
          }),
          ...languageFor(file.name),
        ],
      }),
    })
  }

  function showMedia(file: EpisodeFileView) {
    const url = options.service.mediaUrl(file)
    const extension = extensionOf(file.name)
    media.replaceChildren()
    if (AUDIO.includes(extension)) {
      const audio = el("audio")
      audio.controls = true
      audio.preload = "metadata"
      audio.src = url
      media.append(audio)
    } else if (file.kind === "image") {
      const figure = el("figure", "episode-files-figure")
      const image = el("img", "episode-files-image")
      image.src = url
      image.alt = file.relativePath
      image.decoding = "async"
      figure.append(image)
      media.append(figure)
      if (options.service.readRecord) void showRecord(file, figure, image)
    } else if (VIDEO.includes(extension)) {
      const video = el("video")
      video.controls = true
      video.preload = "metadata"
      video.playsInline = true
      video.src = url
      media.append(video)
    }
    const link = el("a", "episode-files-download", file.kind === "document" ? "Download" : "Open in a new tab")
    link.href = url
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    if (file.kind === "document") link.setAttribute("download", file.name)
    media.append(link)
  }

  /**
   * The record beside an image: its caption, a discreet credit at the bottom,
   * and for a writer, a form to describe it and a button to make it the cover.
   */
  async function showRecord(file: EpisodeFileView, figure: HTMLElement, image: HTMLImageElement) {
    let view: MediaRecordView
    try {
      view = await options.service.readRecord!(file)
    } catch {
      return
    }
    if (current?.relativePath !== file.relativePath) return
    figure.querySelector(".episode-files-record")?.remove()
    const panel = el("figcaption", "episode-files-record")
    const record = view.record
    if (record?.alt) image.alt = record.alt
    if (record?.caption) panel.append(el("span", "episode-files-caption", record.caption))
    if (record?.role) panel.append(el("span", "episode-files-role", record.role))
    if (view.credit) panel.append(el("span", "episode-files-credit", view.credit))
    const canWrite = capabilities().edit
    if (canWrite && (options.service.saveRecord || options.service.setCover)) {
      const actions = el("span", "episode-files-record-actions")
      if (options.service.saveRecord) {
        actions.append(button(record ? "Describe" : "Describe this image", "episode-files-describe", () => describe(file, figure, image, view)))
      }
      if (options.service.setCover) {
        actions.append(
          button("Use as cover", "episode-files-cover", async () => {
            try {
              await options.service.setCover!(file)
              say(`${file.relativePath} is now the episode's cover.`)
            } catch (error) {
              say(error instanceof Error ? error.message : "The cover was not changed.", "warning")
            }
          }),
        )
      }
      panel.append(actions)
    }
    if (panel.childElementCount) figure.append(panel)
  }

  function describe(file: EpisodeFileView, figure: HTMLElement, image: HTMLImageElement, view: MediaRecordView) {
    figure.querySelector(".episode-files-describe-form")?.remove()
    const record = view.record ?? {}
    const form = el("form", "episode-files-describe-form")
    const field = (label: string, input: HTMLElement) => {
      const row = el("label", "episode-files-field")
      row.append(el("span", "episode-files-field-label", label), input)
      form.append(row)
    }
    const select = (values: readonly string[], value?: string) => {
      const node = el("select")
      node.append(el("option", undefined, "—"))
      for (const v of values) {
        const option = el("option", undefined, v)
        option.value = v
        if (v === value) option.selected = true
        node.append(option)
      }
      return node
    }
    const text = (value?: string, multiline = false) => {
      const node = multiline ? el("textarea") : el("input")
      node.value = value ?? ""
      return node
    }
    const role = select(MEDIA_ROLES, record.role)
    const caption = text(record.caption)
    const alt = text(record.alt, true)
    const kind = select(MEDIA_ORIGIN_KINDS, record.origin?.kind)
    const tool = text(record.origin?.tool)
    const madeBy = text(record.made_by)
    const chosenBy = text(record.chosen_by)
    field("Role", role)
    field("Caption", caption)
    field("Alt text (what the picture shows)", alt)
    field("Origin", kind)
    field("Tool or model", tool)
    field("Made by", madeBy)
    field("Chosen by", chosenBy)
    const save = el("button", "episode-files-describe-save", "Save the record")
    save.type = "submit"
    const cancel = button("Cancel", "episode-files-describe-cancel", () => form.remove())
    const row = el("div", "episode-files-describe-actions")
    row.append(save, cancel)
    form.append(row)
    form.addEventListener("submit", async (event) => {
      event.preventDefault()
      const pick = (node: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) =>
        node.value && node.value !== "—" ? node.value.trim() || undefined : undefined
      const origin = pick(kind) ? { ...(record.origin ?? {}), kind: pick(kind), tool: pick(tool) } : undefined
      const next: MediaRecordFieldsView = {
        ...record,
        role: pick(role),
        caption: pick(caption),
        alt: pick(alt),
        origin,
        made_by: pick(madeBy),
        chosen_by: pick(chosenBy),
      }
      save.disabled = true
      try {
        await options.service.saveRecord!(file, next, view.revision)
        form.remove()
        say(`The record of ${file.relativePath} is saved.`)
        void showRecord(file, figure, image)
      } catch (error) {
        save.disabled = false
        say(error instanceof Error ? error.message : "The record was not saved.", "warning")
      }
    })
    figure.append(form)
    ;(role as HTMLSelectElement).focus()
  }

  // ---------- intent ----------
  /** True when nothing unsaved is in the way, or the person agreed to drop it. */
  function leave(): boolean {
    return !dirty() || confirmDiscard("Discard unsaved changes to " + current?.relativePath + "?")
  }

  interface OpenHow {
    /** A person opened a different file: the host may add a history entry. */
    push: boolean
    mode?: FileMode
    /** Expand the file's folders for a host/link request or a newly added file. */
    expandAncestors?: boolean
    /**
     * `true`: bring the viewer into view (the host asked for this file, so the
     * page was not looking at it). `false`: never, the host said so. Omitted: a
     * person's own click, which on a narrow screen scrolls to the text it opened.
     */
    reveal?: boolean
  }

  async function openFile(file: EpisodeFileView, how: OpenHow) {
    current = file
    loaded = null
    saveState = "idle"
    mode = modeFor(file, how.mode)
    view?.destroy()
    view = null
    say("")
    viewer.hidden = false
    tools.hidden = false
    name.textContent = file.relativePath
    preview.replaceChildren()
    media.replaceChildren()
    media.hidden = file.kind === "text"
    if (how.expandAncestors) {
      for (const folder of ancestorFolders(file.relativePath)) collapsed.delete(folder)
    }
    renderList()
    renderFold()
    report(how.push)

    if (file.kind !== "text") {
      preview.hidden = true
      editorHost.hidden = true
      previewButton.hidden = sourceButton.hidden = true
      showMedia(file)
      renderStatus()
      if (how.reveal === true) viewer.scrollIntoView({ block: "start" })
      return
    }

    status.textContent = "Opening…"
    saveButton.hidden = reloadButton.hidden = true
    previewButton.hidden = sourceButton.hidden = true
    preview.hidden = editorHost.hidden = true
    try {
      const text = await options.service.read(file)
      if (current !== file) return
      loaded = text
      makeEditor(file, text.content)
      setMode(mode)
      renderStatus()
      if (how.reveal === true || (how.reveal === undefined && window.matchMedia?.("(max-width: 760px)").matches)) {
        viewer.scrollIntoView({ block: "start" })
      }
    } catch (error) {
      if (current !== file) return
      status.textContent = ""
      say(`${file.relativePath} could not be read. ${error instanceof Error ? error.message : ""}`, "warning")
    }
  }

  async function save() {
    if (!current || !loaded || !view || !canEdit() || saveState === "saving") return
    if (!dirty() && saveState !== "conflict") return
    saveState = "saving"
    say("")
    renderStatus()
    const content = draft()
    const file = current
    try {
      const outcome = await options.service.save(file, content, loaded.revision.sha256)
      // The person opened another file meanwhile: this outcome is not about what is shown.
      // Compared by path: a host's update() may hand in a fresh object for the same file.
      if (current?.relativePath !== file.relativePath) return
      if (outcome.ok) {
        loaded = outcome.loaded ?? { ...loaded, content }
        saveState = "saved"
      } else if (outcome.conflict) {
        saveState = "conflict"
        const theirs = outcome.conflict.currentRevision
        say(
          (outcome.message ??
            "This file changed on disk while you were writing. Nothing was overwritten and your draft is still here.") +
            ` On disk now: ${theirs.bytes} bytes, ${theirs.modifiedAt}.`,
          "warning",
        )
      } else {
        saveState = "error"
        say(outcome.message ?? "It could not be saved.", "warning")
      }
    } catch (error) {
      if (current?.relativePath !== file.relativePath) return
      saveState = "error"
      say(error instanceof Error ? error.message : "It could not be saved.", "warning")
    }
    renderStatus()
  }

  /** Add each chosen image, one after another, then show the last one added. */
  async function addImages(chosen: File[]) {
    const upload = options.service.upload
    if (!upload || !canAdd() || chosen.length === 0) return
    const added: EpisodeFileView[] = []
    const refused: string[] = []
    const taken = (path: string) =>
      options.files.some((file) => file.relativePath === path) || added.some((file) => file.relativePath === path)
    addButton.disabled = true
    addStatus.hidden = false
    addStatus.dataset.tone = "info"
    for (const [index, image] of chosen.entries()) {
      const path = imageUploadPath(image.name, image.type, taken)
      if (!path) {
        refused.push(`${image.name} is not a png, jpg, webp, gif or avif image`)
        continue
      }
      addStatus.textContent = `Adding ${index + 1} of ${chosen.length}: ${path}`
      try {
        const outcome = await upload(path, image)
        if (outcome.ok && outcome.file) added.push(outcome.file)
        else refused.push(`${image.name}: ${outcome.message ?? (outcome.exists ? "that name is taken" : "not added")}`)
      } catch (error) {
        refused.push(`${image.name}: ${error instanceof Error ? error.message : "not added"}`)
      }
    }
    addButton.disabled = false
    picker.value = ""
    if (added.length) {
      addedHere = [...addedHere, ...added]
      options = { ...options, files: [...options.files, ...added] }
      renderShell()
      options.onFilesAdded?.(added)
    }
    const done = added.length ? `Added ${added.map((file) => file.relativePath).join(", ")}.` : ""
    addStatus.textContent = [done, ...refused].filter(Boolean).join(" ")
    addStatus.dataset.tone = refused.length ? "warning" : "info"
    const last = added[added.length - 1]
    if (last && leave()) void openFile(last, { push: true, reveal: true, expandAncestors: true })
  }

  function reload() {
    if (current && confirmDiscard("Drop your draft and load what is on disk now?"))
      void openFile(current, { push: false, mode })
  }

  function close() {
    current = null
    loaded = null
    saveState = "idle"
    view?.destroy()
    view = null
    if (fullscreen) setFullscreen(false)
    say("")
    viewer.hidden = true
    preview.replaceChildren()
    media.replaceChildren()
    renderList()
    report(false)
  }

  /** Say why a requested file is not shown, over the open file or in an empty viewer. */
  function cannotOpen(path: string, text: string) {
    if (!current) {
      viewer.hidden = false
      tools.hidden = true
      name.textContent = path
    }
    say(text, "warning")
  }

  /**
   * Show what the host asked for in `open`. It acts only when `open` changes,
   * so every re-render of a React host is not a new request, and a person's own
   * click is never undone by an address that has not caught up yet.
   */
  function applyOpen() {
    const wanted = options.open
    if (wanted === undefined) return
    if (keyOf(wanted) === applied && !waiting) return
    applied = keyOf(wanted)
    waiting = false

    if (wanted === null) {
      if (!current) {
        // Only a notice about the requested file can be showing; it goes with its address.
        say("")
        viewer.hidden = true
      } else if (leave()) close()
      else report(true, true)
      return
    }
    if (keyOf(wanted) === keyOf(selection())) return

    if (current && wanted.path === current.relativePath) {
      // Same file, another mode.
      if (current.kind === "text") setMode(modeFor(current, wanted.mode))
      report(false, keyOf(selection()) !== keyOf(wanted))
      return
    }

    const file = options.files.find((candidate) => candidate.relativePath === wanted.path)
    if (!file) {
      if (options.files.length === 0) {
        waiting = true
        return
      }
      cannotOpen(wanted.path, `${wanted.path} is not in this episode.`)
      return
    }
    if (!capabilities().read) {
      waiting = true
      return
    }
    if (!canOpen(file)) {
      cannotOpen(wanted.path, `${wanted.path} is too large to open here.`)
      return
    }
    if (!leave()) {
      report(true, true)
      return
    }
    void openFile(file, { push: false, mode: wanted.mode, reveal: wanted.reveal !== false, expandAncestors: true })
    report(false, keyOf(selection()) !== keyOf(wanted))
  }

  // ---------- events ----------
  const onFilter = () => {
    query = filter.value
    renderList()
    renderFold()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && fullscreen && !event.defaultPrevented) setFullscreen(false)
  }
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (dirty()) event.preventDefault()
  }
  const onPick = () => void addImages([...(picker.files ?? [])])
  const onDragOver = (event: DragEvent) => {
    if (!canAdd() || !event.dataTransfer?.types.includes("Files")) return
    event.preventDefault()
    section.classList.add("is-dropping")
  }
  const onDragLeave = (event: DragEvent) => {
    if (!section.contains(event.relatedTarget as Node | null)) section.classList.remove("is-dropping")
  }
  const onDrop = (event: DragEvent) => {
    section.classList.remove("is-dropping")
    if (!canAdd() || !event.dataTransfer?.files.length) return
    event.preventDefault()
    void addImages([...event.dataTransfer.files])
  }
  picker.addEventListener("change", onPick)
  section.addEventListener("dragover", onDragOver)
  section.addEventListener("dragleave", onDragLeave)
  section.addEventListener("drop", onDrop)
  filter.addEventListener("input", onFilter)
  preview.addEventListener("click", followLink)
  document.addEventListener("keydown", onKey)
  window.addEventListener("beforeunload", onBeforeUnload)

  renderShell()
  applyOpen()

  return {
    update(next) {
      if (next.files) {
        const listed = new Set(next.files.map((file) => file.relativePath))
        addedHere = addedHere.filter((file) => !listed.has(file.relativePath))
        next = { ...next, files: [...next.files, ...addedHere] }
      }
      options = { ...options, ...next }
      if (current) current = options.files.find((file) => file.relativePath === current!.relativePath) ?? current
      renderShell()
      renderStatus()
      applyOpen()
    },
    destroy() {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("keydown", onKey)
      document.body.classList.remove("episode-files-locked")
      view?.destroy()
      root.replaceChildren()
    },
  }
}
