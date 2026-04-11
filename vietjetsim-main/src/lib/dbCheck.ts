import { sql } from './db';
import dotenv from 'dotenv';

// Load .env.local file if it exists (redundant if using dotenv -e, but good practice)
dotenv.config({ path: '.env.local' });

async function checkDbConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in the environment variables.');
    process.exit(1);
  }

  try {
    // Run a simple query to verify using the sql template tag from db.ts
    const res = await sql`SELECT 1 as connected;`;
    console.log('Successfully connected to DB using src/lib/db.ts!');
    console.log('Query executed successfully:', res);
    process.exit(0);
  } catch (error) {
    console.error('Failed to connect to DB via db.ts:', error);
    process.exit(1);
  }
}

checkDbConnection();
