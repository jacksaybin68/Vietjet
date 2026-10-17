#!/usr/bin/env node
/**
 * Seed lịch bay theo lô tới một mốc ngày (mặc định: qua Tết âm lịch).
 *
 *   node scripts/seed-schedule-until.cjs --dry-run
 *   node scripts/seed-schedule-until.cjs --until 2027-02-20 --allow-remote --yes
 *   node scripts/seed-schedule-until.cjs --replace --allow-remote --yes
 *
 * Vì sao có script này thay vì chỉ tăng `SEED_FLIGHT_DAYS` của
 * `seed-future-flights.cjs`: script kia đăng từng chuyến qua HTTP API, và mỗi
 * request là một vòng tới Neon ở us-east-1. Phủ từ hôm nay tới Tết là ~125 ngày
 * × ~84 tuyến × 2 sóng ≈ 21.000 chuyến, tức ~21.000 vòng — hàng chục phút và
 * đủ để timeout giữa đường. Ở đây mỗi 1.000 chuyến đi trong một câu lệnh.
 *
 * Ghi theo lô cũng an toàn hơn cho dữ liệu đã có người đặt: mặc định script
 * **chỉ thêm**, `ON CONFLICT (from_code, to_code, depart_time) DO NOTHING`,
 * không xoá gì cả.
 *
 * `--replace` là chế độ *cập nhật* lịch, không phải thêm: nó xoá trước mọi hàng
 * của chính các số hiệu trong `flight-schedule.cjs` nằm trong khoảng ngày, rồi
 * tạo lại bằng giá/giờ mới. Cần chế độ này khi `data/vietjet-schedule.csv` đổi
 * giá hoặc giờ khởi hành — `ON CONFLICT` khoá theo (tuyến, giờ), nên hàng cũ ở
 * giờ cũ sẽ nằm lại cạnh hàng mới chứ không bị ghi đè, và kết quả là mỗi tuyến
 * hiện hai chuyến. Xoá vẫn chừa chuyến đã có booking (`NOT EXISTS` trên
 * `bookings.flight_id`), nên không có vé nào bị mất.
 *
 * Vì sao không dùng `seed-future-flights.cjs` để cập nhật: script đó cũng xoá
 * theo số hiệu, nhưng đi qua HTTP API và đăng nhập **một lần**. Access token
 * sống 15 phút, còn pha quét của nó (168 số hiệu × GET + DELETE) chậm hơn thế
 * khi dev server đang HMR — token hết hạn giữa đường, mọi POST sau đó trả 401,
 * và lần chạy đã xoá hàng loạt mà tạo được 0 hàng. Ở đây không có token và
 * không phụ thuộc dev server.
 *
 * Ghi vào đúng database mà `DATABASE_URL` chỉ tới, qua `scripts/db-target.cjs`,
 * nên host từ xa cần `--allow-remote --yes`.
 */

const { resolveDatabaseUrl } = require('./db-target.cjs');
const { buildSchedule, ROUTES, businessNo } = require('./flight-schedule.cjs');

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
};

const DRY_RUN = argv.includes('--dry-run');
/** Cập nhật (xoá hàng cũ của chính mình rồi tạo lại) thay vì chỉ thêm. */
const REPLACE = argv.includes('--replace');
const CHUNK = 1000;

const pad = (n) => String(n).padStart(2, '0');
/** Ngày địa phương dạng `YYYY-MM-DD` (`toISOString` sẽ lùi một ngày ở múi +07). */
const dayString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Hôm nay theo lịch Việt Nam, dạng `YYYY-MM-DD`. */
function todayInVietnam() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const parseDay = (value, fallback) => {
  const text = value ?? fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`Ngày không hợp lệ: ${text}`);
  return new Date(`${text}T00:00:00`);
};

const today = todayInVietnam();
const tomorrow = new Date(`${today}T00:00:00`);
tomorrow.setDate(tomorrow.getDate() + 1);

const from = parseDay(
  flag('--from'),
  `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
);
// Tết Đinh Mùi là 2027-02-06; mặc định phủ thêm hai tuần để còn đặt được chuyến về.
const until = parseDay(flag('--until'), process.env.SEED_UNTIL || '2027-02-20');

async function main() {
  if (until < from) throw new Error(`--until (${until.toDateString()}) trước --from`);

  const rows = buildSchedule({ from, until });
  console.log(`📅 Lịch: ${from.toDateString()} → ${until.toDateString()}`);
  console.log(`🛫 Tuyến: ${ROUTES.length}  •  chuyến sẽ dựng: ${rows.length}`);
  console.log(
    `🎯 Chế độ: ${DRY_RUN ? 'DRY-RUN (không ghi gì)' : REPLACE ? 'GHI THẬT — THAY THẾ (xoá hàng cũ của chính lịch này rồi tạo lại)' : 'GHI THẬT — CHỈ THÊM'}\n`
  );

  const byMonth = new Map();
  for (const r of rows) {
    const m = r.depart_time.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
  }
  console.log('Chuyến theo tháng:');
  for (const [m, n] of [...byMonth.entries()].sort()) console.log(`   ${m}  ${n}`);
  console.log('\nVí dụ 3 chuyến đầu:');
  rows.slice(0, 3).forEach((r) => console.log('   ' + JSON.stringify(r)));

  if (DRY_RUN) {
    console.log(
      `\n✅ Dry-run xong. Chạy thật:\n   node scripts/seed-schedule-until.cjs${REPLACE ? ' --replace' : ''} --until ${dayString(until)} --allow-remote --yes`
    );
    return;
  }

  const url = resolveDatabaseUrl(argv);
  const host = new URL(url).hostname;
  console.log(`\n🗄️  Ghi vào: ${host}`);
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(url);

  if (REPLACE) {
    const numbers = [...ROUTES.map(([no]) => no), ...ROUTES.map((_, i) => businessNo(i))];
    const deleted = await sql`
      WITH del AS (
        DELETE FROM flights f
        WHERE f.flight_no = ANY(string_to_array(${numbers.join(',')}, ',')::text[])
          AND (f.depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
              BETWEEN ${dayString(from)}::date AND ${dayString(until)}::date
          AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.flight_id = f.id)
        RETURNING 1
      )
      SELECT count(*)::int AS n FROM del
    `;
    console.log(`\n🧹 Đã xoá ${deleted[0].n} hàng cũ (chừa chuyến có booking).`);
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const result = await sql`
      WITH ins AS (
        INSERT INTO flights (
          flight_no, from_code, to_code, depart_time, arrive_time,
          price, class, available, economy_price, business_price
        )
        SELECT
          x.flight_no, x.from_code, x.to_code,
          x.depart_time::timestamptz, x.arrive_time::timestamptz,
          x.price, x.class, x.available, x.economy_price, x.business_price
        FROM jsonb_to_recordset(${JSON.stringify(chunk)}::jsonb) AS x(
          flight_no text, from_code text, to_code text,
          depart_time text, arrive_time text,
          price numeric, class text, available int,
          economy_price numeric, business_price numeric
        )
        ON CONFLICT (from_code, to_code, depart_time) DO NOTHING
        RETURNING 1
      )
      SELECT count(*)::int AS n FROM ins
    `;
    inserted += result[0].n;
    process.stdout.write(`\r   đã thêm ${inserted} / ${rows.length}…`);
  }

  console.log(
    `\n\n✅ Thêm mới: ${inserted}` +
      `\nℹ️  Bỏ qua (đã có chuyến cùng tuyến và giờ): ${rows.length - inserted}` +
      (REPLACE
        ? '\n   Hàng cũ của lịch này đã bị xoá trước khi tạo lại.'
        : '\n   Không xoá chuyến nào.')
  );
}

main().catch((error) => {
  console.error('❌ Lỗi:', error.message);
  process.exit(1);
});
