"use client";

import { useState } from "react";
import { DIRECTIONS, type DirectionName } from "@/lib/types";
import { DirectionPanel } from "@/components/direction-panel";

/** Presentation colors from tokens.css — West's canonical color is invisible on dark ground. */
const DIR_VAR: Record<DirectionName, string> = {
  east: "var(--mw-east)",
  south: "var(--mw-south)",
  west: "var(--mw-west)",
  north: "var(--mw-north)",
};
const DIR_INK: Record<DirectionName, string> = {
  east: "var(--mw-east-ink)",
  south: "var(--mw-south-ink)",
  west: "var(--mw-west-ink)",
  north: "var(--mw-north-ink)",
};
/** Text drawn ON a filled quadrant — dark on light fills, light on dark fills. */
const QUADRANT_TEXT: Record<DirectionName, { main: string; sub: string }> = {
  east: { main: "#1a1408", sub: "#3d3210" },
  south: { main: "#fff5f4", sub: "#ffd9d6" },
  west: { main: "#f4f6fa", sub: "#dbe2ee" },
  north: { main: "#1c1a14", sub: "#4a463a" },
};

const R = 200;
const CX = 250;
const CY = 250;
const toRad = (a: number) => (a * Math.PI) / 180;

function quadrantPath(startAngle: number, endAngle: number) {
  const x1 = CX + R * Math.cos(toRad(startAngle));
  const y1 = CY + R * Math.sin(toRad(startAngle));
  const x2 = CX + R * Math.cos(toRad(endAngle));
  const y2 = CY + R * Math.sin(toRad(endAngle));
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
}

const QUADRANTS: { dir: DirectionName; start: number; end: number }[] = [
  { dir: "east", start: -45, end: 45 },
  { dir: "south", start: 45, end: 135 },
  { dir: "west", start: 135, end: 225 },
  { dir: "north", start: 225, end: 315 },
];

export default function HomePage() {
  const [selected, setSelected] = useState<DirectionName | null>(null);
  const [hovered, setHovered] = useState<DirectionName | null>(null);

  const selectedDir = selected ? DIRECTIONS.find((d) => d.name === selected) : null;

  const toggle = (dir: DirectionName) => setSelected(selected === dir ? null : dir);

  return (
    <div className="flex flex-col items-center gap-8 p-6">
      <div className="text-center max-w-2xl">
        <h1 className="mw-display mb-2">Medicine Wheel</h1>
        <p className="text-muted-foreground">
          Navigate the Four Directions — select a direction to explore its teachings,
          ceremonies, and relational obligations.
        </p>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 500 500"
          className="w-full max-w-[500px] mw-breathe"
          aria-label="Medicine Wheel — four directions"
          role="group"
        >
          {/* Concentric rings + four-direction cross — the wheel made visible */}
          <g aria-hidden="true">
            <circle cx={CX} cy={CY} r={222} fill="none" stroke="var(--mw-border)" strokeWidth={1} opacity={0.6} />
            <circle cx={CX} cy={CY} r={140} fill="none" stroke="var(--mw-fg)" strokeWidth={0.5} opacity={0.12} />
            <circle cx={CX} cy={CY} r={80} fill="none" stroke="var(--mw-fg)" strokeWidth={0.5} opacity={0.12} />
            {QUADRANTS.map(({ dir, start }) => {
              const x = CX + 222 * Math.cos(toRad(start));
              const y = CY + 222 * Math.sin(toRad(start));
              return (
                <line
                  key={`cross-${dir}`}
                  x1={CX} y1={CY} x2={x} y2={y}
                  stroke="var(--mw-border)" strokeWidth={1} opacity={0.7}
                />
              );
            })}
          </g>

          {QUADRANTS.map(({ dir, start, end }) => {
            const dirData = DIRECTIONS.find((d) => d.name === dir)!;
            const isHovered = hovered === dir;
            const isSelected = selected === dir;
            const active = isHovered || isSelected;
            const midAngle = (start + end) / 2;
            const labelR = R * 0.62;
            const lx = CX + labelR * Math.cos(toRad(midAngle));
            const ly = CY + labelR * Math.sin(toRad(midAngle));
            // Lift: the hovered quadrant drifts outward along its own direction
            const dx = 6 * Math.cos(toRad(midAngle));
            const dy = 6 * Math.sin(toRad(midAngle));
            const text = QUADRANT_TEXT[dir];

            return (
              <g
                key={dir}
                style={{
                  transform: active ? `translate(${dx}px, ${dy}px)` : undefined,
                  transition: "transform var(--duration-default) var(--ease-out)",
                }}
              >
                <path
                  d={quadrantPath(start, end)}
                  fill={DIR_VAR[dir]}
                  stroke="var(--mw-bg)"
                  strokeWidth={2}
                  opacity={active ? 0.95 : 0.72}
                  className="cursor-pointer"
                  style={{ transition: "opacity var(--duration-default) ease" }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${dirData.ojibwe} — ${dir}: ${dirData.season}, ${dirData.medicine.join(", ")}`}
                  onClick={() => toggle(dir)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(dir);
                    }
                  }}
                  onMouseEnter={() => setHovered(dir)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(dir)}
                  onBlur={() => setHovered(null)}
                />
                <text
                  x={lx}
                  y={ly - 12}
                  textAnchor="middle"
                  className="pointer-events-none text-base font-semibold"
                  style={{ fill: text.main }}
                >
                  {dirData.ojibwe}
                </text>
                <text
                  x={lx}
                  y={ly + 6}
                  textAnchor="middle"
                  className="pointer-events-none text-xs capitalize"
                  style={{ fill: text.sub }}
                >
                  {dir}
                </text>
                {/* Reveal on hover/select: season and medicines */}
                <text
                  x={lx}
                  y={ly + 24}
                  textAnchor="middle"
                  className="pointer-events-none text-xs"
                  style={{
                    fill: text.sub,
                    opacity: active ? 1 : 0,
                    transition: "opacity var(--duration-default) ease",
                  }}
                >
                  {dirData.season} · {dirData.medicine.join(" · ")}
                </text>
              </g>
            );
          })}

          {/* Center — balance */}
          <circle
            cx={CX}
            cy={CY}
            r={32}
            fill="var(--mw-bg)"
            stroke="var(--mw-border)"
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

      {/* Direction cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
        {DIRECTIONS.map((dir) => (
          <button
            key={dir.name}
            onClick={() => toggle(dir.name)}
            className={`mw-dir-card p-4 text-left ${
              selected === dir.name ? "mw-dir-card--selected" : ""
            }`}
            style={
              {
                "--dir": DIR_VAR[dir.name],
                borderColor: `var(--mw-${dir.name}-border)`,
              } as React.CSSProperties
            }
            aria-pressed={selected === dir.name}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: DIR_VAR[dir.name] }}
              />
              <span className="font-semibold capitalize">{dir.name}</span>
            </div>
            <p className="mw-ojibwe" style={{ color: DIR_INK[dir.name], opacity: 1 }}>
              {dir.ojibwe}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{dir.season}</p>
            <p className="text-xs text-muted-foreground">{dir.medicine.join(" · ")}</p>
          </button>
        ))}
      </div>

      {selectedDir && (
        <DirectionPanel direction={selectedDir} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
