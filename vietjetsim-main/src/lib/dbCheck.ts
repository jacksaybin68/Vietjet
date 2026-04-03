// src/lib/dbCheck.ts
import { Client } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load .env.local file if it exists (redundant if using dotenv -e, but good practice)
dotenv.config({ path: '.env.local' });

async function checkDbConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in the environment variables.');
    process.exit(1);
  }

  const client = new Client(databaseUrl);

  try {
    await client.connect();
    console.log('Successfully connected to NeonDB!');

    // Optional: Run a simple query to further verify
    const res = await client.query('SELECT 1;');
    console.log('Query executed successfully:', res.rows);

    await client.end();
    console.log('Connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to connect to NeonDB:', error);
    process.exit(1);
  }
}

checkDbConnection();
