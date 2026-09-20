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

## Critical conventions

- **Use `apiRequest` from `@/shared/services` for app API calls.** It sends
  `credentials: 'include'` and automatically attaches the CSRF header on
  non-GET methods. Raw `fetch` mutations silently omit CSRF and will be rejected
  once a route enforces it. Use `getApiErrorMessage(error, fallback)` for toasts.
- **CSRF is enforced only on some mutating routes** (`validateCsrfOrReject`). When
  adding enforcement to a route, migrate its client to `apiRequest` in the same
  change or the UI breaks with a 403.
- **`verifyAdminRequest` returns a discriminated union.** Failure always carries
  `response`, so `const { error, response } = await verifyAdminRequest(...); if (error)
  return response;` narrows correctly and avoids returning `undefined` from a handler.
- All state-changing admin APIs must be gated by `verifyAdminRequest`; middleware
  (`middleware.ts`) also blocks non-admins from `/quan-tri` and `/api/quan-tri`.
- Filesystem routes (`/api/editor/files`) must stay admin-only and reject paths
  outside the project root plus secret-bearing files (`.env*`, `*.pem`, `*.key`, `.git`).

## Testing

Vitest, tests in `src/test/` (`src/test/setup.ts` is the setup file). Route handlers are
tested by importing them directly and passing a real `NextRequest` with a real JWT from
`signAccessToken` in `@/lib/auth`. `@/lib/neon` is mocked there. Prefer this over
mocking business logic.