import { sql } from '@/lib/neon';

// ─── Wallet Queries ──────────────────────────────────────────────────────────

export interface WalletRecord {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  account_number: string;
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
}

export async function getOrCreateWallet(userId: string): Promise<WalletRecord> {
  const existing = await sql`
    SELECT * FROM user_wallets WHERE user_id = ${userId}
  `;

  if ((existing as WalletRecord[]).length > 0) {
    return (existing as WalletRecord[])[0];
  }

  const accNum =
    'VJSIM' +
    Math.floor(Math.random() * 10000000000)
      .toString()
      .padStart(10, '0');
  const result = await sql`
    INSERT INTO user_wallets (user_id, balance, currency, account_number)
    VALUES (${userId}, 0, 'VND', ${accNum})
    RETURNING *
  `;
  return (result as WalletRecord[])[0];
}

export async function getWalletTransactions(
  userId: string,
  params?: { page?: number; limit?: number; type?: string }
): Promise<{ transactions: WalletTransactionRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  const wallet = await getOrCreateWallet(userId);

  let transactions: WalletTransactionRecord[];
  if (params?.type) {
    transactions = (await sql`
      SELECT * FROM wallet_transactions
      WHERE wallet_id = ${wallet.id} AND type = ${params.type}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as WalletTransactionRecord[];
  } else {
    transactions = (await sql`
      SELECT * FROM wallet_transactions
      WHERE wallet_id = ${wallet.id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as WalletTransactionRecord[];
  }

  const countResult = await sql`
    SELECT COUNT(*) as total FROM wallet_transactions WHERE wallet_id = ${wallet.id}
  `;

  return {
    transactions,
    total: parseInt((countResult as any)[0].total, 10),
  };
}

export async function topupWallet(
  userId: string,
  amount: number,
  paymentMethodId?: string | null,
  description?: string
): Promise<WalletTransactionRecord> {
  // Defense-in-depth: API layer validates too, but never trust callers.
  // A negative amount here would DRAIN the wallet (acts as an unguarded withdraw).
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Số tiền nạp không hợp lệ');
  }
  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = parseFloat(String(wallet.balance));
  const balanceAfter = balanceBefore + amount;

  const result = await sql`
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, balance_before, balance_after,
      description, payment_method_id, status
    )
    VALUES (
      ${wallet.id}, 'topup', ${amount}, ${balanceBefore}, ${balanceAfter},
      ${description || 'Nạp tiền vào ví'}, ${paymentMethodId || null}, 'completed'
    )
    RETURNING *
  `;

  await sql`
    UPDATE user_wallets SET balance = ${balanceAfter}, updated_at = NOW()
    WHERE id = ${wallet.id}
  `;

  return (result as WalletTransactionRecord[])[0];
}

export async function withdrawWallet(
  userId: string,
  amount: number,
  paymentMethodId: string,
  description?: string
): Promise<WalletTransactionRecord> {
  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = parseFloat(String(wallet.balance));
  if (amount <= 0) throw new Error('Số tiền rút không hợp lệ');
  if (balanceBefore < amount) throw new Error('Số dư ví không đủ');
  const balanceAfter = balanceBefore - amount;

  const result = await sql`
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, balance_before, balance_after,
      description, payment_method_id, status
    )
    VALUES (
      ${wallet.id}, 'withdraw', ${-amount}, ${balanceBefore}, ${balanceAfter},
      ${description || 'Rút tiền từ ví'}, ${paymentMethodId}, 'completed'
    )
    RETURNING *
  `;

  await sql`
    UPDATE user_wallets SET balance = ${balanceAfter}, updated_at = NOW()
    WHERE id = ${wallet.id}
  `;

  return (result as WalletTransactionRecord[])[0];
}

export async function spendWalletBalance(
  userId: string,
  amount: number,
  referenceId: string,
  description?: string
): Promise<WalletTransactionRecord> {
  // Defense-in-depth: validate BEFORE reading/computing balances.
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Số tiền thanh toán không hợp lệ');
  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = parseFloat(String(wallet.balance));
  if (balanceBefore < amount) throw new Error('Số dư ví không đủ để thanh toán');
  const balanceAfter = balanceBefore - amount;

  const result = await sql`
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, balance_before, balance_after,
      description, reference_id, status
    )
    VALUES (
      ${wallet.id}, 'payment', ${-amount}, ${balanceBefore}, ${balanceAfter},
      ${description || 'Thanh toán bằng ví'}, ${referenceId}, 'completed'
    )
    RETURNING *
  `;

  await sql`
    UPDATE user_wallets SET balance = ${balanceAfter}, updated_at = NOW()
    WHERE id = ${wallet.id}
  `;

  return (result as WalletTransactionRecord[])[0];
}

export async function refundWallet(
  userId: string,
  amount: number,
  referenceId: string,
  description?: string
): Promise<WalletTransactionRecord> {
  // Defense-in-depth: validate BEFORE reading/computing balances.
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Số tiền hoàn không hợp lệ');
  }
  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = parseFloat(String(wallet.balance));
  const balanceAfter = balanceBefore + amount;

  const result = await sql`
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, balance_before, balance_after,
      description, reference_id, status
    )
    VALUES (
      ${wallet.id}, 'refund', ${amount}, ${balanceBefore}, ${balanceAfter},
      ${description || `Hoàn tiền vào ví #${referenceId}`}, ${referenceId}, 'completed'
    )
    RETURNING *
  `;

  await sql`
    UPDATE user_wallets SET balance = ${balanceAfter}, updated_at = NOW()
    WHERE id = ${wallet.id}
  `;

  return (result as WalletTransactionRecord[])[0];
}

export async function getSavedPaymentMethods(userId: string): Promise<SavedPaymentMethodRecord[]> {
  return (await sql`
    SELECT * FROM saved_payment_methods
    WHERE user_id = ${userId} AND is_active = true
    ORDER BY is_default DESC, created_at DESC
  `) as SavedPaymentMethodRecord[];
}

export async function addSavedPaymentMethod(method: {
  user_id: string;
  type: 'card' | 'bank';
  card_brand?: string;
  last_four?: string;
  card_holder_name?: string;
  expiry_month?: number;
  expiry_year?: number;
  bank_id?: string;
  bank_name?: string;
  bank_code?: string;
}): Promise<SavedPaymentMethodRecord> {
  const result = await sql`
    INSERT INTO saved_payment_methods (
      user_id, type, card_brand, last_four, card_holder_name,
      expiry_month, expiry_year, bank_id, bank_name, bank_code
    )
    VALUES (
      ${method.user_id}, ${method.type}, ${method.card_brand || null},
      ${method.last_four || null}, ${method.card_holder_name || null},
      ${method.expiry_month || null}, ${method.expiry_year || null},
      ${method.bank_id || null}, ${method.bank_name || null}, ${method.bank_code || null}
    )
    RETURNING *
  `;
  return (result as SavedPaymentMethodRecord[])[0];
}

export async function deleteSavedPaymentMethod(id: string, userId: string): Promise<void> {
  await sql`
    UPDATE saved_payment_methods
    SET is_active = false, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function setDefaultPaymentMethod(id: string, userId: string): Promise<void> {
  await sql`
    UPDATE saved_payment_methods SET is_default = false WHERE user_id = ${userId}
  `;
  await sql`
    UPDATE saved_payment_methods SET is_default = true, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}
