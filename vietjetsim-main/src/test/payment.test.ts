import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPayment,
  getPaymentsByBookingId,
  getSavedPaymentMethods,
  addSavedPaymentMethod,
  deleteSavedPaymentMethod,
  setDefaultPaymentMethod,
  createPaymentAndConfirmBooking,
} from '@/lib/db';

// Mock the neon module
vi.mock('@/lib/neon', () => {
  const queryMock = vi.fn();
  const sqlMock = Object.assign(vi.fn(), {
    query: queryMock,
    begin: vi.fn(),
    transaction: vi.fn(),
  });
  return { sql: sqlMock };
});

import { sql } from '@/lib/neon';

describe('Payment Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment record', async () => {
      const mockPayment = {
        booking_id: 'booking-1',
        method: 'credit_card',
        amount: 1000,
        status: 'completed'
      };

      const expectedRecord = { id: 'payment-1', ...mockPayment };
      (sql as any).mockResolvedValueOnce([expectedRecord]);

      const result = await createPayment({
        booking_id: 'booking-1',
        method: 'credit_card',
        amount: 1000
      });

      expect(sql).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedRecord);
    });
  });

  describe('getPaymentsByBookingId', () => {
    it('should fetch payments by booking ID', async () => {
      const mockPayments = [
        { id: 'payment-1', booking_id: 'booking-1', amount: 1000 },
        { id: 'payment-2', booking_id: 'booking-1', amount: 500 }
      ];

      (sql as any).mockResolvedValueOnce(mockPayments);

      const result = await getPaymentsByBookingId('booking-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPayments);
    });
  });

  describe('getSavedPaymentMethods', () => {
    it('should fetch saved payment methods for a user', async () => {
      const mockMethods = [
        { id: 'pm-1', user_id: 'user-1', type: "card" as const, card_brand: 'visa', last_four: '4242' }
      ];

      (sql as any).mockResolvedValueOnce(mockMethods);

      const result = await getSavedPaymentMethods('user-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockMethods);
    });
  });

  describe('addSavedPaymentMethod', () => {
    it('should add a new saved payment method', async () => {
      const newMethod = {
        user_id: 'user-1',
        type: "card" as const, card_brand: 'visa',
        last_four: '4242',
        expiry_month: 12,
        expiry_year: 25,
        card_holder_name: 'John Doe',
        is_default: true
      };

      const expectedRecord = { id: 'pm-2', ...newMethod };
      (sql as any).mockResolvedValueOnce([expectedRecord]);

      const result = await addSavedPaymentMethod(newMethod);

      expect(sql).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedRecord);
    });
  });

  describe('deleteSavedPaymentMethod', () => {
    it('should delete a saved payment method', async () => {
      (sql as any).mockResolvedValueOnce([]); // no return value expected just successful execution

      await deleteSavedPaymentMethod('pm-1', 'user-1');

      expect(sql).toHaveBeenCalledTimes(1);
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set default payment method and unset others', async () => {
      (sql as any).mockResolvedValueOnce([]); // Unset others
      (sql as any).mockResolvedValueOnce([]); // Set default

      await setDefaultPaymentMethod('pm-1', 'user-1');

      expect(sql).toHaveBeenCalledTimes(2);
    });
  });

  describe('createPaymentAndConfirmBooking', () => {
    it('should confirm booking after payment is created', async () => {
      const mockPaymentRecord = { id: 'payment-1', booking_id: 'booking-1', amount: 1000, method: 'wallet', status: 'completed' };
      const mockBookingRecord = { id: 'booking-1', status: 'confirmed' };

      (sql as any).transaction.mockResolvedValueOnce([]);

      // We need sql function to return iterable
      // The previous code had (sql as any).mockResolvedValueOnce which overrides the root mock function.
      // It must be that `sql` is called as a tagged template literal and we return an array.
      (sql as any).mockImplementation((strings: any) => {
        if (strings[0].includes('SELECT * FROM payments')) {
          return Promise.resolve([mockPaymentRecord]);
        }
        if (strings[0].includes('SELECT * FROM bookings')) {
          return Promise.resolve([mockBookingRecord]);
        }
        return Promise.resolve([]);
      });

      const result = await createPaymentAndConfirmBooking({
        booking_id: 'booking-1',
        method: 'wallet',
        amount: 1000
      });

      expect(sql.transaction).toHaveBeenCalledTimes(1);
      expect(result.payment).toEqual(mockPaymentRecord);
      expect(result.booking).toEqual(mockBookingRecord);
    });
  });
});
