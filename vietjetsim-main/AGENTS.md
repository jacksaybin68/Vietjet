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

## Testing

Vitest, tests in `src/test/` (`src/test/setup.ts` is the setup file). Route handlers are
tested by importing them directly and passing a real `NextRequest` with a real JWT from
`signAccessToken` in `@/lib/auth`. `@/lib/neon` is mocked there. Prefer this over
mocking business logic.