/**
 * Unit Tests for the shared `apiRequest` fetch wrapper.
 *
 * Covers the CSRF header attach rule (mutations only) and error surfacing,
 * since every migrated feature service relies on both.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { apiRequest, ApiRequestError, getApiErrorMessage } from '@/shared/services';

function mockFetch(response: { ok: boolean; status?: number; body?: unknown }) {
  const fake = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    text: async () => (response.body === undefined ? '' : JSON.stringify(response.body)),
  });
  vi.stubGlobal('fetch', fake);
  return fake;
}

beforeEach(() => {
  document.cookie = 'csrf_token=test-token';
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('apiRequest', () => {
  it('attaches the CSRF header on mutations', async () => {
    const fetchMock = mockFetch({ ok: true, body: { success: true } });

    await apiRequest('/api/dat-ve', { method: 'POST', body: { flight_id: 'f1' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['x-csrf-token']).toBe('test-token');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ flight_id: 'f1' }));
  });

  it('omits the CSRF header on GET', async () => {
    const fetchMock = mockFetch({ ok: true, body: { flights: [] } });

    await apiRequest('/api/chuyen-bay?from=HAN&to=SGN');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('GET');
    expect(init.headers['x-csrf-token']).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('always sends credentials so cookie auth works', async () => {
    const fetchMock = mockFetch({ ok: true, body: {} });

    await apiRequest('/api/vi');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe('include');
  });

  it('throws ApiRequestError carrying the server message and status', async () => {
    mockFetch({ ok: false, status: 403, body: { message: 'CSRF token invalid' } });

    await expect(apiRequest('/api/thanh-toan', { method: 'POST', body: {} })).rejects.toThrow(
      expect.objectContaining({ status: 403, message: 'CSRF token invalid' })
    );
  });

  it('falls back to the error field when message is absent', async () => {
    mockFetch({ ok: false, status: 400, body: { error: 'Bad Request' } });

    const error = await apiRequest('/api/vi').catch((e) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).message).toBe('Bad Request');
  });

  it('parses an empty body without throwing', async () => {
    mockFetch({ ok: true });

    await expect(
      apiRequest('/api/thong-bao/danh-dau-tat-ca', { method: 'POST' })
    ).resolves.toBeNull();
  });
});

describe('getApiErrorMessage', () => {
  it('prefers the ApiRequestError message', () => {
    expect(getApiErrorMessage(new ApiRequestError(403, 'Bị từ chối'), 'mặc định')).toBe(
      'Bị từ chối'
    );
  });

  it('uses a plain Error message when present', () => {
    expect(getApiErrorMessage(new Error('network down'), 'mặc định')).toBe('network down');
  });

  it('falls back for unknown throwables', () => {
    expect(getApiErrorMessage('oops', 'mặc định')).toBe('mặc định');
    expect(getApiErrorMessage(undefined, 'mặc định')).toBe('mặc định');
  });
});
