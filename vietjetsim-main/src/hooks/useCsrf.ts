'use client';

/**
 * useCsrf - Client-side CSRF token management hook
 *
 * Automatically fetches CSRF token and provides fetch wrapper
 * that includes the token in all requests.
 *
 * Usage:
 *   const { csrfFetch, getCsrfToken, refreshToken } = useCsrf();
 *
 *   // Use csrfFetch for mutations
 *   await csrfFetch('/api/bookings', { method: 'POST', body: JSON.stringify(data) });
 *
 *   // Or get token manually
 *   const token = getCsrfToken();
 */

import { useState, useCallback, useEffect } from 'react';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Get CSRF token from document.cookie
 */
export function getCsrfTokenFromDocument(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(new RegExp('(^| )' + CSRF_COOKIE_NAME + '=([^;]+)'));
  return match ? match[2] : null;
}

/**
 * Get headers object with CSRF token for fetch requests
 */
export function getCsrfHeaders(): HeadersInit {
  const token = getCsrfTokenFromDocument();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

interface UseCsrfReturn {
  csrfToken: string | null;
  csrfFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshToken: () => Promise<string | null>;
  isLoading: boolean;
}

export function useCsrf(): UseCsrfReturn {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch CSRF token from cookie on mount
  useEffect(() => {
    setCsrfToken(getCsrfTokenFromDocument());
    setIsLoading(false);
  }, []);

  // Refresh token from cookie
  const refreshToken = useCallback(async (): Promise<string | null> => {
    const token = getCsrfTokenFromDocument();
    setCsrfToken(token);
    return token;
  }, []);

  // Fetch wrapper that automatically includes CSRF token
  const csrfFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = getCsrfHeaders();

      return fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });
    },
    []
  );

  return {
    csrfToken,
    csrfFetch,
    refreshToken,
    isLoading,
  };
}

/**
 * Refresh CSRF token by re-fetching a page endpoint
 * Call this before important mutations if token might be stale
 */
export async function refreshCsrfToken(): Promise<string | null> {
  try {
    // Fetch any page to get the CSRF cookie set
    await fetch('/api/auth/me', { credentials: 'include' });
    return getCsrfTokenFromDocument();
  } catch {
    return null;
  }
}
