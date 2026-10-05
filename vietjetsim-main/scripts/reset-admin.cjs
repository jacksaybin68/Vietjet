#!/usr/bin/env node
/**
 * Reset the primary admin account's credentials.
 * Run: node scripts/reset-admin.cjs
 *
 * Updates the existing admin row in place rather than inserting a new one, so the
 * account keeps its id — bookings, chat conversations and audit records that
 * reference `user_id` stay attached to it. Only the email, the password hash and
 * the display name change.
 */

const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { resolveDatabaseUrl } = require('./db-target.cjs');

const OLD_EMAIL = 'admin@vietjetair.vn';
const NEW_EMAIL = process.env.ADMIN_EMAIL || 'Admin';
const NEW_PASSWORD = process.env.ADMIN_PASSWORD || 'Deohieusao123@';
const NEW_FULL_NAME = process.env.ADMIN_FULL_NAME || 'Administrator';

async function resetAdmin() {
  const DATABASE_URL = resolveDatabaseUrl();

  const sql = neon(DATABASE_URL);

  try {
    const [current] = await sql`
      SELECT id, email, role FROM user_profiles WHERE email = ${OLD_EMAIL}
    `;
    if (!current) {
      console.error(`❌ No account found for ${OLD_EMAIL}. Nothing changed.`);
      process.exit(1);
    }

    // The new email must not collide with another account, or the unique index
    // would fail halfway through and leave the row half-updated.
    const clash = await sql`
      SELECT id FROM user_profiles WHERE LOWER(email) = LOWER(${NEW_EMAIL}) AND id <> ${current.id}
    `;
    if (clash.length > 0) {
      console.error(`❌ ${NEW_EMAIL} is already taken by another account. Nothing changed.`);
      process.exit(1);
    }

    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12);

    console.log('💾 Updating admin account...');
    const [admin] = await sql`
      UPDATE user_profiles
      SET email = ${NEW_EMAIL},
          password_hash = ${passwordHash},
          full_name = ${NEW_FULL_NAME},
          updated_at = NOW()
      WHERE id = ${current.id}
      RETURNING id, email, full_name, role
    `;

    // Password reset should not leave an old session alive.
    await sql`
      DELETE FROM refresh_tokens WHERE user_id = ${admin.id}
    `;

    console.log('\n✅ Admin account updated');
    console.log('═'.repeat(46));
    console.log('📧 Email:    ' + admin.email);
    console.log('👤 Name:     ' + admin.full_name);
    console.log('🔐 Password: ' + NEW_PASSWORD);
    console.log('🎭 Role:     ' + admin.role);
    console.log('🆔 ID:       ' + admin.id + '  (unchanged)');
    console.log('═'.repeat(46));
    console.log('\n🔓 Existing sessions were revoked — log in again.');
  } catch (error) {
    console.error('❌ Error resetting admin account:', error);
    process.exit(1);
  }
}

resetAdmin().catch((error) => {
  // Must exit non-zero: db-target's refusal happens before `sql` exists, so it
  // never reaches the inner catch, and a script that "succeeds" while writing
  // nothing is worse than one that crashes.
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
