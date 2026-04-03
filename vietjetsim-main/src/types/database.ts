export type UserRole =
  | 'user'
  | 'admin'
  | 'super_admin'
  | 'admin_ops'
  | 'admin_finance'
  | 'admin_support'
  | 'admin_content';

/** API-facing user profile shape (camelCase) */
export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  phone?: string;
  avatarUrl?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  country?: string;
  preferredLanguage?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

// ─── Wallet Types ──────────────────────────────────────────────────────────

export interface UserWalletRecord {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface SavedPaymentMethodRecord {
  id: string;
  user_id: string;
  type: 'card' | 'bank';
  card_brand: string | null;
  last_four: string | null;
  card_holder_name: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  bank_id: string | null;
  bank_name: string | null;
  bank_code: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransactionRecord {
  id: string;
  wallet_id: string;
  type: 'topup' | 'withdraw' | 'payment' | 'refund' | 'bonus';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  payment_method_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

// ─── Loyalty Types ─────────────────────────────────────────────────────────

export interface LoyaltyProgramRecord {
  id: string;
  name: string;
  description: string | null;
  points_per_1000_vnd: number;
  min_points_to_redeem: number;
  points_expiry_months: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserLoyaltyRecord {
  id: string;
  user_id: string;
  program_id: string;
  total_points: number;
  available_points: number;
  lifetime_points: number;
  tier: string;
  tier_qualified_at: string | null;
  joined_at: string;
  updated_at: string;
}

export interface LoyaltyTransactionRecord {
  id: string;
  user_loyalty_id: string;
  booking_id: string | null;
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjust';
  description: string | null;
  expires_at: string | null;
  expired: boolean;
  created_at: string;
}

export interface LoyaltyTierRecord {
  id: string;
  program_id: string;
  name: string;
  min_lifetime_points: number;
  points_multiplier: number;
  benefits: string | null;
  tier_order: number;
  created_at: string;
}

// ─── Security Types ────────────────────────────────────────────────────────

export interface User2FARecord {
  id: string;
  user_id: string;
  secret: string;
  is_enabled: boolean;
  backup_codes: string[] | null;
  backup_codes_used: number;
  last_verified: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSessionRecord {
  id: string;
  user_id: string;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_active: string;
  is_current: boolean;
  is_trusted: boolean;
  created_at: string;
  expires_at: string;
}

export interface LoginHistoryRecord {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  location: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}
