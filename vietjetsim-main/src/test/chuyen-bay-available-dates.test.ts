import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const searchFlights = vi.hoisted(() => vi.fn());
const getAvailableDepartDates = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ searchFlights, getAvailableDepartDates }));

import { GET } from '@/app/api/chuyen-bay/route';

const get = (query: string) => GET(new NextRequest(`http://localhost/api/chuyen-bay?${query}`));

describe('GET /api/chuyen-bay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchFlights.mockResolvedValue([]);
    getAvailableDepartDates.mockResolvedValue([]);
  });

  // The results page's empty state used to say "pick a nearby date in the strip
  // above", but the strip is generated from today forward — so a search past
  // the end of the seeded week sat among six more empty days with nothing to
  // click. The API now answers with the dates that do have departures.
  it('trả các ngày có chuyến khi ngày yêu cầu rỗng', async () => {
    getAvailableDepartDates.mockResolvedValue(['2026-10-05', '2026-10-06']);
    const res = await get('from=HAN&to=SGN&date=2026-10-20');
    const body = await res.json();

    expect(body.flights).toEqual([]);
    expect(body.availableDates).toEqual(['2026-10-05', '2026-10-06']);
    expect(getAvailableDepartDates).toHaveBeenCalledWith({
      from_code: 'HAN',
      to_code: 'SGN',
    });
  });

  it('không hỏi ngày thay thế khi đã có chuyến', async () => {
    searchFlights.mockResolvedValue([{ id: 'f1' }]);
    const res = await get('from=HAN&to=SGN&date=2026-10-05');
    const body = await res.json();

    expect(body.flights).toHaveLength(1);
    expect(body.availableDates).toBeUndefined();
    expect(getAvailableDepartDates).not.toHaveBeenCalled();
  });

  // Without a date the search spans the whole schedule, so an empty answer is
  // about the route, not the day, and there is no single day to offer instead.
  it('không hỏi ngày thay thế khi tìm cả tuyến', async () => {
    await get('from=HAN&to=SGN');
    expect(getAvailableDepartDates).not.toHaveBeenCalled();
  });

  it('trả danh sách rỗng khi thiếu mã sân bay', async () => {
    const res = await get('date=2026-10-05');
    expect(await res.json()).toEqual({ flights: [] });
    expect(searchFlights).not.toHaveBeenCalled();
  });

  // A failed lookup must not turn a legitimate empty result into a 500 — the
  // empty state is a normal answer, and losing the suggestions is better than
  // losing the page.
  it('vẫn trả kết quả rỗng khi tra ngày thay thế lỗi', async () => {
    getAvailableDepartDates.mockRejectedValue(new Error('db down'));
    const res = await get('from=HAN&to=SGN&date=2026-10-20');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ flights: [], availableDates: [] });
  });
});
