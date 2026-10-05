#!/usr/bin/env node
/**
 * End-to-end wallet flow against a local Postgres, through the real HTTP API.
 *
 * Why this file exists: `npm run test:smoke` only asserts guard behaviour —
 * redirects and 401s — because `@neondatabase/serverless` speaks HTTP only, so
 * a `docker run postgres` was unreachable and no smoke assertion ever touched
 * a real statement. `scripts/neon-http-bridge.cjs` removes that gap; this drives
 * the flow the wallet fix actually changed.
 *
 * It asserts the behaviours measured on Postgres 17:
 *   - a top-up credits exactly once and writes one ledger row
 *   - a withdrawal over the balance is refused, says why, and changes nothing
 *
 * Needs HTTPS, because the session cookies are `Secure` and curl's jar will
 * not persist one over a self-signed dev proxy. For a plain-HTTP run, set
 * `SMOKE_BASE_URL` and point the proxy at an http:// upstream.
 *
 * The dev certificate is trusted by the caller, not here:
 * `NODE_TLS_REJECT_UNAUTHORIZED=0 npm run test:wallet-e2e`. Turning off
 * certificate checking is a process-wide switch, and this file is not the
 * place to reach for it.
 */

const BASE = process.env.SMOKE_BASE_URL || 'https://localhost:4430';

const cookies = new Map();

function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function storeCookies(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

async function call(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (cookies.size) headers.Cookie = cookieHeader();
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  storeCookies(res);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  const detail = ok
    ? ''
    : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
  console.log(`  ${ok ? 'ok   ' : 'FAIL '} ${label}${detail}`);
}

async function main() {
  console.log(`Wallet e2e against ${BASE}\n`);

  await call('/api/csrf');
  const login = await call('/api/xac-thuc/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ email: 'user@vietjetair.vn', password: 'user123' }),
  });
  check('login as the demo user', login.status, 200);

  if (!login.body?.user?.id) {
    console.error('  FAIL   no user id in the login response, cannot continue');
    process.exit(1);
  }

  const postWallet = (payload) =>
    call('/api/vi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
      body: JSON.stringify(payload),
    });

  const before = await call('/api/vi');
  const startBalance = Number(before.body?.wallet?.balance ?? 0);
  const methodId = process.env.SMOKE_PAYMENT_METHOD_ID || before.body?.linkedBankAccounts?.[0]?.id;
  if (!methodId) {
    console.error('  FAIL   no linked bank account; set SMOKE_PAYMENT_METHOD_ID');
    process.exit(1);
  }

  const TOPUP = 200000;
  const topup = await postWallet({
    action: 'topup',
    amount: TOPUP,
    paymentMethodId: methodId,
    description: 'e2e topup',
  });
  check('top-up is accepted', topup.status, 200);
  check(
    'the wallet is credited exactly once',
    Number(topup.body?.wallet?.balance),
    startBalance + TOPUP
  );

  const funded = Number(topup.body?.wallet?.balance ?? 0);

  // One VND over. The `UPDATE`'s own `WHERE` is what must reject this: a
  // check done in JavaScript before the write is what let two withdrawals
  // both succeed against the same balance.
  const tooMuch = await postWallet({
    action: 'withdraw',
    amount: funded + 1,
    paymentMethodId: methodId,
    description: 'e2e overdraft',
  });
  check('a withdrawal over the balance is refused', tooMuch.status >= 400, true);
  check(
    'the refusal says the balance is short, not a bare server error',
    /không đủ/i.test(tooMuch.body?.message ?? ''),
    true
  );

  const final = await call('/api/vi');
  check(
    'a refused withdrawal leaves the balance untouched',
    Number(final.body?.wallet?.balance),
    funded
  );

  const transactions = final.body?.transactions ?? [];
  const topupRow = transactions.find((t) => t.description === 'e2e topup');
  check(
    'the top-up wrote exactly one ledger row',
    transactions.filter((t) => t.description === 'e2e topup').length,
    1
  );
  // `balance_after` arrives as the raw numeric string ("5200000.00"), while
  // the wallet object was compared as a Number above — compare like with like,
  // or this fails on formatting rather than on behaviour.
  check(
    'the ledger records the same final balance the wallet reports',
    Number(topupRow?.balance_after),
    funded
  );

  console.log(failures === 0 ? '\nWallet e2e passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Wallet e2e failed to run:', error);
  process.exit(1);
});
