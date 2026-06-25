/**
 * @medicine-wheel/narrative-cluster — Edit Brief
 *
 * Generate a Film Edit Brief from narrative clusters: ordered EDL-style markers
 * with synthesized timecodes and narrative annotations. Deterministic — the same
 * clusters always yield the same brief, so the slice is testable.
 */
import type { ClusterKind, NarrativeCluster } from './clusters.js';

export interface EditMarker {
  index: number;
  clusterId: string;
  kind: ClusterKind;
  /** HH:MM:SS:FF timecode synthesized from marker order. */
  timecode: string;
  /** Narrative annotation for the editor. */
  label: string;
  source: string;
}

export interface EditBrief {
  productionId: string;
  title: string;
  markers: EditMarker[];
  /** CMX3600-style EDL text block. */
  edl: string;
  generatedAt: string;
}

export interface EditBriefOptions {
  productionId?: string;
  title?: string;
  fps?: number;
  /** Seconds allotted per marker for synthetic timecodes (default: 4). */
  secondsPerMarker?: number;
}

function tc(totalSeconds: number, fps: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds / 60) % 60;
  const s = Math.floor(totalSeconds) % 60;
  const f = Math.floor((totalSeconds - Math.floor(totalSeconds)) * fps);
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

/** Produce ordered markers + an EDL text block from clusters. */
export function generateEditBrief(
  clusters: NarrativeCluster[],
  opts: EditBriefOptions = {},
): EditBrief {
  const fps = opts.fps ?? 24;
  const secondsPerMarker = opts.secondsPerMarker ?? 4;
  const productionId = opts.productionId ?? `production:${Date.now()}`;
  const title = opts.title ?? 'Agent-supported edit brief';
  const generatedAt = new Date().toISOString();

  const markers: EditMarker[] = [];
  let order = 0;
  for (const cluster of clusters) {
    for (const ev of cluster.events) {
      const startSec = order * secondsPerMarker;
      order += 1;
      markers.push({
        index: order,
        clusterId: cluster.id,
        kind: cluster.kind,
        timecode: tc(startSec, fps),
        label: `[${cluster.kind}] ${ev.text.slice(0, 72)}`,
        source: ev.source ?? 'belt-device',
      });
    }
  }

  const edlLines: string[] = [`TITLE: ${title}`, 'FCM: NON-DROP FRAME'];
  markers.forEach((marker, i) => {
    const startSec = i * secondsPerMarker;
    const inTc = tc(startSec, fps);
    const outTc = tc(startSec + secondsPerMarker, fps);
    const num = String(marker.index).padStart(3, '0');
    edlLines.push(`${num}  AX       AA/V  C        ${inTc} ${outTc} ${inTc} ${outTc}`);
    edlLines.push(`* FROM CLIP NAME: ${marker.source}`);
    edlLines.push(`* COMMENT: ${marker.label}`);
  });

  return { productionId, title, markers, edl: edlLines.join('\n'), generatedAt };
}
