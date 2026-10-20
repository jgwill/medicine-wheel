"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import {
  DEFAULT_THEME,
  themeVars,
  type CeremonyAttachmentView,
  type EpisodeCapabilitiesView,
  type EpisodeUITheme,
} from "./types.js"

export interface CeremonyNoteEditorProps {
  ceremonyId: string
  /** Where the note lives in the vessel, shown so a person can find it later. */
  relativePath: string
  content: string
  exists: boolean
  capabilities: EpisodeCapabilitiesView
  onSave: (content: string) => Promise<{ ok: boolean; message?: string }>
  label?: string
  placeholder?: string
  theme?: EpisodeUITheme
  className?: string
  style?: CSSProperties
}

/**
 * The working notes of one ceremony, kept in the episode vessel.
 *
 * The medicine wheel owns the ceremony record; this is what the circle wrote
 * down, and it stays in the folder so it travels with the episode and survives
 * a wheel that is offline. A person without `writeCeremonyNote` reads it.
 */
export function CeremonyNoteEditor({
  ceremonyId,
  relativePath,
  content,
  exists,
  capabilities,
  onSave,
  label = "Working notes",
  placeholder = "What should remain with this ceremony?",
  theme = DEFAULT_THEME,
  className,
  style,
}: CeremonyNoteEditorProps) {
  const [draft, setDraft] = useState(content)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [message, setMessage] = useState("")

  useEffect(() => {
    setDraft(content)
    setState("idle")
  }, [ceremonyId, content])

  const mayWrite = capabilities.writeCeremonyNote

  const save = async () => {
    setState("saving")
    try {
      const outcome = await onSave(draft)
      setState(outcome.ok ? "saved" : "error")
      setMessage(outcome.message ?? (outcome.ok ? `Saved to ${relativePath}` : "It could not be saved."))
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "It could not be saved.")
    }
  }

  return (
    <div
      className={["ceremony-note-editor", className].filter(Boolean).join(" ")}
      style={{ ...themeVars(theme), ...style } as CSSProperties}
    >
      <div className="ceremony-note-head">
        <label className="ceremony-note-label" htmlFor={`ceremony-note-${ceremonyId}`}>
          {label}
        </label>
        <span className={`ceremony-note-state is-${exists ? "saved" : "pending"}`} title={relativePath}>
          {exists ? "notes.md" : "not saved yet"}
        </span>
      </div>
      <textarea
        id={`ceremony-note-${ceremonyId}`}
        className="ceremony-note-field"
        value={draft}
        maxLength={65536}
        readOnly={!mayWrite}
        placeholder={mayWrite ? placeholder : undefined}
        onChange={(event) => {
          setDraft(event.target.value)
          if (state !== "idle") setState("idle")
        }}
      />
      {mayWrite && (
        <div className="ceremony-note-actions">
          <button type="button" disabled={state === "saving" || draft === content} onClick={save}>
            Save notes
          </button>
          {message && (
            <span className={`ceremony-note-message is-${state}`} role="status" aria-live="polite">
              {message}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export interface CeremonyAttachmentsProps {
  attachments: CeremonyAttachmentView[]
  capabilities: EpisodeCapabilitiesView
  onOpen?: (relativePath: string) => void
  onDetach?: (relativePath: string) => void
  emptyLabel?: string
  title?: string
  theme?: EpisodeUITheme
  className?: string
  style?: CSSProperties
}

/**
 * What a circle was held about.
 *
 * A ceremony with no attachment shows nothing rather than an empty frame — an
 * absence stated loudly is still noise. When there are attachments, each one
 * says who put it on the table and when, because that is the part a reader
 * cannot reconstruct afterwards.
 */
export function CeremonyAttachments({
  attachments,
  capabilities,
  onOpen,
  onDetach,
  emptyLabel,
  title = "On the table",
  theme = DEFAULT_THEME,
  className,
  style,
}: CeremonyAttachmentsProps) {
  if (attachments.length === 0 && !emptyLabel) return null

  return (
    <div
      className={["ceremony-attachments", className].filter(Boolean).join(" ")}
      style={{ ...themeVars(theme), ...style } as CSSProperties}
    >
      <span className="ceremony-attachments-title">{title}</span>
      {attachments.length === 0 ? (
        <p className="ceremony-attachments-empty">{emptyLabel}</p>
      ) : (
        <ul className="ceremony-attachments-list">
          {attachments.map((item) => (
            <li key={item.relativePath} className="ceremony-attachment">
              <button
                type="button"
                className="ceremony-attachment-open"
                disabled={!capabilities.read || !onOpen}
                onClick={() => onOpen?.(item.relativePath)}
              >
                {item.relativePath}
              </button>
              <span className="ceremony-attachment-meta">
                {item.attachedBy} · {item.attachedAt.slice(0, 16).replace("T", " ")}
              </span>
              {item.note && <span className="ceremony-attachment-note">{item.note}</span>}
              {onDetach && capabilities.attachToCeremony && (
                <button
                  type="button"
                  className="ceremony-attachment-detach"
                  title="Take this off the table"
                  onClick={() => onDetach(item.relativePath)}
                >
                  remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
