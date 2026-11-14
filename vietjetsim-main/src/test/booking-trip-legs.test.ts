import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';

const createBookingMock = vi.hoisted(() => vi.fn());
const getFlightByIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    createBooking: createBookingMock,
    getFlightById: getFlightByIdMock,
  };
});

const { POST: bookingPost } = await import('@/app/api/dat-ve/route');

const CSRF_TOKEN = 'trip-legs-csrf-token-32-characters!';

/**
 * Mô hình trip/chặng (migration 045): 2 chặng khứ hồi phải dùng CHUNG một
 * `trip_id`, mỗi chặng một `leg_role` ('outbound' | 'inbound').
 *
 * Trước đó 2 chặng chỉ liên kết nhau bằng `sessionStorage` và
 * `return_booking_id` trong response — không có gì trong DB. Đó là lý do
 * `/lam-thu-tuc` không tra được cả 2 chặng từ một PNR.
 */
describe('POST /api/dat-ve — liên kết 2 chặng khứ hồi bằng trip_id', () => {
  const token = () =>
    signAccessToken({
      userId: 'usr-trip-001',
      email: 'khach@vietjetair.vn',
      role: 'user',
      fullName: 'Khách Hành',
    });

  const request = (body: Record<string, unknown>) =>
    new NextRequest('http://localhost:4028/api/dat-ve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': CSRF_TOKEN,
        cookie: `access_token=${token()}; csrf_token=${CSRF_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

  const passengers = [
    {
      name: 'NGUYEN VAN A',
      dob: '1990-01-01',
      idNumber: '001099012345',
      gender: 'male',
      type: 'adult',
      phone: '0900000001',
      email: 'khach@vietjetair.vn',
    },
  ];

  const consents = { policyAccepted: true };

  beforeEach(() => {
    vi.clearAllMocks();

    getFlightByIdMock.mockImplementation(async (id: string) => ({
      id,
      flight_no: id === 'flight-out' ? 'VJ301' : 'VJ302',
      from_code: 'HAN',
      to_code: 'SGN',
      depart_time: '2026-03-20T06:00:00Z',
      arrive_time: '2026-03-20T08:25:00Z',
      price: 899000,
      economy_price: 899000,
      business_price: 2490000,
      available: 20,
    }));

    let seq = 0;
    createBookingMock.mockImplementation(async (booking: Record<string, unknown>) => {
      seq += 1;
      return {
        id: `booking-${seq}`,
        booking_code: `PNR${seq}`,
        status: 'pending',
        total_price: booking.total_price,
        trip_id: booking.trip_id,
        leg_role: booking.leg_role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  });

  it('gives both legs of a round trip the SAME trip_id and a distinct leg_role', async () => {
    const res = await bookingPost(
      request({
        flight_id: 'flight-out',
        return_flight_id: 'flight-in',
        passengers,
        consents,
      })
    );

    expect(res.status).toBe(201);

    expect(createBookingMock).toHaveBeenCalledTimes(2);
    const [outbound, inbound] = createBookingMock.mock.calls.map((call) => call[0]);

    // Cùng một trip.
    expect(outbound.trip_id).toBeTruthy();
    expect(inbound.trip_id).toBe(outbound.trip_id);

    // Mỗi chặng một vai trò.
    expect(outbound.leg_role).toBe('outbound');
    expect(inbound.leg_role).toBe('inbound');

    // Chặng đi giữ chuyến bay đi, chặng về giữ chuyến bay về.
    expect(outbound.flight_id).toBe('flight-out');
    expect(inbound.flight_id).toBe('flight-in');
  });

  it('still writes the trip id and leg role for a ONE-WAY booking', async () => {
    const res = await bookingPost(
      request({
        flight_id: 'flight-out',
        passengers,
        consents,
      })
    );

    expect(res.status).toBe(201);
    expect(createBookingMock).toHaveBeenCalledTimes(1);

    const outbound = createBookingMock.mock.calls[0][0];
    expect(outbound.trip_id).toBeTruthy();
    expect(outbound.leg_role).toBe('outbound');
  });

  it('exposes the trip id and leg role in the response payload', async () => {
    const res = await bookingPost(
      request({
        flight_id: 'flight-out',
        return_flight_id: 'flight-in',
        passengers,
        consents,
      })
    );

    const data = await res.json();
    expect(data.booking.trip_id).toBeTruthy();
    expect(data.booking.leg_role).toBe('outbound');
    expect(data.booking.return_trip_id).toBe(data.booking.trip_id);
    expect(data.booking.return_leg_role).toBe('inbound');
  });

  it('never lets the client choose its own trip id', async () => {
    await bookingPost(
      request({
        flight_id: 'flight-out',
        return_flight_id: 'flight-in',
        passengers,
        consents,
        // The client must not be able to graft itself onto somebody else's
        // trip, so this field is not read from the body at all.
        trip_id: 'attacker-controlled-trip',
      })
    );

    const [outbound] = createBookingMock.mock.calls.map((call) => call[0]);
    expect(outbound.trip_id).not.toBe('attacker-controlled-trip');
  });
});
