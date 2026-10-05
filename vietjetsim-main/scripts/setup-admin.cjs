#!/usr/bin/env node
/**
 * Setup Admin Account Script (CommonJS)
 * Run: node scripts/setup-admin.cjs
 *
 * This script creates an admin account with the following credentials:
 * - Email: admin@vietjetair.vn
 * - Password: Admin@123 (will be hashed with bcrypt)
 * - Role: admin
 */

const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { resolveDatabaseUrl } = require('./db-target.cjs');

// `db:reset-admin` (scripts/reset-admin.cjs) is the one to reach for when the
// account already exists — it updates in place and keeps the user_id. This
// script only creates one, so it deliberately uses a different address.
const ADMIN_EMAIL = 'admin@vietjetsim.vn';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_FULL_NAME = 'Administrator';
const ADMIN_ROLE = 'admin';

async function setupAdminAccount() {
  console.log('🚀 Starting admin account setup...\n');

  const DATABASE_URL = resolveDatabaseUrl();

  const sql = neon(DATABASE_URL);

  try {
    // Check if admin already exists
    console.log(`📋 Checking if admin account (${ADMIN_EMAIL}) exists...`);
    const existingAdmins =
      await sql`SELECT id, email, role FROM user_profiles WHERE email = ${ADMIN_EMAIL}`;

    if (existingAdmins.length > 0) {
      console.log(`⚠️  Admin account already exists!`);
      console.log(`   ID: ${existingAdmins[0].id}`);
      console.log(`   Email: ${existingAdmins[0].email}`);
      console.log(`   Role: ${existingAdmins[0].role}`);
      console.log('\n👋 No changes made.');
      return;
    }

    // Create new admin account
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    console.log('💾 Creating admin account in database...');
    const result = await sql`
      INSERT INTO user_profiles (email, password_hash, full_name, role)
      VALUES (${ADMIN_EMAIL}, ${passwordHash}, ${ADMIN_FULL_NAME}, ${ADMIN_ROLE})
      RETURNING id, email, full_name, role, created_at
    `;

    const admin = result[0];

    console.log('\n✅ Admin account created successfully!');
    console.log('═'.repeat(50));
    console.log('📧 Email:    ' + admin.email);
    console.log('👤 Name:     ' + admin.full_name);
    console.log('🔐 Password: ' + ADMIN_PASSWORD);
    console.log('🎭 Role:     ' + admin.role);
    console.log('🆔 ID:       ' + admin.id);
    console.log('📅 Created: ' + admin.created_at);
    console.log('═'.repeat(50));
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    console.log('🌐 Login URL: http://localhost:3000/dang-nhap\n');
  } catch (error) {
    console.error('❌ Error setting up admin account:', error);
    process.exit(1);
  }

  console.log('🔌 Database connection closed.');
}

// Run the setup
setupAdminAccount().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
