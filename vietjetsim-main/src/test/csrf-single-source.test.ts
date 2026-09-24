/**
 * Regression tests: the double-submit `csrf_token` cookie must have exactly one
 * issuer per response.
 *
 * `src/proxy.ts` bootstraps the cookie for browsers that do not have one yet,
 * while `src/app/api/csrf/route.ts` issues it on demand. When both wrote it into
 * the same response, a token-less GET /api/csrf returned two
 * `Set-Cookie: csrf_token=…` headers holding different tokens, so which token a
 * client kept came down to header ordering instead of to a single source.
 */

import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

import { GET as issueCsrfToken } from '@/app/api/csrf/route';
import { generateCsrfToken } from '@/lib/csrf';
import { proxy } from '@/proxy';

const SITE = 'http://localhost:4028';

const HEX_TOKEN = /^[a-f0-9]{64}$/;

/**
 * `proxy()` also returns bare `Response`s (rate-limit rejections), so narrow the
 * result to the `NextResponse` whose cookie jar these assertions inspect.
 */
async function proxyFor(url: string, cookie?: string): Promise<NextResponse> {
  const request = new NextRequest(url, cookie ? { headers: { cookie } } : undefined);
  return (await proxy(request)) as NextResponse;
}

describe('CSRF cookie has a single issuer', () => {
  it('the issuing route reuses the token the client already holds', async () => {
    const heldToken = generateCsrfToken();

    const response = await issueCsrfToken(
      new Request(`${SITE}/api/csrf`, { headers: { cookie: `csrf_token=${heldToken}` } })
    );

    const issued = response.cookies.getAll('csrf_token');
    expect(issued).toHaveLength(1);
    expect(issued[0].value).toBe(heldToken);
  });

  it('the issuing route mints exactly one token when the client has none', async () => {
    const response = await issueCsrfToken(new Request(`${SITE}/api/csrf`));

    const issued = response.cookies.getAll('csrf_token');
    expect(issued).toHaveLength(1);
    expect(issued[0].value).toMatch(HEX_TOKEN);
  });

  it('the proxy leaves /api/csrf alone so the route is its only issuer', async () => {
    const response = await proxyFor(`${SITE}/api/csrf`);

    expect(response.cookies.getAll('csrf_token')).toHaveLength(0);
  });

  it('the proxy still bootstraps the cookie on other routes', async () => {
    const response = await proxyFor(`${SITE}/trang-chu`);

    const bootstrapped = response.cookies.getAll('csrf_token');
    expect(bootstrapped).toHaveLength(1);
    expect(bootstrapped[0].value).toMatch(HEX_TOKEN);
  });

  it('the proxy does not rotate a cookie the browser already has', async () => {
    const heldToken = generateCsrfToken();

    const response = await proxyFor(`${SITE}/trang-chu`, `csrf_token=${heldToken}`);

    expect(response.cookies.getAll('csrf_token')).toHaveLength(0);
  });
});
