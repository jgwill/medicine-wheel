"use client"

import { useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { DEFAULT_THEME, themeVars, type EpisodeShelfEntry, type EpisodeUITheme } from "./types.js"

export interface EpisodeShelfFilterProps {
  episodes: EpisodeShelfEntry[]
  selected?: string | null
  onSelect?: (episode: EpisodeShelfEntry) => void
  /** Render each entry yourself when the host has its own card. */
  renderEntry?: (episode: EpisodeShelfEntry, selected: boolean) => React.ReactNode
  placeholder?: string
  theme?: EpisodeUITheme
  className?: string
  style?: CSSProperties
}

/**
 * Find an episode by number, title or slug.
 *
 * `349`, `ep349`, `episode 349` and a word from the title all reach the same
 * vessel — on a phone, typing the number is the fastest way there, and it was
 * the first thing gmtermux's shelf learned.
 */
export function EpisodeShelfFilter({
  episodes,
  selected = null,
  onSelect,
  renderEntry,
  placeholder = "Find an episode by number or title",
  theme = DEFAULT_THEME,
  className,
  style,
}: EpisodeShelfFilterProps) {
  const [query, setQuery] = useState("")

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/^(?:ep(?:isode)?\s*)/, "")
    if (!needle) return episodes
    return episodes.filter((episode) =>
      [
        String(episode.number),
        episode.numberLabel,
        episode.title,
        episode.episodePath,
        episode.goal ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    )
  }, [episodes, query])

  return (
    <div
      className={["episode-shelf", className].filter(Boolean).join(" ")}
      style={{ ...themeVars(theme), ...style } as CSSProperties}
    >
      <input
        className="episode-shelf-filter"
        type="search"
        value={query}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => setQuery(event.target.value)}
      />
      <span className="episode-shelf-count">
        {shown.length} of {episodes.length}
      </span>
      <ul className="episode-shelf-list">
        {shown.map((episode) => {
          const isSelected = episode.episodePath === selected
          return (
            <li key={episode.episodePath} className={isSelected ? "is-selected" : undefined}>
              {renderEntry ? (
                renderEntry(episode, isSelected)
              ) : (
                <button type="button" className="episode-shelf-entry" onClick={() => onSelect?.(episode)}>
                  <span className="episode-shelf-number">{episode.numberLabel}</span>
                  <span className="episode-shelf-body">
                    <strong>{episode.title}</strong>
                    {episode.goal && <span>{episode.goal}</span>}
                    <small>
                      {episode.date}
                      {episode.status ? ` · ${episode.status}` : ""}
                      {episode.registered === false ? " · vessel only" : ""}
                    </small>
                  </span>
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
