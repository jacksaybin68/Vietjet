import { getCsrfHeaders } from '@/lib/csrf-client';

/**
 * Error thrown by {@link apiRequest} when the server responds with a non-2xx
 * status. Carries the parsed payload so callers can surface a specific message.
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly payload?: unknown
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip attaching the CSRF header (GET/HEAD never need it). */
  skipCsrf?: boolean;
}

/**
 * Human-readable message for a failed {@link apiRequest} call. Falls back to
 * `fallback` for unexpected errors (network failures, thrown strings, …).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message) return record.message;
    if (typeof record.error === 'string' && record.error) return record.error;
  }
  return fallback;
}

/**
 * Thin wrapper over `fetch` for the app's own `/api/*` routes.
 *
 * Unlike the legacy `HttpClient` this uses relative URLs, so it inherits the
 * origin the browser is already on, and sends cookies plus the CSRF header
 * that every mutating route validates via `validateCsrfOrReject`.
 */
export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipCsrf, headers, ...rest } = options;
  const isMutation = method !== 'GET';

  const response = await fetch(url, {
    ...rest,
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(isMutation && !skipCsrf ? getCsrfHeaders() : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      extractMessage(payload, `Yêu cầu thất bại (${response.status})`),
      payload
    );
  }

  return payload as T;
}
