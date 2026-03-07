"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { type CeremonyLog, DIRECTION_COLORS, CEREMONY_ICONS, type DirectionName, type CeremonyType } from "@/lib/types";
import { toast } from "sonner";

function CeremoniesContent() {
  const searchParams = useSearchParams();
  const [ceremonies, setCeremonies] = useState<CeremonyLog[]>([]);
  const [filterDir, setFilterDir] = useState<string>(searchParams.get("direction") || "all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterDir !== "all") params.set("direction", filterDir);
    if (filterType !== "all") params.set("type", filterType);
    fetch(`/api/ceremonies?${params}`)
      .then((r) => r.json())
      .then((data) => setCeremonies(Array.isArray(data) ? data : []))
      .catch(() => setCeremonies([]));
  }, [filterDir, filterType]);

  async function logCeremony(e: React.FormEvent<HTMLFormElement>) {
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
      const data = await fetch("/api/ceremonies").then((r) => r.json());
      setCeremonies(Array.isArray(data) ? data : []);
    } else { toast.error("Failed to log ceremony"); }
  }

  const directions: DirectionName[] = ["east", "south", "west", "north"];
  const cTypes: CeremonyType[] = ["smudging", "talking_circle", "spirit_feeding", "opening", "closing"];

  const phaseMap: Record<DirectionName, string> = { east: "opening", south: "council", west: "integration", north: "closure" };
  const currentPhase = useMemo(() => {
    if (ceremonies.length === 0) return "opening";
    const latest = [...ceremonies].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    return phaseMap[latest.direction] ?? "opening";
  }, [ceremonies]);

  const phaseFramings: Record<string, string> = {
    opening: "🔥 We are in the Opening phase — setting intentions and acknowledging relationships",
    council: "🔥 We are in the Council phase — deepening understanding through dialogue",
    integration: "🔥 We are in the Integration phase — weaving learnings together",
    closure: "🔥 We are in the Closure phase — honoring what has been shared",
  };
  const phases = ["opening", "council", "integration", "closure"];
  const nextPhase = phases[(phases.indexOf(currentPhase) + 1) % 4];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ceremonies</h1>
          <p className="text-sm text-muted-foreground">{ceremonies.length} ceremony logs</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">+ Log Ceremony</button>
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
            <button key={d} onClick={() => setFilterDir(d)} className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${filterDir === d ? "bg-secondary" : ""}`} style={filterDir === d ? { borderColor: DIRECTION_COLORS[d] } : {}}>
              {d}
            </button>
          ))}
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1 rounded-md border bg-background text-xs">
          <option value="all">All Types</option>
          {cTypes.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
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
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Log Ceremony</button>
        </form>
      )}

      <div className="space-y-3">
        {ceremonies.length === 0 && <div className="text-center py-12 text-muted-foreground"><p>No ceremonies found. Log your first ceremony to begin.</p></div>}
        {ceremonies.map((c) => (
          <div key={c.id} className="border rounded-lg bg-card overflow-hidden cursor-pointer hover:border-ring/50 transition-colors"
            style={{ borderTopColor: DIRECTION_COLORS[c.direction], borderTopWidth: 3 }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CEREMONY_ICONS[c.type]}</span>
                <div>
                  <div className="font-medium text-sm capitalize">{c.type.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{c.direction} · {new Date(c.timestamp).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.participants.length > 0 && <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{c.participants.length} participant{c.participants.length !== 1 ? "s" : ""}</span>}
                {c.medicines_used.length > 0 && <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">🌿 {c.medicines_used.length}</span>}
              </div>
            </div>
            {expandedId === c.id && (
              <div className="px-4 pb-4 space-y-3 border-t pt-3">
                {c.intentions.length > 0 && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Intentions</div>{c.intentions.map((int, i) => <p key={i} className="text-sm">{int}</p>)}</div>}
                {c.participants.length > 0 && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Participants</div><div className="flex flex-wrap gap-1">{c.participants.map((p) => <span key={p} className="px-2 py-0.5 rounded bg-secondary text-xs">{p}</span>)}</div></div>}
                {c.medicines_used.length > 0 && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Medicines</div><div className="flex flex-wrap gap-1">{c.medicines_used.map((m) => <span key={m} className="px-2 py-0.5 rounded bg-secondary text-xs">🌿 {m}</span>)}</div></div>}
                {c.research_context && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Research Context</div><p className="text-sm">{c.research_context}</p></div>}
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
