"use client";

import { useState } from "react";
import { DIRECTIONS, DIRECTION_COLORS, type DirectionName } from "@/lib/types";
import { DirectionPanel } from "@/components/direction-panel";

export default function HomePage() {
  const [selected, setSelected] = useState<DirectionName | null>(null);
  const [hovered, setHovered] = useState<DirectionName | null>(null);

  const selectedDir = selected ? DIRECTIONS.find((d) => d.name === selected) : null;

  const R = 200;
  const CX = 250;
  const CY = 250;

  function quadrantPath(startAngle: number, endAngle: number) {
    const toRad = (a: number) => (a * Math.PI) / 180;
    const x1 = CX + R * Math.cos(toRad(startAngle));
    const y1 = CY + R * Math.sin(toRad(startAngle));
    const x2 = CX + R * Math.cos(toRad(endAngle));
    const y2 = CY + R * Math.sin(toRad(endAngle));
    return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
  }

  const quadrants: { dir: DirectionName; start: number; end: number }[] = [
    { dir: "east", start: -45, end: 45 },
    { dir: "south", start: 45, end: 135 },
    { dir: "west", start: 135, end: 225 },
    { dir: "north", start: 225, end: 315 },
  ];

  return (
    <div className="flex flex-col items-center gap-8 p-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Medicine Wheel</h1>
        <p className="text-muted-foreground">
          Navigate the Four Directions — click a direction to explore its teachings, ceremonies, and relational obligations.
        </p>
      </div>

      <div className="relative">
        <svg viewBox="0 0 500 500" className="w-full max-w-[500px]" aria-label="Medicine Wheel">
          {quadrants.map(({ dir, start, end }) => {
            const dirData = DIRECTIONS.find((d) => d.name === dir)!;
            const isHovered = hovered === dir;
            const isSelected = selected === dir;
            const toRad = (a: number) => (a * Math.PI) / 180;
            const midAngle = (start + end) / 2;
            const labelR = R * 0.6;
            const lx = CX + labelR * Math.cos(toRad(midAngle));
            const ly = CY + labelR * Math.sin(toRad(midAngle));

            return (
              <g key={dir}>
                <path
                  d={quadrantPath(start, end)}
                  fill={DIRECTION_COLORS[dir]}
                  stroke="var(--color-border)"
                  strokeWidth={2}
                  opacity={isHovered || isSelected ? 1 : 0.75}
                  className="cursor-pointer transition-all duration-300"
                  style={{
                    filter: isHovered ? "brightness(1.25)" : undefined,
                    transform: isSelected ? `scale(1.02)` : undefined,
                    transformOrigin: `${CX}px ${CY}px`,
                  }}
                  onClick={() => setSelected(selected === dir ? null : dir)}
                  onMouseEnter={() => setHovered(dir)}
                  onMouseLeave={() => setHovered(null)}
                />
                <text
                  x={lx}
                  y={ly - 8}
                  textAnchor="middle"
                  className="pointer-events-none text-sm font-bold"
                  style={{ fill: dir === "east" || dir === "north" ? "#1a1a2e" : "#f5f5f5" }}
                >
                  {dirData.ojibwe}
                </text>
                <text
                  x={lx}
                  y={ly + 10}
                  textAnchor="middle"
                  className="pointer-events-none text-xs"
                  style={{ fill: dir === "east" || dir === "north" ? "#333" : "#ccc" }}
                >
                  {dirData.season} · {dirData.medicine[0]}
                </text>
              </g>
            );
          })}

          {/* Center circle */}
          <circle
            cx={CX}
            cy={CY}
            r={30}
            fill="var(--color-background)"
            stroke="var(--color-border)"
            strokeWidth={2}
            className="animate-pulse-center"
          />
          <text
            x={CX}
            y={CY + 4}
            textAnchor="middle"
            className="pointer-events-none text-[10px] font-semibold fill-foreground"
          >
            Balance
          </text>
        </svg>
      </div>

      {/* Direction cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
        {DIRECTIONS.map((dir) => (
          <button
            key={dir.name}
            onClick={() => setSelected(selected === dir.name ? null : dir.name)}
            className={`p-4 rounded-lg border text-left transition-all hover:scale-[1.02] ${
              selected === dir.name ? "ring-2 ring-primary" : ""
            }`}
            style={{ borderColor: DIRECTION_COLORS[dir.name] + "60" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: DIRECTION_COLORS[dir.name] }}
              />
              <span className="font-semibold capitalize">{dir.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{dir.ojibwe}</p>
            <p className="text-xs text-muted-foreground">{dir.season}</p>
          </button>
        ))}
      </div>

      {/* Direction Panel */}
      {selectedDir && (
        <DirectionPanel
          direction={selectedDir}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
