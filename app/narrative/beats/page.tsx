"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { type NarrativeBeat, DIRECTION_COLORS, type DirectionName } from "@/lib/types";
import { toast } from "sonner";

export default function BeatsPage() {
  const [beats, setBeats] = useState<NarrativeBeat[]>([]);
  const [viewMode, setViewMode] = useState<"timeline" | "direction">("timeline");
  const [filterDir, setFilterDir] = useState<string>("all");
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/narrative/beats").then((r) => r.json()).then((d) => setBeats(Array.isArray(d) ? d : [])).catch(() => setBeats([]));
  }, []);

  const directions: DirectionName[] = ["east", "south", "west", "north"];
  const filteredBeats = filterDir === "all" ? beats : beats.filter((b) => b.direction === filterDir);

  async function addBeat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      direction: form.get("direction") as string,
      title: form.get("title") as string,
      description: form.get("description") as string,
      prose: form.get("prose") as string || undefined,
      act: parseInt(form.get("act") as string) || 1,
      learnings: (form.get("learnings") as string).split(",").map((s) => s.trim()).filter(Boolean),
      ceremonies: [],
      relations_honored: [],
    };
    const res = await fetch("/api/narrative/beats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success("Beat created");
      setShowForm(false);
      const data = await fetch("/api/narrative/beats").then((r) => r.json());
      setBeats(Array.isArray(data) ? data : []);
    } else { toast.error("Failed"); }
  }

  // Direction summary
  const dirCounts = directions.reduce((acc, d) => { acc[d] = beats.filter((b) => b.direction === d).length; return acc; }, {} as Record<DirectionName, number>);

  // Cadence: which phases are covered
  const dirToPhase: Record<DirectionName, string> = { east: "Opening", south: "Deepening", west: "Integrating", north: "Closing" };
  const visitedDirs = new Set(beats.map((b) => b.direction));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Narrative Beats</h1>
          <p className="text-sm text-muted-foreground">{beats.length} beats across the Four Directions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === "timeline" ? "direction" : "timeline")}
            className="px-3 py-1.5 rounded-md border text-sm">{viewMode === "timeline" ? "By Direction" : "Timeline"}</button>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">+ Add Beat</button>
        </div>
      </div>

      {/* Direction Summary + Cadence */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {directions.map((dir) => (
          <button key={dir} onClick={() => setFilterDir(filterDir === dir ? "all" : dir)}
            className={`p-3 rounded-lg border text-center transition-all ${filterDir === dir ? "ring-2 ring-primary" : ""}`}
            style={{ borderColor: DIRECTION_COLORS[dir] + "40" }}>
            <span className="w-3 h-3 rounded-full inline-block mb-1" style={{ backgroundColor: DIRECTION_COLORS[dir] }} />
            <p className="text-sm capitalize font-medium">{dir}</p>
            <p className="text-lg font-bold">{dirCounts[dir]}</p>
            <p className="text-xs text-muted-foreground">{dirToPhase[dir]} {visitedDirs.has(dir) ? "✓" : ""}</p>
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={addBeat} className="mb-6 p-4 border rounded-lg bg-card grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input name="title" placeholder="Beat title" required className="px-3 py-2 rounded-md border bg-background text-sm" />
          <select name="direction" required className="px-3 py-2 rounded-md border bg-background text-sm">
            {directions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <textarea name="description" placeholder="Description" rows={2} required className="px-3 py-2 rounded-md border bg-background text-sm sm:col-span-2" />
          <textarea name="prose" placeholder="Prose (optional)" rows={2} className="px-3 py-2 rounded-md border bg-background text-sm" />
          <select name="act" className="px-3 py-2 rounded-md border bg-background text-sm">
            <option value="1">Act 1 (East)</option><option value="2">Act 2 (South)</option><option value="3">Act 3 (West)</option><option value="4">Act 4 (North)</option>
          </select>
          <input name="learnings" placeholder="Learnings (comma-separated)" className="px-3 py-2 rounded-md border bg-background text-sm sm:col-span-2" />
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Create Beat</button>
        </form>
      )}

      {viewMode === "timeline" ? (
        <div className="relative pl-8">
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
          {filteredBeats.length === 0 && <div className="text-center py-8 text-muted-foreground">No beats yet.</div>}
          {filteredBeats.map((beat) => (
            <div key={beat.id} className="relative mb-4" onClick={() => setExpandedBeat(expandedBeat === beat.id ? null : beat.id)}>
              <div className="absolute -left-5 top-4 w-3 h-3 rounded-full border-2 border-background" style={{ backgroundColor: DIRECTION_COLORS[beat.direction as DirectionName] }} />
              <div className="border rounded-lg bg-card p-4 cursor-pointer hover:border-ring/50"
                style={{ borderLeftColor: DIRECTION_COLORS[beat.direction as DirectionName], borderLeftWidth: 3 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{beat.title}</h3>
                    <p className="text-sm text-muted-foreground">{beat.description}</p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div className="capitalize">{beat.direction} · Act {beat.act}</div>
                    <div>{new Date(beat.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
                {expandedBeat === beat.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {beat.prose && <p className="text-sm italic">{beat.prose}</p>}
                    {beat.learnings.length > 0 && <div><span className="text-xs font-medium text-muted-foreground">Learnings:</span><ul className="text-sm mt-1">{beat.learnings.map((l, i) => <li key={i}>• {l}</li>)}</ul></div>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {directions.map((dir) => (
            <div key={dir} className="space-y-2">
              <h3 className="font-semibold capitalize text-center py-2 rounded-md" style={{ backgroundColor: DIRECTION_COLORS[dir] + "20", color: DIRECTION_COLORS[dir] }}>
                {dir} ({dirCounts[dir]})
              </h3>
              {beats.filter((b) => b.direction === dir).map((beat) => (
                <div key={beat.id} className="border rounded-md bg-card p-3 text-sm cursor-pointer hover:border-ring/50"
                  onClick={() => setExpandedBeat(expandedBeat === beat.id ? null : beat.id)}>
                  <p className="font-medium">{beat.title}</p>
                  <p className="text-xs text-muted-foreground">Act {beat.act} · {new Date(beat.timestamp).toLocaleDateString()}</p>
                  {expandedBeat === beat.id && beat.prose && <p className="mt-2 text-xs italic border-t pt-2">{beat.prose}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
