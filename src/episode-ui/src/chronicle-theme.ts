/**
 * `@medicine-wheel/episode-ui/chronicle-theme` — the Chronicle's own surface.
 *
 * A dark `#151515` ground with gold `#d4a843` accents, which the Chronicle
 * keeps whatever the host's light or dark theme, so hosts apply it inline.
 * Miadi's `app/chronicle` drew it first; eury copied part of it. This module
 * holds it once, as plain data with no React and no DOM.
 *
 * `CHRONICLE_THEME` is an `EpisodeUITheme`, so the files workspace takes it,
 * and `@miadi/attention-ui`'s panel takes it too (its theme is the same fields
 * without `warning`).
 */

import type { EpisodeUITheme } from "./types.js"

export const CHRONICLE_PALETTE = {
  bg: "#151515",
  panel: "#1c1c1c",
  panelAlt: "#171717",
  canvas: "#141414",
  card: "#242424",
  cardAlt: "#202020",
  border: "#404040",
  borderMid: "#383838",
  borderSubtle: "#2a2a2a",
  borderFaint: "#232323",
  text: "#f9f9f9",
  textStrong: "#e4e4e4",
  textDim: "#d0d0d0",
  textDim2: "#c8c8c8",
  textDim3: "#c4c4c4",
  muted: "#8a8a8a",
  muted2: "#6f6f6f",
  faint: "#959595",
  faint2: "#5f5f5f",
  accent: "#d4a843",
  accentHover: "#e8c471",
  accentSoft: "#f0e2c0",
  success: "#5ac37d",
  warning: "#e0a458",
} as const

export const FONT_SANS = "'Nunito', system-ui, -apple-system, sans-serif"
export const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace"

/**
 * The palette as the theme the workspace and the attention panel take. `muted`
 * is the palette's `faint`, the dimmest grey that reads at 4.5:1 or better on
 * both the background and the card.
 */
export const CHRONICLE_THEME: EpisodeUITheme = {
  background: CHRONICLE_PALETTE.bg,
  card: CHRONICLE_PALETTE.card,
  text: CHRONICLE_PALETTE.text,
  textDim: CHRONICLE_PALETTE.textDim2,
  muted: CHRONICLE_PALETTE.faint,
  accent: CHRONICLE_PALETTE.accent,
  border: CHRONICLE_PALETTE.border,
  success: CHRONICLE_PALETTE.success,
  warning: CHRONICLE_PALETTE.warning,
  mono: FONT_MONO,
}

/** The four directions an episode is read in (`@miadi/inquiry-weave/readings` names the same keys). */
export type ChronicleDirectionKey = "east" | "south" | "west" | "north"

export interface ChronicleDirection {
  key: ChronicleDirectionKey
  label: string
  /** The Anishinaabemowin name. */
  oj: string
  gloss: string
  color: string
  glyph: string
}

export const DIRECTIONS: Readonly<Record<ChronicleDirectionKey, ChronicleDirection>> = {
  east: { key: "east", label: "East", oj: "Waabinong", gloss: "Vision · Spring", color: "#FFD700", glyph: "🌅" },
  south: { key: "south", label: "South", oj: "Zhaawanong", gloss: "Growth · Summer", color: "#DC143C", glyph: "🔥" },
  west: { key: "west", label: "West", oj: "Epangishmok", gloss: "Reflection · Fall", color: "#5b78b4", glyph: "🌊" },
  north: { key: "north", label: "North", oj: "Kiiwedinong", gloss: "Wisdom · Winter", color: "#E8E8E8", glyph: "❄️" },
}
