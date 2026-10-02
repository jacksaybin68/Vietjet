import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createFlight } from '@/lib/db';

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

/** The mocked tagged-template function, typed for `mock.calls`. */
const sqlMock = sql as unknown as Mock;

function statement(): { text: string; values: unknown[] } {
  const [strings, ...values] = sqlMock.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
  return { text: strings.join('?'), values };
}

/** The ratio migration 030 seeds both cabins from. */
const RATIO = 2.77;

const BASE_FLIGHT = {
  flight_no: 'VJ 900',
  from_code: 'HAN',
  to_code: 'SGN',
  depart_time: '2026-10-05T06:00:00+07:00',
  arrive_time: '2026-10-05T08:05:00+07:00',
  price: 1_385_650,
  class: 'economy',
  available: 180,
};

/** The two fare columns, in the bind order they follow `price`. */
function faresFor(price: number): { economy: number; business: number } {
  const { values } = statement();
  const at = values.indexOf(price);
  return { economy: values[at + 1] as number, business: values[at + 2] as number };
}

describe('createFlight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlMock.mockResolvedValue([{ id: 'f1' }]);
  });

  // Migration 030 made `economy_price` and `business_price` NOT NULL, and the
  // results page reads those two instead of `price`. The insert named neither,
  // so every flight created through the admin "Thêm chuyến bay" screen came
  // back 500 — the form had been unusable since that migration shipped.
  it('ghi cả hai cột giá, không để NULL', async () => {
    await createFlight(BASE_FLIGHT);
    const { text, values } = statement();

    expect(text).toMatch(/INSERT INTO flights[\s\S]*economy_price[\s\S]*business_price/);
    expect(values).not.toContain(null);
  });

  it('lấy giá hai khoang từ form khi form gửi lên', async () => {
    await createFlight({ ...BASE_FLIGHT, economyPrice: 2_000_000, businessPrice: 5_540_000 });
    expect(faresFor(BASE_FLIGHT.price)).toEqual({ economy: 2_000_000, business: 5_540_000 });
  });

  // Satisfying the NOT NULL by copying `price` into both columns made all four
  // fare cards on the results page print the same number. A caller that sends
  // one price must still get a ladder, at the ratio 030 seeds from.
  it('dựng thang giá khi form chỉ gửi một mức giá', async () => {
    await createFlight(BASE_FLIGHT);
    expect(faresFor(BASE_FLIGHT.price)).toEqual({
      economy: BASE_FLIGHT.price,
      business: Math.round(BASE_FLIGHT.price * RATIO),
    });
  });

  // A search can return either row for a given flight, so both must resolve to
  // the same pair. A business row carries the business fare in `price`, so its
  // economy fare is that divided back down — the same two numbers, reversed.
  it('giữ cùng một cặp giá dù hàng là economy hay business', async () => {
    const businessPrice = 3_837_251;
    await createFlight({ ...BASE_FLIGHT, class: 'business', price: businessPrice });
    expect(faresFor(businessPrice)).toEqual({
      economy: Math.round(businessPrice / RATIO),
      business: businessPrice,
    });
  });

  // 030's `flights_fare_ladder_ordered` CHECK rejects an inverted ladder; the
  // derivation must never be the thing that produces one.
  it('không bao giờ tạo ra thang giá bị đảo', async () => {
    await createFlight(BASE_FLIGHT);
    const { economy, business } = faresFor(BASE_FLIGHT.price);
    expect(business).toBeGreaterThanOrEqual(economy);
  });
});
