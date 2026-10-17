#!/usr/bin/env node
/**
 * Xem trước lịch bay curated TRƯỚC khi ghi database.
 *
 *   node scripts/preview-flight-schedule.cjs            # toàn bộ tuyến
 *   node scripts/preview-flight-schedule.cjs --day 2026-11-05
 *
 * KHÔNG ghi gì: chỉ đọc `data/vietjet-schedule.csv` qua `flight-schedule.cjs`
 * (đã kiểm bất biến lúc nạp) rồi in ra. Dùng để đối chiếu giá/giờ với hãng và
 * soát trước khi chạy `npm run db:seed-flights` — script ghi thật.
 *
 * Vì sao cần bước này: `db:seed-flights` xoá các hàng cùng số hiệu rồi tạo lại,
 * nên một bảng giá hay giờ sai sẽ thay thế dữ liệu đang có chứ không nằm cạnh nó.
 */

const { ROUTES, buildSchedule, CSV_PATH, BUSINESS_SHIFT_MIN } = require('./flight-schedule.cjs');

/** `--day YYYY-MM-DD` lấy đúng một ngày; không truyền thì in bảng tuyến. */
function parseDay(argv) {
  const i = argv.indexOf('--day');
  if (i === -1) return null;
  const value = argv[i + 1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
    console.error('❌ --day cần một ngày dạng YYYY-MM-DD');
    process.exit(1);
  }
  return value;
}

const vnd = (n) => n.toLocaleString('vi-VN');

function printRoutes() {
  console.log(`📄 Nguồn: ${CSV_PATH}`);
  console.log(`🧭 ${ROUTES.length} tuyến (mỗi tuyến 2 sóng/ngày: economy + business)\n`);

  const head = ['Số hiệu', 'Chặng', 'Giờ', 'Bay', 'Giá Eco', 'Giá Business', 'Ghế'];
  const rows = ROUTES.map(([no, from, to, depart, minutes, eco, biz, seats]) => [
    no,
    `${from}→${to}`,
    depart,
    `${minutes}m`,
    vnd(eco),
    vnd(biz),
    String(seats),
  ]);

  const widths = head.map((h, c) => Math.max(h.length, ...rows.map((r) => r[c].length)));
  const line = (cells) => cells.map((cell, c) => cell.padEnd(widths[c])).join('  ');
  console.log(line(head));
  console.log(widths.map((w) => '─'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));

  const flightsPerDay = ROUTES.length * 2;
  console.log(
    `\nTổng ${flightsPerDay} chuyến/ngày (đã gồm sóng business, cách ${BUSINESS_SHIFT_MIN} phút).`
  );
  console.log('ℹ️  Chưa ghi gì. Chạy `npm run db:seed-flights` để áp dụng lên database.');
}

function printDay(day) {
  const from = new Date(`${day}T00:00:00+07:00`);
  const rows = buildSchedule({ from, until: from }).sort((a, b) =>
    a.depart_time.localeCompare(b.depart_time)
  );
  console.log(`📅 ${day} — ${rows.length} chuyến\n`);

  const head = ['Giờ đi', 'Giờ đến', 'Số hiệu', 'Chặng', 'Hạng', 'Giá', 'Ghế trống'];
  const body = rows.map((r) => [
    r.depart_time.slice(11, 16),
    r.arrive_time.slice(11, 16),
    r.flight_no,
    `${r.from_code}→${r.to_code}`,
    r.class,
    vnd(r.price),
    String(r.available),
  ]);
  const widths = head.map((h, c) => Math.max(h.length, ...body.map((r) => r[c].length)));
  const line = (cells) => cells.map((cell, c) => cell.padEnd(widths[c])).join('  ');
  console.log(line(head));
  console.log(widths.map((w) => '─'.repeat(w)).join('  '));
  for (const r of body) console.log(line(r));
}

const day = parseDay(process.argv.slice(2));
if (day) printDay(day);
else printRoutes();
