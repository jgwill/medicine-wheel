"use client";

/**
 * An episode's folder on the episode page, drawn by `@medicine-wheel/episode-ui`:
 * the files workspace Miadi's room and gmtermux mount too, here read-only. Its
 * folders, markdown preview, source view, images and media come from the
 * package; this file only knows the wheel's routes and its palette. The wheel
 * reads an episode; Miadi writes it.
 *
 * The open file is the page's address (`?file=<path>&mode=preview|source`), so
 * a reload or a shared link lands on the same file, and Back returns to the one
 * opened before.
 *
 * @see app/api/episodes/[id]/files/route.ts — the listing, and why a room is closed
 * @see app/api/episodes/[id]/files/[...path]/route.ts — one file, by kind
 */

import { useEffect, useMemo, useState } from "react";
import {
  EpisodeFiles,
  httpEpisodeFiles,
  useEpisodeFilesAddress,
  type EpisodeCapabilitiesView,
  type EpisodeFileView,
  type EpisodeUITheme,
} from "@medicine-wheel/episode-ui";
import "@medicine-wheel/episode-ui/styles.css";

type Room =
  | { state: "open"; episode_path: string; files: EpisodeFileView[] }
  | { state: "no-root" }
  | { state: "absent"; episode_path: string }
  | { state: "community"; episode_path: string }
  | { state: "not-an-episode" | "refused" | "error"; error?: string };

/** A visitor's capabilities: the wheel has no sign-in, so it browses and reads. */
const READ_ONLY: EpisodeCapabilitiesView = {
  browse: true,
  read: true,
  edit: false,
  upload: false,
  attachCapture: false,
  writeCeremonyNote: false,
  attachToCeremony: false,
};

/** The wheel's tokens (`src/ui-components/src/tokens.css`), so the workspace reads as part of the page. */
const THEME: EpisodeUITheme = {
  background: "var(--mw-bg)",
  card: "var(--mw-card)",
  text: "var(--mw-fg)",
  textDim: "var(--mw-muted)",
  muted: "var(--mw-muted)",
  accent: "var(--mw-primary)",
  border: "var(--mw-border)",
  success: "#5ac37d",
  warning: "#e0a458",
  mono: "var(--font-mono)",
};

const encodePath = (relativePath: string) => relativePath.split("/").map(encodeURIComponent).join("/");

/** Why a folder is not shown, in words a reader can act on. */
function closedReason(room: Room): string | null {
  switch (room.state) {
    case "no-root":
      return "This wheel's host has no chronicle folder (MIADI_CHRONICLE_ROOT), so it knows the episode exists but cannot open it.";
    case "absent":
      return "The episode's folder is not on this host. The wheel holds its record; the folder lives in a chronicle checkout that has not reached this machine.";
    case "community":
      return "This episode is for the community signed in. The wheel has no sign-in, so its folder stays closed here.";
    case "open":
      return null;
    default:
      return room.error ?? "The folder could not be opened.";
  }
}

export function EpisodeFilesPanel({ episodeId }: { episodeId: string }) {
  const base = `/api/episodes/${encodeURIComponent(episodeId)}/files`;
  const [room, setRoom] = useState<Room | null>(null);
  const address = useEpisodeFilesAddress();

  useEffect(() => {
    let live = true;
    setRoom(null);
    fetch(base, { cache: "no-store" })
      .then((res) => res.json())
      .then((body: Room) => live && setRoom(body))
      .catch((e) => live && setRoom({ state: "error", error: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [base]);

  // `save` exists because the service type asks for it; with `edit: false` the
  // workspace never offers it, and the route has no PUT to answer it.
  const service = useMemo(
    () => httpEpisodeFiles({ fileUrl: (file) => `${base}/${encodePath(file.relativePath)}` }),
    [base],
  );

  if (room === null) return <p className="text-sm text-muted-foreground">Opening the folder…</p>;
  if (room.state !== "open") return <p className="text-sm text-muted-foreground">{closedReason(room)}</p>;

  return (
    <EpisodeFiles
      {...address}
      files={room.files}
      capabilities={READ_ONLY}
      service={service}
      theme={THEME}
      title="Files"
      emptyLabel="The folder holds nothing the room shows."
    />
  );
}
