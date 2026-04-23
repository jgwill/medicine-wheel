"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { WorkspacesPanel, WORKSPACES, type Workspace } from "@/components/workspaces-panel";

const NAV_ITEMS = [
  { href: "/", label: "Medicine Wheel", color: "#FFD700" },
  { href: "/graph", label: "Graph", color: "#d4b844" },
  { href: "/nodes", label: "Nodes", color: "#4a9e5c" },
  { href: "/relations", label: "Relations", color: "#5a9ec6" },
  { href: "/ceremonies", label: "Ceremonies", color: "#DC143C" },
  { href: "/narrative", label: "Narrative", color: "#9a5cc6" },
  { href: "/narrative/beats", label: "Beats", color: "#c9a23a" },
  { href: "/narrative/cycles", label: "Cycles", color: "#e8913a" },
  { href: "/accountability", label: "Accountability", color: "#E8E8E8" },
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
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-secondary"
            aria-label="Open workspaces"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: activeWs.color }} />
            <span
              className="hidden sm:inline text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {activeWs.name}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="hidden md:flex items-center gap-1 overflow-hidden">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
                style={pathname === item.href ? { borderBottom: `2px solid ${item.color}` } : {}}
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
          <div className="md:hidden border-t border-border bg-background px-4 pb-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm font-medium",
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
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
