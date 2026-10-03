"use client";

/**
 * An episode's folder on the episode page — listed, and any text file read in
 * place. Read-only: the wheel reads an episode, Miadi writes it.
 *
 * Text is shown as text. Markdown is not rendered here: rendering it means a
 * renderer and a sanitizer between an episode's files and this page, and plain
 * text is already readable. Media and documents are listed, not played.
 *
 * @see app/api/episodes/[id]/files/route.ts — and the rules it states
 */

import { useCallback, useEffect, useRef, useState } from "react";

type EpisodeFile = {
  relativePath: string;
  name: string;
  kind: "text" | "document" | "media";
  size: number;
  modifiedAt: string;
  previewable: boolean;
  guidance: boolean;
};

type Room =
  | { state: "open"; episode_path: string; files: EpisodeFile[] }
  | { state: "no-root" }
  | { state: "absent"; episode_path: string }
  | { state: "community"; episode_path: string }
  | { state: "not-an-episode" | "refused" | "error"; error?: string };

type Opened = { path: string; content?: string; error?: string };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

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
  const [opened, setOpened] = useState<Opened | null>(null);
  // The path last asked for, so a slow answer for an earlier click cannot
  // replace the file the reader opened after it.
  const wanted = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    setRoom(null);
    setOpened(null);
    fetch(base)
      .then((res) => res.json())
      .then((body: Room) => live && setRoom(body))
      .catch((e) => live && setRoom({ state: "error", error: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [base]);

  const toggle = useCallback(
    async (file: EpisodeFile) => {
      if (wanted.current === file.relativePath) {
        wanted.current = null;
        setOpened(null);
        return;
      }
      wanted.current = file.relativePath;
      setOpened({ path: file.relativePath });
      let next: Opened;
      try {
        const res = await fetch(`${base}?path=${encodeURIComponent(file.relativePath)}`);
        const body = await res.json();
        next = res.ok
          ? { path: file.relativePath, content: body.content }
          : { path: file.relativePath, error: body.error ?? body.state ?? `HTTP ${res.status}` };
      } catch (e) {
        next = { path: file.relativePath, error: e instanceof Error ? e.message : String(e) };
      }
      if (wanted.current === file.relativePath) setOpened(next);
    },
    [base],
  );

  const files =
    room?.state === "open"
      ? // The episode's own work first; host and agent guidance after it.
        [...room.files].sort((a, b) => Number(a.guidance) - Number(b.guidance))
      : [];

  return (
    <section>
      <h2 className="text-sm font-semibold mb-2">
        Files {files.length > 0 && `(${files.length})`}
      </h2>

      {room === null ? (
        <p className="text-sm text-muted-foreground">Opening the folder…</p>
      ) : room.state !== "open" ? (
        <p className="text-sm text-muted-foreground">{closedReason(room)}</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground">The folder holds nothing the room shows.</p>
      ) : (
        <ul className="space-y-1">
          {files.map((file) => {
            const isOpen = opened?.path === file.relativePath;
            return (
              <li key={file.relativePath}>
                <div className="p-2 border rounded-lg bg-card flex items-baseline justify-between gap-3 flex-wrap">
                  {file.previewable ? (
                    <button
                      onClick={() => toggle(file)}
                      className="text-sm font-mono text-left break-all hover:underline"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? "▾" : "▸"} {file.relativePath}
                    </button>
                  ) : (
                    <span className="text-sm font-mono break-all text-muted-foreground">
                      {file.relativePath}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground shrink-0 flex gap-2 items-baseline">
                    {file.guidance && <span className="mw-badge">guidance</span>}
                    {!file.previewable && <span className="mw-badge">{file.kind}</span>}
                    <span>{formatSize(file.size)}</span>
                    <span>{file.modifiedAt.slice(0, 10)}</span>
                  </span>
                </div>
                {isOpen && (
                  <div className="mt-1 p-3 border rounded-lg bg-card">
                    {opened?.error ? (
                      <p className="text-sm text-muted-foreground">{opened.error}</p>
                    ) : opened?.content === undefined ? (
                      <p className="text-sm text-muted-foreground">Reading…</p>
                    ) : (
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-[70vh] overflow-auto">
                        {opened.content}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
