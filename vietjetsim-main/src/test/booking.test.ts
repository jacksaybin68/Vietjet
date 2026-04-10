import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBookingsByUserId,
  getBookingById,
  createBooking,
  updateBookingStatus,
  getAllBookings,
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

describe('Booking Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBookingsByUserId', () => {
    it('should fetch bookings with pagination for user', async () => {
      const mockBookings = [
        { id: 'booking-1', user_id: 'user-1', status: 'confirmed', total_price: 1000, payments: [], passengers: [] },
        { id: 'booking-2', user_id: 'user-1', status: 'pending', total_price: 500, payments: [], passengers: [] }
      ];

      (sql as any).mockImplementation((strings: any) => {
        if (strings[0].includes('SELECT COUNT(*)')) {
          return Promise.resolve([{ total: '2' }]);
        }
        if (strings[0].includes('SELECT b.*')) {
          return Promise.resolve(mockBookings);
        }
        return Promise.resolve([]);
      });

      const result = await getBookingsByUserId('user-1', { page: 1, limit: 10 });

      expect(sql).toHaveBeenCalledTimes(2);
      expect(result.bookings).toBeDefined();
      expect(result.bookings.length).toBe(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getBookingById', () => {
    it('should fetch single booking by ID', async () => {
      const mockBooking = { id: 'booking-1', user_id: 'user-1', status: 'confirmed', total_price: 1000, payments: [], passengers: [], seats: [] };

      (sql as any).mockResolvedValueOnce([mockBooking]);

      const result = await getBookingById('booking-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result?.id).toBe('booking-1');
    });

    it('should return null if booking not found', async () => {
      (sql as any).mockResolvedValueOnce([]);

      const result = await getBookingById('booking-not-found');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });

  describe('createBooking', () => {
    it('should create booking and passengers', async () => {
      const mockBookingRecord = { id: 'booking-1', user_id: 'user-1', flight_id: 'flight-1', total_price: 1000 };

      (sql as any).transaction.mockResolvedValueOnce([]);

      (sql as any).mockImplementation((strings: any) => {
        if (strings[0].includes('SELECT * FROM bookings')) {
          return Promise.resolve([mockBookingRecord]);
        }
        return Promise.resolve([]);
      });

      const result = await createBooking(
        { user_id: 'user-1', flight_id: 'flight-1', total_price: 1000 },
        [{ name: 'John Doe', dob: '1990-01-01', id_number: '123', gender: 'male' }]
      );

      expect(sql.transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockBookingRecord);
    });
  });

  describe('updateBookingStatus', () => {
    it('should update booking status', async () => {
      (sql as any).mockResolvedValueOnce([]);

      await updateBookingStatus('booking-1', 'confirmed');

      expect(sql).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllBookings', () => {
    it('should fetch all bookings with pagination', async () => {
      const mockBookings = [
        { id: 'booking-1', status: 'confirmed', total_price: 1000 },
        { id: 'booking-2', status: 'pending', total_price: 500 }
      ];

      // getAllBookings uses sql.query
      (sql as any).query.mockImplementation((queryStr: string) => {
        if (queryStr.includes('SELECT COUNT(*)')) {
          return Promise.resolve([{ total: '2' }]);
        }
        if (queryStr.includes('SELECT b.*')) {
          return Promise.resolve(mockBookings);
        }
        return Promise.resolve([]);
      });

      const result = await getAllBookings({ page: 1, limit: 10 });

      expect(sql.query).toHaveBeenCalledTimes(2);
      expect(result.bookings).toBeDefined();
      expect(result.bookings.length).toBe(2);
      expect(result.total).toBe(2);
    });
  });
});
