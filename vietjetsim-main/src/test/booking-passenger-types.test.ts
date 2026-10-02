import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import type { FareClassId } from '@/features/bookings/pricing';

const createBooking = vi.hoisted(() => vi.fn());
// The route now prices the fare from the database instead of trusting the
// browser, so it looks the flight up before it writes anything.
const getFlightById = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return { ...actual, createBooking, getFlightById };
});

const { POST } = await import('@/app/api/dat-ve/route');

const CSRF_TOKEN = 'test-csrf-token';
const token = () =>
  signAccessToken({ userId: 'u1', email: 'user@vietjetair.vn', role: 'user', fullName: 'Test' });

const CONSENTS = {
  marketing: false,
  survey: false,
  retainForFutureBooking: false,
  policyAccepted: true,
};

const adult = (over: Record<string, unknown> = {}) => ({
  type: 'adult',
  name: 'NGUYEN VAN A',
  dob: '1990-01-01',
  idNumber: '001099012345',
  phone: '0900000000',
  email: 'a@example.com',
  ...over,
});

const infant = (over: Record<string, unknown> = {}) =>
  adult({ type: 'infant', name: 'BABY A', dob: '2025-01-01', idNumber: '', ...over });

function post(body: unknown) {
  return new NextRequest('http://localhost:4028/api/dat-ve', {
    method: 'POST',
    headers: {
      cookie: `access_token=${token()}; csrf_token=${CSRF_TOKEN}`,
      'x-csrf-token': CSRF_TOKEN,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/dat-ve passenger types', () => {
  beforeEach(() => {
    createBooking.mockReset();
    createBooking.mockResolvedValue({ id: 'b1', total_price: 100 });
    getFlightById.mockReset();
    getFlightById.mockResolvedValue({
      id: 'f1',
      price: 1_000_000,
      economy_price: 1_000_000,
      business_price: 3_000_000,
    });
  });

  it('accepts an infant with no identity document', async () => {
    const res = await POST(
      post({
        flight_id: 'f1',
        total_price: 100,
        passengers: [adult(), infant()],
        seats: ['12A'],
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(201);
    expect(createBooking).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ passenger_type: 'adult' }),
        expect.objectContaining({ passenger_type: 'infant' }),
      ]),
      // Seats now reach the database with the price they were sold for, and the
      // chosen services come in a fourth argument, both priced server-side.
      [{ seat_number: '12A', price: 63_250 }],
      [],
      CONSENTS
    );
  });

  // One adult, one infant: the infant rides on a lap, so one seat is enough.
  it('requires a seat per seated passenger, not per passenger', async () => {
    const res = await POST(
      post({
        flight_id: 'f1',
        total_price: 100,
        passengers: [adult(), infant(), infant()],
        seats: ['12A'],
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(201);
  });

  it('rejects a seat count that does not cover every seated passenger', async () => {
    const res = await POST(
      post({
        flight_id: 'f1',
        total_price: 100,
        passengers: [adult(), infant()],
        seats: ['12A', '12B'],
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Number of seats must match number of seated passengers',
    });
  });

  it('still requires an identity document for an adult', async () => {
    const res = await POST(
      post({
        flight_id: 'f1',
        total_price: 100,
        passengers: [adult({ idNumber: '' })],
        seats: ['12A'],
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(400);
  });

  it('still requires an identity document for a child', async () => {
    const res = await POST(
      post({
        flight_id: 'f1',
        total_price: 100,
        passengers: [adult(), adult({ type: 'child', idNumber: '' })],
        seats: ['12A', '12B'],
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(400);
  });

  // Silently coercing a typo would price a child as an adult and seat them wrong.
  it('rejects an unknown passenger type instead of coercing it', async () => {
    const res = await POST(
      post({
        flight_id: 'f1',
        total_price: 100,
        passengers: [adult({ type: 'adlut' })],
        seats: ['12A'],
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(400);
  });

  it('defaults a passenger with no type to adult', async () => {
    // An older client posting the pre-types payload omits `type` entirely.
    const noType = { ...adult() };
    delete (noType as { type?: string }).type;
    const res = await POST(
      post({
        flight_id: 'f1',
        total_price: 100,
        passengers: [noType],
        seats: ['12A'],
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(201);
    expect(createBooking.mock.calls[0][1][0].passenger_type).toBe('adult');
  });

  // The fare is the whole point of the booking, so it is priced from the
  // database rather than from `total_price`. A client that posted one đồng used
  // to get a real, confirmed seat for it.
  it('prices the fare from the flight, ignoring any total the client posts', async () => {
    const res = await POST(
      post({
        flight_id: 'f1',
        total_price: 1,
        passengers: [adult()],
        seats: ['12A'],
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(201);
    // 1,000,000 for one adult, plus 15% tax, plus the row-12 seat: that band is
    // 55,000 before its own 10% tax and 5% service fee.
    expect(createBooking.mock.calls[0][0].total_price).toBe(1_213_250);
  });
  // The results page used to build its four fare cards by adding hard-coded
  // amounts to the base fare, and the API charged one stored fare regardless —
  // so SkyBOSS quoted 10,682,000₫ and was charged 13,573,000₫. The card id the
  // traveller taps now names the bucket, and both sides run the same ladder.
  it('charges each fare card the amount that card quoted', async () => {
    const book = async (fareClass?: FareClassId) => {
      createBooking.mockClear();
      const res = await POST(
        post({
          flight_id: 'f1',
          total_price: 1,
          passengers: [adult()],
          seats: ['12A'],
          fareClass,
          consents: CONSENTS,
        })
      );
      expect(res.status).toBe(201);
      return createBooking.mock.calls[0][0].total_price as number;
    };

    // Economy 1,000,000 and Business 3,000,000 with the gap stepped evenly, so
    // Deluxe is 1,666,667 and SkyBOSS 2,333,333. Each plus 15% tax and the
    // row-12 seat (55,000 + its own 15% = 63,250).
    expect(await book('eco')).toBe(1_213_250);
    expect(await book('deluxe')).toBe(1_979_917);
    expect(await book('skyboss')).toBe(2_746_583);
    expect(await book('business')).toBe(3_513_250);
  });

  it('falls back to the cheapest card when none is sent', async () => {
    createBooking.mockClear();
    const res = await POST(
      post({
        flight_id: 'f1',
        passengers: [adult()],
        seats: ['12A'],
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(201);
    expect(createBooking.mock.calls[0][0].total_price).toBe(1_213_250);
  });

  // Silently downgrading would under-quote: a client asking for a bucket the
  // flight does not sell would get the cheapest fare charged instead of an
  // error it can act on.
  it('rejects a fare card that is not in the ladder', async () => {
    const res = await POST(
      post({
        flight_id: 'f1',
        passengers: [adult()],
        seats: ['12A'],
        fareClass: 'first' as FareClassId,
        consents: CONSENTS,
      })
    );
    expect(res.status).toBe(400);
    expect(createBooking).not.toHaveBeenCalled();
  });
});
