"use client";

/**
 * What the wheel holds for one episode, beyond its node.
 *
 * Every route read here has filtered by episode for some time — ceremonies,
 * inquiry weaves, plan perspectives and captures by `episode_path`, diary
 * entries by the episode's node id — and the episode page never asked any of
 * them. Nothing here is new data; it is the wheel's own records, gathered where
 * a person looking at the episode can see them. Ref jgwill/medicine-wheel#153.
 */

import { useEffect, useState } from "react";

type Ceremony = {
  id: string;
  type: string;
  direction?: string;
  intentions?: string[];
  timestamp: string;
};

type DiaryEntry = {
  id: string;
  timestamp: string;
  phase?: string;
  entryType?: string;
  content: string;
  metadata?: { participant_name?: string };
};

type InquiryWeave = {
  id: string;
  artefact?: { id?: string };
  last_sync?: { state?: string };
  issue?: string;
  issue_url?: string;
};

type PlanPerspective = {
  id: string;
  plan?: { plan_filename?: string; captured_at?: string };
  narrative?: { title?: string };
};

type Capture = {
  id: string;
  filename: string;
  kind?: string;
  artifact_role?: string;
  device?: string;
  registered_at?: string;
};

type Holdings = {
  ceremonies: Ceremony[];
  diary: DiaryEntry[];
  weaves: InquiryWeave[];
  perspectives: PlanPerspective[];
  captures: Capture[];
};

const DIRECTION_ICONS: Record<string, string> = {
  east: "🌅",
  south: "🔥",
  west: "🌊",
  north: "❄️",
};

/** A list from one route, or [] when that route did not answer — one silent route must not blank the rest. */
async function listFrom<T>(url: string, key: string): Promise<{ items: T[]; failed: boolean }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { items: [], failed: true };
    const body = await res.json();
    return { items: Array.isArray(body?.[key]) ? body[key] : [], failed: false };
  } catch {
    return { items: [], failed: true };
  }
}

function byTime<T extends { timestamp: string }>(a: T, b: T): number {
  return a.timestamp.localeCompare(b.timestamp);
}

export function EpisodeHoldings({ episodeId, episodePath }: { episodeId: string; episodePath: string }) {
  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const [silent, setSilent] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    const p = encodeURIComponent(episodePath);
    Promise.all([
      listFrom<Ceremony>(`/api/ceremonies?episode_path=${p}&limit=all`, "ceremonies"),
      listFrom<DiaryEntry>(`/api/diary?chronicle=${encodeURIComponent(episodeId)}&limit=all`, "entries"),
      listFrom<InquiryWeave>(`/api/inquiry-weaves?episode_path=${p}`, "inquiry_weaves"),
      listFrom<PlanPerspective>(`/api/plan-perspectives?episode_path=${p}`, "plan_perspectives"),
      listFrom<Capture>(`/api/captures?episode_path=${p}`, "captures"),
    ]).then(([ceremonies, diary, weaves, perspectives, captures]) => {
      if (!live) return;
      setHoldings({
        ceremonies: [...ceremonies.items].sort(byTime),
        diary: [...diary.items].sort(byTime),
        weaves: weaves.items,
        perspectives: perspectives.items,
        captures: captures.items,
      });
      setSilent(
        (
          [
            ["ceremonies", ceremonies],
            ["diary entries", diary],
            ["inquiry weaves", weaves],
            ["plan perspectives", perspectives],
            ["captures", captures],
          ] as const
        )
          .filter(([, r]) => r.failed)
          .map(([name]) => name),
      );
    });
    return () => {
      live = false;
    };
  }, [episodeId, episodePath]);

  if (!holdings) {
    return (
      <section>
        <h2 className="text-sm font-semibold mb-2">Held on the wheel</h2>
        <p className="text-sm text-muted-foreground">Asking the wheel…</p>
      </section>
    );
  }

  const { ceremonies, diary, weaves, perspectives, captures } = holdings;
  // A route that did not answer is named as silent, not as empty.
  const empty = (
    [
      ["ceremonies", ceremonies],
      ["diary entries", diary],
      ["inquiry weaves", weaves],
      ["plan perspectives", perspectives],
      ["captures", captures],
    ] as const
  )
    .filter(([name, items]) => items.length === 0 && !silent.includes(name))
    .map(([name]) => name);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">Held on the wheel</h2>

      {ceremonies.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">Ceremonies ({ceremonies.length})</h3>
          <ul className="space-y-1">
            {ceremonies.map((c) => (
              <li key={c.id} className="p-2 border rounded-lg bg-card">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {c.direction && DIRECTION_ICONS[c.direction]} {c.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">{c.timestamp.slice(0, 16).replace("T", " ")}</span>
                </div>
                {c.intentions?.[0] && <p className="text-sm text-muted-foreground mt-1">{c.intentions[0]}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {diary.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">Diary ({diary.length})</h3>
          <ul className="space-y-1">
            {diary.map((d) => (
              <li key={d.id} className="p-2 border rounded-lg bg-card">
                <p className="text-xs text-muted-foreground">
                  {[d.metadata?.participant_name, d.entryType, d.phase].filter(Boolean).join(" · ")}
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{d.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {weaves.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">Inquiry weaves ({weaves.length})</h3>
          <ul className="space-y-1">
            {weaves.map((w) => (
              <li key={w.id} className="p-2 border rounded-lg bg-card flex items-baseline justify-between gap-2 flex-wrap">
                <span className="text-sm font-mono break-all">{w.artefact?.id ?? w.id}</span>
                <span className="text-xs text-muted-foreground flex gap-2">
                  {w.last_sync?.state && <span className="mw-badge">{w.last_sync.state}</span>}
                  {w.issue_url?.startsWith("https://") ? (
                    <a href={w.issue_url} className="hover:underline" target="_blank" rel="noreferrer">
                      {w.issue ?? "issue"}
                    </a>
                  ) : (
                    w.issue
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {perspectives.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">Plan perspectives ({perspectives.length})</h3>
          <ul className="space-y-1">
            {perspectives.map((pp) => (
              <li key={pp.id} className="p-2 border rounded-lg bg-card flex items-baseline justify-between gap-2 flex-wrap">
                <span className="text-sm">{pp.narrative?.title ?? pp.plan?.plan_filename ?? pp.id}</span>
                <span className="text-xs text-muted-foreground">{pp.plan?.captured_at?.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {captures.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">Captures ({captures.length})</h3>
          <ul className="space-y-1">
            {captures.map((c) => (
              <li key={c.id} className="p-2 border rounded-lg bg-card flex items-baseline justify-between gap-2 flex-wrap">
                <span className="text-sm font-mono break-all">{c.filename}</span>
                <span className="text-xs text-muted-foreground flex gap-2">
                  <span className="mw-badge">{c.artifact_role ?? c.kind ?? "capture"}</span>
                  {c.device && <span>{c.device}</span>}
                  <span>{c.registered_at?.slice(0, 10)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {empty.length > 0 && (
        <p className="text-xs text-muted-foreground">No {empty.join(", ")} bound to this episode.</p>
      )}
      {silent.length > 0 && (
        <p className="text-xs text-muted-foreground">The wheel did not answer for: {silent.join(", ")}.</p>
      )}
    </section>
  );
}
