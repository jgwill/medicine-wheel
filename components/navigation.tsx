"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { WorkspacesPanel, WORKSPACES, type Workspace } from "@/components/workspaces-panel";

/* Colors are token vars: direction colors only where the page MEANS that
 * direction (Ceremonies=south, Accountability=north, home=east); the rest
 * take node-type category colors. */
const NAV_ITEMS = [
  { href: "/", label: "Wheel", color: "var(--mw-east)" },
  { href: "/graph", label: "Graph", color: "var(--mw-primary)" },
  { href: "/nodes", label: "Nodes", color: "var(--mw-node-land)" },
  { href: "/relations", label: "Relations", color: "var(--mw-node-future)" },
  { href: "/ceremonies", label: "Ceremonies", color: "var(--mw-south)" },
  { href: "/narrative", label: "Narrative", color: "var(--mw-node-spirit)" },
  { href: "/narrative/beats", label: "Beats", color: "var(--mw-node-ancestor)" },
  { href: "/narrative/cycles", label: "Cycles", color: "var(--mw-node-human)" },
  { href: "/accountability", label: "Accountability", color: "var(--mw-north)" },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [activeWs, setActiveWs] = useState<Workspace>(WORKSPACES[0]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <button
            onClick={() => setWsOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-md px-2 py-1 hover:bg-secondary"
            aria-label="Open workspaces"
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: activeWs.color }} />
            <span className="hidden sm:inline whitespace-nowrap text-sm font-semibold">
              {activeWs.name}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <div className="nav-scroll hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-item", pathname === item.href && "nav-item--active")}
                style={{ "--nav-c": item.color } as React.CSSProperties}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-md hover:bg-secondary"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn("nav-item block", pathname === item.href && "nav-item--active")}
                style={{ "--nav-c": item.color } as React.CSSProperties}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <WorkspacesPanel
        open={wsOpen}
        activeId={activeWs.id}
        onClose={() => setWsOpen(false)}
        onSelect={(ws) => { setActiveWs(ws); setWsOpen(false); }}
      />
    </>
  );
}
