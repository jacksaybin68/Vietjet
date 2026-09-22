#!/usr/bin/env node
/**
 * Post-build smoke test
 * Run: node scripts/smoke-test.cjs
 *
 * Boots assertions against an already-running server (default
 * http://localhost:4028, override with SMOKE_BASE_URL). This is the only check
 * that exercises the app through HTTP, so it covers the seams unit tests miss:
 * middleware routing, redirects, the CSRF cookie/header handshake and auth
 * guards on real requests.
 *
 * It deliberately asserts *guard* behaviour rather than happy-path writes: with
 * no DATABASE_URL the app runs on the in-memory mock, which cannot register
 * users. Mutating flows that need persistence belong in the e2e suite.
 *
 * Exits non-zero on the first failing assertion so CI fails loudly.
 */

const BASE = (process.env.SMOKE_BASE_URL || 'http://localhost:4028').replace(/\/$/, '');
const TIMEOUT_MS = 15_000;

let failures = 0;

function check(label, actual, expected) {
  if (actual === expected) {
    console.info(`  ok    ${label}`);
    return true;
  }
  failures += 1;
  console.error(`  FAIL  ${label} — expected ${expected}, got ${actual}`);
  return false;
}

async function checkOneOf(label, actual, expectedList) {
  if (expectedList.includes(actual)) {
    console.info(`  ok    ${label}`);
    return true;
  }
  failures += 1;
  console.error(`  FAIL  ${label} — expected one of ${expectedList.join('/')}, got ${actual}`);
  return false;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...options,
  });
  return res;
}

async function status(path, options) {
  return (await request(path, options)).status;
}

/**
 * Poll until the server answers, so CI does not need a separate readiness
 * helper (and cannot race the dev server's compile-on-first-request).
 */
async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      await request('/api/csrf');
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error(`server did not become ready within ${timeoutMs}ms (${lastError?.message})`);
}

async function main() {
  console.info(`Smoke testing ${BASE}\n`);

  try {
    await waitForServer();
  } catch (error) {
    console.error(`Cannot reach ${BASE}: ${error.message}`);
    process.exit(1);
  }

  console.info('Public pages');
  for (const path of [
    '/trang-chu',
    '/tim-ve',
    '/dich-vu',
    '/gioi-thieu',
    '/hoi-dap',
    '/lien-he',
    '/tra-cuu',
    '/chuyen-bay-cua-toi',
    '/lam-thu-tuc',
    '/dang-nhap',
    '/quen-mat-khau',
    '/dat-lai-mat-khau',
  ]) {
    check(`GET ${path}`, await status(path), 200);
  }

  console.info('\nRedirects and 404');
  const root = await request('/');
  check('GET / is a redirect', root.status, 307);
  check('GET / redirects to /trang-chu', root.headers.get('location'), '/trang-chu');

  const baggage = await request('/hanh-ly');
  check('GET /hanh-ly is a redirect', baggage.status, 307);
  check(
    'GET /hanh-ly redirects to the baggage service',
    baggage.headers.get('location'),
    '/dich-vu?service=baggage'
  );

  const checkInAlias = await request('/lam-thu-tuc-truc-tuyen?code=VD-12345678');
  check('GET /lam-thu-tuc-truc-tuyen is a redirect', checkInAlias.status, 307);
  check(
    'GET /lam-thu-tuc-truc-tuyen forwards the booking code',
    checkInAlias.headers.get('location'),
    '/lam-thu-tuc?code=VD-12345678'
  );

  // Dev/Turbopack does not run the root middleware, so an unknown path reaches
  // the router and renders 404. A production build runs the Proxy, which
  // bounces any non-public path (including nonexistent ones) to /dang-nhap
  // before routing — a deliberate choice that avoids leaking which routes
  // exist. Accept either, but never 200.
  await checkOneOf('GET unknown route', await status('/khong-ton-tai-xyz'), [404, 307]);

  console.info('\nPublic API');
  check('GET /api/csrf', await status('/api/csrf'), 200);
  check(
    'GET /api/cong-khai/cau-hinh-ngan-hang',
    await status('/api/cong-khai/cau-hinh-ngan-hang'),
    200
  );

  const search = await request('/api/chuyen-bay?from=SGN&to=HAN');
  check('GET /api/chuyen-bay', search.status, 200);
  const searchBody = await search.json().catch(() => null);
  check('GET /api/chuyen-bay returns a flights array', Array.isArray(searchBody?.flights), true);

  console.info('\nAuth guards (no session)');
  for (const path of ['/api/dat-ve', '/api/thanh-vien', '/api/quan-tri/nguoi-dung', '/api/vi']) {
    check(`GET ${path} without a session`, await status(path), 401);
  }

  console.info('\nCSRF enforcement');
  const csrfRes = await request('/api/csrf');
  const csrfCookie = csrfRes.headers.getSetCookie().find((c) => c.startsWith('csrf_token='));
  check('GET /api/csrf sets a csrf_token cookie', Boolean(csrfCookie), true);

  // A mutating request carrying the cookie but no matching header must be
  // rejected — this is the double-submit check every POST route relies on.
  check(
    'POST /api/xac-thuc/dang-nhap without the CSRF header',
    await status('/api/xac-thuc/dang-nhap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: csrfCookie.split(';')[0] },
      body: JSON.stringify({ email: 'smoke@vietjetsim.vn', password: 'Smoke@12345' }),
    }),
    401
  );

  console.info('');
  if (failures > 0) {
    console.error(`Smoke test failed: ${failures} assertion(s).`);
    process.exit(1);
  }
  console.info('Smoke test passed.');
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
