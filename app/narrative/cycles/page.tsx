"use client";

import { useEffect, useState } from "react";
import { type MedicineWheelCycle, DIRECTION_COLORS, type DirectionName } from "@/lib/types";
import { toast } from "sonner";

export default function CyclesPage() {
  const [cycles, setCycles] = useState<MedicineWheelCycle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/narrative/cycles").then((r) => r.json()).then((d) => setCycles(Array.isArray(d) ? d : [])).catch(() => setCycles([]));
  }, []);

  async function createCycle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = { research_question: form.get("question") as string };
    const res = await fetch("/api/narrative/cycles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success("Cycle created");
      setShowForm(false);
      const data = await fetch("/api/narrative/cycles").then((r) => r.json());
      setCycles(Array.isArray(data) ? data : []);
    } else { toast.error("Failed"); }
  }

  const dirOrder: DirectionName[] = ["east", "south", "west", "north"];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Medicine Wheel Cycles</h1>
          <p className="text-sm text-muted-foreground">{cycles.length} research cycles</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">+ New Cycle</button>
      </div>

      {showForm && (
        <form onSubmit={createCycle} className="mb-6 p-4 border rounded-lg bg-card">
          <textarea name="question" placeholder="What is your research question?" rows={3} required className="w-full px-3 py-2 rounded-md border bg-background text-sm mb-3" />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Create Cycle</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {cycles.length === 0 && <div className="text-center py-12 text-muted-foreground">No cycles yet. Create one to begin your research journey.</div>}
        {cycles.map((cycle) => {
          const dirIdx = dirOrder.indexOf(cycle.current_direction as DirectionName);
          const progress = ((dirIdx + 1) / 4) * 100;

          return (
            <div key={cycle.id} className="border rounded-xl bg-card overflow-hidden cursor-pointer hover:border-ring/50"
              onClick={() => setExpandedId(expandedId === cycle.id ? null : cycle.id)}>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Mini wheel */}
                  <svg viewBox="0 0 48 48" className="w-12 h-12 flex-shrink-0">
                    {dirOrder.map((dir, i) => {
                      const startAngle = i * 90 - 45;
                      const endAngle = startAngle + 90;
                      const toRad = (a: number) => (a * Math.PI) / 180;
                      const x1 = 24 + 20 * Math.cos(toRad(startAngle));
                      const y1 = 24 + 20 * Math.sin(toRad(startAngle));
                      const x2 = 24 + 20 * Math.cos(toRad(endAngle));
                      const y2 = 24 + 20 * Math.sin(toRad(endAngle));
                      const completed = dirOrder.indexOf(dir) <= dirIdx;
                      return (
                        <path key={dir}
                          d={`M 24 24 L ${x1} ${y1} A 20 20 0 0 1 ${x2} ${y2} Z`}
                          fill={DIRECTION_COLORS[dir]}
                          opacity={completed ? 0.9 : 0.2}
                        />
                      );
                    })}
                    <circle cx="24" cy="24" r="4" fill="var(--color-background)" />
                  </svg>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{cycle.research_question}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="capitalize" style={{ color: DIRECTION_COLORS[cycle.current_direction as DirectionName] }}>
                        ● {cycle.current_direction}
                      </span>
                      <span>{cycle.beats.length} beats</span>
                      <span>{cycle.ceremonies_conducted} ceremonies</span>
                      <span>Started {new Date(cycle.start_date).toLocaleDateString()}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${progress}%`,
                        background: `linear-gradient(to right, ${DIRECTION_COLORS.east}, ${DIRECTION_COLORS.south}, ${DIRECTION_COLORS.west}, ${DIRECTION_COLORS.north})`,
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              {expandedId === cycle.id && (
                <div className="px-6 pb-6 border-t pt-4">
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {dirOrder.map((dir) => {
                      const active = dirOrder.indexOf(dir) <= dirIdx;
                      return (
                        <div key={dir} className="text-center p-2 rounded-md border" style={{ borderColor: active ? DIRECTION_COLORS[dir] : "var(--color-border)", opacity: active ? 1 : 0.4 }}>
                          <p className="text-xs capitalize font-medium">{dir}</p>
                          <p className="text-sm">{active ? "✓" : "○"}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground">Wilson Alignment</p>
                      <p className="font-bold">{Math.round(cycle.wilson_alignment * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">OCAP</p>
                      <p className="font-bold">{cycle.ocap_compliant ? "✅ Compliant" : "⚠️ Pending"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Relations Mapped</p>
                      <p className="font-bold">{cycle.relations_mapped}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Cycle ID: {cycle.id}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
