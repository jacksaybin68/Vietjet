#!/usr/bin/env node
/**
 * Seed Demo Accounts Script
 * Run: node scripts/seed-demo-accounts.cjs
 *
 * Resets the two demo accounts documented in README.md to the credentials the
 * README promises (user@vietjetsim.vn / user123, admin@vietjetsim.vn / admin123)
 * and marks them email-verified, matching migrations/014_seed_demo_data.sql.
 *
 * This exists because migration 014 uses `ON CONFLICT (email) DO NOTHING`: on a
 * database where those accounts already exist with a different hash, re-running
 * the migration is a no-op and the documented passwords still do not work.
 *
 * Writes to whatever DATABASE_URL points at, so confirm the target first.
 */

const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(envPath, 'utf-8')
  .split('\n')
  .forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0 && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });

const DATABASE_URL = process.env.DATABASE_URL;

// Must stay in sync with README.md → "Default Test Accounts".
const DEMO_ACCOUNTS = [
  { email: 'user@vietjetsim.vn', password: 'user123', fullName: 'Nguyễn Văn A', role: 'user' },
  { email: 'admin@vietjetsim.vn', password: 'admin123', fullName: 'Quản Trị Viên', role: 'admin' },
];

async function seedDemoAccounts() {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const host = DATABASE_URL.replace(/.*@([^/]+)\/.*/, '$1');
  console.log(`🎯 Target database: ${host}\n`);

  const sql = neon(DATABASE_URL);

  for (const account of DEMO_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);

    const rows = await sql`
      INSERT INTO user_profiles (email, password_hash, full_name, role, email_verified)
      VALUES (${account.email}, ${passwordHash}, ${account.fullName}, ${account.role}, true)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            email_verified = true,
            updated_at = NOW()
      RETURNING email, role
    `;

    console.log(`✅ ${rows[0].email} (role: ${rows[0].role}) → password "${account.password}"`);
  }

  console.log('\nDone. The README demo credentials now work against this database.');
}

seedDemoAccounts().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
