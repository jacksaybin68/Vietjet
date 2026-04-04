-- Loyalty Program System
-- Run this in your Neon PostgreSQL dashboard (SQL Editor or psql)
-- Required by: Loyalty tab in User Dashboard

-- Loyalty Programs
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  points_per_1000_vnd DECIMAL(5,2) DEFAULT 1.00,
  min_points_to_redeem INTEGER DEFAULT 1000,
  points_expiry_months INTEGER DEFAULT 24,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Loyalty Enrollment
CREATE TABLE IF NOT EXISTS user_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  program_id UUID NOT NULL REFERENCES loyalty_programs(id),
  total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
  available_points INTEGER DEFAULT 0 CHECK (available_points >= 0),
  lifetime_points INTEGER DEFAULT 0 CHECK (lifetime_points >= 0),
  tier VARCHAR(50) DEFAULT 'Bronze',
  tier_qualified_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Transaction History
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_loyalty_id UUID NOT NULL REFERENCES user_loyalty(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  points INTEGER NOT NULL CHECK (points != 0),
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'bonus', 'adjust')),
  description VARCHAR(255),
  expires_at TIMESTAMPTZ,
  expired BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Tiers Configuration
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES loyalty_programs(id),
  name VARCHAR(50) NOT NULL,
  min_lifetime_points INTEGER DEFAULT 0,
  points_multiplier DECIMAL(3,2) DEFAULT 1.00,
  benefits TEXT,
  tier_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_active ON loyalty_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_user_loyalty_user_id ON user_loyalty(user_id);
CREATE INDEX IF NOT EXISTS idx_user_loyalty_program ON user_loyalty(program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_loyalty ON loyalty_transactions(user_loyalty_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_program ON loyalty_tiers(program_id);

-- Insert default loyalty program
INSERT INTO loyalty_programs (name, description, points_per_1000_vnd, min_points_to_redeem, is_active)
VALUES ('VietjetSim Rewards', 'Chương trình tích điểm thưởng cho khách hàng VietjetSim', 1.00, 500, true)
ON CONFLICT DO NOTHING;

-- Insert default tiers
INSERT INTO loyalty_tiers (program_id, name, min_lifetime_points, points_multiplier, benefits, tier_order)
SELECT id, 'Bronze', 0, 1.00, 'Tích 1 điểm cho mỗi 1,000 VND', 1
FROM loyalty_programs WHERE name = 'VietjetSim Rewards'
ON CONFLICT DO NOTHING;

INSERT INTO loyalty_tiers (program_id, name, min_lifetime_points, points_multiplier, benefits, tier_order)
SELECT id, 'Silver', 500000, 1.25, 'Tích 1.25 điểm cho mỗi 1,000 VND. Ưu tiên check-in.', 2
FROM loyalty_programs WHERE name = 'VietjetSim Rewards'
ON CONFLICT DO NOTHING;

INSERT INTO loyalty_tiers (program_id, name, min_lifetime_points, points_multiplier, benefits, tier_order)
SELECT id, 'Gold', 2000000, 1.5, 'Tích 1.5 điểm cho mỗi 1,000 VND. Phòng chờ VIP miễn phí.', 3
FROM loyalty_programs WHERE name = 'VietjetSim Rewards'
ON CONFLICT DO NOTHING;

INSERT INTO loyalty_tiers (program_id, name, min_lifetime_points, points_multiplier, benefits, tier_order)
SELECT id, 'Platinum', 5000000, 2.00, 'Tích 2 điểm cho mỗi 1,000 VND. Tất cả ưu tiên VIP.', 4
FROM loyalty_programs WHERE name = 'VietjetSim Rewards'
ON CONFLICT DO NOTHING;