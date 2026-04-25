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

let singletonPool: Pool | null = null;

function resolvePoolConfig(options?: PostgresConnectionOptions): PoolConfig {
  const connectionString =
    options?.connectionString ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.NEON_DATABASE_URL;

  const useSsl = options?.ssl ?? Boolean(process.env.PGSSLMODE === 'require' || connectionString);

  return {
    connectionString,
    max: options?.max ?? 10,
    idleTimeoutMillis: options?.idleTimeoutMillis ?? 30000,
    application_name: options?.applicationName ?? 'medicine-wheel-data-store-postgres',
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

export function createPostgresPool(options?: PostgresConnectionOptions): Pool {
  return new Pool(resolvePoolConfig(options));
}

export function getPostgresPool(options?: PostgresConnectionOptions): Pool {
  if (!singletonPool) {
    singletonPool = createPostgresPool(options);
  }
  return singletonPool;
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

export async function closePostgresPool(): Promise<void> {
  if (singletonPool) {
    await singletonPool.end();
    singletonPool = null;
  }
}

export function resetPostgresPoolForTests(): void {
  singletonPool = null;
}
