import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOrCreateWallet,
  getWalletTransactions,
  topupWallet,
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
        { id: 'tx-2', amount: 20 }
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

      const mockTransactions = [
        { id: 'tx-1', amount: 50, type: 'topup' }
      ];
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

      const result = await topupWallet(
        'user-1',
        50,
        'pm-1',
        'Test topup'
      );

      expect(sql).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });
  });
});
