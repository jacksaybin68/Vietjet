#!/usr/bin/env node
/**
 * Seed Future Demo Flights Script
 * Run: node scripts/seed-future-flights.cjs
 *
 * The flights created by migrations/014_seed_demo_data.sql are anchored to
 * `CURRENT_DATE + 1 day` at the time that migration ran. Once that day passes
 * every seeded flight is in the past and flight search returns nothing, which
 * makes the booking flow impossible to exercise.
 *
 * This script posts a rolling week of realistic domestic flights through the
 * public admin API (POST /api/quan-tri/chuyen-bay) so the add-flight path is
 * exercised for real, including its CSRF and RBAC guards.
 *
 * Idempotent: rows are matched by their flight numbers and replaced, so
 * re-running refreshes the window instead of duplicating it. The 120 rows owned
 * by migration 014 (flight numbers like "VJ 105", "VJ303-1011") are never
 * touched.
 *
 * TIMEZONE: every timestamp is sent with an explicit +07:00 offset.
 * `flights.depart_time` is TIMESTAMPTZ and the Neon session TimeZone is GMT, so
 * a bare "YYYY-MM-DDTHH:MM:00" is read as UTC — 7 hours off Hanoi time, which
 * pushes late-evening departures into the next calendar day and breaks the
 * +07:00 window searchFlights() filters on.
 *
 * Writes to whatever DATABASE_URL points at, so confirm the target first.
 */

const BASE_URL = process.env.SITE_URL || 'http://localhost:4028';
const ADMIN = { email: 'admin@vietjetair.vn', password: 'admin123' };

// [flight_no, from, to, depart, durationMin, economyPrice, businessPrice, seats]
const ROUTES = [
  ['VJ301', 'HAN', 'SGN', '06:00', 145, 899000, 2490000, 189],
  ['VJ311', 'SGN', 'HAN', '09:15', 145, 949000, 2590000, 189],
  ['VJ321', 'HAN', 'DAD', '07:30', 85, 749000, 1990000, 189],
  ['VJ331', 'DAD', 'HAN', '12:40', 85, 699000, 1890000, 189],
  ['VJ341', 'HAN', 'CXR', '08:20', 105, 829000, 2190000, 150],
  ['VJ351', 'SGN', 'PQC', '10:05', 80, 699000, 1890000, 150],
  ['VJ361', 'HAN', 'HPH', '14:10', 60, 449000, 1290000, 100],
  ['VJ371', 'SGN', 'DLI', '06:45', 115, 769000, 1990000, 150],
  ['VJ381', 'HUI', 'SGN', '11:30', 95, 659000, 1790000, 120],
  ['VJ391', 'VCA', 'SGN', '16:20', 80, 599000, 1690000, 120],
];

/** Business is scheduled as the second wave of the day, +3h from economy. */
const BUSINESS_SHIFT_MIN = 180;
const DAYS = 7;

const pad = (n) => String(n).padStart(2, '0');

/** Vietnam-local ISO timestamp with an explicit +07:00 offset. */
function vnTime(date, hhmm, extraMin = 0) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m + extraMin);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+07:00`;
}

function cookiesFrom(res) {
  const out = {};
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0) out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
  return out;
}

const toCookieHeader = (jar) =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

async function main() {
  console.log(`🎯 Target API: ${BASE_URL}\n`);

  const login = await fetch(`${BASE_URL}/api/xac-thuc/dang-nhap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  if (login.status !== 200) {
    console.error(`❌ Admin login failed (${login.status}). Run "npm run db:seed-demo" first.`);
    process.exit(1);
  }
  const jar = cookiesFrom(login);
  const csrf = jar['csrf_token'];
  const authHeaders = { cookie: toCookieHeader(jar), 'x-csrf-token': csrf };

  // Replace anything this script previously created so re-runs stay idempotent.
  let removed = 0;
  for (const [no] of ROUTES) {
    const list = await fetch(`${BASE_URL}/api/quan-tri/chuyen-bay?search=${no}&limit=100`, {
      headers: authHeaders,
    }).then((r) => r.json());
    for (const f of list.flights ?? []) {
      const del = await fetch(`${BASE_URL}/api/quan-tri/chuyen-bay?flight_id=${f.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (del.status === 200) removed += 1;
    }
  }
  console.log(`🧹 Removed ${removed} previously seeded future flights.\n`);

  const created = [];
  const failures = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 1; day <= DAYS; day += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);

    for (const [no, from, to, depart, durationMin, ecoPrice, bizPrice, seats] of ROUTES) {
      const variants = [
        { cls: 'economy', price: ecoPrice, available: seats, shift: 0 },
        {
          cls: 'business',
          price: bizPrice,
          available: Math.max(20, Math.round(seats / 3)),
          shift: BUSINESS_SHIFT_MIN,
        },
      ];

      for (const v of variants) {
        const res = await fetch(`${BASE_URL}/api/quan-tri/chuyen-bay`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flight_no: no,
            from_code: from,
            to_code: to,
            depart_time: vnTime(date, depart, v.shift),
            arrive_time: vnTime(date, depart, v.shift + durationMin),
            price: v.price,
            class: v.cls,
            available: v.available,
          }),
        });
        const text = await res.text();
        if (res.status === 201) {
          created.push(JSON.parse(text).flight);
        } else {
          failures.push({ status: res.status, body: text.slice(0, 160) });
        }
      }
    }
  }

  const byDate = new Map();
  for (const f of created) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
      new Date(f.depart_time)
    );
    byDate.set(day, (byDate.get(day) ?? 0) + 1);
  }

  console.log(`✅ created: ${created.length}   failed: ${failures.length}`);
  failures.slice(0, 8).forEach((f) => console.log(`   FAIL ${f.status} ${f.body}`));
  console.log('\nFlights per day (Hanoi time):');
  for (const [day, n] of [...byDate.entries()].sort()) {
    console.log(`   ${day}  ${n} flights`);
  }
  console.log('\nDone. Flight search now returns results for the next 7 days.');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
