#!/usr/bin/env node
/**
 * Seed Demo Accounts Script
 * Run: node scripts/seed-demo-accounts.cjs
 *
 * Resets the two demo accounts documented in README.md to the credentials the
 * README promises (user@vietjetair.vn / user123, admin@vietjetair.vn / admin123)
 * and marks them email-verified, matching migrations/014_seed_demo_data.sql.
 *
 * This exists because migration 014 uses `ON CONFLICT (email) DO NOTHING`: on a
 * database where those accounts already exist with a different hash, re-running
 * the migration is a no-op and the documented passwords still do not work.
 *
 * The target is `scripts/db-target.cjs`: an existing `DATABASE_URL` wins over
 * `.env.local`, and a remote host needs `--allow-remote --yes`.
 */

const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { resolveDatabaseUrl } = require('./db-target.cjs');

// Must stay in sync with README.md → "Default Test Accounts".
const DEMO_ACCOUNTS = [
  { email: 'user@vietjetair.vn', password: 'user123', fullName: 'Nguyễn Văn A', role: 'user' },
  { email: 'admin@vietjetair.vn', password: 'admin123', fullName: 'Quản Trị Viên', role: 'admin' },
];

async function seedDemoAccounts() {
  const DATABASE_URL = resolveDatabaseUrl();
  console.log(`🎯 Target database: ${new URL(DATABASE_URL).hostname}\n`);

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
  // A refusal from db-target is a decision, not a crash: its message says
  // exactly what to type next, and a stack trace only buries that.
  console.error(error.message.includes('--allow-remote') ? `\n❌ ${error.message}` : error);
  process.exit(1);
});
