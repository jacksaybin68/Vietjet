/**
 * Client-side CSRF helpers.
 *
 * Split from `@/lib/csrf` because that module imports `next/headers`, which
 * cannot be pulled into a client bundle. Only the double-submit header value
 * read from `document.cookie` belongs here; token generation and validation
 * stay server-side.
 */

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/** Read the CSRF token from `document.cookie`. Returns null during SSR. */
export function getCsrfTokenFromDocument(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(new RegExp('(^| )' + CSRF_COOKIE_NAME + '=([^;]+)'));
  return match ? match[2] : null;
}

/** Headers object carrying the double-submit CSRF token, empty when absent. */
export function getCsrfHeaders(): HeadersInit {
  const token = getCsrfTokenFromDocument();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

/** Fetch wrapper that automatically includes the CSRF token. */
export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...getCsrfHeaders(),
      ...options.headers,
    },
  });
}
