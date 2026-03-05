/**
 * Medicine Wheel Data Store — Redis Connection Management
 *
 * Shared connection logic supporting Upstash, Vercel KV, and local Redis.
 * Loads env from MEDECINEWHEEL_ENV_FILE if set.
 */

import { createClient, type RedisClientType } from 'redis';
import * as fs from 'fs';

export interface ConnectionOptions {
  /** Override Redis URL (takes priority over env detection) */
  url?: string;
  /** Override host for local Redis */
  host?: string;
  /** Override port for local Redis (default: 6381) */
  port?: number;
  /** Redis password */
  password?: string;
  /** Redis database index */
  database?: number;
  /** Max reconnect attempts (default: 3) */
  maxReconnectAttempts?: number;
  /** Connection timeout in ms (default: 5000) */
  connectTimeout?: number;
}

// Load environment from custom path
function loadEnvFile(): void {
  const envPath = process.env.MEDECINEWHEEL_ENV_FILE;
  if (!envPath) return;

  if (!fs.existsSync(envPath)) {
    console.error(`⚠️  MEDECINEWHEEL_ENV_FILE not found: ${envPath}`);
    return;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.error(`⚠️  Failed to load env file ${envPath}:`, err);
  }
}

loadEnvFile();

function detectRedisOptions(opts?: ConnectionOptions): { url: string } | { socket: { host: string; port: number }; password?: string; database?: number } {
  // Explicit URL takes priority
  if (opts?.url) {
    return { url: opts.url };
  }

  // Upstash Redis
  if (process.env.UPSTASH_REDIS_URL) {
    return { url: process.env.UPSTASH_REDIS_URL };
  }
  if (process.env.UPSTASH_REST_API_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const host = process.env.UPSTASH_REST_API_URL.replace(/^https?:\/\//, '');
    return { url: `rediss://default:${process.env.UPSTASH_REDIS_REST_TOKEN}@${host}:6380` };
  }

  // Vercel KV
  if (process.env.KV_URL) {
    return { url: process.env.KV_URL };
  }

  // Generic REDIS_URL
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }

  // Local Redis
  return {
    socket: {
      host: opts?.host || process.env.REDIS_HOST || 'localhost',
      port: opts?.port || parseInt(process.env.REDIS_PORT || '6381'),
    },
    password: opts?.password || process.env.REDIS_PASSWORD || undefined,
    database: opts?.database || parseInt(process.env.REDIS_DB || '0'),
  };
}

// Singleton state
let singletonClient: RedisClientType | null = null;
let singletonConnecting: Promise<RedisClientType> | null = null;

/**
 * Get a shared Redis client (singleton with connection pooling).
 * Detects Upstash, Vercel KV, REDIS_URL, or falls back to localhost:6381.
 */
export async function getRedis(opts?: ConnectionOptions): Promise<RedisClientType> {
  if (singletonClient && singletonClient.isOpen) return singletonClient;
  if (singletonConnecting) return singletonConnecting;

  singletonConnecting = (async () => {
    try {
      const redisOpts = detectRedisOptions(opts);
      const maxAttempts = opts?.maxReconnectAttempts ?? 3;
      const timeout = opts?.connectTimeout ?? 5000;

      const newClient = createClient({
        ...redisOpts,
        socket: {
          ...('socket' in redisOpts ? redisOpts.socket : {}),
          reconnectStrategy: (retries: number) => {
            if (retries > maxAttempts) return new Error('Max reconnect attempts reached');
            return retries * 100;
          },
        },
      }) as RedisClientType;

      newClient.on('error', (err) => {
        if (process.env.DEBUG_REDIS) {
          console.error('[medicine-wheel-data-store] Redis error:', err);
        }
      });

      const connectPromise = newClient.connect();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Connection timeout after ${timeout}ms`)), timeout)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      singletonClient = newClient;
      singletonConnecting = null;
      return newClient;
    } catch (error) {
      singletonConnecting = null;
      throw error;
    }
  })();

  return singletonConnecting;
}

/**
 * Create a fresh (non-singleton) Redis client for advanced use cases.
 */
export function createRedisClient(opts?: ConnectionOptions): ReturnType<typeof createClient> {
  const redisOpts = detectRedisOptions(opts);
  return createClient(redisOpts);
}

/**
 * Disconnect the singleton Redis client.
 */
export async function disconnectRedis(): Promise<void> {
  if (singletonClient && singletonClient.isOpen) {
    await singletonClient.disconnect();
    singletonClient = null;
  }
}
