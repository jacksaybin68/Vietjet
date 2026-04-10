-- Migration 006: Add account_number to user_wallets

ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS account_number VARCHAR(20) UNIQUE;

-- Create an index to look up wallet by account number quickly
CREATE INDEX IF NOT EXISTS idx_wallets_account_number ON user_wallets(account_number);
