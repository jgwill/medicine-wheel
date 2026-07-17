"use client";

import { useCallback, useEffect, useState, Suspense, useMemo } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { type CeremonyLog, CEREMONY_ICONS, type DirectionName, type CeremonyType } from "@/lib/types";
import { extractCeremonyLogs } from "@/lib/ceremony-response";
import { relativeTime, absoluteTime } from "@/lib/format-time";
import { toast } from "sonner";

const dirVar = (d: string) => `var(--mw-${d})`;
const dirInk = (d: string) => `var(--mw-${d}-ink)`;

function CeremoniesContent() {
  const searchParams = useSearchParams();
  const [ceremonies, setCeremonies] = useState<CeremonyLog[]>([]);
  const [filterDir, setFilterDir] = useState<string>(searchParams.get("direction") || "all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCeremonies = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterDir !== "all") params.set("direction", filterDir);
    if (filterType !== "all") params.set("type", filterType);

    setLoading(true);
    try {
      const res = await fetch(`/api/ceremonies?${params}`);
      if (!res.ok) throw new Error("Failed to load ceremonies");
      const data = await res.json();
      setCeremonies(extractCeremonyLogs(data));
    } catch {
      setCeremonies([]);
    } finally {
      setLoading(false);
    }
  }, [filterDir, filterType]);

  const filtersActive = filterDir !== "all" || filterType !== "all";
  const clearFilters = () => { setFilterDir("all"); setFilterType("all"); };

  useEffect(() => {
    loadCeremonies();
  }, [loadCeremonies]);

  async function logCeremony(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      type: form.get("type") as string,
      direction: form.get("direction") as string,
      participants: (form.get("participants") as string).split(",").map((s) => s.trim()).filter(Boolean),
      medicines_used: (form.get("medicines") as string).split(",").map((s) => s.trim()).filter(Boolean),
      intentions: [(form.get("intention") as string)].filter(Boolean),
      research_context: (form.get("context") as string) || undefined,
    };
    const res = await fetch("/api/ceremonies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success("Ceremony logged");
      setShowForm(false);
      await loadCeremonies();
    } else { toast.error("Could not save the ceremony — check the form and try again"); }
  }

  const directions: DirectionName[] = ["east", "south", "west", "north"];
  const cTypes: CeremonyType[] = ["smudging", "talking_circle", "spirit_feeding", "opening", "closing"];
  const DIRECTION_ICONS: Record<DirectionName, string> = { east: "🌅", south: "🌞", west: "🌄", north: "❄️" };

  const phaseMap: Record<DirectionName, string> = { east: "opening", south: "council", west: "integration", north: "closure" };
  const currentPhase = useMemo(() => {
    if (ceremonies.length === 0) return "opening";
    const latest = [...ceremonies].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    return phaseMap[latest.direction] ?? "opening";
  }, [ceremonies]);

  const phaseFramings: Record<string, string> = {
    opening: "We are in the Opening phase — setting intentions and acknowledging relationships",
    council: "We are in the Council phase — deepening understanding through dialogue",
    integration: "We are in the Integration phase — weaving learnings together",
    closure: "We are in the Closure phase — honoring what has been shared",
  };
  const phases = ["opening", "council", "integration", "closure"];
  const nextPhase = phases[(phases.indexOf(currentPhase) + 1) % 4];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="mw-h1">Ceremonies</h1>
          <p className="text-sm text-muted-foreground">{ceremonies.length} ceremony logs</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Log ceremony</button>
      </div>

      <div className="mb-6 p-4 rounded-lg border bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div className="flex-1">
            <p className="text-sm font-medium">{phaseFramings[currentPhase]}</p>
            <p className="text-xs text-muted-foreground mt-1">Next phase: <span className="capitalize">{nextPhase}</span></p>
          </div>
          <div className="flex gap-1">
            {phases.map((p) => (
              <div key={p} className="w-2 h-2 rounded-full" style={{ backgroundColor: p === currentPhase ? "var(--color-primary)" : "var(--color-muted-foreground)", opacity: p === currentPhase ? 1 : 0.3 }} title={p} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="flex gap-1">
          <button onClick={() => setFilterDir("all")} className={`px-3 py-1 rounded-full text-xs font-medium border ${filterDir === "all" ? "bg-secondary" : ""}`}>All</button>
          {directions.map((d) => (
            <button key={d} onClick={() => setFilterDir(d)} className={`px-3 py-1 rounded-full text-xs font-medium border capitalize hover:bg-secondary/60 ${filterDir === d ? "bg-secondary" : ""}`} style={filterDir === d ? { borderColor: dirVar(d) } : {}}>
              {d}
            </button>
          ))}
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1 rounded-md border bg-background text-xs">
          <option value="all">All types</option>
          {cTypes.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
        {filtersActive && (
          <button onClick={clearFilters} className="px-3 py-1 rounded-md border text-xs text-muted-foreground hover:text-foreground">Clear filters</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={logCeremony} className="mb-6 p-4 border rounded-lg bg-card grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select name="type" required className="px-3 py-2 rounded-md border bg-background text-sm">
            {cTypes.map((t) => <option key={t} value={t}>{CEREMONY_ICONS[t]} {t.replace("_", " ")}</option>)}
          </select>
          <select name="direction" required className="px-3 py-2 rounded-md border bg-background text-sm">
            {directions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input name="participants" placeholder="Participants (comma-separated)" className="px-3 py-2 rounded-md border bg-background text-sm" />
          <input name="medicines" placeholder="Medicines used (comma-separated)" className="px-3 py-2 rounded-md border bg-background text-sm" />
          <textarea name="intention" placeholder="Intention" rows={2} className="px-3 py-2 rounded-md border bg-background text-sm sm:col-span-2" />
          <input name="context" placeholder="Research context (optional)" className="px-3 py-2 rounded-md border bg-background text-sm" />
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">Log ceremony</button>
        </form>
      )}

      <div className="space-y-3">
        {loading && <div className="text-center py-12 text-muted-foreground">Loading ceremonies…</div>}
        {!loading && ceremonies.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{filtersActive ? "No ceremonies match these filters." : "No ceremonies yet. Log the first one to open the circle."}</p>
            {filtersActive && <button onClick={clearFilters} className="text-sm mt-2 underline hover:text-foreground">Clear filters</button>}
          </div>
        )}
        {!loading && ceremonies.map((c) => (
          <div key={c.id} className="border rounded-lg bg-card overflow-hidden cursor-pointer hover:border-ring/50 transition-colors"
            style={{ borderTopColor: dirVar(c.direction), borderTopWidth: 3 }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{CEREMONY_ICONS[c.type]}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm capitalize">{c.type.replace("_", " ")}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize border"
                      style={{ borderColor: `var(--mw-${c.direction}-border)`, color: dirInk(c.direction) }}>
                      {DIRECTION_ICONS[c.direction]} {c.direction}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground" title={absoluteTime(c.timestamp)}>{relativeTime(c.timestamp)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.participants.length > 0 && <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{c.participants.length} participant{c.participants.length !== 1 ? "s" : ""}</span>}
                {c.medicines_used.length > 0 && <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">🌿 {c.medicines_used.length}</span>}
                <span className="text-muted-foreground text-sm w-4 text-center" aria-hidden>{expandedId === c.id ? "▲" : "▼"}</span>
              </div>
            </div>
            {expandedId === c.id && (
              <div className="px-4 pb-4 space-y-3 border-t pt-3">
                {c.intentions.length > 0 && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Intentions</div>{c.intentions.map((int, i) => <p key={i} className="text-sm">{int}</p>)}</div>}
                {c.participants.length > 0 && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Participants</div><div className="flex flex-wrap gap-1">{c.participants.map((p) => <span key={p} className="px-2 py-0.5 rounded bg-secondary text-xs">{p}</span>)}</div></div>}
                {c.medicines_used.length > 0 && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Medicines</div><div className="flex flex-wrap gap-1">{c.medicines_used.map((m) => <span key={m} className="px-2 py-0.5 rounded bg-secondary text-xs">🌿 {m}</span>)}</div></div>}
                {c.research_context && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Research Context</div><code className="inline-block px-2 py-1 rounded bg-secondary/60 text-xs font-mono text-muted-foreground break-all">{c.research_context}</code></div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CeremoniesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading ceremonies...</div>}>
      <CeremoniesContent />
    </Suspense>
  );
}
