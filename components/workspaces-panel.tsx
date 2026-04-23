"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Workspace = {
  id: string;
  name: string;
  direction: "east" | "south" | "west" | "north";
  color: string;
  status: "active" | "idle" | "archived";
  repo: string;
  blurb: string;
};

export const WORKSPACES: Workspace[] = [
  { id: "medicine-wheel", name: "Medicine Wheel",  direction: "east",  color: "#FFD700", status: "active", repo: "jgwill/medicine-wheel",         blurb: "Relational ontology + Four Directions web app" },
  { id: "iaip",           name: "IAIP Platform",   direction: "south", color: "#DC143C", status: "active", repo: "jgwill/iaip",                   blurb: "Three Universes multi-agent orchestration" },
  { id: "stc",            name: "STC Workspaces",  direction: "west",  color: "#8888cc", status: "active", repo: "jgwill/stcraft",                blurb: "Structural tension charts across repos" },
  { id: "tushell",        name: "Tushell Magic Land", direction: "north", color: "#E8E8E8", status: "idle", repo: "jgwill/tushellplatform",        blurb: "Child-friendly knowledge platform" },
  { id: "articles",       name: "Articles",        direction: "east",  color: "#c9a23a", status: "idle",   repo: "jgwill/medicine-wheel#articles", blurb: "Narrative-technical research" },
  { id: "pde",            name: "PDE",             direction: "south", color: "#9a5cc6", status: "active", repo: "jgwill/mcp-pde",                 blurb: "Four Directions prompt decomposition" },
];

const STATUS_DOT: Record<Workspace["status"], string> = {
  active:   "bg-[var(--mw-wilson-high)]",
  idle:     "bg-[var(--mw-muted)]",
  archived: "bg-[var(--mw-wilson-low)]",
};

export function WorkspacesPanel({
  open,
  activeId,
  onClose,
  onSelect,
}: {
  open: boolean;
  activeId: string;
  onClose: () => void;
  onSelect: (ws: Workspace) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        aria-label="Workspaces"
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-[340px] border-r border-border bg-card transition-transform",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="mw-h2" style={{ fontSize: "1.25rem" }}>Workspaces</div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close workspaces panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-3 py-3" style={{ maxHeight: "calc(100vh - 60px)" }}>
          {WORKSPACES.map((ws) => {
            const selected = ws.id === activeId;
            return (
              <button
                key={ws.id}
                onClick={() => onSelect(ws)}
                className={cn(
                  "mb-2 w-full rounded-lg border p-3 text-left transition-colors",
                  selected
                    ? "bg-secondary"
                    : "border-border bg-background hover:bg-secondary/50"
                )}
                style={{
                  borderLeft: `3px solid ${ws.color}`,
                  borderTopColor: selected ? ws.color + "60" : undefined,
                  borderRightColor: selected ? ws.color + "60" : undefined,
                  borderBottomColor: selected ? ws.color + "60" : undefined,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[ws.status])} />
                  <span className="text-sm font-semibold">{ws.name}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{ws.blurb}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground/80">{ws.repo}</div>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
