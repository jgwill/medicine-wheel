"use client";

import { useEffect, useState } from "react";

interface Resource {
  id: string;
  name: string;
  description: string;
  content: Record<string, string>;
}

export default function AccountabilityPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [ceremonies, setCeremonies] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [expandedRes, setExpandedRes] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/resources").then((r) => r.json()),
      fetch("/api/nodes").then((r) => r.json()),
      fetch("/api/edges").then((r) => r.json()),
      fetch("/api/ceremonies").then((r) => r.json()),
      fetch("/api/narrative/beats").then((r) => r.json()),
      fetch("/api/analysis").then((r) => r.json()),
    ]).then(([res, n, e, c, b, a]) => {
      setResources(Array.isArray(res) ? res : []);
      setNodes(Array.isArray(n) ? n : []);
      setEdges(Array.isArray(e) ? e : []);
      const cerems = c?.ceremonies ?? (Array.isArray(c) ? c : []);
      setCeremonies(Array.isArray(cerems) ? cerems : []);
      setBeats(Array.isArray(b) ? b : []);
      setAnalysis(a && !a.error ? a : null);
    }).catch(() => {});
  }, []);

  const ceremoniedCount = edges.filter((e: any) => e.ceremony_honored).length;

  const wilsonScore = analysis?.transformationData?.wilsonValidity?.score
    ?? analysis?.transformationData?.wilsonValidity?.overallScore
    ?? 0;
  const wilsonPct = Math.round(wilsonScore * 100);

  const auditData = analysis?.accountabilityAudit ?? {};
  const compliantCount = auditData.compliantCount ?? auditData.compliantEdges ?? 0;
  const auditRecs = auditData.recommendations ?? [];

  const idxHealth = analysis?.indexHealth?.health ?? {};
  const idxScore = typeof idxHealth.score === "number" ? Math.round(idxHealth.score * 100) : null;
  const idxRecs = idxHealth.recommendations ?? [];

  const cerem = analysis?.ceremonyState ?? {};
  const sevenGen = analysis?.transformationData?.sevenGenScore ?? {};
  const reflPrompts = analysis?.reflectionPrompts?.opening ?? [];
  const fkStatus = analysis?.fireKeeperStatus ?? {};
  const reviewCirclesData = analysis?.reviewCircles?.circles ?? [];

  const narrativeCompleteness = analysis?.narrativeAnalysis?.completeness ?? {};
  const narrativePhase = analysis?.narrativeAnalysis?.currentPhase ?? "unknown";
  const cadence = analysis?.narrativeAnalysis?.cadence ?? {};

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Accountability & Frameworks</h1>
      <p className="text-sm text-muted-foreground mb-6">Relational accountability metrics and Indigenous research frameworks</p>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-3xl font-bold">{nodes.length}</p>
          <p className="text-sm text-muted-foreground">Relations Mapped</p>
          <p className="text-xs text-muted-foreground">{nodes.length} nodes · {edges.length} edges</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-3xl font-bold">{ceremonies.length}</p>
          <p className="text-sm text-muted-foreground">Ceremonies Logged</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-3xl font-bold">{beats.length}</p>
          <p className="text-sm text-muted-foreground">Narrative Beats</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-3xl font-bold text-green-500">{ceremoniedCount > 0 ? "✓" : "○"}</p>
          <p className="text-sm text-muted-foreground">Relations Ceremonied</p>
          <p className="text-xs text-muted-foreground">{ceremoniedCount}/{edges.length} edges ceremonied</p>
        </div>
      </div>

      {/* Wilson Alignment Gauge */}
      {analysis && (
        <div className="mb-8 p-6 rounded-xl border bg-card">
          <h2 className="text-lg font-semibold mb-4">Wilson Alignment</h2>
          <div className="flex items-center gap-6">
            <svg viewBox="0 0 120 70" className="w-40 h-24">
              <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="currentColor" strokeWidth="6" opacity={0.15} />
              <path
                d="M10,60 A50,50 0 0,1 110,60"
                fill="none"
                stroke={wilsonPct >= 70 ? "#22c55e" : wilsonPct >= 40 ? "#eab308" : "#ef4444"}
                strokeWidth="6"
                strokeDasharray={`${(wilsonPct / 100) * 157} 157`}
                strokeLinecap="round"
              />
              <text x="60" y="55" textAnchor="middle" className="text-lg font-bold" fill="currentColor">{wilsonPct}%</text>
            </svg>
            <div className="flex-1 text-sm text-muted-foreground">
              <p>&ldquo;If research doesn&apos;t change you, you haven&apos;t done it right.&rdquo; — Shawn Wilson</p>
              <p className="mt-1">Score reflects researcher transformation, community benefit, relational strengthening, and reciprocity balance.</p>
            </div>
          </div>
        </div>
      )}

      {/* OCAP + Narrative + Ceremony Row */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* OCAP Compliance */}
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">OCAP® Compliance</h3>
            <p className="text-2xl font-bold">{auditData.ocapCompliant || compliantCount > 0 ? "✅ Compliant" : "⚠️ Review Needed"}</p>
            <p className="text-xs text-muted-foreground mt-1">Ownership · Control · Access · Possession</p>
          </div>

          {/* Narrative Arc Completeness */}
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Narrative Arc</h3>
            <p className="text-sm">Phase: <span className="font-medium capitalize">{narrativePhase}</span></p>
            <p className="text-sm">Cadence: <span className="font-medium">{cadence.valid ? "✓ Valid" : "⚠ Violations"}</span></p>
            {cadence.violations?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{cadence.violations.length} cadence violation(s)</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Directions: {typeof narrativeCompleteness.directionsVisited === "number"
                ? `${narrativeCompleteness.directionsVisited}/4`
                : "—"}
            </p>
          </div>

          {/* Ceremony Phase State */}
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Ceremony Phase</h3>
            <p className="text-sm capitalize font-medium">{cerem.currentPhase ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{cerem.framing ?? ""}</p>
            <p className="text-xs mt-1">Next: <span className="capitalize">{cerem.nextPhase ?? "—"}</span></p>
          </div>
        </div>
      )}

      {/* Accountability Audit + Index Health Row */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Accountability Audit */}
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Accountability Audit</h3>
            <p className="text-sm">Compliant relations: <span className="font-bold">{compliantCount}</span></p>
            {auditRecs.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Recommendations</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {auditRecs.slice(0, 3).map((r: string, i: number) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Relational Index Health */}
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Relational Index Health</h3>
            {idxScore !== null ? (
              <>
                <p className="text-2xl font-bold">{idxScore}%</p>
                <p className="text-xs text-muted-foreground">Dimension balance · Coverage · Convergence richness</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Index health data unavailable</p>
            )}
            {idxRecs.length > 0 && (
              <ul className="text-xs space-y-1 text-muted-foreground mt-2">
                {idxRecs.slice(0, 3).map((r: string, i: number) => <li key={i}>• {r}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Transformation + Fire Keeper + Review Circles Row */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Transformation Tracker */}
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Transformation Tracker</h3>
            <p className="text-sm">Seven-Gen Score: <span className="font-bold">{typeof sevenGen.score === "number" ? Math.round(sevenGen.score * 100) + "%" : "—"}</span></p>
            {reflPrompts.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Reflection Prompts</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {reflPrompts.slice(0, 2).map((p: string, i: number) => <li key={i}>• {p}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Fire Keeper Status */}
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Fire Keeper</h3>
            <p className="text-sm">Phase: <span className="capitalize font-medium">{fkStatus.ceremonyState?.phase ?? "—"}</span></p>
            <p className="text-sm">Ready: <span className="font-medium">{fkStatus.completionReadiness?.ready ? "✓ Yes" : "○ Not yet"}</span></p>
            {fkStatus.completionReadiness?.blockers?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{fkStatus.completionReadiness.blockers.length} blocker(s)</p>
            )}
          </div>

          {/* Review Circles */}
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Review Circles</h3>
            {reviewCirclesData.length > 0 ? (
              <ul className="text-sm space-y-1">
                {reviewCirclesData.map((c: any, i: number) => (
                  <li key={i} className="text-xs">
                    <span className="font-medium">{c.artifactId ?? c.id}</span>{" "}
                    <span className="text-muted-foreground">— {c.status?.status ?? c.status ?? "gathering"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No review circles active</p>
            )}
          </div>
        </div>
      )}

      {/* Frameworks */}
      <h2 className="text-lg font-semibold mb-4">Indigenous Research Frameworks</h2>
      <div className="space-y-3">
        {resources.map((res) => (
          <div key={res.id} className="border rounded-lg bg-card overflow-hidden cursor-pointer hover:border-ring/50"
            onClick={() => setExpandedRes(expandedRes === res.id ? null : res.id)}>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{res.name}</h3>
                <p className="text-sm text-muted-foreground">{res.description}</p>
              </div>
              <span className="text-muted-foreground">{expandedRes === res.id ? "▲" : "▼"}</span>
            </div>
            {expandedRes === res.id && (
              <div className="px-4 pb-4 border-t pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(res.content).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-md bg-secondary/30">
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{key}</p>
                      <p className="text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
