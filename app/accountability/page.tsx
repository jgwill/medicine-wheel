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
  const [expandedRes, setExpandedRes] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/resources").then((r) => r.json()),
      fetch("/api/nodes").then((r) => r.json()),
      fetch("/api/edges").then((r) => r.json()),
      fetch("/api/ceremonies").then((r) => r.json()),
      fetch("/api/narrative/beats").then((r) => r.json()),
    ]).then(([res, n, e, c, b]) => {
      setResources(Array.isArray(res) ? res : []);
      setNodes(Array.isArray(n) ? n : []);
      setEdges(Array.isArray(e) ? e : []);
      setCeremonies(Array.isArray(c) ? c : []);
      setBeats(Array.isArray(b) ? b : []);
    }).catch(() => {});
  }, []);

  const ceremoniedCount = edges.filter((e: any) => e.ceremony_honored).length;

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
