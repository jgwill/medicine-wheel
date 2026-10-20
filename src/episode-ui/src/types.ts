/**
 * The shapes these components take in.
 *
 * They are re-declared structurally rather than imported from
 * `@medicine-wheel/episode-vessel` at runtime: a browser bundle must not pull `node:fs`
 * in, and a host that reaches a vessel over HTTP receives JSON, not the
 * package's classes. The vessel package is a type-only dependency here, and the
 * two definitions are kept honest by `test/contract.test.mjs`.
 */

export type FileKind = "text" | "document" | "media" | "image"

export interface EpisodeFileView {
  relativePath: string
  name: string
  kind: FileKind
  size: number
  modifiedAt: string
  previewable: boolean
  editable: boolean
  guidance: boolean
}

/** What a media record says, as the host hands it over (`@miadi/episodic-memory-schema` EpisodeMediaRecord). */
export interface MediaRecordFieldsView {
  media?: string
  role?: string
  alt?: string
  caption?: string
  origin?: { kind?: string; tool?: string; notebook?: string; screenwalk?: string; at?: string; device?: string; [key: string]: unknown }
  made_by?: string
  chosen_by?: string
  added_by?: string
  added_at?: string
  [key: string]: unknown
}

export interface MediaRecordView {
  record: MediaRecordFieldsView | null
  /** The record file's revision, null when there is no record yet. */
  revision: string | null
  /** The credit line a surface shows at the bottom of the picture. */
  credit: string | null
}

export const MEDIA_ROLES = ["cover", "map", "still", "illustration", "photo", "screenshot", "other"] as const
export const MEDIA_ORIGIN_KINDS = ["generated", "photo", "screenshot", "frame", "drawn", "imported"] as const

export interface FileRevisionView {
  sha256: string
  modifiedAt: string
  bytes: number
}

export interface EpisodeTextView {
  content: string
  contentType: string
  size: number
  revision: FileRevisionView
}

export interface EpisodeCapabilitiesView {
  browse: boolean
  read: boolean
  edit: boolean
  upload: boolean
  attachCapture: boolean
  writeCeremonyNote: boolean
  attachToCeremony: boolean
}

export interface CeremonyAttachmentView {
  relativePath: string
  attachedBy: string
  attachedAt: string
  note?: string
}

export interface EpisodeShelfEntry {
  episodePath: string
  number: number
  numberLabel: string
  title: string
  date: string
  goal?: string
  status?: string
  /** True when the medicine wheel also holds this episode. */
  registered?: boolean
}

/** Colours and fonts the host already has. Every component takes the same set. */
export interface EpisodeUITheme {
  background: string
  card: string
  text: string
  textDim: string
  muted: string
  accent: string
  border: string
  success: string
  warning: string
  mono: string
}

export const DEFAULT_THEME: EpisodeUITheme = {
  background: "#0d0f12",
  card: "#15181d",
  text: "#e8e6e1",
  textDim: "#b3afa6",
  // 5.03:1 on the card, 5.42:1 on the background. #7d7a72 read at 4.48/4.15
  // and failed AA for the 10.5px meta text and the guidance filename that use
  // it — measured 2026-09-20 while checking gmtermux's dimming (gmtermux#86).
  muted: "#8b8880",
  accent: "#ffd700",
  border: "#2a2e35",
  success: "#5ac37d",
  warning: "#e0a458",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
}

export function themeVars(theme: EpisodeUITheme): Record<string, string> {
  return {
    "--episode-bg": theme.background,
    "--episode-card": theme.card,
    "--episode-text": theme.text,
    "--episode-text-dim": theme.textDim,
    "--episode-muted": theme.muted,
    "--episode-accent": theme.accent,
    "--episode-border": theme.border,
    "--episode-success": theme.success,
    "--episode-warning": theme.warning,
    "--episode-mono": theme.mono,
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function iconFor(file: { name: string; kind: FileKind }): string {
  const extension = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase() ?? ""
  if (["m4a", "mp3", "wav", "opus", "aac", "amr", "ogg"].includes(extension)) return "🎙"
  if (["mp4", "webm", "mov"].includes(extension)) return "🎬"
  if (extension === "mid") return "🎹"
  if (extension === "md") return "📘"
  if (["json", "yaml", "yml"].includes(extension)) return "🧾"
  if (file.kind === "image") return "🏞"
  if (["html", "htm"].includes(extension)) return "🖼"
  if (extension === "pdf") return "📕"
  return "📄"
}
