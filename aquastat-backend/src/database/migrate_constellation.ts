/**
 * @file src/database/migrate_constellation.ts
 * @description Migration runner for the AquaStat Constellation (Galaxy) Schema.
 *
 * Sets up conformed dimensions (dim_time, dim_location), domain dimensions
 * (dim_weather, dim_pump_station, dim_customer, dim_ml_model), and fact tables
 * (fact_production, fact_billing, fact_ml_forecast) with OLAP indexing.
 *
 * Run with:
 *   npm run db:migrate:constellation
 */

import { config as loadDotenv } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env BEFORE importing pool
loadDotenv({ path: path.resolve(__dirname, '../../.env') });

import { pool, closePool } from './pool';
import { logger } from '../utils/logger';

async function runConstellationMigration(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('[Migrate:Constellation] Starting Constellation Schema migration...');
    
    const sqlPath = path.resolve(__dirname, 'schema_constellation.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query('COMMIT');

    logger.info('[Migrate:Constellation] ✓ Constellation Schema DDL applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[Migrate:Constellation] Migration failed — rolled back.', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

// Run if called directly via CLI
if (require.main === module) {
  runConstellationMigration().catch((err: unknown) => {
    logger.error('[Migrate:Constellation] Fatal error during migration.', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  });
}

export { runConstellationMigration };
