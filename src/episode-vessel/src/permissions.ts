/**
 * Who may do what with a vessel's files — as data, not as an auth system.
 *
 * This module holds no identity, no token, no session and no dependency on any
 * identity package. It is a map from a role NAME to a set of capabilities. The
 * host resolves the person (Miadi: `lib/identity.ts` →
 * `@medicine-wheel/community-identity`), reads their role name, calls
 * `capabilitiesFor`, and hands the result to a UI so it can offer the right
 * controls.
 *
 * **The capability object decides what is OFFERED. The host's gate decides what
 * is ALLOWED.** A surface that renders an edit button for a role without
 * `edit` is a bug; a route that writes because the client claimed a capability
 * is a vulnerability. Both checks exist and neither replaces the other.
 */

export interface EpisodeCapabilities {
  /** See that files exist and what they are. */
  browse: boolean
  /** Read text content. */
  read: boolean
  /** Save a text file back with a revision guard. */
  edit: boolean
  /** Add a new artefact to the vessel. */
  upload: boolean
  /** Bind a capture bundle to the episode. */
  attachCapture: boolean
  /** Write `ceremonies/<id>/notes.md`. */
  writeCeremonyNote: boolean
  /** Name a vessel artefact as having been on a ceremony's table. */
  attachToCeremony: boolean
}

export const NO_CAPABILITIES: EpisodeCapabilities = {
  browse: false,
  read: false,
  edit: false,
  upload: false,
  attachCapture: false,
  writeCeremonyNote: false,
  attachToCeremony: false,
}

const reader: EpisodeCapabilities = { ...NO_CAPABILITIES, browse: true, read: true }

const contributor: EpisodeCapabilities = {
  ...reader,
  edit: true,
  upload: true,
  attachCapture: true,
  writeCeremonyNote: true,
  attachToCeremony: true,
}

/**
 * The default grants, by the role names Miadi's community carries
 * (`lib/community/client.ts`, 2026-09-19).
 *
 * A participant reads. Everyone who holds ceremony writes. The two AI roles get
 * what their work needs and no more: a companion writes notes and attaches, an
 * integration brings captures in.
 */
export const DEFAULT_ROLE_CAPABILITIES: Record<string, EpisodeCapabilities> = {
  participant: reader,
  emerging_guide: { ...reader, writeCeremonyNote: true, attachToCeremony: true },
  ceremony_facilitator: contributor,
  firekeeper: contributor,
  story_keeper: contributor,
  admin: contributor,
  companion_ai: { ...reader, writeCeremonyNote: true, attachToCeremony: true },
  integration_ai: { ...reader, upload: true, attachCapture: true },
}

/**
 * An unauthenticated reader of a public front.
 *
 * `read: true` is deliberate and matches what the surfaces already do: Miadi's
 * episode room renders a vessel's script and narration to anyone, and `/v`
 * serves its documents. Returning `read: false` here would have made the file
 * browser refuse to open what the page beside it was already showing. A host
 * whose chronicle is not public passes its own `fallback`.
 */
export const ANONYMOUS_CAPABILITIES: EpisodeCapabilities = {
  ...NO_CAPABILITIES,
  browse: true,
  read: true,
}

export interface CapabilityLookup {
  /** Override or extend the defaults, e.g. from a community config. */
  grants?: Record<string, Partial<EpisodeCapabilities>>
  /** What an unknown role gets. Defaults to read-only. */
  fallback?: EpisodeCapabilities
}

export function capabilitiesFor(role: string | null | undefined, lookup: CapabilityLookup = {}): EpisodeCapabilities {
  if (!role) return lookup.fallback ?? ANONYMOUS_CAPABILITIES
  const base = DEFAULT_ROLE_CAPABILITIES[role] ?? lookup.fallback ?? reader
  const override = lookup.grants?.[role]
  return override ? { ...base, ...override } : base
}

/** The capability a given verb needs, for a host mapping routes to checks. */
export const CAPABILITY_BY_VERB = {
  listFiles: "browse",
  readText: "read",
  writeText: "edit",
  uploadFile: "upload",
  attachCapture: "attachCapture",
  writeCeremonyNote: "writeCeremonyNote",
  attachToCeremony: "attachToCeremony",
  detachFromCeremony: "attachToCeremony",
} as const satisfies Record<string, keyof EpisodeCapabilities>
