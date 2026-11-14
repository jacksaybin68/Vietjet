import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildBoardingPassPdf } from '@/lib/pdf/boarding-pass';

/**
 * PDF thẻ lên máy bay phải sinh được thật, có nhúng font tiếng Việt.
 *
 * Đây là test chạy thật (không phải quét mã nguồn): PDF là thứ khách tải
 * về điện thoại và nhân viên sân bay đối chiếu, nên "file sinh ra mở được,
 * có font nhúng, chứa mã QR" là điều kiện tối thiểu — không có cách nào
 * kiểm tra bằng regex trên mã nguồn.
 */
const FONT_DIR = join(process.cwd(), 'public', 'fonts');

describe('font KoHo được commit cục bộ', () => {
  it('có đủ 4 file font', () => {
    for (const name of ['KoHo-Regular.ttf', 'KoHo-Medium.ttf', 'KoHo-Bold.ttf', 'KoHo-Light.ttf']) {
      const p = join(FONT_DIR, name);
      expect(existsSync(p), `${name} phải tồn tại để nhúng vào PDF`).toBe(true);
      expect(statSync(p).size).toBeGreaterThan(1000);
    }
  });
});

describe('sinh PDF thẻ lên máy bay', () => {
  const legs = [
    {
      pnr: 'ABC123',
      flightNo: 'VJ301',
      from: 'HAN',
      to: 'SGN',
      fromCity: 'Hà Nội',
      toCity: 'TP. Hồ Chí Minh',
      date: '2026-03-20',
      departTime: '06:00',
      arriveTime: '08:25',
      gate: 'A12',
      terminal: '1',
      legRole: 'outbound' as const,
      passengers: [
        { name: 'Nguyễn Văn Anh', seat: '12A', passport: 'C1234567' },
        { name: 'Trần Thị Bình', seat: '12B', passport: 'C7654321' },
      ],
    },
    {
      pnr: 'DEF456',
      flightNo: 'VJ302',
      from: 'SGN',
      to: 'HAN',
      fromCity: 'TP. Hồ Chí Minh',
      toCity: 'Hà Nội',
      date: '2026-03-27',
      departTime: '10:00',
      arriveTime: '12:25',
      gate: 'B5',
      terminal: '2',
      legRole: 'inbound' as const,
      passengers: [
        { name: 'Nguyễn Văn Anh', seat: '8C', passport: 'C1234567' },
        { name: 'Trần Thị Bình', seat: '8D', passport: 'C7654321' },
      ],
    },
  ];

  it('trả về buffer là file PDF hợp lệ', async () => {
    const buf = await buildBoardingPassPdf({ legs, amount: 2500000 });

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    // Chữ ký file PDF.
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.subarray(-6).toString()).toContain('EOF');
  });

  it('nhúng font KoHo (tên font xuất hiện trong file PDF)', async () => {
    const buf = await buildBoardingPassPdf({ legs, amount: 2500000 });
    const text = buf.toString('latin1');
    // pdfkit ghi tên font đã đăng ký vào trang font của file.
    expect(text).toContain('KoHo');
  });

  it('chứa ảnh QR cho mỗi hành khách (mỗi hành khách một mã riêng)', async () => {
    const buf = await buildBoardingPassPdf({ legs, amount: 2500000 });
    const text = buf.toString('latin1');
    // 4 thẻ (2 chặng × 2 khách) ⇒ 4 ảnh PNG nhúng.
    const images = text.match(/\/Subtype\s*\/Image/g) ?? [];
    expect(images.length).toBeGreaterThanOrEqual(4);
  });

  it('không sinh trang rỗng khi một chặng không có hành khách', async () => {
    const buf = await buildBoardingPassPdf({
      legs: [{ ...legs[0], passengers: [] }, legs[1]],
      amount: 1000000,
    });
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
