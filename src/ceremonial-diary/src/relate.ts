/**
 * Project a diary entry into the medicine-wheel relational graph.
 *
 * The diary is a participant's voice that can write into the chronicle. This
 * helper draws the relation as nodes and edges:
 *
 *   participant  --authored-->  diary entry  --recorded_in-->  chronicle episode
 *
 * It is deliberately fail-open, mirroring @miadi/inquiry-weave's register
 * pattern: if the wheel is unreachable or a write fails, the entry is still
 * valid and stored — projection just reports that it did not complete. The
 * chronicle episode node itself is normally registered by @miadi/inquiry-weave
 * (`chronicle:<episode-folder-name>` under parent `chronicle:miadi-chronicle`);
 * set `ensureChronicleNode` to create a stub so the edge is not dangling.
 */

import type { StorageProvider } from '@medicine-wheel/storage-provider';
import type { DiaryEntry } from './types.js';
import { PHASE_TO_DIRECTION } from './types.js';

export interface ProjectEntryOptions {
  /** Create a stub chronicle node when one does not already exist. */
  ensureChronicleNode?: boolean;
  /** Create/refresh a node for the authoring participant (default true). */
  ensureParticipantNode?: boolean;
}

export interface ProjectEntryResult {
  projected: boolean;
  /** Node id minted for the entry (`diary:<entry-id>`). */
  nodeId: string;
  /** Human-readable descriptions of edges drawn. */
  edges: string[];
  error?: string;
}

/** The wheel node id for a diary entry. */
export function diaryNodeId(entry: Pick<DiaryEntry, 'id'>): string {
  return `diary:${entry.id}`;
}

/** The wheel node id for a participant. */
export function participantNodeId(participant: string): string {
  return `participant:${participant}`;
}

/** The chronicle node id convention: `chronicle:<episode-folder-name>`. */
export function chronicleNodeId(episodeFolder: string): string {
  return episodeFolder.startsWith('chronicle:') ? episodeFolder : `chronicle:${episodeFolder}`;
}

export async function projectEntryToWheel(
  store: StorageProvider,
  entry: DiaryEntry,
  options: ProjectEntryOptions = {},
): Promise<ProjectEntryResult> {
  const { ensureChronicleNode = false, ensureParticipantNode = true } = options;
  const nodeId = diaryNodeId(entry);
  const edges: string[] = [];

  try {
    const now = new Date().toISOString();

    await store.createNode({
      id: nodeId,
      name: `Diary — ${entry.entryType} (${entry.phase})`,
      type: 'knowledge',
      direction: PHASE_TO_DIRECTION[entry.phase],
      metadata: {
        source: 'ceremonial-diary',
        participant: entry.participant,
        phase: entry.phase,
        entryType: entry.entryType,
        ...(entry.chronicle ? { chronicle: entry.chronicle } : {}),
      },
      created_at: entry.timestamp,
      updated_at: now,
    });

    const authorId = participantNodeId(entry.participant);
    if (ensureParticipantNode) {
      await store.createNode({
        id: authorId,
        name: entry.participant,
        type: 'human',
        metadata: { source: 'ceremonial-diary' },
        created_at: now,
        updated_at: now,
      });
    }

    await store.createEdge({
      from_id: authorId,
      to_id: nodeId,
      relationship_type: 'authored',
      strength: 1,
      ceremony_honored: false,
      obligations: [],
      created_at: now,
    });
    edges.push(`${authorId} --authored--> ${nodeId}`);

    if (entry.chronicle) {
      const chronicleId = chronicleNodeId(entry.chronicle);
      if (ensureChronicleNode) {
        const existing = await store.getNode(chronicleId);
        if (!existing) {
          await store.createNode({
            id: chronicleId,
            name: chronicleId,
            type: 'knowledge',
            metadata: { source: 'ceremonial-diary', kind: 'chronicle_episode' },
            created_at: now,
            updated_at: now,
          });
        }
      }

      await store.createEdge({
        from_id: nodeId,
        to_id: chronicleId,
        relationship_type: 'recorded_in',
        strength: 1,
        ceremony_honored: false,
        obligations: [],
        created_at: now,
      });
      edges.push(`${nodeId} --recorded_in--> ${chronicleId}`);
    }

    return { projected: true, nodeId, edges };
  } catch (error) {
    return {
      projected: false,
      nodeId,
      edges,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
