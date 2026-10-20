"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { addressWithSelection, selectionFromSearch, writeSelectionToAddress } from "./address.js"
import {
  mountEpisodeFiles,
  type EpisodeFileSelection,
  type EpisodeFilesHandle,
  type EpisodeFilesOptions,
} from "./episode-files.js"

export interface EpisodeFilesProps extends EpisodeFilesOptions {
  className?: string
  style?: CSSProperties
}

/** `mountEpisodeFiles` for a React host. Props flow in on every render; the DOM stays the workspace's. */
export function EpisodeFiles({ className, style, ...options }: EpisodeFilesProps) {
  const root = useRef<HTMLDivElement>(null)
  const handle = useRef<EpisodeFilesHandle | null>(null)

  useEffect(() => {
    if (!root.current) return
    handle.current = mountEpisodeFiles(root.current, options)
    return () => {
      handle.current?.destroy()
      handle.current = null
    }
    // Mounted once; later props arrive through update() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    handle.current?.update(options)
  })

  return <div ref={root} className={className} style={style} />
}

export interface UseEpisodeFilesAddressOptions {
  /**
   * The query string the host's router holds, for instance
   * `useSearchParams().toString()` in Next.js. Omitted, the hook reads
   * `window.location` after mounting and follows Back and Forward itself.
   */
  search?: string
}

/** Props for `EpisodeFiles` that keep the open file in the page's address. */
export interface EpisodeFilesAddress {
  open: EpisodeFileSelection | null
  onSelectionChange: (selection: EpisodeFileSelection | null, change: { push: boolean }) => void
  fileHref: (selection: EpisodeFileSelection) => string
}

/**
 * The open file as the page's address (`?file=&mode=`), for `EpisodeFiles`:
 * `<EpisodeFiles {...useEpisodeFilesAddress()} files={files} service={service} />`.
 * A person's click becomes a history entry, a mode switch replaces the current
 * one, and Back reopens what the address names.
 */
export function useEpisodeFilesAddress(options: UseEpisodeFilesAddressOptions = {}): EpisodeFilesAddress {
  const followsWindow = options.search === undefined
  // Empty until mounted, so the server and the first client render agree.
  const [own, setOwn] = useState("")

  useEffect(() => {
    if (!followsWindow) return
    const read = () => setOwn(window.location.search)
    read()
    window.addEventListener("popstate", read)
    return () => window.removeEventListener("popstate", read)
  }, [followsWindow])

  const search = options.search ?? own
  const open = useMemo(() => selectionFromSearch(search), [search])

  const onSelectionChange = useCallback(
    (selection: EpisodeFileSelection | null, change: { push: boolean }) => {
      writeSelectionToAddress(selection, change)
      if (followsWindow) setOwn(window.location.search)
    },
    [followsWindow],
  )

  const fileHref = useCallback((selection: EpisodeFileSelection) => {
    // The page's path and query: a link to a file does not carry the fragment the page is scrolled to.
    const here = typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}`
    return addressWithSelection(here, selection)
  }, [])

  return { open, onSelectionChange, fileHref }
}
