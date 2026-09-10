const { Client } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set. Load it from .env.local, e.g.:');
  console.error('   node --env-file=.env.local run_migration.js');
  process.exit(1);
}

const client = new Client(databaseUrl);

async function runMigration() {
  try {
    console.log('Running migration 012_add_booking_code...');
    
    // Check if column exists
    const checkQuery = `
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'booking_code'
      ) as exists_flag;
    `;

    const result = await client.query(checkQuery);
    const columnExists = result.rows[0]?.exists_flag;
    
    if (columnExists) {
      console.log('✅ Column booking_code already exists');
      return;
    }
    
    // Add column
    console.log('➕ Adding booking_code column...');
    await client.query(`
      ALTER TABLE bookings ADD COLUMN booking_code VARCHAR(20) UNIQUE;
    `);
    console.log('✅ Added booking_code column');
    
    // Create index
    console.log('📊 Creating index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);
    `);
    console.log('✅ Created index');
    
    // Update existing bookings
    console.log('🔄 Updating existing bookings...');
    await client.query(`
      UPDATE bookings 
      SET booking_code = 'VJ' || SUBSTRING(MD5(id::text) FROM 1 FOR 6)
      WHERE booking_code IS NULL;
    `);
    console.log('✅ Updated existing bookings');
    
    // Make column non-nullable
    console.log('🔒 Setting booking_code as NOT NULL...');
    await client.query(`
      ALTER TABLE bookings ALTER COLUMN booking_code SET NOT NULL;
    `);
    console.log('✅ Set booking_code as NOT NULL');
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
