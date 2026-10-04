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
    const ready = spawnSync(
      'docker',
      ['exec', CONTAINER, 'pg_isready', '-U', DB.user, '-d', DB.name],
      { encoding: 'utf8' }
    );
    if (ready.status === 0) {
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
