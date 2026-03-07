"use client";

import { type Direction, DIRECTION_COLORS, CEREMONY_ICONS } from "@/lib/types";
import { X } from "lucide-react";
import Link from "next/link";

interface DirectionPanelProps {
  direction: Direction;
  onClose: () => void;
}

export function DirectionPanel({ direction, onClose }: DirectionPanelProps) {
  return (
    <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-lg animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full inline-block"
              style={{ backgroundColor: DIRECTION_COLORS[direction.name] }}
            />
            {direction.ojibwe}
            <span className="text-muted-foreground text-lg capitalize">({direction.name})</span>
          </h2>
          <p className="text-muted-foreground">
            {direction.season} · {direction.lifeStage} · {direction.ages}
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">
            Medicines
          </h3>
          <div className="flex flex-wrap gap-2">
            {direction.medicine.map((m) => (
              <span
                key={m}
                className="px-3 py-1 rounded-full text-sm border"
                style={{ borderColor: DIRECTION_COLORS[direction.name] }}
              >
                🌿 {m}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">
            Teachings
          </h3>
          <ul className="space-y-1">
            {direction.teachings.map((t) => (
              <li key={t} className="text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DIRECTION_COLORS[direction.name] }} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">
            Practices
          </h3>
          <div className="flex flex-wrap gap-2">
            {direction.practices.map((p) => (
              <span key={p} className="px-3 py-1 rounded-md text-sm bg-secondary">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t">
        <Link
          href={`/ceremonies?direction=${direction.name}`}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          View Ceremonies
        </Link>
        <Link
          href={`/relations?direction=${direction.name}`}
          className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-secondary"
        >
          View Relations
        </Link>
      </div>
    </div>
  );
}
