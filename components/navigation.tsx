"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="text-2xl">🔵</span>
          <span className="hidden sm:inline">Medicine Wheel</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
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
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md hover:bg-secondary transition-colors"
            aria-label="Toggle theme"
          >
            {mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <Sun className="h-4 w-4" />}
          </button>
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
  );
}
