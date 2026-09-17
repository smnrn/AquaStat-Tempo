/* eslint-disable no-console */
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const password = 'Aquastatcapstone';
const usersToTry = ['postgres', 'aquastat_user', 'joshua', 'JOSHUA', 'root', 'admin'];

async function setup() {
  let connectedClient: Client | null = null;
  let activeUser = '';

  for (const user of usersToTry) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user,
      password,
      database: 'postgres',
      connectionTimeoutMillis: 3000,
    });

    try {
      await client.connect();
      console.log(`[CONNECT SUCCESS] Connected as user "${user}" with password "${password}"`);
      connectedClient = client;
      activeUser = user;
      break;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[CONNECT FAIL] user: "${user}": ${msg}`);
    }
  }


  if (!connectedClient) {
    // Try directly connecting to aquastat_db in case database postgres doesn't exist
    for (const user of usersToTry) {
      const client = new Client({
        host: 'localhost',
        port: 5432,
        user,
        password,
        database: 'aquastat_db',
        connectionTimeoutMillis: 3000,
      });

        try {
        await client.connect();
        console.log(`[CONNECT SUCCESS] Connected directly to aquastat_db as user "${user}"`);
        connectedClient = client;
        activeUser = user;
        break;
      } catch {
        // continue
      }
    }
  }

  if (!connectedClient) {
    console.error('[ERROR] Could not connect to PostgreSQL with provided password under any standard user.');
    process.exit(1);
  }

  // Ensure aquastat_db exists
  try {
    const dbCheck = await connectedClient.query("SELECT datname FROM pg_database WHERE datname = 'aquastat_db'");
    if (dbCheck.rows.length === 0) {
      console.log('[SETUP] Creating database "aquastat_db"...');
      await connectedClient.query('CREATE DATABASE aquastat_db;');
      console.log('[SETUP] "aquastat_db" created.');
    } else {
      console.log('[SETUP] Database "aquastat_db" already exists.');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('[SETUP NOTE]', msg);
  }

  await connectedClient.end();


  // Update .env file
  const envPath = path.resolve(__dirname, '../../.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${activeUser}`);
  envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${password}`);
  envContent = envContent.replace(/DB_NAME=.*/, `DB_NAME=aquastat_db`);
  
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`[SETUP] Updated .env with DB_USER=${activeUser} and provided password.`);
}

setup().then(() => {
  console.log('[SETUP COMPLETE]');
  process.exit(0);
}).catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
