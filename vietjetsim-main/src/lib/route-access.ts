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
  '/trang-chu',
  '/chuyen-bay-cua-toi',
  '/lam-thu-tuc',
  '/dat-ve',
  '/tim-ve',
] as const;

export const PUBLIC_API_ROUTES = [
  // Flight search backs the anonymous search page.
  '/api/chuyen-bay',
  // Lookup by booking code + passenger name: the credentials are the booking
  // code, and requiring a session would break the anonymous check-in lookup.
  '/api/checkin',
  // Public bank/transfer config shown on the payment page.
  '/api/cong-khai/cau-hinh-ngan-hang',
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
