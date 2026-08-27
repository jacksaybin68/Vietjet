#!/usr/bin/env node
/**
 * Setup Admin Account Script (CommonJS)
 * Run: node scripts/setup-admin.cjs
 * 
 * This script creates an admin account with the following credentials:
 * - Email: admin@vietjetsim.vn
 * - Password: Admin@123 (will be hashed with bcrypt)
 * - Role: admin
 */

const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0 && !key.startsWith('#')) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = 'admin@vietjetsim.vn';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_FULL_NAME = 'Administrator';
const ADMIN_ROLE = 'admin';

async function setupAdminAccount() {
  console.log('🚀 Starting admin account setup...\n');

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  try {
    // Check if admin already exists
    console.log(`📋 Checking if admin account (${ADMIN_EMAIL}) exists...`);
    const existingAdmins = await sql`SELECT id, email, role FROM user_profiles WHERE email = ${ADMIN_EMAIL}`;
    
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
    console.log('🔐 Password: Admin@123');
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
setupAdminAccount().catch(console.error);
