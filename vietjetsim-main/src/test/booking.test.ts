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
        {
          id: 'booking-1',
          user_id: 'user-1',
          status: 'confirmed',
          total_price: 1000,
          payments: [],
          passengers: [],
        },
        {
          id: 'booking-2',
          user_id: 'user-1',
          status: 'pending',
          total_price: 500,
          payments: [],
          passengers: [],
        },
      ];

      (sql as any).query.mockImplementation((queryStr: string) => {
        if (queryStr.includes('SELECT COUNT(*)')) {
          return Promise.resolve([{ total: '2' }]);
        }
        if (queryStr.includes('SELECT b.*')) {
          return Promise.resolve(mockBookings);
        }
        return Promise.resolve([]);
      });

      const result = await getBookingsByUserId('user-1', { page: 1, limit: 10 });

      expect(sql.query).toHaveBeenCalledTimes(2);
      expect(result.bookings).toBeDefined();
      expect(result.bookings.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should tolerate a booking with no passengers or payment rows', async () => {
      // json_agg(...) FILTER (...) yields NULL, not [], when nothing matches.
      const mockBookings = [
        {
          id: 'booking-1',
          user_id: 'user-1',
          status: 'pending',
          total_price: 1000,
          payments: null,
          passengers: null,
        },
      ];

      (sql as any).query.mockImplementation((queryStr: string) => {
        if (queryStr.includes('SELECT COUNT(*)')) {
          return Promise.resolve([{ total: '1' }]);
        }
        if (queryStr.includes('SELECT b.*')) {
          return Promise.resolve(mockBookings);
        }
        return Promise.resolve([]);
      });

      const result = await getBookingsByUserId('user-1', { page: 1, limit: 10 });

      expect(result.bookings[0].passengers).toEqual([]);
      expect(result.bookings[0].payment).toBeNull();
    });
  });

  describe('getBookingById', () => {
    it('should fetch single booking by ID', async () => {
      const mockBooking = {
        id: 'booking-1',
        user_id: 'user-1',
        status: 'confirmed',
        total_price: 1000,
        payments: [],
        passengers: [],
        seats: [],
      };

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
      const mockBookingRecord = {
        id: 'booking-1',
        user_id: 'user-1',
        flight_id: 'flight-1',
        total_price: 1000,
      };

      // Booking, passengers and seats are written in one statement.
      (sql as any).mockResolvedValueOnce([mockBookingRecord]);

      const result = await createBooking(
        { user_id: 'user-1', flight_id: 'flight-1', total_price: 1000 },
        [{ name: 'John Doe', dob: '1990-01-01', id_number: '123', gender: 'male' }],
        ['12A']
      );

      expect(sql).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockBookingRecord);

      // Regression guard: the child inserts must take the booking id from the
      // inserting CTE. Interpolating it from another query's result passed
      // undefined and violated passengers.booking_id NOT NULL.
      const [strings, ...params] = (sql as any).mock.calls[0];
      expect(strings.join(' ')).toContain('WITH new_booking AS');
      expect(strings.join(' ')).toContain('nb.id, p.name');
      expect(strings.join(' ')).toContain('INSERT INTO booking_consents');
      expect(params.every((param: unknown) => param !== undefined)).toBe(true);
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
        { id: 'booking-2', status: 'pending', total_price: 500 },
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
