# AGENTS.md

Repository memory for Vietjet Air (Next.js 15 / React 19 / TypeScript / Tailwind / Neon Postgres).

## Commands

```bash
npm run dev        # next dev --turbo -p 4028
npm run build      # next build (runs its own TS type check ‚Äî a tsc error fails the build)
npm run type-check # tsc --noEmit
npm test           # vitest run
npm run lint       # eslint .   (NOT `next lint` ‚Äî that is removed in Next 15)
npm run lint:fix   # eslint . --fix
npm run test:migrations # 4 migration passes on throwaway Docker Postgres (needs Docker)
npm run test:smoke # post-build HTTP assertions against a running server
npm run test:ui    # headless Chrome render check of 14 screens (needs build + start + Chrome)
```

Lint/format rules live in `eslint.config.mjs` (flat config, prettier printWidth 100,
single quotes, `trailingComma: 'es5'`). Run `npx eslint <file> --fix` before finishing.

Lint is NOT part of `npm run build`: Next 15/16 removed the `eslint` key from
`next.config.mjs` (setting it logs "Unrecognized key(s) in object: 'eslint'"), and CI
enforces lint as its own step. Only `typescript.ignoreBuildErrors: false` remains as a
build-time gate, so always run `npm run lint` in addition to the build.

## Architecture

Feature modules under `src/features/<name>/` own `types/`, `constants.ts`, `services/`,
and an `index.ts` barrel. App routes in `src/app/` should consume those services rather
than calling `fetch('/api/...')` directly, so mapping logic and types stay in one place.
Shared infrastructure lives in `src/shared/` (`services/apiClient.ts`, `constants/`,
`components/ui`).

Neon Postgres via `src/lib/neon.ts` (`sql` template tag) is the only datastore. When
`DATABASE_URL` is unset, that module falls back to an in-memory mock for local dev/CI ‚Äî
tests rely on it, so keep the fallback intact. There is no Supabase dependency: the auth
layer is custom JWT (`src/lib/auth.ts`) and data isolation comes from `user_id`-scoped
queries plus RBAC guards, not database-level policies.

Apply `migrations/*.sql` in filename order; they are the only schema source. `013`
wires the `bookings.booking_code` default and `014` seeds airports, flights and the
README demo accounts, so a freshly migrated database is usable without manual inserts.
`014` is idempotent (re-runs keep counts stable via `ON CONFLICT`) and dates its flights
relative to `CURRENT_DATE`, so date-filtered flight search only finds them on the
following day.

**The migration set is now re-applyable end to end — keep it that way.** CI's
"Re-applying migrations must be safe" step replays the whole set against the
same database. It used to fail on five files; all five are fixed. None of the
fixes is in `034`, and none came from the PNR work.

**Re-applyable is not the same as safe, and the harness could only see the
first half.** `scripts/test-migrations.cjs` counts and fingerprints `flights`
and nothing else, so every defect below lived in a table it never queried — and
a `DROP TABLE` is invisible even in principle, because the fingerprint diff
catches a row that was *rewritten*, not one that was deleted. Six files shipped
damage of that kind (`000`, `003`, `005`, `006`, `010`, `011`, `012`, `020`),
each reproduced on a real Postgres 16 and each now measured before and after.
The harness grows a canary customer — a booked, checked-in trip with a support
conversation and a published notice — and asserts it survives every replay.
When you add a table that holds user data, add it to `OPERATING_TABLES_SQL`;
an unmeasured table is an unguarded one.

**Check it the way CI does, or you are checking something else.** The CI step is
`psql -f <file>` with no `BEGIN` and no wrapping transaction, so *every statement
in a migration is its own transaction*. A driver-based replay is not equivalent:
`client.query(<whole file>)` sends the file through the simple-query protocol as
one implicit transaction, so anything that depends on statement boundaries
passes locally and dies in CI. Two real cases this repo has already hit:

- `CREATE TEMP TABLE ... ON COMMIT DROP` is created and destroyed before the
  next statement can read it, because that next statement is a new transaction.
  Seed files that stage ids this way drop the table explicitly at the end of the
  file instead.
- `ALTER TABLE ... DROP NOT NULL` is committed immediately, so a later
  statement in the same file already sees the constraint gone. There is no
  "all or nothing" across a migration file unless the caller wraps it.

Run `npm run test:migrations` instead of pasting that loop. It applies the whole
set four times against a throwaway `postgres:16-alpine` — the same image CI pins —
and asserts, per pass: the row count does not grow, the full row fingerprint does
not change, the CI "expected tables" step still holds, no flight is left without
a fare, every fare matches the ladder its own class implies, no flight number
repeats within a day, and no staging table survives. Exits non-zero on failure.

**CI pins Postgres 16; production runs 17.** `scripts/test-migrations.cjs` and
the CI image are `postgres:16-alpine`, but the Neon instance behind
`DATABASE_URL` reports `server_version: 17.11`. Everything in this file about a
migration aborting was measured on 16, and this set ran clean on 17 as well —
but nothing guarantees that, so **check the version before you trust a local
run**: `pg_dump` alone will tell you, refusing a 17 server with
`server version mismatch` when its client is 16. Use `postgres:17-alpine` for
anything that talks to Neon, including a backup or a restore of a dump.

The raw loop it wraps, if you need it by hand:

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=app \
  -p 5432:5432 postgres:16-alpine
until docker exec pg pg_isready -U postgres -d app; do sleep 1; done
for f in $(ls migrations/*.sql | sort); do
  docker exec -i pg psql -U postgres -d app -v ON_ERROR_STOP=1 -q -f - < "$f" || break
done
```

**State of the live database as of 2026-10-05.** `003` and `020` have been
applied to Neon, and the whole 35-file set then ran clean against it. The
loyalty seed had accumulated damage that was visible only against real data:
**20 programs named `VietjetSim Rewards` and 840 tier rows** (4 distinct tiers
× 20 copies), from this file being re-applied before its conflict targets
existed. `003` merged them to 1 program and 4 tiers, keeping
`dd63d020-6d05-48af-a34c-e0a22264352d` — which was both the oldest and the one
all four enrolled customers pointed at. All 4 enrollments survived, still
`Bronze`. Both keys are installed and `convalidated`, so the seed cannot
multiply again.

**The "20 duplicate flight numbers" were never a defect — they were the
time-zone measurement, not the data.** Neon runs sessions with
`TimeZone = GMT`, so `GROUP BY flight_no, depart_time::date` puts two
different Vietnamese departures in the same bucket. `VJ 2010` on 2026-09-29 is
09:00 and 2026-09-30 is 06:00 *Vietnam time* — two ordinary daily departures,
one flight number, two consecutive local days. Counted in UTC they collide;
counted in `Asia/Ho_Chi_Minh` they do not:

```
UTC-day dups = 20    VN-day dups = 0
```

`scripts/test-migrations.cjs:371` already groups by
`(depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`, which is why CI stayed
green and why this never showed up as a failure. **Any count over a day
boundary on this database must say which zone it means.** A "duplicate" found
this way is usually two real flights, and renumbering them would have invented
a defect that customers would then see in their booking history.

**What that measurement did surface was a genuine defect one layer down:**
1224 flights whose `flight_no` never matched `VJ <digits>` — 1174 written as
`VJ351` / `VJ341B` (no space) and 50 as `VJ101-1000`. `035` moved all 89 of
those numbers into the empty 3001–3089 block. Two consequences worth keeping:
- `VJ341B` was **uneditable through the admin console** — the validator at
  `src/app/api/quan-tri/chuyen-bay/[id]/route.ts:59` is
  `/^[A-Z]{2}\s?\d{2,4}$/i`, which rejects a trailing `B`. Two thirds of this
  data could not be managed by the screen meant to manage it. Every number in
  the 3xxx block passes that validator.
- The `B` suffix was doing real work: `VJ341` and `VJ341B` are both HAN-CXR,
  one economy and one business. Dropping it is safe only because `class`
  already carries the cabin on every row.

`flight_no` is a lookup key, not a label — `getFlightStatusByNo`
(`src/lib/db.ts:509`) resolves a flight by `UPPER(flight_no) =` for the
tracking page and check-in, and `searchBookingsByPnr` joins on it. So `035`
touches **no flight that has a booking**, and reports the ones it skipped
instead of silently leaving them. Two remain on purpose, each with a live
booking: `VJ101-1000` (VJDEMO01, completed) and `VJ789-1043` (VJ644052,
confirmed). Widening the validator to accept their shape is still open.

The dump used to reason about this is
`database-backup/neon_dump_pre_003_020.sql` (2.1 MB, taken before these
changes). Restoring it locally needs `postgres:17-alpine` and the
`pg_session_jwt` CREATE EXTENSION stripped — Neon ships that extension and
nothing else does.

Pass 1 legitimately grows — `027`'s rolling window is relative to "now", so each
run seeds a new day, and the `CURRENT_DATE`-based seeds move — but every pass
after the first must add exactly zero rows.

Two limits worth knowing before you trust it:

- **Counting rows is the weaker check**, because a seed that *rewrites* prices
  without adding rows passes it. The script diffs a fingerprint of every row for
  this reason.
- **The fingerprint diff cannot see pass 1.** If a file prices rows it does not
  own, pass 1 already holds the overwritten value and pass 2 matches it. The
  per-row ladder check is what catches that; if you add a check, ask the same
  question of it — would it have stayed green against a bug present in pass 1?

Neither failure is visible in the test suite, which runs against the in-memory
mock and never executes a migration.

- **030's fare columns are `NOT NULL` with no default, and every seed file
  predates them.** A seed cannot name `economy_price` in its column list — 030 has
  not created the column yet on a fresh database, so the *first* apply would fail
  on "column does not exist". The shape every seed file now uses, and the one
  027 already had, is: drop `NOT NULL` in a guarded `DO` block before the INSERT,
  price the file's own rows with 030's formula, re-apply `NOT NULL` after. All
  three blocks no-op on a fresh database. Every seed file does this now.
- **`WHERE economy_price IS NULL` is not a scope, but it is not yet a bug
  either.** It reads like one — "price the rows this file added" — yet it matches
  *every* unpriced flight in the table, so the block also touches rows another
  file left unpriced. Three files scoped this way (`027`, `028`, `032`) before
  they staged ids. Two things keep it harmless *today*, and both are load-bearing
  enough to be worth stating plainly:
  - Every seed closes its own ratchet: `DROP NOT NULL` at the top, `SET NOT NULL`
    at the bottom. A file that leaves a null behind fails its *own* `SET NOT NULL`
    immediately, so no file can hand a null to the next one. Measured across all
    35 files: the flight table never holds a null price between two files.
  - Every seed copies `030`'s ladder verbatim, so "wrong file, right formula"
    produces the same two numbers. A wide scope here rewrites rows to a value
    they already had.
  So the exposure is *latent*, not active: it opens the moment a file diverges
  from `030`'s ladder, or the moment a file stops closing its ratchet. Both are
  one edit away, and neither has a test. These files stage `RETURNING id` and
  price `WHERE f.id IN (...)` so the scope is exact regardless. Do not cite this
  as a fixed user-visible bug — it never was one.
- **`row_number() OVER ()` cannot identify a file's own rows.** It numbers the
  *select*, not the insert, so the counter advances even for a row
  `ON CONFLICT DO NOTHING` then skips. On a first run that is invisible — the
  numbers come out as the tidy block the author expected (014 → 101-160, 024 →
  201-370). On a replay, where most rows already exist, the few that do get
  inserted take the numbers the skipped rows consumed, and they land scattered
  across the whole range. Any pricing step scoped by a number range then misses
  them. This is why the number blocks in the seed comments look right and are
  still wrong; do not reason about a seed's rows from its numbering.
  `014`, `024`, `026`, `027`, `028` and `032` all stage ids now. `025` scopes by
  route (TBB) instead, which is exact because `025` is the only file that creates
  a TBB route. Name the temp table after the file: two seed files can share one
  session in a replay harness.
- **A staging `CREATE TEMP TABLE` must precede the first `WITH`, and the INSERT
  goes *inside* that same `WITH`.** Two shapes are wrong, and both fail at parse
  time rather than run time: putting the `CREATE` between two `WITH` clauses
  makes it a CTE body (`syntax error at or near "CREATE"`), and starting a
  second `WITH inserted AS (` after the CTE list has already closed gives two
  consecutive `WITH` keywords (`syntax error at or near "WITH"`). The working
  shape is: `CREATE TEMP TABLE ...;` → one
  `WITH cte AS (...), inserted AS (INSERT ... RETURNING id) INSERT INTO
  _vj_seeded_x SELECT id FROM inserted;`.
- **A `SET NOT NULL` that fails tells you the pricing `WHERE` under-reached, not
  that the constraint is wrong.** It is the only reliable signal, and it fires
  after the damage is done. When it happens, count the orphans by flight number
  before assuming anything about which file owns them.
- **A migration file is not a transaction.** CI runs each file with `psql -f` and
  no `BEGIN`, so a failure halfway through leaves the earlier statements
  committed. Anything that must be atomic has to say so inside the file. This is
  also why staging rows through a temp table needs an explicit `DROP` at the end
  rather than `ON COMMIT DROP`.
- **`ADD CONSTRAINT` validates the rows already in the table — use `NOT VALID`
  plus `VALIDATE` whenever the table holds real data.** `ADD CONSTRAINT ... CHECK`
  and `ADD CONSTRAINT ... FOREIGN KEY` both check existing rows immediately, so
  a file written to *repair* dirty data aborts on the very dirt it was written
  for. `017` and `023` both shipped this way. Measured on a database seeded
  with exactly the damage each file exists to fix:
  - `017`: `ERROR: insert or update on table "bookings" violates foreign key
    constraint` — and the constraint was left at **0**, i.e. the file could not
    add the very key it exists to add. After `NOT VALID` → clear orphans →
    `VALIDATE`: constraint present, `convalidated = t`, orphan gone, and the
  - `023`: `ERROR: check constraint ... is violated by some row`, with
    `ADD COLUMN` already committed — so it left the half-migrated state the
    comment claimed to be avoiding (column present, CHECK absent). After the
    fix: `convalidated = t`, no abort.
  - `030` (fare ladder): the same abort, and worse in one respect — its
    `ALTER COLUMN ... SET NOT NULL` had already committed, so the table ended
    up with two NOT NULL fare columns and **no** `flights_fare_ladder_ordered`
    at all. After `NOT VALID` → `LEAST`/`GREATEST` swap → `VALIDATE`: `t`, zero
    inverted rows, and all 4242 flights still present (the repair reorders the
    pair rather than deleting the row).
  - `007` (phone UNIQUE): **UNIQUE has no `NOT VALID` form**, so the shape does
    not apply. `ADD CONSTRAINT UNIQUE` aborted with `could not create unique
    index` on a database holding two accounts on one number, which also cost
    step 3 — `user_profiles_contact_check` was never created. It now checks for
    duplicates first and *skips with a `RAISE NOTICE`* instead of aborting;
    `016` then merges those accounts properly (it moves bookings, wallets and
    loyalty before deleting a row) and re-adds the constraint. Measured end to
    end: `007` no longer aborts, the duplicate survives until `016` handles it,
    and afterwards the UNIQUE is present with zero duplicate numbers.
  So the rule has two branches: `NOT VALID` → repair → `VALIDATE` where the
  syntax allows it, and *detect and defer* where it does not (UNIQUE) — and
  whichever branch is taken, a later file has to finish the job.
  The replay test **cannot** catch this class: it starts from an empty database,
  where there is nothing to violate. Only a database carrying the damage
  exercises it, so build one by hand when adding a constraint to a table that
  ships rows.
- **`DROP TABLE` in a migration is not idempotency, it is a data delete — and
  because CI replays the whole set, "on every re-apply" is the real frequency.**
  Three files shipped the same defect, each with its own table, and all three
  were invisible to the harness for the same reason (below).
  - `011_checkin_system.sql:5` opened with `DROP TABLE IF EXISTS check_in
    CASCADE`, commented "for idempotent migrations". The same file already had
    `CREATE TABLE IF NOT EXISTS` plus six guarded `ADD COLUMN` blocks, so the
    DROP bought nothing and cost the table's contents: measured on a database
    holding one check-in, 1 row before and **0** after re-running that file
    alone, with `bookings` and `passengers` untouched. The boarding pass the gate
    scanned was gone while the booking stayed `confirmed` and the UI still
    offered to issue one. `check_in` is a leaf — no constraint anywhere
    references it, so `CASCADE` had nothing else to drop.
  - `000_core_schema.sql:107` had `DROP TABLE IF EXISTS announcements` followed
    by a *bare* `CREATE TABLE`, in a file where every other table is
    `IF NOT EXISTS`. 1 row before, 0 after; the operator's published notices at
    `/api/quan-tri/thong-bao` came back blank.
  - `010_chat.sql:5-7` dropped all three chat tables. This one *was* a deliberate
    repair of an older minimal schema, which is why it cannot simply lose the
    DROP — so it now drops only when a table is actually missing a column this
    file defines, resolved children-first because both children hold an FK to
    `chat_conversations`. Measured both ways on one database: with the shape
    correct, 1 conversation and 1 message before and after; after dropping
    `unread_by_admin`, the rebuild fired (three `NOTICE`s) and restored the
    column.
  The rule: reach for `CREATE TABLE IF NOT EXISTS`, a guard on
  `information_schema`, or a guard on behaviour. Never a `DROP` for idempotency.
- **The four-pass harness counts `flights` and nothing else — so every one of
  those three tables was unmeasured.** `checkInvariants()` (script lines 194-214)
  asserts two tables by name and one constraint; `checkDataInvariants()`
  (216-259) only ever queries `flights`; the row count (274) and the
  fingerprint (133-140) are both `SELECT … FROM flights`. A table the seed files
  do not touch is not covered by "pass 2 added zero rows", and the fingerprint
  diff cannot even *see* rows that were deleted rather than rewritten. If you
  add a table that carries user data, either extend the harness to count it or
  accept that CI is silent about it.
- **A targetless `ON CONFLICT DO NOTHING` is not idempotency; it is a comment.**
  It guards only the unique indexes the table *happens* to have, so it degrades
  to "insert another row" the moment one is missing. `003_loyalty_program.sql`
  seeded a program and four tiers with exactly that, and both tables had nothing
  but `id UUID PRIMARY KEY` — so every re-apply inserted a fresh copy. Measured
  after three extra runs: `loyalty_programs` 1 → **4**, `loyalty_tiers` 4 → **40**,
  12 duplicate `(program_id, name)` pairs. `getUserLoyaltyWithProgram`
  (`src/lib/db.ts:2820`) returns every tier of the program to the loyalty tab,
  and `getOrEnrollLoyalty` picks `WHERE is_active = true LIMIT 1` with **no
  `ORDER BY`**, so which program a customer was enrolled in could differ between
  two calls.
  The fix follows the `007`/`016` rule: `UNIQUE` has no `NOT VALID` form, so
  merge first and add the key after. `003` now merges duplicate programs —
  repointing `loyalty_tiers` *and* `user_loyalty` at the survivor before
  deleting, because the FK blocks the delete and because `user_loyalty
  .program_id` is what decides the ladder a customer sees — collapses duplicate
  tiers, then adds both constraints under a `conrelid` guard. Every seed now
  names its conflict target. Measured on a database left at 4 programs / 40
  tiers with a customer enrolled on one of the duplicates: after one apply, 1
  program, 4 tiers, the customer's `program_id` repointed and the row intact; three
  further applies changed nothing.
- **A `CREATE TABLE IF NOT EXISTS` does not upgrade a table that already
  exists, so a constraint added inside the `CREATE` never lands on a database
  that has been there longer than the migration.** Every `UNIQUE` in `003` is
  written twice on purpose: once in the `CREATE TABLE` for a fresh database,
  once as a guarded `ALTER TABLE … ADD CONSTRAINT` after the dedupe block for
  every other one. Read a constraint declared inside `CREATE TABLE IF NOT
  EXISTS` as applying to new databases only.
- **Never put a statement that other files depend on inside another object's
  existence guard — the guarded object outlives any one attempt to create
  it.** `012` defined `generate_booking_code()` as the last statement inside
  the `IF` that adds `bookings.booking_code`, so the function existed only if
  the column did not. The column is the thing that persists: on a database
  holding the column and not the function, re-running `012` recreated neither,
  and `013` — `ALTER TABLE bookings ALTER COLUMN booking_code SET DEFAULT
  generate_booking_code()` — aborted with `function generate_booking_code()
  does not exist`.
  The damage outlives the abort. The column is already `NOT NULL` with no
  default, nothing in the application supplies `booking_code`, and so every
  insert failed with `null value in column "booking_code" … violates not-null
  constraint`: **no booking could be created at all**, and the driver error went
  straight to the customer. Measured end to end on a database in that state —
  re-run `012`, re-run `013`, then insert — before the fix the insert failed and
  `fn=0 / default=NONE`; after it `fn=1 / default=generate_booking_code()` and
  the insert returned a six-character PNR.
  The function is now outside the guard, and carries `034`'s six-character
  alphanumeric body rather than the `VJ`-prefixed one it replaced, so `012` and
  `034` cannot drift into two different definitions. `CREATE OR REPLACE FUNCTION`
  needs no guard of its own.
- **A constraint guard must filter by table, not by name.** A constraint name is
  unique per *schema*, not per table. `023` checked only `conname`, so any
  constraint anywhere named `passengers_passenger_type_check` would skip the
  block and leave the column permanently unchecked. Add
  `AND conrelid = '<table>'::regclass` — `017` already did, `007` and `016` did
  not (three guards, all the same omission).
- **An inline constraint on `ADD COLUMN IF NOT EXISTS` is never applied.** The
  `IF NOT EXISTS` makes the whole statement a no-op when the column is already
  there: Postgres emits `NOTICE: column … already exists, skipping` and discards
  the rest of the definition, constraints included. No error, no warning that
  anything was dropped — the constraint simply never lands, on any apply, ever.
  `005` carried `ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN
  ('male','female','other'))`. Measured on a database whose `user_profiles.gender`
  already existed without the CHECK — which is exactly the state that file meets,
  since its own header tells the reader to paste it into a Neon console where the
  column may have been added by hand — the constraint count was still 0 after
  three applies, and only the `<select>` in `ProfileTab.tsx` was limiting the
  value, with the profile route passing the field through unfiltered.
  `006` had the same shape with `UNIQUE` on `user_wallets.account_number`.
  Both now add the column bare and install the constraint separately.
- **So a constraint on a column that may predate it needs both branches of the
  rule, and which branch applies depends on the constraint type.**
  `CHECK` gets `NOT VALID` → repair → `VALIDATE`: `005`'s gender block installs
  the CHECK, resets an unrecognised value to the column's default (not to a
  deleted row — the profile carries the customer's booking history), then
  validates. Measured on a database holding `gender = 'xxx'`: after one apply, 0
  bad values and the constraint present with `convalidated = t`.
  `UNIQUE` cannot be deferred that way, so `006` detects and skips with a
  `RAISE NOTICE` naming how many values are shared. Two wallets on one account
  number is not a value to normalise — it means a payout account was recorded
  twice and only the accounts team can say which is right. Measured both ways: on
  the duplicated database it printed `1 value(s) are shared by more than one
  wallet; skipping the UNIQUE constraint until an operator resolves them` and
  exited 0; after the duplicate was resolved the same file installed the
  constraint with no notice.
- **A `CREATE UNIQUE INDEX` can abort a file just as badly as an inline
  constraint fails to install — and the abort takes the rest of the file with
  it.** `020` had `CREATE UNIQUE INDEX … ON refund_requests (booking_id) WHERE
  status IN ('pending','approved')`, which is the right idea (one open ticket per
  booking, so a customer cannot queue a refund twice) with no way to install it on
  a database that already violates it. Measured on a database holding two open
  tickets for one booking: `ERROR: could not create unique index
  "idx_refund_requests_open_booking"`, and because the file has no `BEGIN`, the
  `INSERT` below it never ran either — so the refund feature had no
  `refund_feature_enabled` switch in `system_config` to read.
  It now closes the surplus first, keeping the **oldest** open ticket so the one
  already in the operator's queue survives, and marks the newer ones `archived`.
  Measured after the fix: index present, switch seeded, the original ticket still
  `pending`, the surplus `archived`, 0 duplicates left.
- **A hand-written validator and a CHECK constraint are two copies of one list;
  keep them literally identical.** The admin PATCH validator at
  `src/app/api/quan-tri/chuyen-bay/[id]/route.ts` offered `boarding`, `landed`
  and `scheduled`, none of which `021`'s CHECK accepts, while the CHECK's
  `completed` and `departed` were not offered. So `status: 'boarding'` passed
  validation and then died as `new row ... violates check constraint
  "flights_status_check"`, surfacing to the operator as a 500 with a raw driver
  message. The same route already does this correctly for the fare ladder (it
  returns a 400 explaining the inversion instead of letting the CHECK throw),
  so the omission was inconsistent rather than deliberate.
  Adding a status means editing `021` and that array together;
  there is no test that ties them, which is why they drifted.
- **The four-pass replay test proves idempotency, nothing else.** It starts from
  an empty database, so it cannot see a constraint that would abort on real data
  (above), a code path only reachable with pre-existing rows, or a validator
  whose list disagrees with a constraint. Use it for what it covers — "running
  the set again changes nothing" — and prove the rest by hand against a database
  seeded with the damage in question.
- **022 renames the demo email unconditionally, dropping the seed row on a
  collision.** 014 re-seeds `@vietjetsim.vn` on every run, so a replayed database
  can hold the old and the new address at once, and renaming would collide on
  `user_profiles_email_key`. "Skip when the target is taken" — the obvious guard,
  and the one this file used to have — is wrong in a way that only shows on a
  real database: `scripts/setup-admin.sql` and `setup-admin.ts` both create
  `admin@vietjetair.vn`, so wherever an admin was set up before this file ran,
  the target is occupied, the rename is skipped, and `admin@vietjetsim.vn` is
  left behind permanently. Measured: the set ended with both addresses present
  and README/SETUP advertising only the new one, i.e. the advertised admin
  login was a different account from the seeded one. The guard now checks the
  source row's own id, and a leftover that cannot be renamed is deleted — it is
  a seeded demo account, not customer data. Do not restore the "leave both"
  behaviour: it trades a two-row cosmetic problem for a demo account that can
  never be renamed again.
- **025 renames airport codes by dropping the duplicate, not by UPDATE.** 027 has
  already seeded routes under the replacement codes at the same instants the
  earlier seeds used the old ones, so renaming onto them trips
  `idx_flights_route_depart_time`. The DELETE drops only the old-code row, only
  where a same-instant row already carries the correct code, and only where no
  booking points at it. The surviving row is the correctly-coded one, so no
  flight is lost — the two rows describe the same departure.
- **026 must not delete a booked flight.** Its `^VJ [0-9]{3}$` DELETE reaches
  601-999, which on a replay is 025's block and on a live database holds booked
  flights (this one has six bookings on `VJ 601`). The `NOT EXISTS (bookings)`
  guard keeps them, and the INSERT then collides on the route index and skips
  them too — correct, since the flight still exists with its booking attached.
  The pattern is deliberately not widened to `^VJ [0-9]{3,4}$`: that would sweep
  up those same bookings from the 1000s.

**IATA codes are reference data, not a UI detail.** `flights.from_code` /
`to_code` are foreign keys on `airports(code)`, so an airport's code cannot be
renamed in place — `025_airport_codes_and_tuy_hoa.sql` shows the required
order: insert the new code, repoint the flights, then drop the old row. Codes
must match the civil-aviation register (Điện Biên Phủ is DIN, Rạch Giá is VKG,
Chu Lai is VCL); an invented code reaches the customer in the URL and the
boarding pass. The airport list the hero picker serves comes from the
`airports` table via `/api/san-bay`; the code → city map that screens without
a join use lives in `AIRPORT_CITIES` in `src/shared/constants` and must stay
in step with the table. Add an airport to both, plus a migration, together.

**Write seed timestamps with an explicit +07:00 offset.** A `TIMESTAMPTZ` built
from `CURRENT_DATE + make_interval(hours => n)` is read in the *session* time
zone, and Neon sessions run `TimeZone = GMT` — a slot meant to be 06:00 lands
at 13:00 in Vietnam. 014/024/025 all did this, and 026 had to delete and
re-seed 440 rows to undo it. Format the local time as text with a literal
`+07:00` (as `scripts/seed-future-flights.cjs` does) so the stored instant does
not depend on the session. When correcting a wrong value, re-seed rather than
shift: the five seed slots are symmetric, so a row that needs shifting and a
row that is already correct are indistinguishable, and any relative `UPDATE`
you can write will be wrong on its second run.

**And read timestamps back in Vietnam, too — not just write them.** The same
`TimeZone = GMT` makes a *query* lie. `GROUP BY depart_time::date` is a UTC
day, so `VJ 2010` departing 09:00 on the 29th and 06:00 on the 30th *Vietnam
time* both fall in 2026-09-29 UTC, and the number looks like it flies twice a
day. Counted in UTC: **20 duplicates**. Counted in
`(depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`: **0**. Those are two
ordinary daily departures, and "fixing" them would have renamed flights
customers had booked. Any day-boundary count on this database must state its
zone; `scripts/test-migrations.cjs` already does, which is why this never
surfaced as a failure.

**The server owns every amount in a booking.** `POST /api/dat-ve` re-derives
the fare, the seats and the services from `features/bookings/pricing` and ignores
`total_price`; the client sends only *which* seat, *which* service and *which*
fare card. Migrations `029` (`seats.price`, `booking_ancillaries`) and `030`
(`flights.economy_price` / `business_price`) are what make that possible — before
them the browser's number was the record. Keep a new charge in `pricing.ts` and
price it on the server; a total computed only in a component cannot be trusted.

**A fare card names a bucket, never a cabin.** `flights` stores two fares, so
the four cards (Eco, Deluxe, SkyBOSS, Business) cannot each have one. The two
endpoints are the stored values and the middle two are stepped evenly between
them by `getFareForClass` in `pricing.ts`, which both `FlightResultsStep` and
`POST /api/dat-ve` call. Deriving the ladder inside the card and sending only
`cabin` made SkyBOSS quote 10,682,000₫ and bill 13,573,000₫. **Coerce the two
fares with `Number`**: a `NUMERIC(12, 2)` column comes back from the driver as a
*string*, so plain arithmetic concatenates (`step` → `NaN`) and every
interpolated card silently collapses onto the cheapest fare — the page quotes
7,791,000₫ while the API charges 4,900,000₫. `flight_no` has the same hazard in
seed files: `LPAD(x, 3, '0')` *truncates* 4-digit numbers, which is what
`031_unique_flight_numbers.sql` repairs.

**`028` adds the international network** (13 airports, flights from HAN/SGN in
both directions) and numbers its block from 1100 so it cannot collide with 027's
601–1040. Cà Mau (CAH) is deliberately absent: the airport closed for a
twelve-month upgrade in November 2025, and offering it would send a customer to
a terminal with no service.

**Seat prices and seat adjacency are one module each, and both had two copies.**
`getSeatPrice`/`getSeatCharge` in `pricing.ts` are the only seat price — the
seat map in `SeatSelectionStep` calls them rather than keeping its own row
bands. It used to carry separate bands (row 12 was 55,000₫ on the map, 70,000₫ on
the server), so a customer agreed to 63,250₫ and was billed 80,500₫. Likewise
`seat-adjacency.ts` had one `adjacentSeats`: the aisle test looked at the origin
column, which dropped C's *left* neighbour along with its right, so
`adjacentSeats('12C')` returned only `['12D']` and a child could not sit beside
an adult in 12B — the picker showed "1 chỗ ngồi còn lại" forever. `src/test/
seat-adjacency.test.ts` and the `seat pricing` block in `passenger-types.test.ts`
pin both.

**Never index a status map without a fallback.** `bookings.status` has five
values; `/tai-khoan` knew three, so one `pending` booking threw
`Cannot read properties of undefined (reading 'cls')` and the page-level
ErrorBoundary turned the whole dashboard — wallet, loyalty, profile — into
"Lỗi máy chủ". The admin `BookingsTab` was missing `refunded`, and `/tra-cuu`
indexed its own map the same way. All three now go through a `statusBadge()` /
`bookingBadge()` helper with a default, and `src/test/booking-status-badge.test.ts`
sweeps `src/` for the bare pattern.

**Every seeded route needs a customer to reach it.** `027` built its route list
with `WHERE a.code NOT IN ('HAN', 'SGN')`, which excluded the hub-to-hub pair
along with the hubs — leaving HAN↔SGN, the busiest route in the country and the
one the hero form pre-fills, with nothing to sell for the whole week. When
excluding a set to avoid self-links, check the pair that exclusion creates.

**An empty search must offer a date that works.** `GET /api/chuyen-bay` answers
an empty day with `availableDates` (`getAvailableDepartDates`), and the results
page renders them as buttons. The advice it replaced — "pick a nearby date in
the strip above" — was a dead end: the strip is generated from today forward, so
once a week passes, six more empty days sit next to the empty result. Two
details are load-bearing. The query filters
`>= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`, because the seeds leave past
departures in `flights` and ordering without it offered 28/08 to someone
searching in October. And the lookup is wrapped in its own `try`: it is a
convenience on an answer that is already correct, so its failure must not turn
a legitimate empty result into a 500.

**Never print a row id where a customer is shown a reference.** `bookings.id` is
a UUID; `bookings.booking_code` (migration 013) is the PNR. The history table, the
upcoming cards, the CSV export, the print view and the refund tickets all
rendered the UUID under a column headed "Mã đặt chỗ", so a customer had nothing
to quote support with. `createBooking` also omitted `booking_code` from its
`RETURNING`, which meant `POST /api/dat-ve` answered without one and the refund
form could not be submitted at all. When a booking is displayed, carry
`bookingCode` through the mapper and fall back to the id only for pre-013 rows.

**The PNR is six alphanumeric characters, and nothing may assume otherwise.**
`generate_booking_code()` (rewritten in `034`) returns exactly six symbols from
`A-Z0-9` — `FG7KH9` — with no prefix. 012's `VJ` prefix is gone and so are its
digits-only body, which is what let it fall back to an 11-character code after
ten collisions and quietly break the length guarantee; the loop now raises
instead. Two consequences worth stating:

- **Compare the code case-insensitively.** The PNR has letters in it now, so
  `b.booking_code = $code` 404s a customer who typed `jkhbmi` with caps-lock off.
  `searchCheckIn`, its passenger join and `getBookingByCodeOrId` all wrap both
  sides in `UPPER()`; a new lookup added without that is a bug, not a style
  choice.
- **034 replaced the generator; it did not rewrite existing rows.** A PNR is
  already printed on tickets and quoted in support chats, so reissuing one
  invalidates a reference the customer is holding. Legacy `VJ644052` codes are
  8 characters and stay in the column — never add a `length(...)` guard, a
  `LIKE 'VJ%'` filter or a `maxLength` under 8 to any lookup or input.

**A view headed "Mã đặt chỗ" must read the PNR, not the booking UUID.** Every such
view now goes through one of two routes, and picking the wrong one is how the
UUID got there in the first place: `bookings.booking_code` for rows that are
bookings, or `getPaymentHistory` for rows that are payments — that query
`SELECT p.*`, so it has to join `b.booking_code` explicitly. `payments` has no
such column, so `PaymentRecord.booking_code` is optional at the type level and
only `PaymentHistoryEntry` (which `GET /api/thanh-toan/lich-su` returns, via an
inner join against a NOT NULL column) narrows it to `string`. That distinction
exists so a caller that *can* prove the join cannot silently accept `undefined`
and print `#AC5F3313` under a heading the customer will read out to support.
`payment.id.slice(0, 8)` under "Mã giao dịch" is fine — it is a payment, not a
booking, and there is no short reference for one.

**`refund_requests.amount` is its own column.** The figure used to be packed into
the `bank_info` JSON text, so the operator list showed an empty "Số tiền" and
the "Đã hoàn tiền" card stayed at 0₫ no matter how many tickets were approved.
`createRefund` writes the column; the admin tab coerces it with `Number()`
(`NUMERIC` arrives as a string, so `reduce(+)` concatenated into "01975873.00₫"),
and the customer view reads the column with `bank_info.amount` only as a
fallback for tickets created before it existed.

**`createFlight` must write a ladder, not a flat row.** Migration 030 made
`economy_price` / `business_price` NOT NULL, and `createFlight` named neither, so
every flight added through `/quan-tri` → "Thêm chuyến bay" came back 500 — the
form had been unusable since that migration shipped. Filling both from `price`
then satisfied the constraint but made all four fare cards print one number.
`price` is the fare of the cabin the row itself seats, so the other cabin comes
off it in the opposite direction: economy row multiplies by 2.77, business row
divides. `scripts/seed-future-flights.cjs` sends one `price` per row and relies
on this, so a change here reshapes its whole schedule.

**`updateFlight` needs the same fare columns `createFlight` got.** The PATCH
route accepted `economy_price` / `business_price` from its `ALLOWED_FIELDS` from
the start, but `updateFlight` filtered through its own whitelist and dropped
both before SQL: an operator edited a fare, saw "Cập nhật thành công", and the
results page still quoted the old number. Any new column added to a write path
has to be added to *every* write path — `createFlight` and `updateFlight` keep
separate whitelists, and only one being updated reads as "already handled".
The route also derives `price` from whichever side of the ladder the row's own
`class` seats and refuses an inverted pair with a 400, because migration 030's
`flights_fare_ladder_ordered` CHECK only surfaces as a 500. `src/test/
flight-fare-edit.test.ts` pins both columns reaching SQL.

**A flight number has one definition, in `src/lib/flight-no.ts`, and the
database enforces it.** Four writers disagreed before migration 036: the PATCH
handler and the admin form each ran `/^[A-Z]{2}\s?\d{2,4}$/i`, while
`createFlight` and the POST handler checked nothing at all. The pattern rejected
`VJ101-1000` — a shape two live flights with live bookings still carry — so
those two could not be priced, delayed or renumbered through the console meant
to manage them. Two rules follow, and they are the same lesson as the fare
columns above:

- **A new CHECK column needs every write path to agree with it.** A CHECK
  nothing validates against does not produce a helpful error; it produces a
  bare 500 from the handler, which reads as a server fault to the operator and
  as "already handled" to the next reader. Validate at the door and normalise
  there, so the handler answers 400 naming the field.
- **Normalise before you test, and test the normalised value.** PATCH had two
  calls for the same job — `.replace(/\s+/, ' ')` at line 251 without the `g`
  flag and with it at line 281 — so `VJ  101` passed on one path and failed on
  the other. `normalizeFlightNo` exists to make that impossible.

The CHECK is deliberately case-sensitive and rejects the old letter suffix
`VJ341B`: `searchBookingsByPnr` joins on the raw column while
`getFlightStatusByNo` uppercases first, so a lowercase row would be findable by
tracking and invisible to a booking search, and a suffixed one is unreadable to
the console at all. Adding a flight-number pattern means editing
`036_flight_no_shape_check.sql` and `flight-no.ts` together — the SQL and the
regex must stay the same string or one of the two is decoration.

**`refund_requests.status` is nullable no more, and one booking is paid back
once.** The column had no CHECK, defaulted to `'pending'`, accepted NULL, and
every layer disagreed about its legal values: migration 020's duplicate-guard
index listed two, the PATCH route validated four, `RefundRecord['status']` typed
six, and `RefundRequestsTab`'s `STATUS_MAP` had three. Two of those gaps were
money.

- **A nullable status column defeats a partial index built on it.** 020's
  `idx_refund_requests_open_booking` covers `WHERE status IN ('pending',
  'approved')`, so a ticket written with NULL is in *neither* branch and is not
  in the index at all. Reproduced: two NULL tickets for one booking inserted
  cleanly while the equivalent `pending` pair was correctly rejected — the
  "at most one open ticket per booking" guarantee had a hole exactly where a
  broken client would fall. 037 backfills NULL to `'pending'` and then sets
  `NOT NULL`, which closes it without touching the index.
- **`refundWallet` was not idempotent, so approving twice paid twice.**
  Measured against Postgres 17: balance 100k → 1.1M after one approval → 2.1M
  after pressing the same button on the same ticket, with two `'refund'` rows
  of 1,000,000 against one booking. `refundWallet` read the balance, added to
  it, and wrote it back, and `wallet_transactions` had no unique index on
  `reference_id` to reject the second write. 037 adds
  `wallet_transactions_one_refund_per_reference`, partial on
  `type = 'refund'` — `reference_id` is shared with topups and withdrawals, so a
  plain unique index would have rejected a customer's deposit for a booking
  that had already been refunded.

The ledger lookup inside `refundWallet` is not the enforcement — the index is —
but it is what lets the PATCH route say "wallet was already refunded for this
booking" instead of logging a credit failure for money that already moved.
When you add a money-moving write path, the test has to sit *below* the mock:
asserting that a handler reports a `refundWallet` rejection proves nothing about
`refundWallet`, and passes with the guard deleted.

**`processed` is a status nothing writes.** It was in the TypeScript union, in
the CHECK (where it must stay — dropping it would abort 037 on a database with
an archived row) and in `archiveOldRefunds`'s predicate, but no code path has
ever produced it, and `completed` — the other settled state an operator can
reach — was not in that predicate at all, so settled tickets were never
archived. The predicate now names the two states that actually accumulate.

**Never move a wallet balance with a number computed in JavaScript.** Every
wallet write used to be three bare statements — `SELECT balance`, `INSERT` the
ledger row, `UPDATE user_wallets SET balance = <total computed in JS>` — with no
transaction around them. That is a lost update: two concurrent writes read the
same balance, both compute `before + delta`, and the second `UPDATE` overwrites
the first one's money. Measured on Postgres 17:

| Two concurrent writes | Old balance | Correct |
|---|---|---|
| two 40,000 top-ups against 50,000 | **90,000** | 130,000 |
| two 100,000 withdrawals from 100,000 | **0** — both succeeded | one must fail |

`CHECK (balance >= 0)` does **not** catch this. It reads the final value, and the
lost-update answer is 0, which passes. It fired on only the third variant, where
the race happened to push the balance negative.

`moveWalletBalance` in `db.ts` is now the only place a balance changes, and it
needs no transaction API and no `FOR UPDATE`: Postgres re-evaluates an
`UPDATE`'s `WHERE` after it unblocks on a concurrent writer (READ COMMITTED,
EPQ), so putting the funds check *inside* the `UPDATE` makes each write test
its own precondition against the balance it actually found. Re-measured with
the statements the function emits: two 40,000 top-ups land on 130,000 with a
coherent ledger (50,000 → 90,000 → 130,000), and of two 100,000 withdrawals
from 100,000 exactly one commits while the other matches no row and raises
`Số dư ví không đủ`. The ledger `INSERT` hangs off that `UPDATE` as a
data-modifying CTE, so a move and its audit row commit together — the old order
left a `completed` ledger row behind whenever the `UPDATE` was what failed.

**Do not fold wallet creation into that statement.** `INSERT ... ON CONFLICT
DO UPDATE` in a CTE feeding the `UPDATE` looks tidier and is silently broken: a
statement cannot update a row its own CTE just wrote, so the `UPDATE` matches
nothing and Postgres reports **no error at all**. Measured — the CTE returned 1
row, the `UPDATE` returned 0, the balance never moved. A customer topping up
for the first time would be told it worked while nothing was credited, which is
worse than the lost update it replaced. `ensureWallet` is a separate
write-only `ON CONFLICT DO NOTHING`; correctness still rests on the `UPDATE`.
Its `ON CONFLICT` target is `user_id` (from 002), never `account_number` —
006 only adds that UNIQUE on a database with no duplicates, so it may not exist.

**Reading back a `sql` call's text needs the placeholders rebuilt.** A tagged
template hands the driver its literal chunks *separated* from the values, so
`strings.join(' ')` — the obvious way to read a statement back out of a spy —
silently drops every parameter and welds fragments together ("balance + ," where
the SQL really reads "balance + $2"). `sqlText` in `wallet.test.ts` re-inserts
`$1`, `$2`, … and the wallet tests assert on that. They also assert on the SQL
rather than on a mocked balance, because a mock cannot tell a guarded `UPDATE`
from a read-then-write — it returns whatever the fixture says either way.

**A script that writes must never let `.env.local` outrank the command line.**
Five scripts (`seed-demo-accounts`, `setup-admin`, `reset-admin`,
`reset-admin-password`, `clean-test-bookings`) each loaded `.env.local` with a
hand-rolled loop doing `process.env[key] = value` — unconditionally, so a
`DATABASE_URL=…` passed on the command line was silently discarded. That has
already reset two demo accounts' passwords on the production Neon database: the
run was given a local `DATABASE_URL`, printed `🎯 Target database: ep-cool-king-…`,
and wrote there anyway. Nothing was lost (both accounts already existed and only
`password_hash`/`role`/`email_verified` were rewritten, and the 8 bookings and
wallet on `user@vietjetair.vn` survived), but a reset password is still a reset
password.

`scripts/db-target.cjs` is now the only loader. Two rules:

- **An already-set variable wins**; `.env.local` fills in only what is missing.
  `DATABASE_URL=… node scripts/seed-demo-accounts.cjs` reaches that database.
- **A remote host needs `--allow-remote --yes`.** This repo's only real
  database is remote, so refusing outright would make the scripts useless for
  their actual job — but the flag pair means writing to production can never
  happen by accident, which is the failure that already occurred.

Both are pinned in `src/test/db-target.test.ts`, which points the loader at a
temp file rather than rewriting the repo's `.env.local`. Do not "simplify" that
test to touch the real file: a run that dies between the write and the restore
would take a live connection string with it.

Two details in there are load-bearing. The host comes from `new URL(url)
.hostname`, not a `/.*@([^/]+)\//` regex — a regex mis-reads credentials
containing `@`, and a mis-read host means the guard checks the wrong string,
the one way a broken guard still looks like it works. And values are split on
the *first* `=`, so a password containing `=` survives. `clean-test-bookings
--apply` is the sharpest edge of the five: it deletes real bookings, which is
why it prints its target host too.

**A bound parameter inside SQL quotes is a bug, and a mocked `sql` cannot see
it.** `SELECT id, '${type}', …` looks interpolated; the driver emits a
placeholder anyway, so the statement reaches Postgres as the *string literal*
`'$5'`. No parameter occupies `$5`, so its type cannot be inferred and every
call fails with 42P18, `could not determine data type of parameter $5`. The unit
suite stayed green — a mocked `sql` records the text and never executes it —
while each real top-up returned 500. Found only by `test:wallet-e2e`, which
drives the actual route through Postgres. Fixed by binding properly
(`${type}::varchar(20)`); `wallet.test.ts` now asserts no statement contains a
`$n` wrapped in quotes, which goes red on the old form.

**A local Postgres was unreachable from the app, and that hid it.**
`@neondatabase/serverless` speaks HTTP only — it POSTs `{query, params}` to
`https://<host>/sql` — so no `docker run postgres` could serve it, and
`test:smoke` could only ever assert guards (401s, redirects). `wsproxy` is not
the answer: it forwards to a Neon endpoint and requires the Host to match
`*.neon.tech`. `scripts/neon-http-bridge.cjs` (`npm run db:bridge`) closes that
gap by speaking the protocol the driver already uses, pinned to
`node_modules/@neondatabase/serverless/index.js` rather than to a guess:

```bash
docker run -d -p 5432:5432 -e POSTGRES_USER=app -e POSTGRES_PASSWORD=pw \
  -e POSTGRES_DB=app postgres:17-alpine
for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
npm run db:bridge &
DATABASE_URL=postgresql://app:pw@localhost:5432/app \
  NEON_FETCH_ENDPOINT=http://localhost:4444/sql npm run dev
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run test:wallet-e2e
```

`src/lib/neon.ts` already honours `NEON_FETCH_ENDPOINT`, so no runtime code
changed for this. What the bridge has to get right is the *wire format*, and
every mistake here fails silently rather than loudly:

- **`pg` parses dates and JSON before the bridge ever sees them.** It ignores
  the text format for `date`/`timestamp`/`timestamptz` and always runs its own
  parsers, and it parses `json`/`jsonb` to objects. The driver, meanwhile,
  re-parses every value on arrival from `dataTypeID`. Both sides parsing means
  double encoding. Identity parsers
  (`types.setTypeParser(oid, 'text', v => v)` for 1082/1114/1184/114/3802) hand
  back the server's own text, which is the only spelling both halves accept.
  Symptoms seen while getting this wrong: `getTypeParser(1184)(new Date(…))`
  returns **null**, so every timestamp in every response became null and
  `/tim-ve` reported "no flights found" with 6 226 rows sitting in the table;
  and `JSON.parse` over an already-parsed `json_agg` object failed on any
  value holding a comma, so `getBookingById` — and with it every payment —
  died with `"[object Object]" is not valid JSON`.
- **Do not re-serialise a `Date` by hand.** `toISOString()` looks correct and is
  not: Postgres text output is `2026-10-06 23:00:00+00`, and the driver's 1184
  parser returns null for the ISO form. `pg-types`' own stringifier gets the
  session timezone right; a hand-rolled one silently shifts to UTC.
- **A batch is `{queries: [...]}` in and `{results: [...]}` out.** Read out of
  `node_modules/@neondatabase/serverless/index.js`, not guessed. The bridge read
  a bare `{query}` and every `sql.transaction()` in the app — including the one
  that commits a payment — failed with "A query must have either text or a
  name". Run it in one explicit transaction; do not quietly execute statements
  outside one.
- **Answer a 5-digit Postgres error code with HTTP 400.** The driver reads its
  error fields off a 400 body, so anything else surfaces as an opaque 500.

`test:wallet-e2e` needs HTTPS: the session cookies are `Secure`, and curl's
jar will not persist one over a self-signed certificate. It keeps its own jar
and lets the caller trust the dev cert — it is not the file that should flip
`NODE_TLS_REJECT_UNAUTHORIZED`.

**A booking carried the day it was made, not the day it flies.**
`FlightBookingClient` put `new Date().toLocaleDateString('vi-VN')` in the
summary it hands to the payment screen, so a flight for 07/10 was confirmed as
`5/10` — right only when the two happen to match. `Flight` now carries
`departDate`, mapped from `depart_time` through `toVietnamWallClock`, and the
payment screen formats that calendar date by splitting it rather than through
`new Date()`, which would read `2026-10-07` as UTC midnight and print the day
before anywhere west of GMT.

**Re-run the seed when the window runs out.** `npm run db:seed-flights` opens a
21-day window (three weeks, not the seven the date strip shows — someone who
returns next week still lands inside it) and covers 028's international routes,
so HAN→ICN does not vanish when that migration's own week passes. Its admin
credentials come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: there is no
single admin address in a real database, and a hard-coded one made the script
exit 401 everywhere except the database it was written against.

**The schedule's values live in a CSV, not in the seed script.** Block times,
departure times, fares, aircraft and capacity are in
`data/vietjet-schedule.csv`; `scripts/flight-schedule.cjs` only loads, validates
and shapes them. They are *curated* from public Vietjet references — the
`vietjetair.com` fare/route/fleet pages and published block times — **not**
scraped. The booking API (`vietjet-api.vietjetair.com/booking/api/v1/…`) sits
behind AWS WAF, an HMAC `X-Signature` plus proof-of-work and a reCAPTCHA
Enterprise key, so every plain request answers `403 Request blocked`; do not try
to reimplement that signing. The loader fails loudly on anything the database
would reject: a `flight_no` outside 036's shape, a duplicate
`(from_code, to_code, depart_time)`, `economy_price > business_price`, or a
`business_price` that is not `round(economy_price × 2.77)` per 030's ladder. A
route's business number is its **row position** (`BUSINESS_NO_BASE + index`), so
re-ordering the CSV renumbers the business wave and leaves the old rows behind —
keep the numeric flight-number order. Review with `npm run db:preview-flights`
before running `db:seed-flights`, which sweeps rows by `flight_no` and re-creates
them, so a wrong fare replaces what is on sale rather than sitting beside it.

**The network is hub-and-spoke plus the regional pairs that matter.** 027 links
every airport to HAN and SGN; that covers each hub's 26 destinations and leaves
all 462 regional-to-regional pairs unserved. `032` adds the 32 a traveller
actually asks for — adjacent provinces on a corridor, plus each regional hub's
own spokes — with real block times (Đà Nẵng–Huế is 90 minutes, not the 2h10m 027
gives every hop) numbered from 1500, clear of 027's 601–1040, 028's 1100–1256
and 031's 2001+. Seeding all 462 would be both false and unreadable in the
results list. When adding routes, keep the block bands clear of those four
ranges.

**One `flight_no` per row, not per service — and no letter suffix.**
`scripts/seed-future-flights.cjs` creates an economy row and a business wave for
each route. They used to share a number (399 `(day, flight_no)` collisions, with
the results list printing the same service twice), then the business wave got a
`B` suffix — and `FLIGHT_NO_PATTERN` allows an optional `-NNNN` but no letter,
on purpose, because `flights.class` already carries the cabin and migration 035
renumbered 593 legacy `VJ341B` rows for exactly that reason. So a seed run
created 399 economy rows, got 400 on every business row, and silently left the
network with no business cabin to sell. The business wave now carries its own
numeric number in 3001-3089 — the block 035 vacated — so it passes the CHECK
migration 036 added and cannot collide with 027/028/031/032's bands. Sweep the
block too when cleaning up, or every re-run doubles the business rows.

**A duplicate departure is a 409, and the bridge decides whether that happens.**
`flights` keeps `(from_code, to_code, depart_time)` unique as a plain unique
*index*, so Postgres reports the violation with `code = 23505` and the index
name in `constraint`. Measured on Postgres 16: `constraint` carries the name
for an index just as it does for a constraint, and `routine` is the C function
that raised it — `_bt_check_unique` for this index, `ExecConstraints` for a
CHECK, `ri_ReportViolation` for a foreign key. An `err.routine` fallback
matching the index name could therefore never fire; it is gone.

The field never arrived at all in local development, because `errorBody()` in
`scripts/neon-http-bridge.cjs` sent five fields — `message`, `severity`,
`code`, `detail`, `hint`, `position` — while the driver copies sixteen off the
400 body. Application code was correct and every 409 was still a 500.
`src/test/neon-bridge-error.test.ts` pins the set against `NeonDbError`'s own
keys, so a driver upgrade that renames a field fails the test rather than
silently dropping it; it needs no database, so it runs in CI's unit job.

A 409 is also not a failure for the seed: migrations 027/028 already fly
HAN-SGN, HAN-SIN and SGN-ICN out of the same hub slots, which is 33 of its 840
requests, and the service being on sale already is the point of the rolling
window.

**Agency-issued discount codes.** `015_agency_discounts.sql` adds `agencies` and
`discount_codes.agency_id` (nullable, `ON DELETE SET NULL`) plus `issued_by`. Admins
manage agencies at `/quan-tri` → "Đại lý" and pick one from the "Phát hành cho đại lý"
selector when creating a code; the percentage presets (10/20/30%) exist because those
are the tiers the business issues. `agency_id` is *provenance only* — `/api/ma-giam-gia/xac-thuc`
deliberately does not filter by agency, so a customer holding an agency code can enter
it at checkout exactly like a platform-wide one. Deleting an agency therefore orphans
its codes into platform-wide rather than invalidating them.

**Phone identity is normalised before it is stored or looked up.** `user_profiles.phone`
has carried a UNIQUE index since `007`, but registration and login compared the raw
string, so `0986349061`, `+84 986 349 061` and `986349061` were accepted as three
different people, each getting its own wallet. Route every write and lookup through
`normalizePhone` in `src/lib/utils.ts` (canonical form `0XXXXXXXXX`); it also backs the
client-side normalisation in `AuthContext.signUp`. `016_normalize_phone_and_cleanup.sql`
canonicalises rows created before this existed, merges the duplicates it collapses
(preferring the account that has an email, and refusing to guess when a wallet has a
non-zero balance or both rows carry a 2FA enrollment), rewrites unrecognised `role`
values to `user`, and drops the Neon console demo table `playing_with_neon`.

**`user_profiles.id` is `text`, not `uuid`.** Child tables such as `bookings.user_id`
and `user_wallets.user_id` are `text` too, but `admin_roles.user_id` and several others
are not — check `information_schema.columns` before joining or declaring PL/pgSQL
variables, or a comparison fails with `operator does not exist: text <> uuid`.
Application-aware migration caveat: a bare parameter used only in `IS NOT NULL` makes
Postgres refuse the whole query with `could not determine data type of parameter $N`;
add an explicit `::text` cast.

To run the app against a local database without a Neon account, note that
`@neondatabase/serverless` speaks Neon's HTTP `/sql` protocol, not the Postgres wire
protocol ‚Äî raw `DATABASE_URL=postgresql://localhost/...` fails with
`Failed to parse URL from https://api.<host>/sql`. Point `DATABASE_URL` at a
`<db>.<project>.neon.tech`-style host and run a small HTTP proxy that translates
`{query, params}` calls to real Postgres, or use a real Neon branch.

## Critical conventions

- **Use `apiRequest` from `@/shared/services` for app API calls.** It sends
  `credentials: 'include'` and automatically attaches the CSRF header on
  non-GET methods. Raw `fetch` mutations silently omit CSRF and will be rejected
  once a route enforces it. Use `getApiErrorMessage(error, fallback)` for toasts.
- **CSRF is enforced on every mutating route.** `verifyAuthRequest` and
  `verifyAdminRequest` run `validateCsrfOrReject` for non-GET methods, so new
  mutating handlers that use either helper are covered automatically. Handlers
  that parse cookies themselves must call `validateCsrfOrReject` explicitly.
  `proxy.ts` seeds the `csrf_token` cookie for cookieless sessions, so
  `getCsrfHeaders()` always has a value to echo back. When adding enforcement,
  migrate the client to `apiRequest` in the same change or the UI breaks with 403.
  The password-reset routes do not use the auth helpers, so they call
  `validateCsrfOrReject` themselves ‚Äî keep that call when editing them.
- **`verifyAdminRequest` returns a discriminated union.** Failure always carries
  `response`, so `const { error, response } = await verifyAdminRequest(...); if (error)
return response;` narrows correctly and avoids returning `undefined` from a handler.
- All state-changing admin APIs must be gated by `verifyAdminRequest`; the proxy
  (`proxy.ts`) also blocks non-admins from `/quan-tri` and `/api/quan-tri`.
- **Public routes/APIs are declared in `src/lib/route-access.ts`**, which
  `proxy.ts` imports (`src/lib/route-access.test.ts` pins the classification).
  `isPublicApiRoute` lists only endpoints that must answer without a session
  (flight search, booking-code check-in, public bank config); anything else is
  treated as private, so don't add an entry without confirming the handler is
  genuinely anonymous.
- Filesystem routes (`/api/editor/files`) must stay admin-only and reject paths
  outside the project root plus secret-bearing files (`.env*`, `*.pem`, `*.key`, `.git`).
- **Never trust identity from request bodies or headers** (`x-user-id`). Resolve the
  caller from the signed `access_token` via `getToken`/`verifyAuthRequest`.
- **Gate privileged checks with `isAdminRole(role)`**, not `role === 'admin'`, so the
  comparison survives future role additions.
- Chat conversation access must go through `userOwnsConversation(conversationId, userId)`
  for non-admins; do not fetch all conversations just to check ownership.
- **Paginated handlers use `src/lib/pagination.ts`** (`parsePaginationParams`,
  `getOffset`, `getPaginationMeta`) rather than raw `parseInt(searchParams.get('page'))`.
  The raw idiom turns malformed input into `NaN` and skips the 100-row limit cap.
- **`sql.transaction([...])` cannot reference another statement's result.** The Neon
  batch API runs each statement independently, so interpolating `queryA.id` into
  `queryB` passes `undefined`. To write a parent and its children in one round trip,
  use a data-modifying CTE and have the child inserts `SELECT nb.id FROM new_booking nb`
  (see `createBooking`). Bulk rows go in via `jsonb_to_recordset`, which needs the
  `::jsonb` cast and a column list whose types match the target columns (`dob date`,
  not `text` ‚Äî there is no implicit text‚Üídate cast in a recordset definition).
- **`json_agg(...) FILTER (WHERE ...)` returns SQL `NULL`, not `[]`, when nothing
  matches.** Map it with `Array.isArray(x) ? x : []` before indexing; `x[0]` throws
  on a booking with no passengers or payments.
- **Every booking-scoped route must verify ownership, not just authentication.**
  `booking.user_id === user.userId` (or `isAdminRole(user.role)`) before reading or
  mutating. `/api/checkin` (POST) and `/api/checkin/status/[bookingId]` previously
  accepted any booking id / booking code, letting a signed-in user read or check in
  someone else's reservation. The status route requires a session for the same reason.
- **2FA is enforced at login, not at the API layer.** `user_2fa` rows whose
  `is_enabled` is false are incomplete enrollments and must never block a
  login; `/api/xac-thuc/dang-nhap` answers 401 with `requires2FA: true` when a
  code is needed. Backup codes are stored as SHA-256 digests in
  `backup_codes` and spent with a conditional UPDATE, so they are single-use
  even under concurrent requests. Use `src/lib/two-factor.ts` for TOTP and
  code handling rather than calling `otplib` directly.
- **Login identity is `session_id`, not `user_sessions.is_current`.**
  `is_current` describes the viewer, so the sessions API computes it by
  comparing each row against the `session_id` cookie. `user_sessions` and
  `login_history` live in `src/lib/security-db.ts`; deletes are always scoped
  by `user_id` so a foreign session id is a silent no-op.
- **The README demo passwords only apply to a fresh database.** `014_seed_demo_data.sql`
  still seeds the old `@vietjetsim.vn` domain, and `022_rename_demo_email_domain.sql`
  then renames those two rows to `@vietjetair.vn`. Both statements are
  `ON CONFLICT (email) DO NOTHING`-safe, so on a database where the rows already
  exist with other hashes the migrations are a no-op and the documented logins fail.
  `npm run db:seed-demo` (`scripts/seed-demo-accounts.cjs`) resets both accounts to the
  README credentials and their intended roles. Keep the README table and that script's
  `DEMO_ACCOUNTS` in sync; it writes to whatever `DATABASE_URL` points at.

## Chat (h·ªó tr·ª£ kh√°ch h√Ýng + tr·ª£ l√Ω AI)

Chat lives in `src/features/chat` (`UserChat`, `OpenClawAssistant`, `ChatWidgets`)
with services in `src/features/chat/services` and APIs under `src/app/api/tro-chuyen/*`.

- **Both widgets mount once, from the root layout** via `<ChatWidgets />` (inside
  `AuthProvider`). Each widget gates itself: `UserChat` renders only for a signed-in
  user and returns `null` on `/quan-tri`; `OpenClawAssistant` renders only when
  `isAdmin && pathname.startsWith('/quan-tri')`. Do not re-mount `UserChat` on an
  individual page ‚Äî that renders two floating buttons.
- **Presence (`/api/tro-chuyen/truc-tuyen`) is conversation-scoped.** Both GET and
  POST require the caller to own the conversation (`userOwnsConversation`) unless they
  are an admin. GET previously accepted a `role` query param that overrode the token's
  role; never reintroduce a client-supplied role. The viewer's own role is derived with
  `isAdminRole(payload.role)`.
- **`/api/tro-ly-ai/tro-chuyen` is admin-only** and gated by `verifyAdminRequest`, which
  enforces CSRF before auth. Its sole caller is the Admin console widget; call it through
  `askAssistant()` rather than raw fetch.
- **The assistant has two backends; Ollama is only picked when it is configured.**
  `resolveAssistantProvider` (`src/lib/openclaw/ollama.ts`) answers `ollama` as soon as any
  `OLLAMA_*` variable exists (`OPENCLAW_PROVIDER` overrides the guess) and `openclaw`
  otherwise, so an environment without Ollama config keeps calling the gateway exactly as
  before — that default is pinned in `src/test/ollama-provider.test.ts`. The chosen backend
  is tried first and the other only when it is configured (`getProviderAttempts`), so one
  dead backend does not fail the turn while the other is alive. A `GET` on the same route
  reports which backend is live and what `GET /api/tags` offers, which is also what the
  widget prints under "Đang trực tuyến".
- **The new question travels as the last `user` message, not only in `history`.**
  The widget sends the typed text in `message` and only the *previous* turns in `history`,
  so a turn assembled from `history` alone answers the previous question — measured against
  a stub Ollama before `ollamaMessages = [...context, question]` existed. Two details came
  with the fix: a duplicate-tail guard (a client that also puts the question at the end of
  `history` must not send it twice) and `OLLAMA_THINK` only forwarded when set, because
  older Ollama builds do not know the `think` field.
- **Archiving is a real `status` column**, not a UI-only flag. `PATCH
  /api/tro-chuyen/cuoc-hoi-thoai` is admin-only, rejects any status other than
  `active`/`closed`, and backs the Admin `ChatTab` "L∆∞u tr·ªØ" filter and its
  archive/reopen button (`setConversationStatus`).
- **The mock DB models chat in memory.** `src/lib/neon.ts` has a `runChatQuery` branch
  plus a `.query` method that mirrors the SQL `src/lib/db.ts` issues through
  `sql.query`, so chat works without `DATABASE_URL`. New chat SQL must be mirrored
  there or it silently no-ops in mock mode. Restart `next dev` after editing
  `neon.ts` ‚Äî a stale server serves the old mock and looks like a 404 on new queries.

## Testing

Vitest, tests in `src/test/` (`src/test/setup.ts` is the setup file). Route handlers are
tested by importing them directly and passing a real `NextRequest` with a real JWT from
`signAccessToken` in `@/lib/auth`. `@/lib/neon` is mocked there. Prefer this over
mocking business logic.

`setup.ts` stubs `next/navigation` (`useRouter`/`usePathname`/`useSearchParams`/`useParams`).
Components are rendered outside an `<AppRouterContext>`, so any component calling
`useRouter` throws "invariant expected app router to be mounted" without it. Add to that
mock rather than wrapping individual tests in a router provider.

`npm run test:smoke` (`scripts/smoke-test.cjs`) is a dependency-free HTTP smoke test
against a running server; CI runs it in the `smoke` job on port 4028 with no
`DATABASE_URL`, so it exercises the mock DB path. It asserts routing, redirects, the CSRF
handshake and auth guards, not happy-path writes ‚Äî the mock DB cannot register users, so
persistence flows are out of scope. Point it elsewhere with `SMOKE_BASE_URL`.

`npm run test:ui` (`scripts/ui-check.cjs`) drives real headless Chrome over the DevTools
Protocol and asserts the *browser* side that smoke cannot see: no `console.error`, no JS
exception, no non-401 HTTP error, no horizontal overflow, no overlapping boxes, no
`<img>` with an empty `src`, and no capture taken while a `.skeleton-*` is still on
screen. It screenshots 14 screens (plus the OpenClaw widget) and exits non-zero if any
screen has a flag, so it works as a gate. **Run it against a production build** (`npm run
build && npm start`) — this is where the difference is load-bearing: `next dev` does not
prefetch, so `router.prefetch('/dat-ve')` for a non-existent route (only `/dat-ve/[id]`
exists) produced a 404 on every page in `next start` and nowhere in dev, and the dev
server compiles routes on demand, so a fixed sleep photographs skeletons. It needs Chrome
on the machine and the demo logins (`admin@vietjetair.vn` / `user@vietjetair.vn`, see the
README); login status is printed but does not gate, since a fresh DB has no such accounts.
Override with `UI_CHECK_BASE_URL`, `CHROME_PATH` and `UI_CHECK_SHOTS_DIR` (screenshots
default to a temp dir so a repo run does not leave artifacts behind).

**`src/proxy.ts` runs on both `next dev` and `next start`.** Next.js 16 renamed
the file convention from `middleware.ts` (export `middleware`) to `proxy.ts` (export
`proxy`), and the file must sit at the same level as `app` — here that is `src/`,
not the project root. All three mistakes stacked in this repo: the deprecated name was
silently skipped by `next dev` while `next start` still ran it, and the dev watcher
never even sees a root-level proxy when the app lives in `src/`
(`setup-dev-bundler` only watches `<app-level>/proxy.*`, while `next build`
additionally accepts the project root). That is exactly how auth redirects and
CSRF seeding were disabled in development while production still worked. With the
`src/proxy.ts` convention the dev/prod divergence is gone:
the proxy bounces every non-public path to `/dang-nhap` before routing and seeds the
`csrf_token` cookie on cookieless requests in dev too. Consequences to remember:

- Any route that must answer without a session needs an entry in
  `src/lib/route-access.ts` (see `isPublicApiRoute`), or the proxy returns a 307
  redirect where dev/tests expect 401/200/404. `/api/csrf`, `/api/xac-thuc/lam-moi` and
  the marketing pages were each missing and only failed in production.
- Protected `/api/*` routes return **401 JSON**, not a redirect, so XHR callers can
  branch on status. Only page paths redirect to `/dang-nhap`.
- CI's smoke job runs against `next dev`, so it now exercises the proxy as well. When
  touching `proxy.ts`/`route-access.ts`, still run the smoke test against a production
  build (`npm run build && npm start`) before trusting a green CI.

## UI design system

Brand red is `#EC2029` (hover `#D91A21`, dark `#6F0000`); the CTA/action yellow is
`#FFDD00` with the deeper `#F9A51A`/`#FBB612` accents. Theme values live in
`tailwind.config.js` and `src/styles/tailwind.css`. Keep pages on these tokens ‚Äî a
past palette (`#ED1D23`, `#E30613`, `#FFD400`, `#FFC400`) was removed, so reintroducing
one of those hexes is a regression, not a neutral choice. The same applies to off-brand
neutrals that ignore the tokens: `/chuyen-bay-cua-toi` and `/lam-thu-tuc` once used
`#1e293b`/`#fff5f5`/`#FFF8E1`/`#7a6a00`/`#111827` and raw `gray-50`/`gray-300`; use
`var(--foreground*)`, `var(--surface*)` and `var(--border)` instead so dark mode works.

`vj-menubar` styles the red uppercase nav row and `vj-cta` the gold pill button; prefer
those utilities over restyling a bespoke button. `vj-btn` + `vj-btn-primary` is the
brand-red action button (`vj-btn-pill` rounds it); most pages render `<Header />` and
`<Footer />` from `@/shared/components/navigation` themselves (only `/dang-nhap`,
`/quen-mat-khau`, `/dat-lai-mat-khau`, `/editor`, `/quan-tri` are intentionally
standalone), so a new page should add both.

The auth screens do **not** use `vj-btn-primary`. Their submit buttons use
`vj-auth-submit` (48px tall, 344px wide, 4px radius, flat 90¬∞ gold sweep `#F9A51A‚Üí#FFDD00`,
`#333` text, hover only dims to `opacity: .9`), copied from the real SkyID login theme.
That theme lives on `skyjoy-authen.vietjetair.com`, which fronts a Keycloak realm on
`skyjoy-id.vietjetair.com`; both answer a VPN/proxy block page to this sandbox, so the
values above come from the theme's own leaked stylesheet ‚Äî don't "correct" them to red.
Keep auth CTAs on that one utility rather than reintroducing `.vj-btn`.

Floating labels (`.form-label-float`) sit on a `var(--background)` chip when lifted, so
in dark mode they need the `.dark` override to `var(--dark-surface)`; a hard-coded
`background: white` there produces a white notch over a dark input.

Public information pages share `<PageHero>` (`@/shared/components/navigation`), which
renders the brand red sweep via `.vj-page-hero`. Do not re-add an inline
`linear-gradient(20.12deg, ‚Ä¶)` hero ‚Äî `gioi-thieu`, `hoi-dap`, `lien-he` and `dich-vu`
were consolidated onto it. `/hanh-ly` is a pure `redirect()` and correctly has no
chrome.

The auth screens share `AuthShell` (split brand/form layout) and `AlertBanner` from
`@/features/auth/components`; `/dang-nhap` toggles login and registration in one route
(`?tab=register` deep-links registration, `?redirect=` restores the bounced path). The
tab strip follows SkyID's order ‚Äî **ƒêƒÉng k√Ω before ƒêƒÉng nh·∫≠p** ‚Äî while the default tab
stays login, so keep the array order and the default state in sync when editing. The
terms/privacy links in the registration form point at `/gioi-thieu`, matching
`Footer.tsx`; they were previously `href="#"`, which silently made a legally-required
consent link a no-op.
Password recovery is `/quen-mat-khau` (request a link) ‚Üí `/dat-lai-mat-khau?token=‚Ä¶`
(consume it). Tokens are single-use and hashed in `account_recovery` via
`src/lib/password-reset.ts`; a successful reset revokes refresh tokens and sessions.
There is no mail transport, so the request endpoint echoes `resetUrl` only outside
production.

`/hanh-ly` is a redirect to `/dich-vu?service=baggage`, and `/dich-vu` reads the
`service` query param (`baggage`, `meal`, `seat`, `insurance`, `priority`, `lounge`) to
preselect a panel. Link services as `/dich-vu?service=<id>` rather than as subpaths like
`/dich-vu/hanh-ly`, which do not exist and 404.

`/lam-thu-tuc-truc-tuyen` is a legacy alias that 307s to `/lam-thu-tuc`; it forwards the
whole query string, so `?code=` survives. Both are in `PUBLIC_ROUTES` ‚Äî the check-in
lookup is anonymous (booking code + surname are the credentials). `/chuyen-bay-cua-toi`
is public too, but it reads `/api/checkin/status/[bookingId]`, which is *not* in
`PUBLIC_API_ROUTES`, so a signed-out visitor sees the booking-code lookup and an empty
state rather than someone else's reservations.

`useToast` owns its own state: render `<ToastContainer toasts={toast.toasts}
onDismiss={toast.dismiss} />`. Passing a literal `toasts={[]}` compiles and renders but
silently swallows every toast.

- **Payments are admin-configured.** Bank accounts live in `bank_accounts` and are
  edited at `/quan-tri` → "Ngân hàng" (`BankAccountsTab`, API
  `/api/quan-tri/tai-khoan-ngan-hang`). `transfer_note_template` is the payment
  content the customer must paste into their bank app; it is rendered by
  `src/lib/transfer-note.ts` and supports `{code}`, `{amount}`, `{original}`,
  `{discount}`, `{discount_code}`. Amounts render as separator-free digits
  (`850000`, never `850,000`) because a receiving bank or a customer retyping the
  amount can misread a separator. Unknown tokens are a **hard 400 on save** rather
  than a warning — they would otherwise ship a literal `{amout}` to the customer.
  `PATCH` only validates when the field is present, so an `is_active` toggle cannot
  be rejected for a template that predates the token set. The public config route
  (`/api/cong-khai/cau-hinh-ngan-hang`) is what checkout reads; it is in
  `PUBLIC_API_ROUTES`.

### Tailwind gotchas that caused real regressions

- **`[var(--x)]/N` silently compiles to nothing.** Tailwind 3.4's `/opacity` modifier
  cannot resolve a plain CSS variable, so `bg-[var(--vj-red)]/10` produces _no rule at
  all_ ‚Äî no error, no warning. Use channel variables and wrap in `rgb()`:
  `bg-[rgb(var(--vj-red-rgb))]/10`. Channel tokens (`--vj-red-rgb: 236 32 41`) live in
  `:root` in `tailwind.css`; add one whenever you add a translucent tint.
- **Only `src/styles/tailwind.css` is imported** (by `src/app/layout.tsx`). A stylesheet
  under `src/styles/` that nothing imports is dead code ‚Äî dark mode once shipped a second
  `[data-theme="dark"]` mechanism that way while `ThemeContext` toggles a `dark` class.
  `darkMode: 'class'` with a `.dark` selector is the only supported mechanism.
- **Use the token for brand red**: `hover:bg-primary-dark` / `var(--primary-dark)`
  (`#D91A21`), not a bespoke `#C41017`/`#D0021B`. One-off hexes for a specific UI accent
  are fine, but a button hover is not a place to invent a shade.
- **Page roots share the canvas token** ‚Äî `min-h-screen bg-[var(--surface)]` for content
  pages, `bg-[var(--background)]` where the page must stay white in light mode. Avoid
  `bg-gray-50`/`bg-stone-50`/raw hex, which ignore dark mode.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
