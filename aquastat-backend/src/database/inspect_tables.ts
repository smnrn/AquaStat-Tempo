/**
 * @file src/database/inspect_tables.ts
 * @description Inspects the connected Supabase database and outputs all tables,
 * columns, data types, and row counts.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/inspect_tables.ts
 */

import { config as loadDotenv } from 'dotenv';
import path from 'node:path';

loadDotenv({ path: path.resolve(__dirname, '../../.env') });

import { pool, closePool } from './pool';

async function inspectDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('\n============================================================');
    console.log('🔍 CONNECTING TO SUPABASE & INSPECTING TABLES...');
    console.log('============================================================\n');

    // 1. Get all user tables in public schema
    const tablesRes = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    if (tablesRes.rows.length === 0) {
      console.log('⚠️  No tables found in the "public" schema.');
      return;
    }

    console.log(`✅ Found ${tablesRes.rows.length} tables in public schema:\n`);

    for (const { table_name } of tablesRes.rows) {
      // Get row count
      let count = 'unknown';
      try {
        const countRes = await client.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM "${table_name}";`
        );
        count = countRes.rows[0]?.count ?? '0';
      } catch (e) {
        count = 'error reading count';
      }

      console.log(`------------------------------------------------------------`);
      console.log(`📋 TABLE: "${table_name}"  (Total rows: ${count})`);
      console.log(`------------------------------------------------------------`);

      // Get columns
      const colRes = await client.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>(
        `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `,
        [table_name]
      );

      for (const col of colRes.rows) {
        console.log(
          `  - ${col.column_name.padEnd(25)} : ${col.data_type} ${
            col.is_nullable === 'NO' ? '(NOT NULL)' : ''
          }`
        );
      }
      console.log('');
    }

    console.log('============================================================');
    console.log('🎉 Inspection complete.');
    console.log('============================================================\n');
  } catch (err) {
    console.error('❌ Connection or query failed:', err);
  } finally {
    client.release();
    await closePool();
  }
}

inspectDatabase().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
