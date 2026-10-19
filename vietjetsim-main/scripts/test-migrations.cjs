#!/usr/bin/env node
/**
 * Migration replay test
 * Run: node scripts/test-migrations.cjs
 *
 * Applies every migrations/*.sql in filename order against a throwaway
 * Postgres 16 container, four times, and asserts the three things CI asserts
 * plus the one it does not.
 *
 * Why four passes and not two: pass 1 is the fresh database, where a seed that
 * re-adds rows cannot hide — it is allowed to grow, because the rolling-window
 * seeds key off "now" and each run seeds a new day. Passes 2-4 all run against
 * an already-populated database, and every one of them must be a no-op. Pass 3
 * is what catches a file that is only *partly* idempotent: pass 2 can succeed
 * after writing rows that pass 3 then trips over.
 *
 * Why a diff and not a row count: a seed that rewrites prices without adding
 * rows passes the count check. Every one of those four bugs was invisible to
 * both `npm test` (which runs against the in-memory mock, so migrations never
 * execute) and to a count. This is the check that would have caught them.
 *
 * Requires Docker. Exits non-zero on the first failure so CI fails loudly.
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONTAINER = 'vj-migration-test-pg';
const PASSES = 4;
// 16-alpine is what CI pins (`.github/workflows/ci.yml`). A different major
// version would make a local pass and a CI fail disagree for no real reason.
const IMAGE = 'postgres:16-alpine';
const DB = { user: 'postgres', name: 'app' };
const READY_TIMEOUT_S = 40;

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

let failures = 0;

function check(label, ok, detail) {
  if (ok) {
    console.info(`  ok    ${label}`);
    return true;
  }
  failures += 1;
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  return false;
}

function docker(args, opts = {}) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}

/** Run SQL inside the container, returning stdout. Throws on SQL error. */
function psql(sql) {
  return docker([
    'exec',
    '-i',
    CONTAINER,
    'psql',
    '-U',
    DB.user,
    '-d',
    DB.name,
    '-v',
    'ON_ERROR_STOP=1',
    '-tA',
    '-F',
    '|',
    '-c',
    sql,
  ]).trim();
}

/**
 * Apply every migration once, in filename order — the same loop CI runs.
 *
 * `psql -f -` with no `BEGIN`, so each statement is its own transaction. A file
 * that fails halfway leaves its earlier statements committed; that is why the
 * container is disposable and never reused between passes.
 */
function applyAll(pass) {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const res = spawnSync(
      'docker',
      [
        'exec',
        '-i',
        CONTAINER,
        'psql',
        '-U',
        DB.user,
        '-d',
        DB.name,
        '-v',
        'ON_ERROR_STOP=1',
        '-q',
        '-f',
        '-',
      ],
      { input: sql, encoding: 'utf8' }
    );
    if (res.status !== 0) {
      console.error(`\n  FAIL  pass ${pass}: ${file} failed to apply`);
      // psql prints the failing line last; that is the one worth seeing.
      const err = (res.stderr || '').trim().split('\n').filter(Boolean);
      err.slice(-8).forEach((line) => console.error(`        ${line}`));
      failures += 1;
      return false;
    }
  }
  return true;
}

/**
 * A fingerprint of every seeded flight's business data.
 *
 * `depart_time` is rendered in Vietnam time with an explicit offset rather than
 * dumped raw, because a `TIMESTAMPTZ` printed in the session zone would hide a
 * session-zone dependency rather than expose it.
 */
const FINGERPRINT_SQL = `
  SELECT flight_no, from_code, to_code,
         to_char(depart_time, 'YYYY-MM-DD HH24:MI+07'),
         price, class, available,
         coalesce(economy_price, -1), coalesce(business_price, -1)
  FROM flights
  ORDER BY flight_no, from_code, to_code, depart_time
`;

function startPostgres() {
  spawnSync('docker', ['rm', '-f', CONTAINER], { encoding: 'utf8' });
  docker([
    'run',
    '-d',
    '--name',
    CONTAINER,
    '-e',
    'POSTGRES_PASSWORD=pw',
    '-e',
    `POSTGRES_DB=${DB.name}`,
    IMAGE,
  ]);

  for (let i = 1; i <= READY_TIMEOUT_S; i++) {
    // A real query, not `pg_isready`. The image starts Postgres twice — a
    // temporary server for initdb, then the real one — and `pg_isready` answers
    // the temporary one, so it reports ready and then the next statement fails
    // with "the database system is shutting down". Waiting until a query
    // actually round-trips cannot hit that window.
    const ready = spawnSync(
      'docker',
      ['exec', CONTAINER, 'psql', '-U', DB.user, '-d', DB.name, '-tAc', 'SELECT 1'],
      { encoding: 'utf8' }
    );
    if (ready.status === 0 && ready.stdout.trim() === '1') {
      console.info(`  ok    Postgres ready after ${i}s`);
      return true;
    }
    // A missing binary or a stopped Docker daemon is not "still starting" — the
    // loop would burn the full timeout and then blame Postgres for it.
    if (ready.error) {
      console.error(`  FAIL  cannot run docker: ${ready.error.message}`);
      failures += 1;
      return false;
    }
    spawnSync('sleep', ['1']);
  }
  console.error(`  FAIL  Postgres did not become ready within ${READY_TIMEOUT_S}s`);
  try {
    console.error(docker(['logs', '--tail', '20', CONTAINER]));
  } catch {
    /* logs are best-effort */
  }
  failures += 1;
  return false;
}

function stopPostgres() {
  spawnSync('docker', ['rm', '-f', CONTAINER], { encoding: 'utf8' });
}

function checkInvariants() {
  check(
    'public tables exist',
    /^[0-9]{2,}$/.test(
      psql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
    )
  );
  check(
    'fk_bookings_discount_code exists',
    psql("SELECT count(*) FROM pg_constraint WHERE conname='fk_bookings_discount_code';") === '1'
  );
  // The booking flow writes here inside the same CTE that inserts the booking,
  // so a missing table fails every booking with 'relation "booking_consents"
  // does not exist'. Created by 018.
  check(
    'booking_consents exists',
    psql(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='booking_consents';"
    ) === '1'
  );
  // ── Tables no seed file writes to ──────────────────────────────────────
  //
  // `flights` is the only table the replay test counts and the only one it
  // fingerprints, so a defect in any other table is invisible to it. That is not
  // hypothetical: three tables were deleted outright on every re-apply — `011`
  // opened with `DROP TABLE IF EXISTS check_in CASCADE`, `000` with
  // `DROP TABLE IF EXISTS announcements`, `010` dropped all three chat tables —
  // and the `flights` count never moved. Asserting that those tables *exist*
  // would not have caught it either, because the following file recreates an
  // empty one, so the table was present at every check. Only a row put in before
  // a pass and looked for after it can tell deletion from recreation; see
  // `seedOperatingRows` and `checkOperatingRows`, which do exactly that.
  //
  // What *is* worth asserting structurally is the keys `003`'s seeds conflict
  // on. A targetless `ON CONFLICT DO NOTHING` guards only the unique indexes a
  // table happens to have, so a missing key silently turns "seed once" into
  // "seed forever" — measured at 4 programs and 40 tiers after three re-applies,
  // every one of them served to the loyalty tab by `getUserLoyaltyWithProgram`.
  for (const [table, name] of [
    ['loyalty_programs', 'loyalty_programs_name_key'],
    ['loyalty_tiers', 'loyalty_tiers_program_id_name_key'],
  ]) {
    check(
      `${name} exists and is validated`,
      psql(
        "SELECT count(*) FROM pg_constraint WHERE conname='" +
          name +
          "' AND conrelid = '" +
          table +
          "'::regclass AND contype = 'u' AND convalidated;"
      ) === '1'
    );
  }
}

/**
 * Row counts for the tables no seed file writes to.
 *
 * The `flights` count and fingerprint above cannot see a row that was deleted
 * rather than rewritten, which is why these tables need their own pass-to-pass
 * comparison.
 */
const OPERATING_TABLES_SQL = `
  SELECT 'check_in=' || count(*) FROM check_in
  UNION ALL SELECT 'announcements=' || count(*) FROM announcements
  UNION ALL SELECT 'chat_conversations=' || count(*) FROM chat_conversations
  UNION ALL SELECT 'chat_messages=' || count(*) FROM chat_messages
  UNION ALL SELECT 'loyalty_programs=' || count(*) FROM loyalty_programs
  UNION ALL SELECT 'loyalty_tiers=' || count(*) FROM loyalty_tiers
  UNION ALL SELECT 'phone_otp=' || count(*) FROM phone_otp
  UNION ALL SELECT 'referral_events=' || count(*) FROM referral_events
  ORDER BY 1
`;

/**
 * One operating customer: a booked and checked-in trip, a support conversation
 * with a message in it, a published notice and a loyalty enrollment.
 *
 * Real records rather than sentinels in a scratch column, because the point is
 * to prove the files leave other people's data alone. Removed again before the
 * next pass so the flight counts and fingerprints are unaffected.
 */
function seedOperatingRows() {
  psql(`
    INSERT INTO user_profiles (id, email, password_hash, full_name, phone)
    SELECT gen_random_uuid()::text, 'migration-canary@vietjetsim.invalid', 'x',
           'Migration Canary', '0900000777'
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE email = 'migration-canary@vietjetsim.invalid');

    INSERT INTO bookings (user_id, flight_id, status, total_price)
    SELECT u.id, f.id, 'confirmed', f.price
    FROM user_profiles u, flights f
    WHERE u.email = 'migration-canary@vietjetsim.invalid'
      AND f.id = (SELECT id FROM flights ORDER BY id LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM bookings b JOIN user_profiles u2 ON u2.id = b.user_id
                      WHERE u2.email = 'migration-canary@vietjetsim.invalid');

    INSERT INTO passengers (booking_id, name, dob, passenger_type)
    SELECT b.id, 'CANARY', '1990-01-01', 'adult'
    FROM bookings b JOIN user_profiles u ON u.id = b.user_id
    WHERE u.email = 'migration-canary@vietjetsim.invalid'
      AND NOT EXISTS (SELECT 1 FROM passengers p WHERE p.booking_id = b.id);

    INSERT INTO check_in (booking_id, passenger_id, check_in_number, boarding_pass_number,
                          seat_number, flight_no, from_code, to_code, depart_time, passenger_name)
    SELECT b.id, p.id, 'CANARY-CI', 'CANARY-BP', '1A', f.flight_no, f.from_code, f.to_code,
           f.depart_time, 'CANARY'
    FROM bookings b JOIN user_profiles u ON u.id = b.user_id
    JOIN passengers p ON p.booking_id = b.id JOIN flights f ON f.id = b.flight_id
    WHERE u.email = 'migration-canary@vietjetsim.invalid'
      AND NOT EXISTS (SELECT 1 FROM check_in c WHERE c.booking_id = b.id);

    INSERT INTO chat_conversations (id, user_id, user_email, user_name, status, last_message)
    SELECT gen_random_uuid(), u.id, u.email, u.full_name, 'active', 'canary'
    FROM user_profiles u
    WHERE u.email = 'migration-canary@vietjetsim.invalid'
      AND NOT EXISTS (SELECT 1 FROM chat_conversations c WHERE c.user_id = u.id);

    INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content)
    SELECT c.id, c.user_id, 'user', 'canary'
    FROM chat_conversations c JOIN user_profiles u ON u.id = c.user_id
    WHERE u.email = 'migration-canary@vietjetsim.invalid'
      AND NOT EXISTS (SELECT 1 FROM chat_messages m WHERE m.conversation_id = c.id);

    INSERT INTO announcements (title, content, type, is_active)
    SELECT 'canary', 'canary', 'info', true
    WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'canary');

    INSERT INTO user_loyalty (user_id, program_id, tier)
    SELECT u.id, p.id, 'Bronze'
    FROM user_profiles u CROSS JOIN loyalty_programs p
    WHERE u.email = 'migration-canary@vietjetsim.invalid' AND p.is_active
      AND NOT EXISTS (SELECT 1 FROM user_loyalty l WHERE l.user_id = u.id);

    INSERT INTO phone_otp (phone, purpose, code_hash, expires_at)
    SELECT '0900000777', 'login', 'canary', NOW() + INTERVAL '5 minutes'
    WHERE NOT EXISTS (SELECT 1 FROM phone_otp WHERE phone = '0900000777');

    INSERT INTO referral_events (referee_user_id, referral_code, points_awarded)
    SELECT u.id, 'SJ20000001', 0
    FROM user_profiles u
    WHERE u.email = 'migration-canary@vietjetsim.invalid'
      AND NOT EXISTS (SELECT 1 FROM referral_events r WHERE r.referee_user_id = u.id);
  `);
}
/** The canary must survive every re-apply: an empty table means a file dropped it. */
function checkOperatingRows(pass) {
  const emptied = psql(OPERATING_TABLES_SQL)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('=0'));
  check(
    `pass ${pass} keeps the rows it does not own`,
    emptied.length === 0,
    emptied.length > 0
      ? `replay emptied ${emptied.join(', ')} — a migration dropped a table it should have left alone`
      : ''
  );
}

function checkDataInvariants() {
  check(
    'no flight is left without a fare',
    psql('SELECT count(*) FROM flights WHERE economy_price IS NULL OR business_price IS NULL;') ===
      '0'
  );

  // A seed that prices rows it does not own is invisible to the pass-to-pass
  // diff: pass 1 already contains the overwritten value, so pass 2 matches it.
  // The only way to see it is to check each row's fare against the ladder the
  // row's own class implies — 030's formula, which every seed reuses:
  //   economy  -> economy_price = price,          business_price = price * 2.77
  //   business -> economy_price = price / 2.77,  business_price = price
  // A row priced by the wrong formula, or by another file's, misses this.
  check(
    'every fare matches its own class ladder',
    psql(`SELECT count(*) FROM flights
          WHERE (class = 'economy'
                  AND (economy_price IS DISTINCT FROM price
                       OR business_price IS DISTINCT FROM round(price * 2.77)))
             OR (class = 'business'
                  AND (economy_price IS DISTINCT FROM round(price / 2.77)
                       OR business_price IS DISTINCT FROM price));`) === '0',
    'a row is priced by a formula that does not match its class — scope the update by id'
  );
  // `flight_no` has no unique constraint — 031 exists because duplicates were
  // real — so "the same number twice in one day" is only catchable this way.
  check(
    'no flight number repeats within a day',
    psql(`SELECT count(*) FROM (
            SELECT 1 FROM flights
            GROUP BY (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, flight_no
            HAVING count(*) > 1
          ) x;`) === '0'
  );

  // Money invariants, added with migration 037. These are the checks a
  // row-fingerprint diff cannot make: a seed that re-credits a wallet, or that
  // re-applies a refund against a booking already paid back, produces a
  // different balance on pass 2 — but the fingerprint covers seeded flights,
  // not a customer's wallet.
  check(
    'no booking was refunded twice',
    psql(`SELECT count(*) FROM (
            SELECT reference_id FROM wallet_transactions
            WHERE type = 'refund' AND reference_id IS NOT NULL
            GROUP BY reference_id HAVING count(*) > 1
          ) x;`) === '0',
    '037 added wallet_transactions_one_refund_per_reference for this — a replay that trips it has a seed paying the same booking back twice'
  );
  // The partial-guard hole 037 closed: a NULL status satisfies neither branch of
  // `idx_refund_requests_open_booking`, so two open tickets for one booking slip
  // past the uniqueness check that is supposed to prevent a double payout.
  check(
    'at most one open refund ticket per booking',
    psql(`SELECT count(*) FROM (
            SELECT booking_id FROM refund_requests
            WHERE status IN ('pending','approved')
            GROUP BY booking_id HAVING count(*) > 1
          ) x;`) === '0'
  );
  check(
    'refund_requests.status is never null',
    psql('SELECT count(*) FROM refund_requests WHERE status IS NULL;') === '0',
    '037 sets NOT NULL — a null here means a write path supplies no status at all'
  );
  // Staging tables are dropped at the end of each file rather than with
  // `ON COMMIT DROP` (CI runs `psql -f` with no `BEGIN`, so there is no single
  // commit to hang one on). A leftover one means a file died before its DROP.
  check(
    'no staging table is left behind',
    psql(`SELECT count(*) FROM information_schema.tables
          WHERE table_schema IN ('public','pg_temp') AND table_name LIKE '\\_vj%';`) === '0'
  );
}

function main() {
  console.info('Migration replay test\n');

  if (!startPostgres()) return stopPostgresAndReport();

  try {
    let firstFingerprint = null;
    let referenceRows = null;

    for (let pass = 1; pass <= PASSES; pass++) {
      console.info(`\nPass ${pass}/${PASSES}`);

      if (!applyAll(pass)) break;

      // The canary is inserted once the schema exists and re-checked after every
      // later apply, so each replay has something real to lose. `flights` is the
      // only table counted below and the only one fingerprinted, which is why
      // these needed their own check rather than another assertion on the same
      // query. The rows stay: clearing them after each pass would mean the next
      // pass also starts empty and has nothing to lose either.
      if (pass === 1) seedOperatingRows();
      else checkOperatingRows(pass);

      const fingerprint = psql(FINGERPRINT_SQL);
      const rows = fingerprint ? fingerprint.split('\n').length : 0;
      console.info(`  flights = ${rows}`);

      if (pass === 1) {
        firstFingerprint = fingerprint;
        referenceRows = rows;
        check('fresh apply seeds flights', rows > 0, `got ${rows} rows`);
      } else {
        // Both halves matter. An added row means a seed re-added; a changed
        // value means a seed rewrote a row it does not own, which is the bug
        // that added zero rows and so passed every row count.
        check(
          `pass ${pass} adds no rows`,
          rows === referenceRows,
          `${rows} vs ${referenceRows} after pass 1`
        );
        check(
          `pass ${pass} changes no flight data`,
          fingerprint === firstFingerprint,
          'seed rewrote rows it did not insert — scope the update by id, not by a state predicate'
        );
        checkOperatingRows(pass);
      }

      checkInvariants();
      checkDataInvariants();
    }
  } finally {
    stopPostgres();
  }

  return stopPostgresAndReport();
}

function stopPostgresAndReport() {
  console.info('');
  if (failures > 0) {
    console.error(`Failed: ${failures} check(s)`);
    process.exit(1);
  }
  console.info('All migration checks passed.');
  process.exit(0);
}

main();
