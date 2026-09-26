// Route classification shared between `middleware.ts` (Edge runtime) and tests.
//
// Keep this module dependency-free: the Edge middleware bundle cannot pull in
// `next/headers`-dependent modules.
//
// `publicRoutes` are page paths reachable while signed out; `publicApiRoutes`
// are API handlers that must answer without a session. Every API path listed
// here is deliberately unauthenticated, so add entries only for genuinely
// anonymous endpoints — anything else leaks data to unauthenticated callers.
export const PUBLIC_ROUTES = [
  '/',
  '/dang-nhap',
  // Password recovery must be reachable without a session.
  '/quen-mat-khau',
  '/dat-lai-mat-khau',
  '/trang-chu',
  '/chuyen-bay-cua-toi',
  '/lam-thu-tuc',
  // Marketing/support pages — freely browsable while signed out.
  '/dich-vu',
  '/gioi-thieu',
  '/hoi-dap',
  '/lien-he',
  '/tra-cuu',
  // Legacy alias for the same anonymous check-in lookup; it 307s to
  // `/lam-thu-tuc` forwarding the query string.
  '/lam-thu-tuc-truc-tuyen',
  '/dat-ve',
  '/tim-ve',
  // Programs alias that immediately 307s to the (public) services page — it
  // must stay reachable signed-out, otherwise the middleware bounces it
  // to login before the page's own redirect can run.
  '/hanh-ly',
] as const;

export const PUBLIC_API_ROUTES = [
  // Flight search backs the anonymous search page.
  '/api/chuyen-bay',
  // The airport list behind the hero search form. Reference data, read before
  // anyone has signed in, same as the flight search it feeds.
  '/api/san-bay',
  // Lookup by booking code + passenger name: the credentials are the booking
  // code, and requiring a session would break the anonymous check-in lookup.
  '/api/checkin',
  // Public bank/transfer config shown on the payment page.
  '/api/cong-khai/cau-hinh-ngan-hang',
  // CSRF bootstrap: anonymous GET minting the double-submit cookie that
  // every mutation route echoes back. Blocking it in the middleware would
  // make the cookie bootstrap unreachable on production builds, and every
  // mutating API would fail CSRF with 403.
  '/api/csrf',
  // Refresh-token rotation: anonymous by design — the handler itself returns
  // 401 when no/invalid token is present, so the middleware must not
  // bounce it to login first.
  '/api/xac-thuc/lam-moi',
] as const;

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(route + '/');
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route));
}

export function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => matchesRoute(pathname, route));
}
