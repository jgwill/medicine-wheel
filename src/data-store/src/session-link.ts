/**
 * Medicine Wheel Data Store — Session-Ceremony Linking
 *
 * Bidirectional linking between agent sessions and ceremonies.
 */

import { getRedis } from './connection.js';

export interface CeremonySessionLink {
  ceremony_id: string;
  session_id: string;
  linked_at: string;
  notes?: string;
}

export async function linkSessionToCeremony(
  ceremonyId: string,
  sessionId: string,
  notes?: string
): Promise<void> {
  const redis = await getRedis();
  const now = new Date().toISOString();
  await redis.sAdd(`ceremony-sessions:${ceremonyId}`, sessionId);
  await redis.sAdd(`session-ceremony:${sessionId}`, ceremonyId);
  await redis.hSet(`ceremony-session-link:${ceremonyId}:${sessionId}`, {
    ceremony_id: ceremonyId,
    session_id: sessionId,
    linked_at: now,
    ...(notes && { notes }),
  });
}

export async function unlinkSessionFromCeremony(
  ceremonyId: string,
  sessionId: string
): Promise<void> {
  const redis = await getRedis();
  await redis.sRem(`ceremony-sessions:${ceremonyId}`, sessionId);
  await redis.sRem(`session-ceremony:${sessionId}`, ceremonyId);
  await redis.del(`ceremony-session-link:${ceremonyId}:${sessionId}`);
}

export async function getSessionsForCeremony(ceremonyId: string): Promise<string[]> {
  const redis = await getRedis();
  return redis.sMembers(`ceremony-sessions:${ceremonyId}`);
}

export async function getCeremoniesForSession(sessionId: string): Promise<string[]> {
  const redis = await getRedis();
  return redis.sMembers(`session-ceremony:${sessionId}`);
}

export async function getLinkMetadata(
  ceremonyId: string,
  sessionId: string
): Promise<CeremonySessionLink | null> {
  const redis = await getRedis();
  const data = await redis.hGetAll(`ceremony-session-link:${ceremonyId}:${sessionId}`);
  if (!data || Object.keys(data).length === 0) return null;
  return {
    ceremony_id: data.ceremony_id,
    session_id: data.session_id,
    linked_at: data.linked_at,
    notes: data.notes || undefined,
  };
}
