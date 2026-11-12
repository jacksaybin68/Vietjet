#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { resolveDatabaseUrl } = require('./db-target.cjs');

async function main() {
  console.log('🚀 Running migration 043: seat_locks...\n');
  const databaseUrl = resolveDatabaseUrl(process.argv);
  const sql = neon(databaseUrl);

  const migrationPath = path.join(__dirname, '..', 'migrations', '043_seat_locks.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying SQL:');
  console.log(sqlContent);

  // Execute DDL
  await sql`
    CREATE TABLE IF NOT EXISTS seat_locks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
      seat_number TEXT NOT NULL,
      session_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(flight_id, seat_number)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_seat_locks_flight_expires ON seat_locks(flight_id, expires_at)
  `;

  console.log('✅ Migration executed successfully.');

  // Verify table
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'seat_locks'
    ORDER BY ordinal_position
  `;

  console.log('\n📋 Verified seat_locks columns:');
  columns.forEach((c) => console.log(`   - ${c.column_name}: ${c.data_type}`));
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
