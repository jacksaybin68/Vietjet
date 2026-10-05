#!/usr/bin/env node
/**
 * Reset Admin Password Script
 * Run: node scripts/reset-admin-password.cjs
 */

const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { resolveDatabaseUrl } = require('./db-target.cjs');

const ADMIN_EMAIL = 'admin@vietjetair.vn';
const NEW_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345'; // Override via ADMIN_PASSWORD env

async function resetAdminPassword() {
  console.log('🔑 Resetting admin password...\n');

  const DATABASE_URL = resolveDatabaseUrl();

  const sql = neon(DATABASE_URL);

  try {
    // Check if admin exists
    console.log(`📋 Checking if admin account (${ADMIN_EMAIL}) exists...`);
    const existingAdmins =
      await sql`SELECT id, email, full_name, role FROM user_profiles WHERE email = ${ADMIN_EMAIL}`;

    if (existingAdmins.length === 0) {
      console.log('❌ Admin account not found. Creating new one...');

      // Create new admin
      const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12);
      const result = await sql`
        INSERT INTO user_profiles (email, password_hash, full_name, role)
        VALUES (${ADMIN_EMAIL}, ${passwordHash}, 'Administrator', 'admin')
        RETURNING id, email, full_name, role, created_at
      `;

      const admin = result[0];
      console.log('\n✅ New admin account created!');
      console.log('═'.repeat(50));
      console.log('📧 Email:    ' + admin.email);
      console.log('👤 Name:     ' + admin.full_name);
      console.log('🔐 Password: ' + NEW_PASSWORD);
      console.log('🎭 Role:     ' + admin.role);
      console.log('═'.repeat(50));
    } else {
      console.log(`   Found: ${existingAdmins[0].email} (${existingAdmins[0].role})`);

      // Reset password
      console.log('\n🔐 Hashing new password...');
      const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12);

      await sql`
        UPDATE user_profiles 
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE email = ${ADMIN_EMAIL}
      `;

      console.log('✅ Password updated successfully!');
      console.log('═'.repeat(50));
      console.log('📧 Email:    ' + ADMIN_EMAIL);
      console.log('🔐 Password: ' + NEW_PASSWORD);
      console.log('═'.repeat(50));
    }

    console.log('\n🌐 Login URL: http://localhost:3000/dang-nhap\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetAdminPassword().catch((error) => {
  // Exits non-zero: a refusal from db-target happens before `sql` exists, so it
  // never reaches the inner catch.
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
