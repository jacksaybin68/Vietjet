-- 015_agency_discounts.sql
-- Travel agencies that resell tickets and the discount codes issued to them.
--
-- `discount_codes` already carries the customer-facing rules (percentage/fixed,
-- validity window, usage caps) and `/api/ma-giam-gia/xac-thuc` already applies a
-- code at checkout. What was missing is *provenance*: an admin needs to record
-- which agency a code was issued to, and an agency needs to see only its own.
--
-- `agency_id` is nullable on purpose — legacy and platform-wide codes stay
-- unattributed, and only agency-issued codes get scoped. `issued_by` keeps the
-- issuing admin for audit even if the agency row is later removed.

CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,
    -- Percentage of the fare the agency keeps. Advisory only; no payout logic reads it.
    commission_rate DECIMAL(5, 2) DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agencies_code ON agencies(code);
CREATE INDEX IF NOT EXISTS idx_agencies_active ON agencies(is_active);

ALTER TABLE discount_codes
    ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS issued_by TEXT;

CREATE INDEX IF NOT EXISTS idx_discount_codes_agency ON discount_codes(agency_id);

DROP TRIGGER IF EXISTS update_agencies_updated_at ON agencies;
CREATE TRIGGER update_agencies_updated_at
    BEFORE UPDATE ON agencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
