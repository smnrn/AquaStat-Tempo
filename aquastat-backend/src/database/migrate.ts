/**
 * @file src/database/migrate.ts
 * @description Minimal schema migration runner.
 *
 * Creates the three core DataMart tables (billing, consumption, production)
 * if they do not already exist.  Run with:
 *
 *   npm run db:migrate
 *
 * For larger projects, replace this with a dedicated migration tool such as
 * node-pg-migrate, Flyway, or Liquibase.
 */

import { config as loadDotenv } from 'dotenv';
import path from 'node:path';

// Load env BEFORE importing pool (pool reads config on module load)
loadDotenv({ path: path.resolve(__dirname, '../../.env') });

import { pool, closePool } from './pool';
import { logger } from '../utils/logger';

// ─── DDL Statements ───────────────────────────────────────────────────────────

const migrations: { name: string; sql: string }[] = [
  {
    name: 'create_billing_table',
    sql: `
      CREATE TABLE IF NOT EXISTS billing (
        billing_id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id           UUID          NOT NULL,
        customer_name         VARCHAR(255)  NOT NULL,
        billing_period_start  DATE          NOT NULL,
        billing_period_end    DATE          NOT NULL,
        volume_billed_m3      NUMERIC(12,4) NOT NULL CHECK (volume_billed_m3 >= 0),
        amount_due            NUMERIC(14,2) NOT NULL CHECK (amount_due >= 0),
        amount_paid           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
        currency              CHAR(3)       NOT NULL DEFAULT 'PHP',
        status                VARCHAR(20)   NOT NULL DEFAULT 'pending'
                                            CHECK (status IN ('pending','paid','overdue','disputed','cancelled')),
        due_date              DATE          NOT NULL,
        paid_date             DATE,
        created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_billing_customer_id  ON billing (customer_id);
      CREATE INDEX IF NOT EXISTS idx_billing_status       ON billing (status);
      CREATE INDEX IF NOT EXISTS idx_billing_period_start ON billing (billing_period_start);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_customer_period ON billing (customer_id, billing_period_start, billing_period_end);
    `,
  },
  {
    name: 'create_consumption_table',
    sql: `
      CREATE TABLE IF NOT EXISTS consumption (
        consumption_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        meter_id              VARCHAR(64)   NOT NULL,
        customer_id           UUID          NOT NULL,
        reading_timestamp     TIMESTAMPTZ   NOT NULL,
        meter_reading_m3      NUMERIC(14,4) NOT NULL CHECK (meter_reading_m3 >= 0),
        consumption_delta_m3  NUMERIC(12,4) NOT NULL DEFAULT 0,
        zone_id               VARCHAR(64)   NOT NULL,
        is_anomaly            BOOLEAN       NOT NULL DEFAULT FALSE,
        anomaly_score         NUMERIC(5,4),
        created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_consumption_meter_id   ON consumption (meter_id);
      CREATE INDEX IF NOT EXISTS idx_consumption_customer   ON consumption (customer_id);
      CREATE INDEX IF NOT EXISTS idx_consumption_zone       ON consumption (zone_id);
      CREATE INDEX IF NOT EXISTS idx_consumption_timestamp  ON consumption (reading_timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_consumption_anomaly    ON consumption (is_anomaly) WHERE is_anomaly = TRUE;
    `,
  },
  {
    name: 'create_production_table',
    sql: `
      CREATE TABLE IF NOT EXISTS production (
        production_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        facility_id             VARCHAR(64)   NOT NULL,
        facility_name           VARCHAR(255)  NOT NULL,
        recorded_at             TIMESTAMPTZ   NOT NULL,
        volume_produced_m3      NUMERIC(14,4) NOT NULL CHECK (volume_produced_m3 >= 0),
        nrw_volume_m3           NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (nrw_volume_m3 >= 0),
        nrw_percentage          NUMERIC(5,2)  NOT NULL DEFAULT 0
                                              CHECK (nrw_percentage BETWEEN 0 AND 100),
        efficiency              NUMERIC(5,4)  NOT NULL DEFAULT 0
                                              CHECK (efficiency BETWEEN 0 AND 1),
        energy_consumption_kwh  NUMERIC(12,4) NOT NULL DEFAULT 0,
        status                  VARCHAR(20)   NOT NULL DEFAULT 'operational'
                                              CHECK (status IN ('operational','maintenance','offline')),
        created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_production_facility   ON production (facility_id);
      CREATE INDEX IF NOT EXISTS idx_production_status     ON production (status);
      CREATE INDEX IF NOT EXISTS idx_production_recorded   ON production (recorded_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_production_facility_recorded ON production (facility_id, recorded_at);
    `,

  },
  {
    name: 'create_updated_at_trigger',
    sql: `
      -- Generic trigger function to auto-update the updated_at column
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Apply to billing
      DROP TRIGGER IF EXISTS trg_billing_updated_at ON billing;
      CREATE TRIGGER trg_billing_updated_at
        BEFORE UPDATE ON billing
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      -- Apply to production
      DROP TRIGGER IF EXISTS trg_production_updated_at ON production;
      CREATE TRIGGER trg_production_updated_at
        BEFORE UPDATE ON production
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `,
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('[Migrate] Starting schema migration...');
    await client.query('BEGIN');

    for (const migration of migrations) {
      logger.info(`[Migrate] Running: ${migration.name}`);
      await client.query(migration.sql);
      logger.info(`[Migrate] ✓ Done: ${migration.name}`);
    }

    await client.query('COMMIT');
    logger.info('[Migrate] All migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[Migrate] Migration failed — rolled back.', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

// Run when called directly (not when imported)
runMigrations().catch((err: unknown) => {
  logger.error('[Migrate] Fatal error.', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
