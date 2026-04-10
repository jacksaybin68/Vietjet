CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  account_holder VARCHAR(255) NOT NULL,
  bank_bin VARCHAR(20),
  branch VARCHAR(255),
  logo_url TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed an initial account if none exists
INSERT INTO bank_accounts (bank_name, account_number, account_holder, bank_bin, is_default)
SELECT 'Vietcombank', '1234 5678 9012', 'CONG TY VIETJET SIM', '970436', true
WHERE NOT EXISTS (SELECT 1 FROM bank_accounts);