/**
 * medicine-wheel-data-store-postgres
 *
 * Minimal PostgreSQL/Neon provider scaffold for Medicine Wheel storage.
 * This package only establishes pool management and a provider-ready surface.
 */

export {
  createPostgresPool,
  getPostgresPool,
  withPostgresClient,
  closePostgresPool,
  resetPostgresPoolForTests,
} from './connection.js';

export type {
  PostgresConnectionOptions,
  PostgresProviderRecord,
} from './connection.js';
