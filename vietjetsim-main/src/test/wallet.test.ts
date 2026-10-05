import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOrCreateWallet,
  getWalletTransactions,
  spendWalletBalance,
  topupWallet,
  withdrawWallet,
} from '@/lib/db';

// Mock the neon module
vi.mock('@/lib/neon', () => {
  const queryMock = vi.fn();
  const sqlMock = Object.assign(vi.fn(), {
    query: queryMock,
    begin: vi.fn(),
  });
  return { sql: sqlMock };
});

import { sql } from '@/lib/neon';

/**
 * Rebuilds the SQL text of a recorded `sql` call, with each interpolated value
 * put back as `$1`, `$2`, … the way Neon sends it.
 *
 * A tagged template hands the driver its literal chunks *separated* by the
 * values, so `strings.join(' ')` — the obvious way to read one back — silently
 * drops every placeholder and welds two fragments together ("balance + ," where
 * the statement really reads "balance + $2"). Assertions against that string
 * pass or fail for reasons unrelated to the code under test.
 */
function sqlText(call: unknown): string {
  if (!Array.isArray(call)) return '';
  const [strings] = call;
  if (!Array.isArray(strings) || typeof strings !== 'object' || strings === null) return '';
  return strings.reduce(
    (acc: string, chunk: unknown, i: number) => acc + (i > 0 ? `$${i}` : '') + String(chunk),
    ''
  );
}

/** Every SQL statement issued so far, as text. */
function sqlStatements(): string[] {
  const mocked = sql as unknown;
  if (typeof mocked !== 'function' || !('mock' in mocked)) return [];
  const mock = mocked.mock;
  if (typeof mock !== 'object' || mock === null || !('calls' in mock)) return [];
  const { calls } = mock;
  return Array.isArray(calls) ? calls.map(sqlText) : [];
}

describe('Wallet Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateWallet', () => {
    it('should return existing wallet if found', async () => {
      const mockWallet = { id: 'wallet-1', user_id: 'user-1', balance: 100, currency: 'VND' };
      (sql as any).mockResolvedValueOnce([mockWallet]);

      const wallet = await getOrCreateWallet('user-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(wallet).toEqual(mockWallet);
    });

    it('should create a new wallet if not found', async () => {
      const mockNewWallet = { id: 'wallet-2', user_id: 'user-2', balance: 0, currency: 'VND' };
      // First call returns empty array (not found)
      (sql as any).mockResolvedValueOnce([]);
      // Second call returns newly created wallet
      (sql as any).mockResolvedValueOnce([mockNewWallet]);

      const wallet = await getOrCreateWallet('user-2');

      expect(sql).toHaveBeenCalledTimes(2);
      expect(wallet).toEqual(mockNewWallet);
    });
  });

  describe('getWalletTransactions', () => {
    it('should fetch wallet transactions with pagination', async () => {
      const mockWallet = { id: 'wallet-1', user_id: 'user-1', balance: 100, currency: 'VND' };
      (sql as any).mockResolvedValueOnce([mockWallet]); // getOrCreateWallet

      const mockTransactions = [
        { id: 'tx-1', amount: 50 },
        { id: 'tx-2', amount: 20 },
      ];
      (sql as any).mockResolvedValueOnce(mockTransactions); // fetch transactions
      (sql as any).mockResolvedValueOnce([{ total: '2' }]); // fetch count

      const result = await getWalletTransactions('user-1', { page: 1, limit: 10 });

      expect(sql).toHaveBeenCalledTimes(3);
      // Depending on how db.ts processes it, ensure we match
      expect(result.transactions).toBeDefined();
      expect(result.total).toBe(2);
    });

    it('should fetch wallet transactions with type filter', async () => {
      const mockWallet = { id: 'wallet-1', user_id: 'user-1', balance: 100, currency: 'VND' };
      (sql as any).mockResolvedValueOnce([mockWallet]); // getOrCreateWallet

      const mockTransactions = [{ id: 'tx-1', amount: 50, type: 'topup' }];
      (sql as any).mockResolvedValueOnce(mockTransactions); // fetch transactions
      (sql as any).mockResolvedValueOnce([{ total: '1' }]); // fetch count

      const result = await getWalletTransactions('user-1', { page: 1, limit: 10, type: 'topup' });

      expect(sql).toHaveBeenCalledTimes(3);
      expect(result.transactions).toBeDefined();
      expect(result.total).toBe(1);
    });
  });

  describe('topupWallet', () => {
    it('credits the wallet and records the move in one statement', async () => {
      const mockTx = { id: 'tx-1', amount: 50, balance_before: 100, balance_after: 150 };

      (sql as any).mockResolvedValueOnce([]); // ensureWallet (INSERT ... DO NOTHING)
      (sql as any).mockResolvedValueOnce([mockTx]); // the UPDATE + ledger INSERT

      const result = await topupWallet('user-1', 50, 'pm-1', 'Test topup');

      expect(sql).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockTx);
    });

    /**
     * The balance is moved by an `UPDATE` that carries its own ledger insert,
     * not by an `UPDATE` of a number computed in JS. That is what makes two
     * concurrent top-ups safe: Postgres re-evaluates the `WHERE` of an UPDATE
     * after it unblocks on a writer, so the loser sees the winner's balance
     * rather than the one it read.
     *
     * Asserted on the SQL, not on a mock's call count: the old shape issued a
     * bare `SET balance = <number>` and this asserts that number is gone.
     */
    it('never writes a balance computed outside the database', async () => {
      (sql as any).mockResolvedValueOnce([]);
      (sql as any).mockResolvedValueOnce([{ id: 'tx-1' }]);

      await topupWallet('user-1', 50);

      const statements = sqlStatements();
      const move = statements.find((q) => q.includes('UPDATE user_wallets'));
      expect(move).toBeDefined();
      expect(move).toContain('balance + $');
      // The old read-modify-write put a precomputed total here.
      expect(move).not.toMatch(/SET balance = \$/);
      // One statement carries both the move and its audit row, so a failure in
      // either cannot leave the other committed on its own.
      const combined = statements.find((q: string) =>
        q.includes('INSERT INTO wallet_transactions')
      );
      expect(combined).toContain('WITH moved AS');
    });

    it('rejects negative topup amount (would drain wallet)', async () => {
      await expect(topupWallet('user-1', -50, 'pm-1')).rejects.toThrow('Số tiền nạp không hợp lệ');
      // Must fail BEFORE any DB call
      expect(sql).not.toHaveBeenCalled();
    });

    it('rejects NaN / non-finite topup amount', async () => {
      await expect(topupWallet('user-1', NaN, 'pm-1')).rejects.toThrow('Số tiền nạp không hợp lệ');
      await expect(topupWallet('user-1', Infinity, 'pm-1')).rejects.toThrow(
        'Số tiền nạp không hợp lệ'
      );
      expect(sql).not.toHaveBeenCalled();
    });
  });

  describe('debits that need funds', () => {
    /**
     * The withdrawal race that cost real money.
     *
     * Measured on Postgres 17: two 100,000 withdrawals from a 100,000 wallet
     * both succeeded and left the balance at 0 — 200,000 paid out of 100,000.
     * `CHECK (balance >= 0)` does not catch it, because 0 passes.
     *
     * The funds check has to live in the `UPDATE`'s `WHERE`. Asserted on the
     * SQL because that placement is the whole fix, and a mock returning "not
     * enough" would look identical however the number was arrived at.
     */
    it('tests for sufficient funds inside the UPDATE, not before it', async () => {
      (sql as any).mockResolvedValueOnce([]);
      (sql as any).mockResolvedValueOnce([{ id: 'tx-w' }]);

      await withdrawWallet('user-1', 100000, 'pm-1');

      const statements = sqlStatements();
      const move = statements.find((q) => q.includes('UPDATE user_wallets'));
      expect(move).toMatch(/balance \+ \$\d+ >= 0/);
      // A prior read of `user_wallets.balance` in its own statement is exactly
      // what let both withdrawals see 100,000 and each conclude it was enough.
      // (The move's own `SELECT ... FROM moved` reads the CTE, not the table.)
      expect(statements.some((q) => /SELECT[\s\S]*FROM\s+user_wallets/.test(q))).toBe(false);
    });

    it('reports insufficient funds when the guarded UPDATE moves no row', async () => {
      (sql as any).mockResolvedValueOnce([]); // ensureWallet
      (sql as any).mockResolvedValueOnce([]); // the UPDATE matched nothing

      await expect(withdrawWallet('user-1', 100000, 'pm-1')).rejects.toThrow('Số dư ví không đủ');
    });

    it('refuses a spend the wallet cannot cover', async () => {
      (sql as any).mockResolvedValueOnce([]);
      (sql as any).mockResolvedValueOnce([]);

      await expect(spendWalletBalance('user-1', 900, 'booking-9')).rejects.toThrow(
        'Số dư ví không đủ'
      );
    });
  });

  describe('refundWallet', () => {
    it('credits the wallet and records the move in one statement', async () => {
      const mockTx = { id: 'tx-9', type: 'refund', amount: 70 };

      (sql as any).mockResolvedValueOnce([]); // no prior refund for this reference
      (sql as any).mockResolvedValueOnce([]); // ensureWallet
      (sql as any).mockResolvedValueOnce([mockTx]); // the UPDATE + ledger INSERT

      const { refundWallet } = await import('@/lib/db');
      const result = await refundWallet('user-1', 70, 'booking-1', 'Hoàn tiền vé');

      expect(sql).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockTx);
    });

    /**
     * A refund credits a wallet, so it needs no funds check — but it must still
     * go through the shared `UPDATE`, or it is a lost update like the others.
     */
    it('credits without a funds guard, so the balance cannot stall', async () => {
      (sql as any).mockResolvedValueOnce([]); // no prior refund for this reference
      (sql as any).mockResolvedValueOnce([]); // ensureWallet
      (sql as any).mockResolvedValueOnce([{ id: 'tx-9' }]);

      const { refundWallet } = await import('@/lib/db');
      await refundWallet('user-1', 70, 'booking-1');

      const move = sqlStatements().find((q) => q.includes('UPDATE user_wallets'));
      expect(move).toContain('balance + $');
      expect(move).not.toContain('>= 0');
    });

    it('should reject non-positive refund amounts', async () => {
      const { refundWallet } = await import('@/lib/db');
      await expect(refundWallet('user-1', 0, 'booking-1')).rejects.toThrow(
        'Số tiền hoàn không hợp lệ'
      );
      await expect(refundWallet('user-1', -100, 'booking-1')).rejects.toThrow(
        'Số tiền hoàn không hợp lệ'
      );
      expect(sql).not.toHaveBeenCalled();
    });

    /**
     * The defect 037's index exists to stop.
     *
     * Measured against a real Postgres 17 with this schema: approving one
     * ticket moved a wallet from 100,000 to 1,100,000, and approving the *same
     * ticket again* moved it to 2,100,000 — two 'refund' rows of 1,000,000
     * against one booking. `refundWallet` read the balance, added to it, and
     * wrote it back, and nothing on the way rejected the second write.
     *
     * Migration 037 adds `wallet_transactions_one_refund_per_reference`; that
     * index is the real enforcement. The lookup in `refundWallet` exists so the
     * *caller* can tell "this booking was already paid" from "the credit failed"
     * — that distinction decides whether an operator goes hunting for money
     * that already moved. So this asserts the refusal happens and no ledger
     * row is written.
     */
    it('refuses a second refund for the same booking instead of crediting twice', async () => {
      // The duplicate row the partial unique index would have rejected.
      (sql as any).mockResolvedValueOnce([{ id: 'tx-prior' }]);

      const { refundWallet } = await import('@/lib/db');

      await expect(refundWallet('user-1', 70, 'booking-1', 'Hoàn tiền vé')).rejects.toThrow(
        /đã được hoàn tiền trước đó/
      );
      // One lookup, then stop: no wallet read, no INSERT, no balance update.
      expect(sql).toHaveBeenCalledTimes(1);
    });

    /**
     * The lookup filters on `type = 'refund'` because `reference_id` is shared
     * with topups and withdrawals. Constraining the whole column would reject a
     * customer's deposit for a booking that had already been refunded.
     */
    it('allows a non-refund ledger row to share the reference', async () => {
      const mockTx = { id: 'tx-10', type: 'refund', amount: 70 };

      (sql as any).mockResolvedValueOnce([]); // no prior *refund* row
      (sql as any).mockResolvedValueOnce([]); // ensureWallet
      (sql as any).mockResolvedValueOnce([mockTx]);

      const { refundWallet } = await import('@/lib/db');
      const result = await refundWallet('user-1', 70, 'booking-1');

      expect(result).toEqual(mockTx);
      const lookup = (sql as any).mock.calls[0][0].join(' ');
      expect(lookup).toContain("type = 'refund'");
    });
  });
});
