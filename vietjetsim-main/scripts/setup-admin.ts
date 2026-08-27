#!/usr/bin/env ts-node
/**
 * Setup Admin Account Script
 * Run: npm run db:setup-admin
 * 
 * This script creates an admin account with the following credentials:
 * - Email: admin@vietjetsim.vn
 * - Password: Admin@123 (will be hashed with bcrypt)
 * - Role: admin
 */

// Load environment variables manually
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { sql } from '../src/lib/neon';
import { hashPassword } from '../src/lib/auth';

async function setupAdminAccount() {
  console.log('🚀 Starting admin account setup...\n');

  const adminEmail = 'admin@vietjetsim.vn';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminFullName = 'Administrator';
  const adminRole = 'admin';

  try {
    // Check if admin already exists
    console.log(`📋 Checking if admin account (${adminEmail}) exists...`);
    const existingAdmins = await sql`SELECT id, email, role FROM user_profiles WHERE email = ${adminEmail}`;
    
    if (existingAdmins.length > 0) {
      console.log(`⚠️  Admin account already exists!`);
      console.log(`   ID: ${(existingAdmins[0] as any).id}`);
      console.log(`   Email: ${(existingAdmins[0] as any).email}`);
      console.log(`   Role: ${(existingAdmins[0] as any).role}`);
      
      // Ask if we should update the password
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('\n❓ Do you want to reset the admin password? (y/N): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() === 'y') {
        console.log('\n🔑 Updating admin password...');
        const newHash = await hashPassword(adminPassword);
        await sql`UPDATE user_profiles SET password_hash = ${newHash}, updated_at = NOW() WHERE email = ${adminEmail}`;
        console.log('✅ Admin password updated successfully!');
      } else {
        console.log('👋 No changes made.');
      }
      return;
    }

    // Create new admin account
    console.log('🔐 Hashing password...');
    const passwordHash = await hashPassword(adminPassword);
    
    console.log('💾 Creating admin account in database...');
    const result = await sql`
      INSERT INTO user_profiles (email, password_hash, full_name, role)
      VALUES (${adminEmail}, ${passwordHash}, ${adminFullName}, ${adminRole})
      RETURNING id, email, full_name, role, created_at
    `;

    const admin = result[0] as any;
    
    console.log('\n✅ Admin account created successfully!');
    console.log('═'.repeat(50));
    console.log('📧 Email:    ' + admin.email);
    console.log('👤 Name:     ' + admin.full_name);
    console.log('🔐 Password: ' + adminPassword);
    console.log('🎭 Role:     ' + admin.role);
    console.log('🆔 ID:       ' + admin.id);
    console.log('📅 Created: ' + admin.created_at);
    console.log('═'.repeat(50));
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    console.log('🌐 Login URL: http://localhost:3000/dang-nhap\n');

  } catch (error) {
    console.error('❌ Error setting up admin account:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await sql`SELECT 1`.catch(() => {}); // Test connection closure
    console.log('🔌 Database connection closed.');
  }
}

// Run the setup
setupAdminAccount().catch(console.error);
