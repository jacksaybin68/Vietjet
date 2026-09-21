# AGENTS.md

Repository memory for VietjetSim (Next.js 15 / React 19 / TypeScript / Tailwind / Neon Postgres).

## Commands

```bash
npm run dev        # next dev --turbo -p 4028
npm run build      # next build (runs its own TS type check — a tsc error fails the build)
npm run type-check # tsc --noEmit
npm test           # vitest run
npm run lint       # eslint .   (NOT `next lint` — that is removed in Next 15)
npm run lint:fix   # eslint . --fix
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
`DATABASE_URL` is unset, that module falls back to an in-memory mock for local dev/CI —
tests rely on it, so keep the fallback intact. There is no Supabase dependency: the auth
layer is custom JWT (`src/lib/auth.ts`) and data isolation comes from `user_id`-scoped
queries plus RBAC guards, not database-level policies.

Apply `migrations/*.sql` in filename order; they are the only schema source. `013`
wires the `bookings.booking_code` default and `014` seeds airports, flights and the
README demo accounts, so a freshly migrated database is usable without manual inserts.
`014` is idempotent (re-runs keep counts stable via `ON CONFLICT`) and dates its flights
relative to `CURRENT_DATE`, so date-filtered flight search only finds them on the
following day.

To run the app against a local database without a Neon account, note that
`@neondatabase/serverless` speaks Neon's HTTP `/sql` protocol, not the Postgres wire
protocol — raw `DATABASE_URL=postgresql://localhost/...` fails with
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
  `middleware.ts` seeds the `csrf_token` cookie for cookieless sessions, so
  `getCsrfHeaders()` always has a value to echo back. When adding enforcement,
  migrate the client to `apiRequest` in the same change or the UI breaks with 403.
- **`verifyAdminRequest` returns a discriminated union.** Failure always carries
  `response`, so `const { error, response } = await verifyAdminRequest(...); if (error)
  return response;` narrows correctly and avoids returning `undefined` from a handler.
- All state-changing admin APIs must be gated by `verifyAdminRequest`; middleware
  (`middleware.ts`) also blocks non-admins from `/quan-tri` and `/api/quan-tri`.
- **Public routes/APIs are declared in `src/lib/route-access.ts`**, which
  `middleware.ts` imports (`src/lib/route-access.test.ts` pins the classification).
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
  not `text` — there is no implicit text→date cast in a recordset definition).
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
  seeds `user@vietjetsim.vn` / `admin@vietjetsim.vn` with `ON CONFLICT (email) DO NOTHING`,
  so on a database where those rows already exist with other hashes the migration is a
  no-op and the documented logins fail. `npm run db:seed-demo`
  (`scripts/seed-demo-accounts.cjs`) resets both accounts to the README credentials and
  their intended roles. Keep the README table and that script's `DEMO_ACCOUNTS` in sync;
  it writes to whatever `DATABASE_URL` points at.

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
handshake and auth guards, not happy-path writes — the mock DB cannot register users, so
persistence flows are out of scope. Point it elsewhere with `SMOKE_BASE_URL`.

## UI design system

Brand red is `#EC2029` (hover `#D91A21`, dark `#6F0000`); the CTA/action yellow is
`#FFDD00` with the deeper `#F9A51A`/`#FBB612` accents. Theme values live in
`tailwind.config.js` and `src/styles/tailwind.css`. Keep pages on these tokens — a
past palette (`#ED1D23`, `#E30613`, `#FFD400`, `#FFC400`) was removed, so reintroducing
one of those hexes is a regression, not a neutral choice.

`vj-menubar` styles the red uppercase nav row and `vj-cta` the gold pill button; prefer
those utilities over restyling a bespoke button. Most pages render `<Header />` and
`<Footer />` from `@/shared/components/navigation` themselves (only `/dang-nhap`,
`/editor`, `/quan-tri` are intentionally standalone), so a new page should add both.

`/hanh-ly` is a redirect to `/dich-vu?service=baggage`, and `/dich-vu` reads the
`service` query param (`baggage`, `meal`, `seat`, `insurance`, `priority`, `lounge`) to
preselect a panel. Link services as `/dich-vu?service=<id>` rather than as subpaths like
`/dich-vu/hanh-ly`, which do not exist and 404.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
