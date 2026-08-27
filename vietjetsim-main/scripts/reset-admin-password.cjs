#!/usr/bin/env node
/**
 * Reset Admin Password Script
 * Run: node scripts/reset-admin-password.cjs
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
const NEW_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345'; // Override via ADMIN_PASSWORD env

async function resetAdminPassword() {
  console.log('🔑 Resetting admin password...\n');

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  try {
    // Check if admin exists
    console.log(`📋 Checking if admin account (${ADMIN_EMAIL}) exists...`);
    const existingAdmins = await sql`SELECT id, email, full_name, role FROM user_profiles WHERE email = ${ADMIN_EMAIL}`;
    
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

resetAdminPassword().catch(console.error);
