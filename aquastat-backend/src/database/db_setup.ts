/* eslint-disable no-console */
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const defaultPassword = process.env['DB_PASSWORD'] || 'Aquastatcapstone';
const usersToTry = ['postgres', 'aquastat_user', 'joshua', 'JOSHUA', 'root', 'admin'];

async function tryConnectUsers(database: string, password: string): Promise<{ client: Client; user: string } | null> {
  for (const user of usersToTry) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user,
      password,
      database,
      connectionTimeoutMillis: 3000,
    });

    try {
      await client.connect();
      console.log(`[CONNECT SUCCESS] Connected to ${database} as user "${user}"`);
      return { client, user };
    } catch {
      // try next user
    }
  }
  return null;
}

async function ensureDatabaseExists(client: Client): Promise<void> {
  try {
    const dbCheck = await client.query("SELECT datname FROM pg_database WHERE datname = 'aquastat_db'");
    if (dbCheck.rows.length === 0) {
      console.log('[SETUP] Creating database "aquastat_db"...');
      await client.query('CREATE DATABASE aquastat_db;');
      console.log('[SETUP] "aquastat_db" created.');
    } else {
      console.log('[SETUP] Database "aquastat_db" already exists.');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('[SETUP NOTE]', msg);
  }
}

function updateEnvFile(activeUser: string, password: string): void {
  const envPath = path.resolve(__dirname, '../../.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${activeUser}`);
  envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${password}`);
  envContent = envContent.replace(/DB_NAME=.*/, `DB_NAME=aquastat_db`);
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`[SETUP] Updated .env with DB_USER=${activeUser} and provided password.`);
}

async function setup() {
  const password = defaultPassword;
  const connResult = (await tryConnectUsers('postgres', password)) ?? (await tryConnectUsers('aquastat_db', password));

  if (!connResult) {
    console.error('[ERROR] Could not connect to PostgreSQL with provided password under any standard user.');
    process.exit(1);
  }

  const { client, user: activeUser } = connResult;
  await ensureDatabaseExists(client);
  await client.end();
  updateEnvFile(activeUser, password);
}

setup().then(() => {
  console.log('[SETUP COMPLETE]');
  process.exit(0);
}).catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
