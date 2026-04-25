import { Pool, type PoolClient, type PoolConfig } from 'pg';
import type { CeremonyLog, RelationalEdge, RelationalNode } from 'medicine-wheel-ontology-core';

export type PostgresProviderRecord = RelationalNode | RelationalEdge | CeremonyLog;

export interface PostgresConnectionOptions {
  connectionString?: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  applicationName?: string;
}

const singletonPools = new Map<string, Pool>();

function resolvePoolConfig(options?: PostgresConnectionOptions): PoolConfig {
  const connectionString =
    options?.connectionString ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.NEON_DATABASE_URL;

  const useSsl = resolveSslEnabled(connectionString, options?.ssl);

  return {
    connectionString,
    max: options?.max ?? 10,
    idleTimeoutMillis: options?.idleTimeoutMillis ?? 30000,
    application_name: options?.applicationName ?? 'medicine-wheel-data-store-postgres',
    ssl: useSsl ? { rejectUnauthorized: true } : undefined,
  };
}

export function createPostgresPool(options?: PostgresConnectionOptions): Pool {
  return new Pool(resolvePoolConfig(options));
}

export function getPostgresPool(options?: PostgresConnectionOptions): Pool {
  const poolKey = getPoolKey(options);
  const existingPool = singletonPools.get(poolKey);

  if (existingPool) {
    return existingPool;
  }

  const pool = createPostgresPool(options);
  singletonPools.set(poolKey, pool);
  return pool;
}

export async function withPostgresClient<T>(
  fn: (client: PoolClient) => Promise<T>,
  options?: PostgresConnectionOptions,
): Promise<T> {
  const client = await getPostgresPool(options).connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function closePostgresPool(options?: PostgresConnectionOptions): Promise<void> {
  if (options !== undefined) {
    // Close only the pool that matches the given options, leaving others intact.
    const poolKey = getPoolKey(options);
    const pool = singletonPools.get(poolKey);
    if (pool) {
      await pool.end();
      singletonPools.delete(poolKey);
    }
    return;
  }

  await Promise.all(Array.from(singletonPools.values(), (pool) => pool.end()));
  singletonPools.clear();
}

export async function resetPostgresPoolForTests(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('resetPostgresPoolForTests must not be called in production');
  }
  // Close all pools so connections are not leaked between test suites.
  await Promise.all(Array.from(singletonPools.values(), (pool) => pool.end()));
  singletonPools.clear();
}

function resolveSslEnabled(
  connectionString: string | undefined,
  explicitSsl: boolean | undefined,
): boolean {
  if (explicitSsl !== undefined) {
    return explicitSsl;
  }

  const sslFromConnectionString = readSslFromConnectionString(connectionString);
  if (sslFromConnectionString !== undefined) {
    return sslFromConnectionString;
  }

  return isSslModeEnabled(process.env.PGSSLMODE);
}

function readSslFromConnectionString(connectionString: string | undefined): boolean | undefined {
  if (!connectionString) {
    return undefined;
  }

  try {
    const url = new URL(connectionString);
    const ssl = url.searchParams.get('ssl');
    if (ssl !== null) {
      return isAffirmativeValue(ssl);
    }

    const sslMode = url.searchParams.get('sslmode');
    if (sslMode !== null) {
      return isSslModeEnabled(sslMode);
    }
  } catch {
    // Leave SSL disabled unless it was explicitly requested.
  }

  return undefined;
}

function isAffirmativeValue(value: string): boolean {
  switch (value.toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true;
    default:
      return false;
  }
}

function isSslModeEnabled(value: string | undefined): boolean {
  switch (value?.toLowerCase()) {
    case 'require':
    case 'verify-ca':
    case 'verify-full':
      return true;
    default:
      return false;
  }
}

function getPoolKey(options?: PostgresConnectionOptions): string {
  const config = resolvePoolConfig(options);
  return JSON.stringify({
    connectionString: config.connectionString ?? null,
    max: config.max ?? null,
    idleTimeoutMillis: config.idleTimeoutMillis ?? null,
    application_name: config.application_name ?? null,
    ssl: config.ssl === true,
  });
}
