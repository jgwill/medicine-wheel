/**
 * Diary entry creation.
 *
 * Every helper takes a StorageProvider (dependency injection) and persists the
 * record through it, so the same code path serves jsonl and neon equally. The
 * id preserves Miadi's epoch-millis lineage while adding a short random suffix
 * so rapid successive entries never collide.
 */

import { randomUUID } from 'node:crypto';
import type { StorageProvider } from '@medicine-wheel/storage-provider';
import type {
  CeremonialPhase,
  DiaryEntry,
  DiaryEntryMetadata,
  DiaryEntryType,
  DiaryEntryLocation,
  Participant,
} from './types.js';

export interface CreateDiaryEntryInput {
  content: string;
  participant: Participant;
  phase: CeremonialPhase;
  entryType: DiaryEntryType;
  metadata?: DiaryEntryMetadata;
  agent?: string;
  /**
   * Optional chronicle node id (`chronicle:<episode-folder-name>`). Entries
   * without one remain fully valid.
   */
  chronicle?: string;
  /** Override the generated id (rarely needed; upsert is by id). */
  id?: string;
  /** Override the timestamp (defaults to now). */
  timestamp?: Date | string;
}

function newEntryId(timestamp: Date): string {
  return `diary-${timestamp.getTime()}-${randomUUID().slice(0, 8)}`;
}

function resolveTimestamp(value: CreateDiaryEntryInput['timestamp']): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

/** Create and persist a diary entry, returning the stored record. */
export async function createDiaryEntry(
  store: StorageProvider,
  input: CreateDiaryEntryInput,
): Promise<DiaryEntry> {
  const timestamp = resolveTimestamp(input.timestamp);
  const record: DiaryEntry = {
    id: input.id ?? newEntryId(timestamp),
    timestamp: timestamp.toISOString(),
    participant: input.participant,
    phase: input.phase,
    entryType: input.entryType,
    content: input.content,
    metadata: input.metadata ?? {},
    ...(input.agent !== undefined ? { agent: input.agent } : {}),
    ...(input.chronicle !== undefined ? { chronicle: input.chronicle } : {}),
  };

  return store.registerDiaryEntry(record);
}

/** Create an intention entry — the opening of a ceremony. */
export async function createIntentionEntry(
  store: StorageProvider,
  input: {
    intention: string;
    participant: Participant;
    agent?: string;
    metadata?: DiaryEntryMetadata;
    chronicle?: string;
  },
): Promise<DiaryEntry> {
  return createDiaryEntry(store, {
    content: input.intention,
    participant: input.participant,
    phase: 'miigwechiwendam',
    entryType: 'intention',
    agent: input.agent,
    chronicle: input.chronicle,
    metadata: { ...input.metadata, ceremonyStage: 'opening' },
  });
}

/** Create a reflection entry — the closing of a ceremony. */
export async function createReflectionEntry(
  store: StorageProvider,
  input: {
    reflection: string;
    participant: Participant;
    agent?: string;
    metadata?: DiaryEntryMetadata;
    chronicle?: string;
  },
): Promise<DiaryEntry> {
  return createDiaryEntry(store, {
    content: input.reflection,
    participant: input.participant,
    phase: 'migwech',
    entryType: 'reflection',
    agent: input.agent,
    chronicle: input.chronicle,
    metadata: { ...input.metadata, ceremonyStage: 'closing' },
  });
}

/** Create a walking-mode entry — creative expression observed on the move. */
export async function createWalkingEntry(
  store: StorageProvider,
  input: {
    content: string;
    participant: Participant;
    location: DiaryEntryLocation;
    agent?: string;
    metadata?: DiaryEntryMetadata;
    chronicle?: string;
  },
): Promise<DiaryEntry> {
  return createDiaryEntry(store, {
    content: input.content,
    participant: input.participant,
    phase: 'nindoodam',
    entryType: 'observation',
    agent: input.agent ?? 'ava',
    chronicle: input.chronicle,
    metadata: {
      ...input.metadata,
      location: input.location,
      activity: 'walking',
      context: 'mobile',
    },
  });
}
