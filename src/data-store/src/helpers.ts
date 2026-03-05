/**
 * Medicine Wheel Data Store — Generic Redis Helpers
 *
 * Low-level helpers for direct Redis hash/set/sorted-set access.
 */

import { getRedis } from './connection.js';

export async function getAllFromSet(setKey: string): Promise<string[]> {
  const redis = await getRedis();
  return redis.sMembers(setKey);
}

export async function getHash(key: string): Promise<Record<string, string> | null> {
  const redis = await getRedis();
  const data = await redis.hGetAll(key);
  if (!data || Object.keys(data).length === 0) return null;
  return data;
}

export async function getAllHashes(prefix: string, ids: string[]): Promise<Record<string, string>[]> {
  const redis = await getRedis();
  const results: Record<string, string>[] = [];
  for (const id of ids) {
    const data = await redis.hGetAll(`${prefix}${id}`);
    if (data && Object.keys(data).length > 0) results.push(data);
  }
  return results;
}

export async function getSortedSetRange(key: string, start = 0, stop = -1): Promise<string[]> {
  const redis = await getRedis();
  return redis.zRange(key, start, stop, { REV: true });
}

export async function setHash(key: string, data: Record<string, string>): Promise<void> {
  const redis = await getRedis();
  await redis.hSet(key, data);
}

export async function addToSet(setKey: string, ...members: string[]): Promise<void> {
  const redis = await getRedis();
  await redis.sAdd(setKey, members);
}

export async function addToSortedSet(key: string, score: number, value: string): Promise<void> {
  const redis = await getRedis();
  await redis.zAdd(key, { score, value });
}
