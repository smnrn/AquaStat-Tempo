/**
 * @file src/server.ts
 * @description HTTP server entry point for the AquaStat API.
 *
 * Responsibilities:
 *  1. Load environment variables.
 *  2. Verify database connectivity.
 *  3. Create the Express application.
 *  4. Bind to the configured port.
 *  5. Register SIGTERM / SIGINT handlers for graceful shutdown.
 */

import 'dotenv/config'; // Must be first — populates process.env before any import reads config
import http from 'node:http';
import { config } from './config/env';
import { logger } from './utils/logger';
import { checkConnection, closePool } from './database/pool';
import { createApp } from './app';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  logger.info('═══════════════════════════════════════════');
  logger.info('  AquaStat API — starting up…');
  logger.info(`  Environment : ${config.env}`);
  logger.info(`  Port        : ${config.port}`);
  logger.info('═══════════════════════════════════════════');

  // 1. Verify database is reachable before accepting traffic.
  //    A failed connection logs a warning but does NOT abort startup —
  //    the HTTP server still comes up so health-checks and non-DB routes work.
  //    Individual data routes will fail gracefully via the global error handler
  //    until a live PostgreSQL instance is available.
  try {
    await checkConnection();
  } catch {
    logger.warn(
      '[Server] ⚠️  Could not reach PostgreSQL — starting without DB. ' +
      'Data routes will return 500 until the database is available. ' +
      'Set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD in your .env file.'
    );
  }

  // 2. Build the Express app
  const app = createApp();

  // 3. Wrap in a raw http.Server so we can control graceful shutdown
  const server = http.createServer(app);

  // 4. Start listening
  server.listen(config.port, '0.0.0.0', () => {
    logger.info(
      `[Server] Listening on http://localhost:${config.port}` +
        `${config.apiBasePath}/${config.apiVersion}`
    );
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────

  /**
   * Graceful shutdown sequence:
   *  1. Stop accepting new connections.
   *  2. Wait for in-flight requests to complete (10-second timeout).
   *  3. Drain the DB connection pool.
   *  4. Exit with code 0.
   */
  function shutdown(signal: string): void {
    logger.info(`[Server] ${signal} received — initiating graceful shutdown…`);

    server.close((err) => {
      if (err) {
        logger.error('[Server] Error closing HTTP server.', { error: err.message });
        process.exit(1);
      }

      // Drain DB pool asynchronously inside a self-contained IIFE
      void (async () => {
        try {
          await closePool();
          logger.info('[Server] Shutdown complete. Goodbye. 👋');
          process.exit(0);
        } catch (dbErr) {
          logger.error('[Server] Error draining DB pool.', {
            error: dbErr instanceof Error ? dbErr.message : String(dbErr),
          });
          process.exit(1);
        }
      })();
    });

    // Force-exit if shutdown takes longer than 10 seconds
    setTimeout(() => {
      logger.error('[Server] Graceful shutdown timed out — forcing exit.');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Catch any unhandled sync exceptions that escape the express error handler
  process.on('uncaughtException', (err: Error) => {
    logger.error('[Server] Uncaught exception — shutting down.', {
      error: err.message,
      stack: err.stack,
    });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('[Server] Unhandled promise rejection — shutting down.', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    shutdown('unhandledRejection');
  });
}

bootstrap().catch((err: unknown) => {
  // Startup failed — log and exit immediately
  process.stderr.write(`[Server] Fatal startup error: ${String(err)}\n`);
  process.exit(1);
});
