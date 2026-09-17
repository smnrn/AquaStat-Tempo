/**
 * @file src/database/pool.ts
 * @description PostgreSQL connection pool using the `pg` library.
 *
 * Exports:
 *  - `pool`      — a singleton `pg.Pool` instance used by all services.
 *  - `query()`   — a typed wrapper around `pool.query()` for convenience.
 *  - `getClient()` — retrieves a dedicated client (for multi-statement transactions).
 *  - `checkConnection()` — tests connectivity; used at startup.
 *
 * Pattern: services import `query` or `getClient`; they never create their own
 * pool, keeping connection management in one place.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// ─── Pool singleton ───────────────────────────────────────────────────────────

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  min: config.db.poolMin,
  max: config.db.poolMax,
  idleTimeoutMillis: config.db.idleTimeoutMs,
  connectionTimeoutMillis: config.db.connectionTimeoutMs,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
});

// ─── Pool lifecycle events ────────────────────────────────────────────────────

pool.on('connect', (client) => {
  // Defer the SET TIME ZONE call until after the connection handshake is complete.
  // Calling client.query() synchronously in the 'connect' event triggers a
  // pg deprecation warning ("client is already executing a query") because the
  // internal authentication query is still in flight at this point.
  setImmediate(() => {
    void client.query("SET TIME ZONE 'UTC'");
  });
  logger.debug('[DB] New client connected to PostgreSQL pool.');
});

pool.on('error', (err) => {
  logger.error('[DB] Unexpected idle client error.', { error: err.message });
});

pool.on('remove', () => {
  logger.debug('[DB] Client removed from pool.');
});

// ─── Typed query helper ───────────────────────────────────────────────────────

/**
 * Execute a parameterised SQL query against the pool.
 *
 * @example
 * const result = await query<BillingRow>(
 *   'SELECT * FROM billing WHERE customer_id = $1',
 *   [customerId]
 * );
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(sql, params);
    const duration = Date.now() - start;

    logger.debug('[DB] Query executed.', {
      sql: sql.substring(0, 120), // avoid logging sensitive data in full
      rows: result.rowCount,
      durationMs: duration,
    });

    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error('[DB] Query failed.', {
      sql: sql.substring(0, 120),
      durationMs: duration,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Transaction helper ───────────────────────────────────────────────────────

/**
 * Acquire a dedicated `PoolClient` for use in a multi-statement transaction.
 * Caller is responsible for calling `client.release()` after use.
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   // ... your transactional queries
 *   await client.query('COMMIT');
 * } catch (err) {
 *   await client.query('ROLLBACK');
 *   throw err;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// ─── Startup connectivity check ───────────────────────────────────────────────

/**
 * Verifies that the database is reachable.
 * Called once from `server.ts` before the HTTP server starts listening.
 * Throws on failure so the process exits with a non-zero code.
 */
export async function checkConnection(): Promise<void> {
  try {
    const result = await query<{ now: string }>('SELECT NOW() AS now');
    const serverTime = result.rows[0]?.now ?? 'unknown';
    logger.info('[DB] Connected to PostgreSQL.', {
      host: config.db.host,
      database: config.db.name,
      serverTime,
    });
  } catch (err) {
    logger.error('[DB] Failed to connect to PostgreSQL.', {
      host: config.db.host,
      database: config.db.name,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Gracefully drain the connection pool.
 * Called on SIGTERM / SIGINT to allow in-flight queries to complete.
 */
export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('[DB] Connection pool closed.');
}
