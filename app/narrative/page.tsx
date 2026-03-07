"use client";

import { useEffect, useState } from "react";
import { type NarrativeBeat, type MedicineWheelCycle, DIRECTION_COLORS, type DirectionName } from "@/lib/types";

export default function NarrativePage() {
  const [beats, setBeats] = useState<NarrativeBeat[]>([]);
  const [cycles, setCycles] = useState<MedicineWheelCycle[]>([]);
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/narrative/beats").then((r) => r.json()), fetch("/api/narrative/cycles").then((r) => r.json())])
      .then(([b, c]) => { setBeats(Array.isArray(b) ? b : []); setCycles(Array.isArray(c) ? c : []); })
      .catch(() => {});
  }, []);

  const activeCycle = cycles[0];
  const dirOrder: DirectionName[] = ["east", "south", "west", "north"];
  const dirIdx = activeCycle ? dirOrder.indexOf(activeCycle.current_direction as DirectionName) : 0;
  const progress = ((dirIdx + 1) / 4) * 100;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Narrative Arc</h1>
      <p className="text-sm text-muted-foreground mb-6">Journey through the Four Directions</p>

      {activeCycle && (
        <div className="mb-8 p-6 rounded-xl border bg-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Active Cycle</h2>
              <p className="text-sm text-muted-foreground italic">&ldquo;{activeCycle.research_question}&rdquo;</p>
            </div>
            <span className="text-xs text-muted-foreground">Started {new Date(activeCycle.start_date).toLocaleDateString()}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Current Direction</p>
              <p className="text-lg font-bold capitalize" style={{ color: DIRECTION_COLORS[activeCycle.current_direction as DirectionName] }}>
                {activeCycle.current_direction}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ceremonies</p>
              <p className="text-lg font-bold">{activeCycle.ceremonies_conducted}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wilson Alignment</p>
              <p className="text-lg font-bold">{Math.round(activeCycle.wilson_alignment * 100)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">OCAP</p>
              <p className="text-lg font-bold">{activeCycle.ocap_compliant ? "✅ Compliant" : "⚠️ Pending"}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: `linear-gradient(to right, ${DIRECTION_COLORS.east}, ${DIRECTION_COLORS.south}, ${DIRECTION_COLORS.west}, ${DIRECTION_COLORS.north})` }} />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              {dirOrder.map((d) => <span key={d} className="capitalize">{d}</span>)}
            </div>
          </div>
        </div>
      )}

      {/* Direction Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {dirOrder.map((dir) => {
          const count = beats.filter((b) => b.direction === dir).length;
          return (
            <div key={dir} className="p-3 rounded-lg border text-center" style={{ borderColor: DIRECTION_COLORS[dir] + "40" }}>
              <span className="w-3 h-3 rounded-full inline-block mb-1" style={{ backgroundColor: DIRECTION_COLORS[dir] }} />
              <p className="text-sm capitalize font-medium">{dir}</p>
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">beats</p>
            </div>
          );
        })}
      </div>

      {/* Beat List */}
      <h2 className="text-lg font-semibold mb-3">Narrative Beats ({beats.length})</h2>
      <div className="space-y-3">
        {beats.length === 0 && <div className="text-center py-8 text-muted-foreground">No beats recorded yet.</div>}
        {beats.map((beat) => (
          <div key={beat.id} className="border rounded-lg bg-card overflow-hidden cursor-pointer hover:border-ring/50"
            style={{ borderLeftColor: DIRECTION_COLORS[beat.direction as DirectionName], borderLeftWidth: 4 }}
            onClick={() => setExpandedBeat(expandedBeat === beat.id ? null : beat.id)}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{beat.title}</h3>
                  <p className="text-sm text-muted-foreground">{beat.description}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="capitalize">{beat.direction} · Act {beat.act}</div>
                  <div>{new Date(beat.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            {expandedBeat === beat.id && (
              <div className="px-4 pb-4 border-t pt-3 space-y-2">
                {beat.prose && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Prose</div><p className="text-sm italic">{beat.prose}</p></div>}
                {beat.learnings.length > 0 && <div><div className="text-xs font-medium text-muted-foreground uppercase mb-1">Learnings</div><ul className="text-sm space-y-1">{beat.learnings.map((l, i) => <li key={i}>• {l}</li>)}</ul></div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
