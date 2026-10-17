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

/**
 * The route list, its flight numbering and the +07:00 timestamp helper live in
 * `flight-schedule.cjs`, so this rolling-window refresher and the bulk schedule
 * seeder cannot drift into two different networks. `BUSINESS_SHIFT_MIN` is the
 * gap between one route's economy and business waves.
 *
 * The values themselves (block times, departure times, fares, aircraft) are
 * curated from public Vietjet references and live in `data/vietjet-schedule.csv`
 * — `flight-schedule.cjs` loads and validates that file. Because this script
 * sweeps rows by `flight_no` and re-creates them, a bad fare replaces the data
 * on sale rather than sitting beside it, so preview first with
 * `npm run db:preview-flights` before running this one.
 */
const { ROUTES, BUSINESS_SHIFT_MIN, businessNo, vnTime } = require('./flight-schedule.cjs');
/**
 * How far ahead the window reaches. Three weeks, not the week the date strip
 * shows: the strip renders seven days, so a customer can only *reach* the first
 * seven — but anyone who picks a date from a search result, follows a booking
 * link, or simply comes back next week lands outside a seven-day window and
 * finds nothing. Three weeks means forgetting to re-run this for a fortnight
 * still leaves the site answerable.
 */
const DAYS = Number(process.env.SEED_FLIGHT_DAYS) || 21;

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

/** Cookie + CSRF của phiên admin hiện tại; đăng nhập lại sẽ thay cả hai. */
let authHeaders;

/** Đăng nhập admin và cất header dùng cho các request sau. */
async function login() {
  const res = await fetch(`${BASE_URL}/api/xac-thuc/dang-nhap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  if (res.status !== 200) {
    console.error(`❌ Admin login failed (${res.status}) for ${ADMIN.email}`);
    console.error('   The account or password does not match this database. Set them and re-run:');
    console.error('     SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed-flights');
    console.error(
      '   On a fresh database "npm run db:seed-demo" creates admin@vietjetair.vn/admin123.'
    );
    process.exit(1);
  }
  const jar = cookiesFrom(res);
  authHeaders = { cookie: toCookieHeader(jar), 'x-csrf-token': jar['csrf_token'] };
  return authHeaders;
}

/**
 * One admin login, but the access token it mints lives 15 minutes — and the
 * sweep (168 flight numbers × GET + DELETE) outlasts that whenever the dev
 * server is recompiling under HMR. A run that reached the create phase on an
 * expired token deleted its rows and then failed every POST with 401, leaving
 * 31 flight numbers with no rows at all while the script still exited 0. So a
 * 401 re-authenticates and retries once, and a long run cannot destroy the
 * network it came to refresh.
 */
async function authedFetch(url, init = {}) {
  const send = () => fetch(url, { ...init, headers: { ...authHeaders, ...(init.headers ?? {}) } });
  const res = await send();
  if (res.status !== 401) return res;
  await login();
  return send();
}

async function main() {
  console.log(`🎯 Target API: ${BASE_URL}\n`);

  await login();

  // Replace anything this script previously created so re-runs stay idempotent.
  // Both waves are swept: the business block as well as the economy numbers.
  // Cleaning up only the economy numbers left every business row from the
  // previous run in place, so each run doubled them.
  const sweepNumbers = [...ROUTES.map(([no]) => no), ...ROUTES.map((_, i) => businessNo(i))];
  let removed = 0;
  for (const no of sweepNumbers) {
    const list = await authedFetch(
      `${BASE_URL}/api/quan-tri/chuyen-bay?search=${no}&limit=100`
    ).then((r) => r.json());
    for (const f of list.flights ?? []) {
      const del = await authedFetch(`${BASE_URL}/api/quan-tri/chuyen-bay?flight_id=${f.id}`, {
        method: 'DELETE',
      });
      if (del.status === 200) removed += 1;
    }
  }
  console.log(`🧹 Removed ${removed} previously seeded future flights.\n`);

  const created = [];
  const failures = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /**
   * Slots migrations 027/028 already cover. A 409 means the service is already
   * on sale for that day, which is all the rolling window is for, so it is
   * counted rather than reported as a failure.
   */
  const alreadyThere = new Set();

  for (let day = 1; day <= DAYS; day += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);

    for (const [
      index,
      [no, from, to, depart, durationMin, ecoPrice, bizPrice, seats],
    ] of ROUTES.entries()) {
      const variants = [
        { cls: 'economy', price: ecoPrice, available: seats, shift: 0, no },
        {
          cls: 'business',
          price: bizPrice,
          available: Math.max(20, Math.round(seats / 3)),
          shift: BUSINESS_SHIFT_MIN,
          no: businessNo(index),
        },
      ];

      for (const v of variants) {
        const res = await authedFetch(`${BASE_URL}/api/quan-tri/chuyen-bay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flight_no: v.no,
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
        } else if (res.status === 409) {
          // Migrations 027/028 already fly HAN-SGN, HAN-SIN, SGN-ICN and
          // ICN-SGN out of the same hub slots this script wants, and the
          // database refuses two flights on one route at one minute. 28 of 840
          // requests landed here, which is why a run printed `failed: 28`
          // while the network was in fact complete.
          alreadyThere.add(`${from}-${to}`);
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
  if (alreadyThere.size > 0) {
    console.log(
      `ℹ️  ${alreadyThere.size} routes already covered by a migration seed, not re-created: ${[...alreadyThere].join(', ')}`
    );
  }
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
