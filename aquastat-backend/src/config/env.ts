/**
 * @file src/config/env.ts
 * @description Centralised, strictly-typed environment configuration.
 *
 * Reads from `process.env` (populated by dotenv in server.ts) and exposes a
 * single frozen config object used throughout the application.  Any missing
 * required variable causes an immediate startup failure with a clear message.
 */

import { config as loadDotenv } from 'dotenv';
import path from 'node:path';

// Load .env from project root before anything else references process.env
loadDotenv({ path: path.resolve(__dirname, '../../.env') });

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Reads an environment variable and throws if it is absent / empty.
 * @param key   The `process.env` key to read.
 * @param fallback  Optional default value (makes the variable optional).
 */
function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `[Config] Missing required environment variable: "${key}". ` +
        `Copy .env.example → .env and supply a value.`
    );
  }
  return value;
}

function optionalInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new Error(`[Config] "${key}" must be an integer.`);
  return parsed;
}

function optionalBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw.toLowerCase() === 'true';
}

// ─── Exported Config Object ───────────────────────────────────────────────────

export const config = Object.freeze({
  /** Runtime environment */
  env: (process.env['NODE_ENV'] ?? 'development') as
    | 'development'
    | 'production'
    | 'test',

  /** HTTP server */
  port: optionalInt('PORT', 8000),
  apiBasePath: process.env['API_BASE_PATH'] ?? '/api',
  apiVersion: process.env['API_VERSION'] ?? 'v1',

  /** CORS — comma-separated origins */
  allowedOrigins: (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),

  /** Rate limiting */
  rateLimit: {
    windowMs: optionalInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 min
    max: optionalInt('RATE_LIMIT_MAX', 100),
  },

  /** PostgreSQL connection pool */
  db: {
    host: required('DB_HOST', 'localhost'),
    port: optionalInt('DB_PORT', 5432),
    name: required('DB_NAME', 'aquastat_db'),
    user: required('DB_USER', 'aquastat_user'),
    password: required('DB_PASSWORD', 'password'),
    poolMin: optionalInt('DB_POOL_MIN', 2),
    poolMax: optionalInt('DB_POOL_MAX', 20),
    idleTimeoutMs: optionalInt('DB_IDLE_TIMEOUT_MS', 30_000),
    connectionTimeoutMs: optionalInt('DB_CONNECTION_TIMEOUT_MS', 5_000),
    ssl: optionalBool('DB_SSL', false),
  },

  /** Logging */
  logging: {
    level: process.env['LOG_LEVEL'] ?? 'debug',
    dir: process.env['LOG_DIR'] ?? './logs',
  },

  /** Shorthand for production check */
  isProduction: process.env['NODE_ENV'] === 'production',
});

export type AppConfig = typeof config;
