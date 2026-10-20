/**
 * The top of an episode room: its masthead, its lineage and the issues it came
 * from.
 *
 * Miadi, gmtermux and eury each drew these by hand. They are plain components
 * with no state, no effect and no fetch, so a server renders them and a link
 * callback can be passed from a server page. The data comes from the vessel:
 * `readEpisodeSummary` (`@medicine-wheel/episode-vessel`) for the masthead and the
 * references, `readEpisodeLineage` (`@miadi/inquiry-weave`) for the edges.
 */

import type { CSSProperties, ReactNode } from "react"
import { DEFAULT_THEME, themeVars, type EpisodeUITheme } from "./types.js"

/** The direction an episode is read in, as the masthead shows it. */
export interface MastheadDirection {
  label: string
  /** The Anishinaabemowin name, shown in brackets. */
  oj?: string
  glyph?: string
  /** The rule beside the masthead takes this colour. */
  color: string
}

export interface EpisodeMastheadProps {
  /** The padded number, `551`, shown as `E551`. */
  numberLabel: string
  title: string
  goal?: string
  date?: string
  status?: string
  type?: string
  series?: string
  direction?: MastheadDirection
  /** Further readings shown after the direction, such as a theme or a book. */
  readings?: readonly string[]
  /** The cover image's address; the host serves the file. */
  coverUrl?: string
  coverAlt?: string
  /** The level of the title's heading. Default 1. */
  headingLevel?: 1 | 2 | 3
  theme?: EpisodeUITheme
  className?: string
  style?: CSSProperties
}

const joined = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(" ")

/** The episode's number, title, goal and facts, with its cover. */
export function EpisodeMasthead({
  numberLabel,
  title,
  goal,
  date,
  status,
  type,
  series,
  direction,
  readings = [],
  coverUrl,
  coverAlt = "",
  headingLevel = 1,
  theme = DEFAULT_THEME,
  className,
  style,
}: EpisodeMastheadProps) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3"
  const facts = [
    date,
    status,
    type,
    series,
    direction ? joined(direction.glyph, direction.label, direction.oj ? `(${direction.oj})` : undefined) : undefined,
    ...readings,
  ].filter((fact): fact is string => typeof fact === "string" && fact.trim() !== "")
  return (
    <header
      className={joined("episode-masthead", className)}
      data-episode-number={numberLabel}
      style={{
        ...themeVars(theme),
        ...(direction ? ({ "--episode-direction": direction.color } as CSSProperties) : {}),
        ...style,
      }}
    >
      <div className="episode-masthead-number">E{numberLabel}</div>
      <Heading className="episode-masthead-title">{title}</Heading>
      {goal ? <p className="episode-masthead-goal">{goal}</p> : null}
      {facts.length > 0 ? <div className="episode-masthead-facts">{facts.join(" · ")}</div> : null}
      {coverUrl ? <img className="episode-masthead-cover" src={coverUrl} alt={coverAlt} /> : null}
    </header>
  )
}

/** One lineage edge, as `readEpisodeLineage` returns it. */
export interface LineageEdgeItem {
  kind?: string
  label: string
  targetValue: string
  targetName?: string
  targetTitle?: string
  text?: string
  candidates?: readonly string[]
}

export interface LineageListProps {
  edges: readonly LineageEdgeItem[]
  /** The address of an episode room, from its folder name. */
  href: (episodeFolder: string) => string
  theme?: EpisodeUITheme
  className?: string
  style?: CSSProperties
}

/**
 * The episodes this one continues, branches from or relates to. An edge two
 * folders claim offers both, rather than a guess or a dead number.
 */
export function LineageList({ edges, href, theme = DEFAULT_THEME, className, style }: LineageListProps) {
  if (edges.length === 0) return null
  return (
    <ul className={joined("episode-lineage", className)} style={{ ...themeVars(theme), ...style }}>
      {edges.map((edge, index) => {
        let target: ReactNode
        if (edge.targetName) {
          target = <a href={href(edge.targetName)}>{edge.targetTitle ?? edge.targetName}</a>
        } else if (edge.candidates && edge.candidates.length > 0) {
          target = (
            <span>
              {edge.targetValue}, one of{" "}
              {edge.candidates.map((name, i) => (
                <span key={name}>
                  {i > 0 ? " or " : ""}
                  <a href={href(name)}>{name}</a>
                </span>
              ))}
            </span>
          )
        } else {
          target = <span>{edge.targetValue}</span>
        }
        return (
          <li key={`${edge.kind ?? edge.label}:${edge.targetValue}:${index}`} data-lineage-kind={edge.kind}>
            {edge.label} {target}
            {edge.text ? <span className="episode-lineage-text"> · {edge.text}</span> : null}
          </li>
        )
      })}
    </ul>
  )
}

/** One reference an episode came from, with its address when it has one. */
export interface SourceIssueItem {
  ref: string
  url: string | null
}

export interface SourceIssueListProps {
  /** `summary.references.map((ref) => ({ ref, url: issueUrl(ref) }))`. */
  issues: readonly SourceIssueItem[]
  theme?: EpisodeUITheme
  className?: string
  style?: CSSProperties
}

/** The issues and other references the episode came from; the ones with an address are links. */
export function SourceIssueList({ issues, theme = DEFAULT_THEME, className, style }: SourceIssueListProps) {
  if (issues.length === 0) return null
  return (
    <ul className={joined("episode-source-issues", className)} style={{ ...themeVars(theme), ...style }}>
      {issues.map((issue, index) => (
        <li key={`${issue.ref}:${index}`}>{issue.url ? <a href={issue.url}>{issue.ref}</a> : <span>{issue.ref}</span>}</li>
      ))}
    </ul>
  )
}
