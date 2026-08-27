-- ============================================================
-- Admin Account Setup SQL Script
-- ============================================================
-- Run this script directly in your Neon PostgreSQL database
-- to create an admin account.
--
-- IMPORTANT: Change the password hash before running in production!
-- This hash is for 'Admin@123' using bcrypt with 12 rounds.
-- ============================================================

-- Check if admin already exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE email = 'admin@vietjetsim.vn')
    THEN 'Admin account already exists'
    ELSE 'No admin account found - will create one'
  END AS status;

-- Option 1: Insert new admin (if not exists)
INSERT INTO user_profiles (email, password_hash, full_name, role)
SELECT 
  'admin@vietjetsim.vn',
  -- bcrypt hash for 'Admin@123' (12 rounds)
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4jHnWJQ5MKCGfKPa',
  'Administrator',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE email = 'admin@vietjetsim.vn'
)
RETURNING id, email, full_name, role, created_at;

-- Option 2: Update existing user to admin role
-- Uncomment the line below if you want to promote an existing user to admin
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- Option 3: Reset admin password (if forgotten)
-- Uncomment and run this to reset the password to 'Admin@123'
-- UPDATE user_profiles 
-- SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4jHnWJQ5MKCGfKPa',
--     updated_at = NOW()
-- WHERE email = 'admin@vietjetsim.vn';

-- Verify admin account
SELECT 
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
FROM user_profiles 
WHERE email = 'admin@vietjetsim.vn';
