#!/usr/bin/env node
/**
 * Lịch bay dùng chung cho các script seed — nạp từ `data/vietjet-schedule.csv`.
 *
 * Dữ liệu là bản *curated* theo số liệu công khai của Vietjet (trang giá vé,
 * trang tuyến bay, trang đội tàu trên vietjetair.com, cùng thời gian bay đã
 * công bố). Không thu thập từ API đặt vé của hãng: endpoint đó nằm sau AWS WAF
 * + chữ ký HMAC + proof-of-work, mọi lời gọi trần đều trả 403. Vì vậy giá và
 * giờ ở đây là mức tham chiếu hợp lý, không phải bản chụp giá theo thời gian
 * thực.
 *
 * Vì sao tách CSV ra khỏi code: trước đây tuyến/giờ/giá là hằng số trong file
 * này, nên muốn đối chiếu với hãng phải đọc JavaScript. CSV để người duyệt đọc
 * và sửa được, còn file này chỉ còn nhiệm vụ nạp + kiểm tra + dựng lịch.
 *
 * Các bất biến được kiểm ngay lúc nạp, vì đây là chốt duy nhất giữa dữ liệu
 * người viết và database sẽ từ chối nếu sai:
 *   - `flight_no` khớp CHECK của migration 036
 *   - khoá duy nhất `(from_code, to_code, depart_time)` không tự trùng
 *   - giá dương, và economy <= business
 *   - `business_price` = round(economy_price × 2.77) — bậc giá của migration 030
 *
 * Số hiệu hạng Business sinh theo VỊ TRÍ DÒNG (`BUSINESS_NO_BASE + index`), nên
 * thứ tự trong CSV chính là thứ tự số hiệu. Đổi thứ tự là đổi số hiệu, và script
 * seed (thay hàng theo `flight_no`) sẽ để lại bản cũ — xem đầu file CSV.
 */

const fs = require('fs');
const path = require('path');

/** Số hiệu sóng business; mỗi tuyến lấy `BUSINESS_NO_BASE + index` trong ROUTES. */
const BUSINESS_NO_BASE = 3001;
const businessNo = (index) => `VJ${BUSINESS_NO_BASE + index}`;

/** Business là sóng thứ hai trong ngày, sau economy 3 tiếng. */
const BUSINESS_SHIFT_MIN = 180;

/** Khớp `FLIGHT_NO_PATTERN` của src/lib/flight-no.ts và CHECK của migration 036. */
const FLIGHT_NO_PATTERN = /^[A-Z]{2} ?[0-9]{2,4}(-[0-9]{4})?$/;

const CSV_PATH = path.join(__dirname, '..', 'data', 'vietjet-schedule.csv');

const REQUIRED_COLUMNS = [
  'flight_no',
  'from_code',
  'to_code',
  'depart_time',
  'block_minutes',
  'economy_price',
  'business_price',
  'seats',
  'aircraft',
  'source',
];

/**
 * Bậc giá của migration 030, nguyên văn: hàng business lấy `price / 2.77` làm
 * giá economy, mọi hạng khác lấy `price`; chiều ngược lại nhân 2.77. Giữ đúng
 * công thức này để hàng seed không lệch bậc so với hàng tạo qua admin.
 */
const fareLadder = (cls, price) =>
  cls === 'business'
    ? { economy_price: Math.round(price / 2.77), business_price: Math.round(price) }
    : { economy_price: Math.round(price), business_price: Math.round(price * 2.77) };

/** CSV nhỏ và không có dấu phẩy trong ô, nên tách bằng dấu phẩy là đủ — nhưng
 * vẫn từ chối ô thừa/thiếu thay vì im lặng nhận dữ liệu lệch cột. */
function parseCsv(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  let header = null;

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return; // chú thích nguồn ở đầu file

    const cells = line.split(',').map((c) => c.trim());
    if (!header) {
      header = cells;
      const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
      if (missing.length) {
        throw new Error(`vietjet-schedule.csv thiếu cột: ${missing.join(', ')}`);
      }
      return;
    }

    if (cells.length !== header.length) {
      throw new Error(
        `vietjet-schedule.csv dòng ${i + 1}: ${cells.length} ô, mong đợi ${header.length}`
      );
    }
    const row = {};
    header.forEach((key, col) => (row[key] = cells[col]));
    rows.push(row);
  });

  if (!rows.length) throw new Error('vietjet-schedule.csv không có dòng dữ liệu nào');
  return rows;
}

/** Nạp CSV thành tuple đúng hình dạng `seed-future-flights.cjs` đang đọc. */
function loadRoutes() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const seen = new Set();

  return rows.map((row, index) => {
    const { flight_no, from_code, to_code, depart_time } = row;
    const block_minutes = Number(row.block_minutes);
    const economy_price = Number(row.economy_price);
    const business_price = Number(row.business_price);
    const seats = Number(row.seats);

    const fail = (why) => {
      throw new Error(`vietjet-schedule.csv dòng ${index + 2} (${flight_no}): ${why}`);
    };

    if (!FLIGHT_NO_PATTERN.test(flight_no)) fail(`số hiệu không khớp CHECK của 036`);
    if (![from_code, to_code, depart_time].every(Boolean)) fail('thiếu sân bay/giờ khởi hành');
    if (!/^\d{2}:\d{2}$/.test(depart_time)) fail(`giờ khởi hành "${depart_time}" không phải HH:MM`);
    if (!Number.isFinite(block_minutes) || block_minutes <= 0) fail('block_minutes không hợp lệ');
    if (!Number.isFinite(seats) || seats <= 0) fail('seats không hợp lệ');
    if (!Number.isFinite(economy_price) || economy_price <= 0) fail('economy_price không hợp lệ');

    const expectedBusiness = Math.round(economy_price * 2.77);
    if (business_price !== expectedBusiness) {
      fail(
        `business_price ${business_price} ≠ round(${economy_price} × 2.77) = ${expectedBusiness}`
      );
    }
    if (economy_price > business_price) fail('economy_price > business_price (030 từ chối)');

    const key = `${from_code}-${to_code}-${depart_time}`;
    if (seen.has(key)) fail(`trùng khoá duy nhất (from, to, depart_time): ${key}`);
    seen.add(key);

    return [
      flight_no,
      from_code,
      to_code,
      depart_time,
      block_minutes,
      economy_price,
      business_price,
      seats,
    ];
  });
}

const ROUTES = loadRoutes();

const pad = (n) => String(n).padStart(2, '0');

/** Vietnam-local ISO timestamp with an explicit +07:00 offset. */
function vnTime(date, hhmm, extraMin = 0) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m + extraMin);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+07:00`;
}

/** `HH:MM` cộng thêm phút, dùng để rải giờ khởi hành cho khỏi trùng một giờ. */
const shiftTime = (hhmm, extraMin) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + extraMin;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
};

/**
 * Mọi chuyến của lịch trong khoảng `[from, until]` (bao gồm hai đầu), mỗi tuyến
 * hai sóng. Trả về mảng hàng đã sẵn sàng để ghi, kèm bậc giá của 030.
 */
function buildSchedule({ from, until }) {
  const rows = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const last = new Date(until.getFullYear(), until.getMonth(), until.getDate());

  while (cursor <= last) {
    const date = new Date(cursor);
    ROUTES.forEach(
      ([no, fromCode, toCode, depart, durationMin, ecoPrice, bizPrice, seats], index) => {
        const waves = [
          { cls: 'economy', price: ecoPrice, available: seats, shift: 0, no },
          {
            cls: 'business',
            price: bizPrice,
            available: Math.max(20, Math.round(seats / 3)),
            shift: BUSINESS_SHIFT_MIN,
            no: businessNo(index),
          },
        ];
        for (const wave of waves) {
          rows.push({
            flight_no: wave.no,
            from_code: fromCode,
            to_code: toCode,
            depart_time: vnTime(date, depart, wave.shift),
            arrive_time: vnTime(date, depart, wave.shift + durationMin),
            price: wave.price,
            class: wave.cls,
            available: wave.available,
            ...fareLadder(wave.cls, wave.price),
          });
        }
      }
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}

module.exports = {
  ROUTES,
  BUSINESS_NO_BASE,
  BUSINESS_SHIFT_MIN,
  CSV_PATH,
  businessNo,
  buildSchedule,
  fareLadder,
  shiftTime,
  vnTime,
};
