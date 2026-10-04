import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrCreateWallet, getWalletTransactions, topupWallet } from '@/lib/db';

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
    it('should create a topup transaction and update wallet balance', async () => {
      const mockWallet = { id: 'wallet-1', user_id: 'user-1', balance: 100, currency: 'VND' };
      const mockTx = { id: 'tx-1', amount: 50 };

      (sql as any).mockResolvedValueOnce([mockWallet]); // getOrCreateWallet
      (sql as any).mockResolvedValueOnce([mockTx]); // insert transaction
      (sql as any).mockResolvedValueOnce([mockWallet]); // update user_wallets

      const result = await topupWallet('user-1', 50, 'pm-1', 'Test topup');

      expect(sql).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });

    it('should reject negative topup amount (would drain wallet)', async () => {
      await expect(topupWallet('user-1', -50, 'pm-1')).rejects.toThrow('Số tiền nạp không hợp lệ');
      // Must fail BEFORE any DB call
      expect(sql).not.toHaveBeenCalled();
    });

    it('should reject NaN / non-finite topup amount', async () => {
      await expect(topupWallet('user-1', NaN, 'pm-1')).rejects.toThrow('Số tiền nạp không hợp lệ');
      await expect(topupWallet('user-1', Infinity, 'pm-1')).rejects.toThrow(
        'Số tiền nạp không hợp lệ'
      );
      expect(sql).not.toHaveBeenCalled();
    });
  });

  describe('refundWallet', () => {
    it('should create a refund transaction and credit the wallet', async () => {
      const mockWallet = { id: 'wallet-1', user_id: 'user-1', balance: 100, currency: 'VND' };
      const mockTx = { id: 'tx-9', type: 'refund', amount: 70 };

      (sql as any).mockResolvedValueOnce([]); // no prior refund for this reference
      (sql as any).mockResolvedValueOnce([mockWallet]); // getOrCreateWallet
      (sql as any).mockResolvedValueOnce([mockTx]); // insert transaction
      (sql as any).mockResolvedValueOnce([mockWallet]); // update user_wallets

      const { refundWallet } = await import('@/lib/db');
      const result = await refundWallet('user-1', 70, 'booking-1', 'Hoàn tiền vé');

      expect(sql).toHaveBeenCalledTimes(4);
      expect(result).toEqual(mockTx);
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
      const mockWallet = { id: 'wallet-1', user_id: 'user-1', balance: 100, currency: 'VND' };
      const mockTx = { id: 'tx-10', type: 'refund', amount: 70 };

      (sql as any).mockResolvedValueOnce([]); // no prior *refund* row
      (sql as any).mockResolvedValueOnce([mockWallet]);
      (sql as any).mockResolvedValueOnce([mockTx]);
      (sql as any).mockResolvedValueOnce([mockWallet]);

      const { refundWallet } = await import('@/lib/db');
      const result = await refundWallet('user-1', 70, 'booking-1');

      expect(result).toEqual(mockTx);
      const lookup = (sql as any).mock.calls[0][0].join(' ');
      expect(lookup).toContain("type = 'refund'");
    });
  });
});
