require('dotenv').config({path: '.env.local'});
const { Client } = require('@neondatabase/serverless');
const fs = require('fs');

async function run() {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  console.log('--- Applying Migration 007 ---');
  
  try {
    const sql = fs.readFileSync('migrations/007_phone_registration_support.sql', 'utf8');
    await client.query(sql);
    console.log('✓ Migration 007 successful.');
  } catch (err) {
    console.error('Error applying migration:', err.message);
  } finally {
    await client.end();
  }
}

run();
