import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * "Mã đặt chỗ" phải là PNR 6 ký tự, không phải UUID của dòng `bookings`.
 *
 * `bookings.id` là UUID nội bộ (36 ký tự). Số đó không in trên vé, không tra
 * cứu được ở quầy và khách đọc cho bộ phận hỗ trợ cũng vô ích — nhưng nó là
 * giá trị duy nhất mà `POST /api/dat-ve` trả về cho client, nên chỗ nào lấy
 * `data.booking.id` để hiển thị là in ra UUID. Đã xảy ra: toast "Đặt chỗ
 * thành công" in UUID, trong khi màn thanh toán và màn tra cứu vẫn in PNR.
 *
 * Test này quét mã nguồn thay vì render: lỗi là một chuỗi nội suy, và để bắt
 * được nó bằng render thì phải dựng lại cả luồng đặt vé (router, auth, giá,
 * ghế) chỉ để nhìn một dòng toast.
 */
const CUSTOMER_FACING_DIRS = [
  'src/app',
  'src/features/payments',
  'src/features/bookings',
  'src/features/loyalty',
];

/** Biểu thức nội suy cạnh nhãn: `${...}` trong template, `{...}` trong JSX. */
const LABELLED_VALUE = /Mã đặt chỗ[^\n]*?(?:\$\{|\{)\s*([A-Za-z_$][\w.$?]*)\s*\}?/g;

/** `booking.id`, `bookingId`, `data.booking.id` — mọi thứ trỏ về UUID. */
const LOOKS_LIKE_ROW_ID = /(^|[.\s])id$|\.id$|bookingid$/i;

function collectOffenders(): string[] {
  const offenders: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;

      const source = readFileSync(full, 'utf8');
      for (const match of source.matchAll(LABELLED_VALUE)) {
        const value = match[1];
        if (LOOKS_LIKE_ROW_ID.test(value) && !/code/i.test(value)) {
          offenders.push(`${full.replace(`${process.cwd()}/`, '')}: ${match[0].trim()}`);
        }
      }
    }
  };

  for (const dir of CUSTOMER_FACING_DIRS) walk(join(process.cwd(), dir));
  return offenders;
}

describe('nhãn "Mã đặt chỗ" không in UUID dòng bookings', () => {
  it('không chỗ nào ở màn khách in giá trị lấy từ id', () => {
    expect(collectOffenders()).toEqual([]);
  });

  it('toast đặt chỗ thành công in PNR', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/bookings/components/FlightBookingClient.tsx'),
      'utf8'
    );
    const toast = /Mã đặt chỗ:\s*\$\{([^}]+)\}/.exec(source);
    expect(toast).not.toBeNull();
    expect(toast![1]).toMatch(/code/i);
  });
});
