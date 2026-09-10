const { Client } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set. Load it from .env.local, e.g.:');
  console.error('   node --env-file=.env.local run_migration_timeout.js');
  process.exit(1);
}

const client = new Client(databaseUrl);

// Set a timeout for the entire operation
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Migration timeout after 30 seconds')), 30000)
);

async function runMigration() {
  try {
    console.log('🚀 Running migration 012_add_booking_code...');
    
    // Check if column exists
    const checkQuery = `
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'booking_code'
      ) as exists;
    `;
    
    const result = await Promise.race([
      client.query(checkQuery),
      timeoutPromise
    ]);
    const columnExists = result.rows[0]?.exists_flag;
    
    if (columnExists) {
      console.log('✅ Column booking_code already exists');
      await client.end();
      return;
    }
    
    // Add column
    console.log('➕ Adding booking_code column...');
    await Promise.race([
      client.query(`ALTER TABLE bookings ADD COLUMN booking_code VARCHAR(20) UNIQUE;`),
      timeoutPromise
    ]);
    console.log('✅ Added booking_code column');
    
    // Create index
    console.log('📊 Creating index...');
    await Promise.race([
      client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);`),
      timeoutPromise
    ]);
    console.log('✅ Created index');
    
    // Update existing bookings
    console.log('🔄 Updating existing bookings...');
    await Promise.race([
      client.query(`
        UPDATE bookings 
        SET booking_code = 'VJ' || SUBSTRING(MD5(id::text) FROM 1 FOR 6)
        WHERE booking_code IS NULL;
      `),
      timeoutPromise
    ]);
    console.log('✅ Updated existing bookings');
    
    // Make column non-nullable
    console.log('🔒 Setting booking_code as NOT NULL...');
    await Promise.race([
      client.query(`ALTER TABLE bookings ALTER COLUMN booking_code SET NOT NULL;`),
      timeoutPromise
    ]);
    console.log('✅ Set booking_code as NOT NULL');
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (e) {
      console.log('Warning: Error closing client:', e.message);
    }
  }
}

// Run with a wrapper timeout
Promise.race([
  runMigration(),
  timeoutPromise
]).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
