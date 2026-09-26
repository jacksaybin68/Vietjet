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
  seeds `user@vietjetsim.vn` / `admin@vietjetsim.vn` with `ON CONFLICT (email) DO NOTHING`,
  so on a database where those rows already exist with other hashes the migration is a
  no-op and the documented logins fail. `npm run db:seed-demo`
  (`scripts/seed-demo-accounts.cjs`) resets both accounts to the README credentials and
  their intended roles. Keep the README table and that script's `DEMO_ACCOUNTS` in sync;
  it writes to whatever `DATABASE_URL` points at.

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
