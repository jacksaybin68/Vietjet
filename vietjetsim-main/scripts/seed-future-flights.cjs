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
/**
 * Admin credentials, from the environment. There is no single admin address:
 * migration 022 renames the demo rows to `@vietjetair.vn`, and a real
 * database carries its own `admin@vietjetsim.vn` — `scripts/reset-admin.cjs`
 * can set a third password. A hard-coded pair meant this script exited 401 on
 * every database but the one it was written against, so the rolling window it
 * exists to maintain silently stopped.
 */
const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@vietjetair.vn',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};

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
  // International, matching 028's network and its real block times. Without
  // these the rolling window covered the domestic list only, so a search for
  // HAN→Seoul came back empty as soon as 028's own week ran out.
  ['VJ401', 'HAN', 'SIN', '09:00', 210, 2450000, 6786500, 180],
  ['VJ411', 'SIN', 'HAN', '13:30', 210, 2550000, 7053500, 180],
  ['VJ421', 'SGN', 'ICN', '09:00', 320, 4900000, 13573000, 180],
  ['VJ431', 'ICN', 'SGN', '14:00', 320, 5000000, 13850000, 180],
  ['VJ441', 'HAN', 'BKK', '08:20', 165, 1650000, 4570500, 180],
  ['VJ451', 'SGN', 'MNL', '10:40', 205, 2650000, 7340500, 160],
  ['VJ461', 'HAN', 'KIX', '11:10', 350, 5600000, 15512000, 150],
  ['VJ471', 'SGN', 'HKG', '07:50', 200, 3250000, 9002500, 170],
  // Migration 028 flies Hanoi–Seoul in both directions; the rolling window
  // has to cover the same pair or a repeat of that day's search finds nothing
  // once 028's own week runs out.
  ['VJ481', 'HAN', 'ICN', '08:30', 320, 5100000, 14127000, 170],
  ['VJ491', 'SGN', 'BKK', '13:10', 165, 1750000, 4847500, 180],
];

/** Business is scheduled as the second wave of the day, +3h from economy. */
const BUSINESS_SHIFT_MIN = 180;
/**
 * How far ahead the window reaches. Three weeks, not the week the date strip
 * shows: the strip renders seven days, so a customer can only *reach* the first
 * seven — but anyone who picks a date from a search result, follows a booking
 * link, or simply comes back next week lands outside a seven-day window and
 * finds nothing. Three weeks means forgetting to re-run this for a fortnight
 * still leaves the site answerable.
 */
const DAYS = Number(process.env.SEED_FLIGHT_DAYS) || 21;

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
    console.error(`❌ Admin login failed (${login.status}) for ${ADMIN.email}`);
    console.error('   The account or password does not match this database. Set them and re-run:');
    console.error('     SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed-flights');
    console.error(
      '   On a fresh database "npm run db:seed-demo" creates admin@vietjetair.vn/admin123.'
    );
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
        { cls: 'economy', price: ecoPrice, available: seats, shift: 0, suffix: '' },
        {
          cls: 'business',
          price: bizPrice,
          available: Math.max(20, Math.round(seats / 3)),
          shift: BUSINESS_SHIFT_MIN,
          // A distinct number. Both waves used the base number, so a day held
          // two rows under one `flight_no` and the results list printed the same
          // service twice — which is what 031 exists to clean up after.
          suffix: 'B',
        },
      ];

      for (const v of variants) {
        const res = await fetch(`${BASE_URL}/api/quan-tri/chuyen-bay`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flight_no: no + v.suffix,
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
