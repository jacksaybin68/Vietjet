const { neon } = require('@neondatabase/serverless');

const DATABASE_URL =
  'postgresql://neondb_owner:npg_aZWhQfSsm38R@ep-winter-heart-ajygrzyx-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function setupSchema() {
  console.log('🚀 Setting up VietjetSim database schema on Neon PostgreSQL...\n');

  try {
    // Enable UUID extension
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    console.log('✅ UUID extension enabled');

    // ─── User Profiles ───────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL DEFAULT '',
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        phone VARCHAR(20),
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: user_profiles');

    // ─── Airports ────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS airports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        country VARCHAR(100) DEFAULT 'Vietnam',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: airports');

    // ─── Flights ─────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS flights (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        flight_no VARCHAR(20) NOT NULL,
        from_code VARCHAR(10) NOT NULL REFERENCES airports(code),
        to_code VARCHAR(10) NOT NULL REFERENCES airports(code),
        depart_time TIMESTAMPTZ NOT NULL,
        arrive_time TIMESTAMPTZ NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        class VARCHAR(20) NOT NULL DEFAULT 'economy' CHECK (class IN ('economy', 'business')),
        available INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: flights');

    // ─── Seats ───────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS seats (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
        seat_number VARCHAR(10) NOT NULL,
        class VARCHAR(20) NOT NULL DEFAULT 'economy' CHECK (class IN ('economy', 'business')),
        is_occupied BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: seats');

    // ─── Bookings ────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
        total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        discount_code_id UUID REFERENCES discount_codes(id),
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: bookings');

    // ─── Passengers ──────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS passengers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        dob DATE,
        id_number VARCHAR(50),
        gender VARCHAR(10) DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: passengers');

    // ─── Payments ────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        method VARCHAR(50) NOT NULL DEFAULT 'card',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: payments');

    // ─── Notifications ───────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: notifications');

    // ─── Refund Requests ─────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS refund_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
        bank_info JSONB,
        admin_note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: refund_requests');

    // ─── Chat Conversations ──────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
        last_message TEXT,
        unread_by_user INTEGER DEFAULT 0,
        unread_by_admin INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: chat_conversations');

    // ─── Chat Messages ───────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('user', 'admin')),
        content TEXT NOT NULL,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: chat_messages');

    // ─── Chat Presence ───────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS chat_presence (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'admin')),
        is_online BOOLEAN DEFAULT false,
        is_typing BOOLEAN DEFAULT false,
        last_seen TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, conversation_id)
      )
    `;
    console.log('✅ Table: chat_presence');

    // ─── Refresh Tokens (H3 Token Rotation) ─────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        family_id UUID NOT NULL,
        revoked BOOLEAN DEFAULT false,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    // ─── Discount Codes ──────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS discount_codes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
        value DECIMAL(15, 2) NOT NULL,
        min_booking_amount DECIMAL(15, 2) DEFAULT 0,
        max_discount_amount DECIMAL(15, 2),
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        usage_limit INTEGER,
        usage_per_user_limit INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table: discount_codes');

    // ─── Indexes for Performance ─────────────────────────────────────────────
    await sql`CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_discount_codes_dates ON discount_codes(start_date, end_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_flights_from_to ON flights(from_code, to_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_flights_depart_time ON flights(depart_time)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON refund_requests(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_presence_user_conv ON chat_presence(user_id, conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens(family_id)`;
    console.log('✅ Indexes created');

    // ─── Seed Data: Airports ─────────────────────────────────────────────────
    const airports = [
      { code: 'SGN', name: 'Tân Sơn Nhất', city: 'TP. Hồ Chí Minh' },
      { code: 'HAN', name: 'Nội Bài', city: 'Hà Nội' },
      { code: 'DAD', name: 'Đà Nẵng', city: 'Đà Nẵng' },
      { code: 'CXR', name: 'Cam Ranh', city: 'Nha Trang' },
      { code: 'PQC', name: 'Phú Quốc', city: 'Phú Quốc' },
      { code: 'HPH', name: 'Cát Bi', city: 'Hải Phòng' },
      { code: 'VDH', name: 'Đồng Hới', city: 'Đồng Hới' },
      { code: 'HUI', name: 'Phú Bài', city: 'Huế' },
      { code: 'DLI', name: 'Liên Khương', city: 'Đà Lạt' },
      { code: 'VCA', name: 'Cần Thơ', city: 'Cần Thơ' },
    ];

    for (const airport of airports) {
      await sql`
        INSERT INTO airports (code, name, city, country)
        VALUES (${airport.code}, ${airport.name}, ${airport.city}, 'Vietnam')
        ON CONFLICT (code) DO NOTHING
      `;
    }
    console.log('✅ Seed data: 10 airports inserted');

    // ─── Seed Data: Test Users ───────────────────────────────────────────────
    const bcrypt = require('bcryptjs');
    const userPassword = await bcrypt.hash('user123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    await sql`
      INSERT INTO user_profiles (id, email, password_hash, full_name, role)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'user@vietjetsim.vn',
        ${userPassword},
        'Nguyễn Văn An',
        'user'
      )
      ON CONFLICT (email) DO NOTHING
    `;

    await sql`
      INSERT INTO user_profiles (id, email, password_hash, full_name, role)
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'admin@vietjetsim.vn',
        ${adminPassword},
        'Admin VietjetSim',
        'admin'
      )
      ON CONFLICT (email) DO NOTHING
    `;
    console.log('✅ Seed data: 2 test users inserted');

    // ─── Seed Data: Sample Flights ───────────────────────────────────────────
    const now = new Date();
    const sampleFlights = [
      { flight_no: 'VJ100', from: 'SGN', to: 'HAN', hours: 2, price: 1500000, class: 'economy', available: 120 },
      { flight_no: 'VJ101', from: 'HAN', to: 'SGN', hours: 2, price: 1500000, class: 'economy', available: 115 },
      { flight_no: 'VJ200', from: 'SGN', to: 'DAD', hours: 1.5, price: 1200000, class: 'economy', available: 85 },
      { flight_no: 'VJ201', from: 'DAD', to: 'SGN', hours: 1.5, price: 1200000, class: 'economy', available: 90 },
      { flight_no: 'VJ300', from: 'SGN', to: 'CXR', hours: 1, price: 1000000, class: 'economy', available: 60 },
      { flight_no: 'VJ301', from: 'CXR', to: 'SGN', hours: 1, price: 1000000, class: 'economy', available: 55 },
      { flight_no: 'VJ400', from: 'SGN', to: 'PQC', hours: 1, price: 900000, class: 'economy', available: 70 },
      { flight_no: 'VJ401', from: 'PQC', to: 'SGN', hours: 1, price: 900000, class: 'economy', available: 65 },
      { flight_no: 'VJ500', from: 'HAN', to: 'DAD', hours: 1.5, price: 1100000, class: 'economy', available: 75 },
      { flight_no: 'VJ501', from: 'DAD', to: 'HAN', hours: 1.5, price: 1100000, class: 'economy', available: 80 },
      { flight_no: 'VJ600', from: 'SGN', to: 'DLI', hours: 1, price: 1100000, class: 'economy', available: 35 },
      { flight_no: 'VJ601', from: 'DLI', to: 'SGN', hours: 1, price: 1100000, class: 'economy', available: 40 },
      { flight_no: 'VJ700', from: 'SGN', to: 'VCA', hours: 0.75, price: 800000, class: 'economy', available: 50 },
      { flight_no: 'VJ701', from: 'VCA', to: 'SGN', hours: 0.75, price: 800000, class: 'economy', available: 45 },
      { flight_no: 'VJ800', from: 'SGN', to: 'HAN', hours: 2, price: 3500000, class: 'business', available: 20 },
      { flight_no: 'VJ801', from: 'HAN', to: 'SGN', hours: 2, price: 3500000, class: 'business', available: 18 },
    ];

    for (const flight of sampleFlights) {
      const departTime = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      const arriveTime = new Date(departTime.getTime() + flight.hours * 60 * 60 * 1000);

      await sql`
        INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available)
        VALUES (
          ${flight.flight_no},
          ${flight.from},
          ${flight.to},
          ${departTime.toISOString()},
          ${arriveTime.toISOString()},
          ${flight.price},
          ${flight.class},
          ${flight.available}
        )
        ON CONFLICT DO NOTHING
      `;
    }
    console.log(`✅ Seed data: ${sampleFlights.length} sample flights inserted`);

    console.log('\n🎉 Database schema setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 14 tables created');
    console.log('   - 17 indexes created');
    console.log('   - 10 airports seeded');
    console.log('   - 2 test users seeded');
    console.log('   - 16 sample flights seeded');
    console.log('\n🔑 Test Accounts:');
    console.log('   User:  user@vietjetsim.vn / user123');
    console.log('   Admin: admin@vietjetsim.vn / admin123');
    console.log('\n📌 Note: Run migrations/001_refresh_tokens.sql manually in Neon SQL Editor');
    console.log('   OR re-run setup-schema.js (all tables use CREATE TABLE IF NOT EXISTS)');
  } catch (error) {
    console.error('\n❌ Schema setup failed:', error.message);
    process.exit(1);
  }
}

setupSchema();
