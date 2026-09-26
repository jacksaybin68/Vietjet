import { describe, it, expect, vi, beforeEach } from 'vitest';

const getAllAirports = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ getAllAirports }));

const { GET } = await import('@/app/api/san-bay/route');

describe('GET /api/san-bay', () => {
  beforeEach(() => getAllAirports.mockReset());

  it('serves the airports table so the picker cannot drift from the data', async () => {
    getAllAirports.mockResolvedValue([
      { id: '1', code: 'HAN', name: 'Nội Bài', city: 'Hà Nội', country: 'Vietnam' },
      { id: '2', code: 'VDH', name: 'Đồng Hới', city: 'Đồng Hới', country: 'Vietnam' },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      airports: [
        { code: 'HAN', city: 'Hà Nội', airport: 'Nội Bài' },
        { code: 'VDH', city: 'Đồng Hới', airport: 'Đồng Hới' },
      ],
    });
  });

  it('reports a failure instead of returning an empty list', async () => {
    // Rejecting with a plain object matches the house style in api-security.test.ts;
    // an Error instance here is picked up as an unhandled rejection by vitest.
    getAllAirports.mockRejectedValueOnce({
      name: 'NeonDbError',
      message: 'connection terminated',
    });
    const res = await GET();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: 'Không thể tải danh sách sân bay' });
  });
});
