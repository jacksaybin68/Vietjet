import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';

const createBooking = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return { ...actual, createBooking };
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
      ['12A'],
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
});
